import type { Metadata } from 'next'
import { HistoryView } from '@/components/history/history-view'

export const metadata: Metadata = { title: 'Move History' }

export default function Page() {
  return <HistoryView />
}
