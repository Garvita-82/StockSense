'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRightLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { transferStock } from '@/lib/db'
import { useReadyDb } from '@/lib/use-db'
import { fmtDateTime, fmtNum } from '@/lib/format'
import { PageHeader, Panel } from '@/components/common/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/common/status-badge'

export function TransfersView() {
  const { db, lk } = useReadyDb()
  const [productId, setProductId] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [qty, setQty] = useState('1')
  const [busy, setBusy] = useState(false)
  const available = productId && fromId ? db.stock.find((row) => row.product_id === productId && row.location_id === fromId)?.qty ?? 0 : null
  const transfers = useMemo(() => [...db.internal_transfers].sort((a, b) => b.created_at.localeCompare(a.created_at)), [db])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const reference = transferStock({ product_id: productId, from_location_id: fromId, to_location_id: toId, qty: Number(qty) })
      toast.success(`Transfer ${reference} completed.`)
      setQty('1')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete the transfer.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <PageHeader title="Internal Transfers" description="Move stock between locations and keep both balances and the movement ledger in sync." />
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Panel title="Move stock" description="Transfers update source and destination stock immediately.">
        <form onSubmit={submit} className="space-y-4 p-4">
          <label className="block text-sm font-medium">Product
            <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select product</option>{db.products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">From location
            <select required value={fromId} onChange={(event) => setFromId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select source</option>{db.locations.map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">To location
            <select required value={toId} onChange={(event) => setToId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select destination</option>{db.locations.map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Quantity
            <input required type="number" min="1" step="1" value={qty} onChange={(event) => setQty(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </label>
          {available !== null && <p className="text-xs text-muted-foreground">Available at source: <span className="font-semibold text-foreground">{fmtNum(available)}</span></p>}
          <Button type="submit" disabled={busy || !productId || !fromId || !toId || fromId === toId} className="w-full"><ArrowRightLeft data-icon="inline-start" />Complete transfer</Button>
        </form>
      </Panel>

      <Panel title="Transfer history" description={`${transfers.length} completed internal transfers`}>
        <div className="divide-y divide-border">
          {transfers.map((transfer) => <div key={transfer.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{lk.products.get(transfer.product_id)?.name ?? 'Product'}</p><p className="mt-1 truncate text-xs text-muted-foreground">{lk.locations.get(transfer.from_location_id)?.code}<ArrowRight className="mx-1 inline size-3" />{lk.locations.get(transfer.to_location_id)?.code}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{transfer.reference} · {fmtDateTime(transfer.created_at)}</p></div>
            <Badge tone="neutral">{fmtNum(transfer.qty)} units</Badge>
          </div>)}
          {!transfers.length && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No internal transfers yet.</p>}
        </div>
      </Panel>
    </div>
  </>
}
