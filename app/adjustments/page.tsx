import type { Metadata } from 'next'
import { AdjustmentsView } from '@/components/adjustments/adjustments-view'

export const metadata: Metadata = { title: 'Adjustments' }

export default function Page() {
  return <AdjustmentsView />
}
