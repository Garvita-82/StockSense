import type { Metadata } from 'next'
import { OrdersView } from '@/components/orders/orders-view'

export const metadata: Metadata = { title: 'Receipts' }

export default function Page() {
  return <OrdersView kind="receipt" />
}
