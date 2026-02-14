import ReactECharts from 'echarts-for-react'
import { BarChart, LineChart, PieChart, ScatterChart } from 'lucide-react'
import type { VisualItem, ChartType } from '../../types'
import { useChatStore } from '../../stores/chatStore'

interface Props {
  item: VisualItem
}

const CHART_TYPES: { type: ChartType; icon: typeof BarChart; label: string }[] = [
  { type: 'bar', icon: BarChart, label: '柱状图' },
  { type: 'line', icon: LineChart, label: '折线图' },
  { type: 'pie', icon: PieChart, label: '饼图' },
  { type: 'scatter', icon: ScatterChart, label: '散点图' },
]

export default function ChartCard({ item }: Props) {
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const switchChartType = useChatStore((s) => s.switchChartType)

  const handleSwitch = (chartType: ChartType) => {
    if (!currentSessionId || chartType === item.activeChartType) return
    switchChartType(currentSessionId, item.id, chartType)
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      {/* 标题 + 图表类型切换按钮 */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-medium text-slate-700">{item.title}</h3>
        </div>

        {/* 图表类型切换按钮组 */}
        <div className="flex gap-1">
          {CHART_TYPES.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => handleSwitch(type)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer ${
                item.activeChartType === type
                  ? 'bg-indigo-50 text-indigo-600 font-medium border border-indigo-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
              title={label}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表 */}
      <div className="p-2">
        <ReactECharts
          option={item.chartConfig.option}
          style={{ height: '280px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      </div>
    </div>
  )
}
