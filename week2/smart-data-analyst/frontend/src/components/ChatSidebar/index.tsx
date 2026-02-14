import { BarChart3 } from 'lucide-react'
import NewChatButton from './NewChatButton'
import SessionList from './SessionList'

export default function ChatSidebar() {
  return (
    <div className="w-[260px] h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <BarChart3 size={18} className="text-white" />
        </div>
        <h1 className="text-sm font-bold text-slate-800">智能数据分析助理</h1>
      </div>

      {/* 新建对话 */}
      <div className="px-3 pt-3">
        <NewChatButton />
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-hidden flex flex-col px-2 py-1">
        <SessionList />
      </div>
    </div>
  )
}
