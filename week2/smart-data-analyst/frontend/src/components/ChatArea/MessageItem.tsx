import { User, Bot, BarChart3 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../../types'
import SqlBlock from './SqlBlock'

interface Props {
  message: Message
}

export default function MessageItem({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* 消息体 */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-500 text-white rounded-tr-sm'
              : 'bg-white text-slate-700 rounded-tl-sm border border-slate-200 shadow-sm'
          }`}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-2">{children}</ol>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="text-xs border-collapse w-full">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-slate-200 px-2 py-1 text-left bg-slate-50 text-slate-600 font-medium">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-slate-200 px-2 py-1">{children}</td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* SQL 代码块 */}
        {message.sql_query && <SqlBlock sql={message.sql_query} />}

        {/* 图表指示 */}
        {message.chart_config && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-indigo-500">
            <BarChart3 size={12} />
            <span>已生成图表 →</span>
          </div>
        )}
      </div>
    </div>
  )
}
