import { PanelRightClose, PanelRightOpen, BarChart3, Table2 } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import VisualCard from './VisualCard'

export default function ChartPanel() {
  const isOpen = useChatStore((s) => s.isChartPanelOpen)
  const togglePanel = useChatStore((s) => s.toggleChartPanel)
  const panelViewMode = useChatStore((s) => s.panelViewMode)
  const setPanelViewMode = useChatStore((s) => s.setPanelViewMode)
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const visualItems = useChatStore((s) => s.visualItems)

  const currentItems = currentSessionId ? visualItems[currentSessionId] || [] : []

  // 折叠状态
  if (!isOpen) {
    return (
      <div className="flex flex-col items-center py-4 px-1 border-l border-slate-200 bg-white">
        <button
          onClick={togglePanel}
          className="p-2 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
          title="展开面板"
        >
          <PanelRightOpen size={18} />
        </button>
        {currentItems.length > 0 && (
          <div className="mt-2 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-xs text-white">
            {currentItems.length}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-[420px] h-full bg-white border-l border-slate-200 flex flex-col shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-700">数据可视化</h2>
          {currentItems.length > 0 && (
            <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
              {currentItems.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* 图表/表格 切换按钮 */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setPanelViewMode('chart')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                panelViewMode === 'chart'
                  ? 'bg-white text-indigo-600 shadow-sm font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="图表视图"
            >
              <BarChart3 size={13} />
              图表
            </button>
            <button
              onClick={() => setPanelViewMode('table')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                panelViewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-sm font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="表格视图"
            >
              <Table2 size={13} />
              表格
            </button>
          </div>

          <button
            onClick={togglePanel}
            className="p-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
            title="折叠面板"
          >
            <PanelRightClose size={18} />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <BarChart3 size={40} className="mb-2 opacity-30" />
            <p className="text-sm">暂无数据</p>
            <p className="text-xs mt-1">提问后将自动生成可视化图表和数据表格</p>
          </div>
        ) : (
          currentItems.map((item) => (
            <VisualCard key={item.id} item={item} viewMode={panelViewMode} />
          ))
        )}
      </div>
    </div>
  )
}
