'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowDownToLine, ArrowRight, Boxes, ClipboardCheck, MapPin, PackageCheck, Truck } from 'lucide-react'
import { useReadyDb } from '@/lib/use-db'
import { fmtDateTime, fmtNum } from '@/lib/format'
import { lowStock } from '@/lib/queries'
import { PageHeader, Panel } from '@/components/common/layout'
import { Badge } from '@/components/common/status-badge'

export function WarehouseStaffDashboard() {
  const { db, lk } = useReadyDb()
  const work = useMemo(() => ({
    receiving: db.receipts.filter((item) => item.status === 'Expected' || item.status === 'Draft'),
    picking: db.delivery_orders.filter((item) => item.status === 'Ready'),
    deliveryPrep: db.delivery_orders.filter((item) => item.status === 'Draft'),
    low: lowStock(db),
    recentMoves: [...db.ledger].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6),
    transfers: [...db.internal_transfers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
  }), [db])

  return (
    <>
      <PageHeader title="Warehouse Operations" description="Your floor work, receiving queue, and stock movement tasks for today." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TaskCard href="/receipts" title="Receive goods" count={work.receiving.length} detail="Receipts waiting to be processed" icon={ArrowDownToLine} tone="blue" />
        <TaskCard href="/deliveries" title="Pick & pack" count={work.picking.length} detail="Ready orders to pick and prepare" icon={PackageCheck} tone="amber" />
        <TaskCard href="/deliveries" title="Prepare deliveries" count={work.deliveryPrep.length} detail="Draft orders awaiting preparation" icon={Truck} tone="slate" />
        <TaskCard href="/adjustments" title="Stock counts" count={work.low.length} detail="Low-stock items to check on the floor" icon={ClipboardCheck} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel title="Start a warehouse task" description="Jump straight into an execution workflow" className="lg:col-span-3">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Action href="/receipts" icon={ArrowDownToLine} title="Receiving" detail="Check in incoming goods and put them away" />
            <Action href="/deliveries" icon={PackageCheck} title="Picking & packing" detail="Work ready orders and prepare shipments" />
            <Action href="/adjustments" icon={ClipboardCheck} title="Count & adjust stock" detail="Record cycle counts or stock differences" />
            <Action href="/products" icon={Boxes} title="Find stock" detail="Check product quantities and storage locations" />
            <Action href="/history" icon={MapPin} title="Move history" detail="Trace recent stock movements by location" />
            <Action href="/transfers" icon={ArrowRight} title="Move stock" detail="Transfer products between warehouse locations" />
          </div>
        </Panel>

        <Panel title="Location overview" description={`${db.locations.length} storage and work locations`} className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {db.locations.slice(0, 6).map((location) => {
              const units = db.stock.filter((stock) => stock.location_id === location.id).reduce((sum, stock) => sum + stock.qty, 0)
              return <li key={location.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{location.name}</p><p className="truncate font-mono text-xs text-muted-foreground">{location.code} · {lk.warehouses.get(location.warehouse_id)?.code}</p></div>
                <Badge tone="neutral">{fmtNum(units)} units</Badge>
              </li>
            })}
          </ul>
          <div className="border-t border-border px-4 py-3"><Link href="/products" className="text-sm font-medium text-primary hover:underline">View stock by location <ArrowRight className="ml-1 inline size-3.5" /></Link></div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent stock movements" description="Latest changes recorded across your locations" actions={<Link href="/history" className="text-sm font-medium text-primary hover:underline">Full history</Link>}>
          <ul className="divide-y divide-border">
            {work.recentMoves.map((move) => <li key={move.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{lk.products.get(move.product_id)?.name ?? 'Product'}</p><p className="text-xs text-muted-foreground">{lk.locations.get(move.location_id)?.code} · {move.reference}</p></div>
              <div className="shrink-0 text-right"><p className={`font-mono text-sm font-semibold ${move.delta < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{move.delta > 0 ? '+' : ''}{fmtNum(move.delta)}</p><p className="text-xs text-muted-foreground">{fmtDateTime(move.timestamp)}</p></div>
            </li>)}
            {work.recentMoves.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">No stock movements recorded yet.</li>}
          </ul>
        </Panel>

        <Panel title="Internal transfers" description="Recently completed moves between locations" actions={<Link href="/transfers" className="text-sm font-medium text-primary hover:underline">Manage transfers</Link>}>
          <ul className="divide-y divide-border">
            {work.transfers.map((transfer) => <li key={transfer.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{lk.products.get(transfer.product_id)?.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{lk.locations.get(transfer.from_location_id)?.code} <ArrowRight className="mx-1 inline size-3" /> {lk.locations.get(transfer.to_location_id)?.code}</p></div><Badge tone="neutral">{fmtNum(transfer.qty)} units</Badge></div>
            </li>)}
            {work.transfers.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">No internal transfers recorded yet.</li>}
          </ul>
          <div className="border-t border-border px-4 py-3"><Link href="/transfers" className="text-sm font-medium text-primary hover:underline">Start a stock transfer <ArrowRight className="ml-1 inline size-3.5" /></Link></div>
        </Panel>
      </div>
    </>
  )
}

function TaskCard({ href, title, count, detail, icon: Icon, tone }: { href: string; title: string; count: number; detail: string; icon: typeof Boxes; tone: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-500/10 text-blue-600', amber: 'bg-amber-500/10 text-amber-600', slate: 'bg-slate-500/10 text-slate-600', rose: 'bg-rose-500/10 text-rose-600' }
  return <Link href={href} className="group rounded-lg border border-border bg-card p-4 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <div className="flex items-center justify-between"><span className={`grid size-9 place-items-center rounded-md ${colors[tone]}`}><Icon className="size-4" /></span><ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" /></div>
    <p className="mt-4 text-sm font-medium text-muted-foreground">{title}</p><p className="mt-1 text-3xl font-semibold tabular-nums">{fmtNum(count)}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </Link>
}

function Action({ href, icon: Icon, title, detail }: { href: string; icon: typeof Boxes; title: string; detail: string }) {
  return <Link href={href} className="flex gap-3 rounded-md border border-border p-3 transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></span>
  </Link>
}
