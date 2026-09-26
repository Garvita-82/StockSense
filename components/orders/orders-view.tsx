'use client'

import { useMemo, useState } from 'react'
import { Columns3, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/layout'
import { SearchInput, Segmented } from '@/components/common/controls'
import { useReadyDb } from '@/lib/use-db'
import type { OrderStatus } from '@/lib/types'
import { ORDER_CONFIG, selectOrders, type OrderKind, type OrderRow } from './order-model'
import { OrdersTable } from './orders-table'
import { OrdersKanban } from './orders-kanban'
import { OrderDetailDialog } from './order-detail-dialog'
import { OrderFormDialog } from './order-form-dialog'

type View = 'list' | 'kanban'

export function OrdersView({ kind }: { kind: OrderKind }) {
  const config = ORDER_CONFIG[kind]
  const { db, lk } = useReadyDb()
  const [view, setView] = useState<View>('list')
  const [status, setStatus] = useState<OrderStatus | 'All'>('All')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const all = useMemo(() => selectOrders(db, kind), [db, kind])

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((o) => searchText(o, lk).includes(q))
  }, [all, query, lk])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const o of searched) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [searched])

  const listRows = status === 'All' ? searched : searched.filter((o) => o.status === status)
  const selected = selectedId ? all.find((o) => o.id === selectedId) ?? null : null

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New {config.singular}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<View>
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List', icon: List },
              { value: 'kanban', label: 'Kanban', icon: Columns3 },
            ]}
          />
          {view === 'list' ? (
            <div className="max-w-full overflow-x-auto">
              <Segmented<OrderStatus | 'All'>
                label="Filter by status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'All', label: 'All', count: searched.length },
                  ...config.statuses.map((s) => ({ value: s, label: s, count: counts[s] ?? 0 })),
                ]}
              />
            </div>
          ) : null}
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          label={`Search ${config.title.toLowerCase()}`}
          placeholder={`Reference, ${config.partnerLabel.toLowerCase()}, product, location`}
          className="lg:w-80"
        />
      </div>

      {view === 'list' ? (
        <OrdersTable kind={kind} rows={listRows} onOpen={setSelectedId} />
      ) : (
        <OrdersKanban kind={kind} rows={searched} onOpen={setSelectedId} />
      )}

      <OrderDetailDialog kind={kind} order={selected} onClose={() => setSelectedId(null)} />
      <OrderFormDialog kind={kind} open={creating} onOpenChange={setCreating} />
    </>
  )
}

function searchText(o: OrderRow, lk: ReturnType<typeof useReadyDb>['lk']) {
  const loc = lk.locations.get(o.location_id)
  const products = o.lines.map((l) => {
    const p = lk.products.get(l.product_id)
    return `${p?.sku ?? ''} ${p?.name ?? ''}`
  })
  return [o.reference, o.partner, o.status, loc?.code, loc?.name, lk.warehouses.get(o.warehouse_id)?.code, ...products]
    .join(' ')
    .toLowerCase()
}
