import type { Session, Message, ChartConfig } from '../types'

export const mockSessions: Session[] = [
  {
    id: 'session-1',
    title: '各产品销售额分析',
    created_at: '2026-02-12T08:00:00Z',
    updated_at: '2026-02-12T08:30:00Z',
  },
  {
    id: 'session-2',
    title: '员工绩效排名查询',
    created_at: '2026-02-11T14:00:00Z',
    updated_at: '2026-02-11T14:20:00Z',
  },
  {
    id: 'session-3',
    title: '月度收入趋势',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-10T10:15:00Z',
  },
  {
    id: 'session-4',
    title: '客户分布统计',
    created_at: '2026-02-09T16:00:00Z',
    updated_at: '2026-02-09T16:10:00Z',
  },
]

export const mockMessages: Record<string, Message[]> = {
  'session-1': [
    {
      id: 'msg-1',
      session_id: 'session-1',
      role: 'user',
      content: '帮我查询一下各产品的销售额是多少？',
      sql_query: null,
      chart_config: null,
      created_at: '2026-02-12T08:00:00Z',
    },
    {
      id: 'msg-2',
      session_id: 'session-1',
      role: 'assistant',
      content:
        '根据查询结果，各产品销售额如下：\n\n- **笔记本电脑**: ¥1,250,000\n- **智能手机**: ¥980,000\n- **平板电脑**: ¥560,000\n- **智能手表**: ¥320,000\n- **耳机**: ¥180,000\n\n笔记本电脑的销售额最高，占总销售额的 38%。',
      sql_query:
        'SELECT product_name, SUM(amount) as total_sales\nFROM sales\nGROUP BY product_name\nORDER BY total_sales DESC;',
      chart_config: JSON.stringify({
        id: 'chart-1',
        type: 'bar',
        title: '各产品销售额',
        option: {
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: ['笔记本电脑', '智能手机', '平板电脑', '智能手表', '耳机'],
            axisLabel: { color: '#9ca3af' },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: '#9ca3af' },
            splitLine: { lineStyle: { color: '#374151' } },
          },
          series: [
            {
              name: '销售额',
              type: 'bar',
              data: [1250000, 980000, 560000, 320000, 180000],
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: '#6366f1' },
                    { offset: 1, color: '#4f46e5' },
                  ],
                },
                borderRadius: [4, 4, 0, 0],
              },
            },
          ],
          grid: { left: '8%', right: '4%', bottom: '12%', top: '8%' },
        },
      }),
      created_at: '2026-02-12T08:00:05Z',
    },
    {
      id: 'msg-3',
      session_id: 'session-1',
      role: 'user',
      content: '那各产品的销售占比是多少？',
      sql_query: null,
      chart_config: null,
      created_at: '2026-02-12T08:01:00Z',
    },
    {
      id: 'msg-4',
      session_id: 'session-1',
      role: 'assistant',
      content:
        '各产品销售占比如下：\n\n| 产品 | 销售额 | 占比 |\n|------|--------|------|\n| 笔记本电脑 | ¥1,250,000 | 38.0% |\n| 智能手机 | ¥980,000 | 29.8% |\n| 平板电脑 | ¥560,000 | 17.0% |\n| 智能手表 | ¥320,000 | 9.7% |\n| 耳机 | ¥180,000 | 5.5% |',
      sql_query:
        'SELECT product_name,\n       SUM(amount) as total_sales,\n       ROUND(SUM(amount) * 100.0 / (SELECT SUM(amount) FROM sales), 1) as percentage\nFROM sales\nGROUP BY product_name\nORDER BY total_sales DESC;',
      chart_config: JSON.stringify({
        id: 'chart-2',
        type: 'pie',
        title: '各产品销售占比',
        option: {
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend: {
            orient: 'vertical',
            right: '5%',
            top: 'center',
            textStyle: { color: '#9ca3af' },
          },
          series: [
            {
              name: '销售占比',
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['40%', '50%'],
              avoidLabelOverlap: false,
              itemStyle: { borderRadius: 6, borderColor: '#1f2937', borderWidth: 2 },
              label: { show: false },
              emphasis: {
                label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#fff' },
              },
              data: [
                { value: 1250000, name: '笔记本电脑' },
                { value: 980000, name: '智能手机' },
                { value: 560000, name: '平板电脑' },
                { value: 320000, name: '智能手表' },
                { value: 180000, name: '耳机' },
              ],
            },
          ],
        },
      }),
      created_at: '2026-02-12T08:01:05Z',
    },
  ],
  'session-2': [
    {
      id: 'msg-5',
      session_id: 'session-2',
      role: 'user',
      content: '查询销售业绩前5名的员工',
      sql_query: null,
      chart_config: null,
      created_at: '2026-02-11T14:00:00Z',
    },
    {
      id: 'msg-6',
      session_id: 'session-2',
      role: 'assistant',
      content:
        '销售业绩前5名员工：\n\n1. **张三** - ¥520,000\n2. **李四** - ¥480,000\n3. **王五** - ¥450,000\n4. **赵六** - ¥420,000\n5. **钱七** - ¥380,000',
      sql_query:
        'SELECT employee_name, SUM(sales_amount) as total_sales\nFROM employees e\nJOIN sales s ON e.id = s.employee_id\nGROUP BY employee_name\nORDER BY total_sales DESC\nLIMIT 5;',
      chart_config: null,
      created_at: '2026-02-11T14:00:05Z',
    },
  ],
}

/**
 * 从 mock messages 中提取图表配置
 * 模拟后端行为：chart_config 是 JSON 字符串，需要 parse
 */
function extractMockCharts(): Record<string, ChartConfig[]> {
  const result: Record<string, ChartConfig[]> = {}
  for (const [sessionId, msgs] of Object.entries(mockMessages)) {
    const charts: ChartConfig[] = []
    for (const msg of msgs) {
      if (msg.chart_config) {
        try {
          charts.push(JSON.parse(msg.chart_config) as ChartConfig)
        } catch {
          // ignore parse errors
        }
      }
    }
    if (charts.length > 0) {
      result[sessionId] = charts
    }
  }
  return result
}

export const mockCharts: Record<string, ChartConfig[]> = extractMockCharts()
