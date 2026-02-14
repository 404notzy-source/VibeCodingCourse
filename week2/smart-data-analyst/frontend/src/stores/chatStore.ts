import { create } from 'zustand'
import type {
  Session, Message, ChartConfig, ChartType,
  VisualItem, QueryData, PanelViewMode,
} from '../types'
import * as api from '../services/api'

interface ChatStore {
  // 会话管理
  sessions: Session[]
  currentSessionId: string | null

  // 消息
  messages: Record<string, Message[]>

  // 可视化项（每个会话一个列表，每次查询产生一个 VisualItem）
  visualItems: Record<string, VisualItem[]>

  // 临时：当前流式过程中收集的 queryData（还没关联到 VisualItem）
  _pendingQueryData: QueryData | null

  // 流式状态
  isStreaming: boolean

  // 右侧面板
  isChartPanelOpen: boolean
  panelViewMode: PanelViewMode

  // 初始化标记
  initialized: boolean

  // Actions
  init: () => Promise<void>
  setCurrentSession: (id: string) => Promise<void>
  createSession: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  toggleChartPanel: () => void
  setPanelViewMode: (mode: PanelViewMode) => void
  switchChartType: (sessionId: string, itemId: string, chartType: ChartType) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  visualItems: {},
  _pendingQueryData: null,
  isStreaming: false,
  isChartPanelOpen: true,
  panelViewMode: 'chart',
  initialized: false,

  // ========== 初始化 ==========
  init: async () => {
    if (get().initialized) return
    try {
      const sessions = await api.fetchSessions()
      set({ sessions, initialized: true })
      if (sessions.length > 0) {
        const firstId = sessions[0].id
        set({ currentSessionId: firstId })
        await loadSessionMessages(firstId)
      }
    } catch (err) {
      console.error('初始化会话列表失败:', err)
      set({ initialized: true })
    }
  },

  // ========== 切换会话 ==========
  setCurrentSession: async (id: string) => {
    set({ currentSessionId: id })
    if (!get().messages[id]) {
      await loadSessionMessages(id)
    }
  },

