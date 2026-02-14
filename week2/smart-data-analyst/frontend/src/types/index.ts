import type { EChartsOption } from 'echarts'

/**
 * 会话 — 对应后端 GET /api/sessions 返回
 */
export interface Session {
  id: string
  title: string
  created_at: string
  updated_at: string
}

/**
 * 消息 — 对应后端 GET /api/sessions/{id}/messages 返回
 */
export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sql_query?: string | null
  chart_config?: string | null
  created_at: string
}

/**
 * 图表配置 — 对应后端 SSE chart 事件的 config 字段
 */
export interface ChartConfig {
  id: string
  type: ChartType
  title: string
  option: EChartsOption
}

/** 支持的图表类型 */
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter'

/**
 * 查询结果数据 — 对应后端 SSE data 事件
 * 用于表格展示和图表类型切换
 */
export interface QueryData {
  columns: string[]
  rows: (string | number | null)[][]
  sql: string
}

/**
 * 可视化项 — 包含图表配置 + 原始查询数据
 * 每次查询产生一个 VisualItem
 */
export interface VisualItem {
  id: string
  title: string
  chartConfig: ChartConfig        // 原始图表配置（LLM 推荐的类型）
  queryData: QueryData | null     // 查询原始数据（用于表格和切换图表类型）
  activeChartType: ChartType      // 当前选中的图表类型
}

/**
 * 聊天请求 — 对应后端 POST /api/chat/stream 请求体
 */
export interface ChatRequest {
  session_id: string
  message: string
}

/**
 * SSE 事件 — 对应后端 SSE 流中每条 data 的 JSON 结构
 */
export interface SSEEvent {
  type: 'text' | 'sql' | 'chart' | 'data' | 'error' | 'done'
  content?: string | QueryData
  config?: ChartConfig
}

/**
 * 表信息 — 对应后端 GET /api/data/tables 返回
 */
export interface TableColumn {
  name: string
  type: string
  notnull: boolean
  pk: boolean
}

export interface TableInfo {
  name: string
  columns: TableColumn[]
  row_count: number
}

/** 右侧面板视图模式 */
export type PanelViewMode = 'chart' | 'table'
