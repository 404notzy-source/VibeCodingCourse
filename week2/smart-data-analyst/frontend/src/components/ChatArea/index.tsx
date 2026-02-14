import MessageList from './MessageList'
import ChatInput from './ChatInput'

export default function ChatArea() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
      <MessageList />
      <ChatInput />
    </div>
  )
}