  // ========== 创建新会话 ==========
  createSession: async () => {
    try {
      const session = await api.createSession()
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSessionId: session.id,
        messages: { ...state.messages, [session.id]: [] },
      }))
    } catch (err) {
      console.error('创建会话失败:', err)
    }
  },

  // ========== 删除会话 ==========
  deleteSession: async (id: string) => {
    try {
      await api.deleteSession(id)
      set((state) => {
        const filtered = state.sessions.filter((s) => s.id !== id)
        const newMessages = { ...state.messages }
        delete newMessages[id]
        const newVisualItems = { ...state.visualItems }
        delete newVisualItems[id]
        return {
          sessions: filtered,
          currentSessionId:
            state.currentSessionId === id
              ? filtered[0]?.id ?? null
              : state.currentSessionId,
          messages: newMessages,
          visualItems: newVisualItems,
        }
      })
    } catch (err) {
      console.error('删除会话失败:', err)
    }
  },

  // ========== 重命名会话 ==========
  renameSession: async (id: string, title: string) => {
    try {
      const updated = await api.renameSession(id, title)
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, title: updated.title, updated_at: updated.updated_at } : s
        ),
      }))
    } catch (err) {
      console.error('重命名会话失败:', err)
    }
  },

  // ========== 发送消息: SSE 流式对接 ==========
  sendMessage: async (content: string) => {
    let { currentSessionId } = get()

    if (!currentSessionId) {
      try {
        const session = await api.createSession(content.slice(0, 30))
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
          messages: { ...state.messages, [session.id]: [] },
        }))
        currentSessionId = session.id
      } catch (err) {
        console.error('自动创建会话失败:', err)
        return
      }
    }

    const sessionId = currentSessionId!

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content,
      sql_query: null,
      chart_config: null,
      created_at: new Date().toISOString(),
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      session_id: sessionId,
      role: 'assistant',
      content: '',
      sql_query: null,
      chart_config: null,
      created_at: new Date().toISOString(),
    }

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [
          ...(state.messages[sessionId] || []),
          userMessage,
          assistantMessage,
        ],
      },
      isStreaming: true,
      _pendingQueryData: null,
    }))

    try {
      await api.sendChatMessage(
        sessionId,
        content,
        (event) => {
          const state = get()
          const msgs = [...(state.messages[sessionId] || [])]
          const lastIdx = msgs.length - 1
          const lastMsg = msgs[lastIdx]

          if (!lastMsg || lastMsg.role !== 'assistant') return

          switch (event.type) {
            case 'text':
              msgs[lastIdx] = {
                ...lastMsg,
                content: lastMsg.content + (event.content || ''),
              }
              set({ messages: { ...state.messages, [sessionId]: msgs } })
              break

            case 'sql':
              msgs[lastIdx] = {
                ...lastMsg,
                sql_query: (event.content as string) || null,
              }
              set({ messages: { ...state.messages, [sessionId]: msgs } })
              break

            case 'data':
              // 存储查询原始数据（等 chart 事件来时关联）
              set({ _pendingQueryData: event.content as QueryData })
              break

            case 'chart':
              if (event.config) {
                const chart = event.config
                const pendingData = get()._pendingQueryData

                msgs[lastIdx] = {
                  ...lastMsg,
                  chart_config: JSON.stringify(chart),
                }

                // 创建 VisualItem
                const visualItem: VisualItem = {
                  id: chart.id,
                  title: chart.title,
                  chartConfig: chart,
                  queryData: pendingData,
                  activeChartType: chart.type,
                }

                set((s) => ({
                  messages: { ...s.messages, [sessionId]: msgs },
                  visualItems: {
                    ...s.visualItems,
                    [sessionId]: [...(s.visualItems[sessionId] || []), visualItem],
                  },
                  _pendingQueryData: null,
                }))
              }
              break

            case 'error':
              msgs[lastIdx] = {
                ...lastMsg,
                content: lastMsg.content + `\n\n**错误**: ${event.content || '未知错误'}`,
              }
              set({ messages: { ...state.messages, [sessionId]: msgs } })
              break

            case 'done': {
              // 如果有 pendingQueryData 但没有 chart 事件，也创建一个纯数据的 VisualItem
              const pendingData = get()._pendingQueryData
              if (pendingData && pendingData.rows.length > 0) {
                const dataItem: VisualItem = {
                  id: `data-${Date.now()}`,
                  title: '查询结果',
                  chartConfig: {
                    id: `chart-${Date.now()}`,
                    type: 'bar',
                    title: '查询结果',
                    option: buildChartOption(pendingData, 'bar'),
                  },
                  queryData: pendingData,
                  activeChartType: 'bar',
                }
                set((s) => ({
                  visualItems: {
                    ...s.visualItems,
                    [sessionId]: [...(s.visualItems[sessionId] || []), dataItem],
                  },
                }))
              }

              set({ isStreaming: false, _pendingQueryData: null })
              api.fetchSessions().then((sessions) => {
                set({ sessions })
              }).catch(() => {})
              break
            }
          }
        },
        (error) => {
          console.error('SSE 错误:', error)
          const state = get()
          const msgs = [...(state.messages[sessionId] || [])]
          const lastIdx = msgs.length - 1
          const lastMsg = msgs[lastIdx]
          if (lastMsg && lastMsg.role === 'assistant') {
            msgs[lastIdx] = {
              ...lastMsg,
              content: lastMsg.content || '连接失败，请重试。',
            }
          }
          set({
            messages: { ...state.messages, [sessionId]: msgs },
            isStreaming: false,
            _pendingQueryData: null,
          })
        }
      )
    } catch {
      if (get().isStreaming) {
        set({ isStreaming: false, _pendingQueryData: null })
      }
    }
  },

  toggleChartPanel: () => {
    set((state) => ({ isChartPanelOpen: !state.isChartPanelOpen }))
  },

  setPanelViewMode: (mode: PanelViewMode) => {
    set({ panelViewMode: mode })
  },

  // ========== 切换图表类型 ==========
  switchChartType: (sessionId: string, itemId: string, chartType: ChartType) => {
    set((state) => {
      const items = state.visualItems[sessionId]
      if (!items) return state

      const updatedItems = items.map((item) => {
        if (item.id !== itemId) return item

        // 如果有原始数据，根据数据重新生成 ECharts option
        const newOption = item.queryData
          ? buildChartOption(item.queryData, chartType)
          : switchOptionType(item.chartConfig.option, chartType)

        return {
          ...item,
          activeChartType: chartType,
          chartConfig: {
            ...item.chartConfig,
            type: chartType,
            option: newOption,
          },
        }
      })

      return {
        visualItems: { ...state.visualItems, [sessionId]: updatedItems },
      }
    })
  },
}))

