import { Plus } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

export default function NewChatButton() {
  const createSession = useChatStore((s) => s.createSession)

  return (
    <button
      onClick={createSession}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm text-slate-600 cursor-pointer hover:border-indigo-300 hover:text-indigo-600"
    >
      <Plus size={16} />
      <span>新建对话</span>
    </button>
  )
}
