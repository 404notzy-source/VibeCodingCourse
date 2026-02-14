import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

export default function ChatInput() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const currentSessionId = useChatStore((s) => s.currentSessionId)

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [input])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    sendMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-slate-200 px-4 py-3 bg-white">
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            currentSessionId
              ? '输入你的问题，例如："各产品销售额是多少？"'
              : '请先新建或选择一个对话'
          }
          disabled={!currentSessionId || isStreaming}
          rows={1}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 resize-none outline-none max-h-[150px] py-1 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming || !currentSessionId}
          className="p-1.5 text-slate-400 hover:text-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Send size={18} />
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1.5 text-center">
        Enter 发送 · Shift+Enter 换行
      </p>
    </div>
  )
}
