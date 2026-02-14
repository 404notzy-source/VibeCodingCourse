import { useEffect, useRef } from 'react'
import { MessageSquareDashed } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import MessageItem from './MessageItem'

export default function MessageList() {
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const bottomRef = useRef<HTMLDivElement>(null)

  const currentMessages = currentSessionId
    ? messages[currentSessionId] || []
    : []

  // 判断是否需要显示 loading dots
  const lastMsg = currentMessages[currentMessages.length - 1]
  const showLoadingDots =
    isStreaming && (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content)

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, isStreaming])

  if (!currentSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <MessageSquareDashed size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">选择或新建一个对话开始</p>
        </div>
      </div>
    )
  }

  if (currentMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <MessageSquareDashed size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-semibold text-slate-600 mb-1">智能数据分析助理</p>
          <p className="text-sm">输入自然语言问题，查询数据库并生成图表</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {currentMessages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {showLoadingDots && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
