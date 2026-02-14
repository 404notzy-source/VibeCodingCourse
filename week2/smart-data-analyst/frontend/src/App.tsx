import { useEffect } from 'react'
import ChatSidebar from './components/ChatSidebar'
import ChatArea from './components/ChatArea'
import ChartPanel from './components/ChartPanel'
import { useChatStore } from './stores/chatStore'

function App() {
  const init = useChatStore((s) => s.init)

  // 应用启动时从后端加载会话列表
  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">
      {/* 左侧：会话管理 */}
      <ChatSidebar />

      {/* 中间：问答区域 */}
      <ChatArea />

      {/* 右侧：图表面板 */}
      <ChartPanel />
    </div>
  )
}

export default App
