import { Table2 } from 'lucide-react'
import type { VisualItem } from '../../types'

interface Props {
  item: VisualItem
}

export default function DataTable({ item }: Props) {
  const data = item.queryData

  if (!data || data.rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-3 py-2 border-b border-slate-100">
          <h3 className="text-sm font-medium text-slate-700">{item.title}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <Table2 size={24} className="mb-2 opacity-40" />
          <p className="text-xs">暂无表格数据</p>
          <p className="text-xs mt-0.5">历史会话的查询数据不支持表格展示</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      {/* 标题 */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">{item.title}</h3>
        <span className="text-xs text-slate-400">{data.rows.length} 行</span>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left font-medium text-slate-500 border-b border-slate-200 w-8">
                #
              </th>
              {data.columns.map((col, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-slate-500 border-b border-slate-200 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/30 transition-colors`}
              >
                <td className="px-3 py-1.5 text-slate-400 border-b border-slate-100">
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-1.5 text-slate-600 border-b border-slate-100 whitespace-nowrap"
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatCell(value: string | number | null): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    // 如果是整数，直接显示；如果是浮点数，保留 2 位
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return String(value)
}
