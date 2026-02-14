/**
 * API service 层
 * 对接后端真实接口，字段与后端 snake_case 保持一致
 */

import type { Session, Message, ChartConfig, SSEEvent, TableInfo } from '../types'
import { fetchEventSource } from '@microsoft/fetch-event-source'

const API_BASE = '/api'

// ========== 会话管理 ==========

/**
 * 获取会话列表
 * GET /api/sessions → Session[]
 */
export async function fetchSessions(): Promise<Session[]> {
  const resp = await fetch(`${API_BASE}/sessions`)
  if (!resp.ok) throw new Error('获取会话列表失败')
  return resp.json()
}

/**
 * 创建新会话
 * POST /api/sessions → Session
 */
export async function createSession(title?: string): Promise<Session> {
  const resp = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || '新对话' }),
  })
  if (!resp.ok) throw new Error('创建会话失败')
  return resp.json()
}

/**
 * 删除会话
 * DELETE /api/sessions/{id}
 */
export async function deleteSession(id: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' })
  if (!resp.ok) throw new Error('删除会话失败')
}

/**
 * 重命名会话
 * PUT /api/sessions/{id} → Session
 */
export async function renameSession(id: string, title: string): Promise<Session> {
  const resp = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!resp.ok) throw new Error('重命名会话失败')
  return resp.json()
}

/**
 * 获取会话消息历史
 * GET /api/sessions/{id}/messages → Message[]
 */
export async function fetchMessages(sessionId: string): Promise<Message[]> {
  const resp = await fetch(`${API_BASE}/sessions/${sessionId}/messages`)
  if (!resp.ok) throw new Error('获取消息历史失败')
  return resp.json()
}

// ========== 聊天 SSE ==========

/**
 * 发送聊天消息并通过 SSE 接收流式响应
 * POST /api/chat/stream
 *
 * SSE 事件格式:
 *   data: {"type": "text",  "content": "..."}
 *   data: {"type": "sql",   "content": "SELECT ..."}
 *   data: {"type": "chart", "config": {id, type, title, option}}
 *   data: {"type": "error", "content": "..."}
 *   data: {"type": "done",  "content": ""}
 */
export async function sendChatMessage(
  sessionId: string,
  message: string,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  const ctrl = new AbortController()

  await fetchEventSource(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
    signal: ctrl.signal,

    onmessage(ev) {
      if (!ev.data) return
      try {
        const event: SSEEvent = JSON.parse(ev.data)
        onEvent(event)

        // 收到 done 事件后关闭连接
        if (event.type === 'done') {
          ctrl.abort()
        }
      } catch {
        // 忽略解析失败的事件
      }
    },

    onerror(err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
      ctrl.abort()
      throw err // 阻止 fetchEventSource 重试
    },

    openWhenHidden: true,
  })
}

// ========== 数据管理 ==========

/**
 * 获取所有表信息
 * GET /api/data/tables → { tables: TableInfo[] }
 */
export async function fetchTables(): Promise<TableInfo[]> {
  const resp = await fetch(`${API_BASE}/data/tables`)
  if (!resp.ok) throw new Error('获取表信息失败')
  const data = await resp.json()
  return data.tables
}

/**
 * 获取指定表详情（含示例数据）
 * GET /api/data/tables/{name}?limit=20
 */
export async function fetchTableDetail(
  tableName: string,
  limit = 20
): Promise<{ name: string; columns: unknown[]; row_count: number; sample_data: unknown[] }> {
  const resp = await fetch(`${API_BASE}/data/tables/${tableName}?limit=${limit}`)
  if (!resp.ok) throw new Error(`获取表 ${tableName} 详情失败`)
  return resp.json()
}

/**
 * 上传 CSV 文件
 * POST /api/data/upload
 */
export async function uploadCSV(
  file: File,
  tableName?: string
): Promise<{ detail: string; table_name: string; rows_inserted: number }> {
  const formData = new FormData()
  formData.append('file', file)
  if (tableName) {
    formData.append('table_name', tableName)
  }
  const resp = await fetch(`${API_BASE}/data/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!resp.ok) throw new Error('上传 CSV 失败')
  return resp.json()
}

// ========== 工具函数 ==========

/**
 * 从 Message 的 chart_config (JSON 字符串) 解析出 ChartConfig 对象
 */
export function parseChartConfig(chartConfigStr: string | null | undefined): ChartConfig | null {
  if (!chartConfigStr) return null
  try {
    return JSON.parse(chartConfigStr) as ChartConfig
  } catch {
    return null
  }
}

export { API_BASE }
