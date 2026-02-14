import type { VisualItem, PanelViewMode } from '../../types'
import ChartCard from './ChartCard'
import DataTable from './DataTable'

interface Props {
  item: VisualItem
  viewMode: PanelViewMode
}

export default function VisualCard({ item, viewMode }: Props) {
  if (viewMode === 'table') {
    return <DataTable item={item} />
  }
  return <ChartCard item={item} />
}
