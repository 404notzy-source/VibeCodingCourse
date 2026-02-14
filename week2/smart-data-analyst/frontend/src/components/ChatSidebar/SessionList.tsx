import { useChatStore } from '../../stores/chatStore'
import SessionItem from './SessionItem'

export default function SessionList() {
  const sessions = useChatStore((s) => s.sessions)
  const currentSessionId = useChatStore((s) => s.currentSessionId)

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-slate-400">暂无对话</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto sidebar-scroll space-y-0.5 mt-2">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isActive={session.id === currentSessionId}
        />
      ))}
    </div>
  )
}
