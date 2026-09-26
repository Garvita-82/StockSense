import type { Metadata } from 'next'
import { ProductsView } from '@/components/products/products-view'

export const metadata: Metadata = { title: 'Products' }

export default function Page() {
  return <ProductsView />
}