// ========== 辅助函数 ==========

async function loadSessionMessages(sessionId: string) {
  try {
    const messages = await api.fetchMessages(sessionId)
    const visualItems: VisualItem[] = []

    for (const msg of messages) {
      const chart = api.parseChartConfig(msg.chart_config)
      if (chart) {
        visualItems.push({
          id: chart.id,
          title: chart.title,
          chartConfig: chart,
          queryData: null,
          activeChartType: chart.type,
        })
      }
    }

    useChatStore.setState((state) => ({
      messages: { ...state.messages, [sessionId]: messages },
      visualItems: visualItems.length > 0
        ? { ...state.visualItems, [sessionId]: visualItems }
        : state.visualItems,
    }))
  } catch (err) {
    console.error(`加载会话 ${sessionId} 消息失败:`, err)
  }
}

/**
 * 根据 QueryData 和图表类型生成 ECharts option
 */
export function buildChartOption(data: QueryData, chartType: ChartType): Record<string, unknown> {
  const { columns, rows } = data

  if (rows.length === 0 || columns.length < 2) {
    return { title: { text: '数据不足' } }
  }

  // 第一列作为类目/名称，其余列作为数值
  const categories = rows.map((r) => String(r[0] ?? ''))
  const valueColumns = columns.slice(1)

  if (chartType === 'pie') {
    // 饼图：取第一个数值列
    const pieData = rows.map((r) => ({
      name: String(r[0] ?? ''),
      value: Number(r[1]) || 0,
    }))
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: '5%', top: 'center' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: pieData,
      }],
    }
  }

  if (chartType === 'scatter') {
    // 散点图：前两个数值列
    if (columns.length < 3) {
      // 只有两列，x=类目索引, y=数值
      const scatterData = rows.map((r, i) => [i, Number(r[1]) || 0])
      return {
        tooltip: { trigger: 'item' },
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: [{ type: 'scatter', data: scatterData }],
      }
    }
    const scatterData = rows.map((r) => [Number(r[1]) || 0, Number(r[2]) || 0])
    return {
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: columns[1] },
      yAxis: { type: 'value', name: columns[2] },
      series: [{ type: 'scatter', data: scatterData, symbolSize: 10 }],
    }
  }

  // bar / line
  const series = valueColumns.map((colName, colIdx) => ({
    name: colName,
    type: chartType,
    data: rows.map((r) => Number(r[colIdx + 1]) || 0),
    ...(chartType === 'bar' ? { barMaxWidth: 40 } : {}),
    ...(chartType === 'line' ? { smooth: true } : {}),
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: valueColumns.length > 1 ? { data: valueColumns } : undefined,
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { rotate: categories.some((c) => c.length > 4) ? 30 : 0 },
    },
    yAxis: { type: 'value' },
    series,
    grid: { left: '8%', right: '4%', bottom: '15%', top: '10%' },
  }
}

/**
 * 简单切换已有 option 的图表类型（没有原始数据时的降级方案）
 */
function switchOptionType(option: Record<string, unknown>, chartType: ChartType): Record<string, unknown> {
  const newOption = JSON.parse(JSON.stringify(option))
  const series = (newOption.series || []) as Record<string, unknown>[]

  if (chartType === 'pie') {
    // 从 bar/line 转 pie
    const xAxis = newOption.xAxis as Record<string, unknown> | undefined
    const categories = (xAxis?.data || []) as string[]
    const firstSeries = series[0]
    const data = ((firstSeries?.data || []) as number[]).map((val, i) => ({
      name: categories[i] || `项${i}`,
      value: val,
    }))
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      }],
    }
  }

  // bar / line / scatter
  for (const s of series) {
    s.type = chartType
    if (chartType === 'line') s.smooth = true
  }

  // 如果从 pie 转回 bar/line，需要重建 xAxis
  if (!newOption.xAxis && series[0]) {
    const pieData = (series[0].data || []) as { name: string; value: number }[]
    newOption.xAxis = { type: 'category', data: pieData.map((d) => d.name) }
    newOption.yAxis = { type: 'value' }
    series[0] = {
      type: chartType,
      data: pieData.map((d) => d.value),
    }
    newOption.series = series
    newOption.tooltip = { trigger: 'axis' }
  }

  return newOption
}
