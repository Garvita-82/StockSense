'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { AlertTriangle, ArrowDownToLine, ArrowRight, Package, Truck } from 'lucide-react'
import { useReadyDb } from '@/lib/use-db'
import { lowStock, stockByCategory } from '@/lib/queries'
import { fmtDateTime, fmtMoney, fmtNum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PageHeader, Panel } from '@/components/common/layout'
import { Badge, Delta, LedgerTypeTag } from '@/components/common/status-badge'
import { EmptyRow, TableShell, Th, cellClass, rowClass, theadClass } from '@/components/common/controls'

export function DashboardView() {
  const { db, lk } = useReadyDb()

  const stats = useMemo(() => {
    const units = db.stock.reduce((s, r) => s + r.qty, 0)
    const value = db.stock.reduce((s, r) => s + r.qty * (lk.products.get(r.product_id)?.unit_cost ?? 0), 0)
    const low = lowStock(db)
    const lowProducts = new Set(low.map((l) => l.product_id)).size
    const receiptsOpen = db.receipts.filter((r) => r.status === 'Draft' || r.status === 'Expected')
    const deliveriesOpen = db.delivery_orders.filter((d) => d.status === 'Draft' || d.status === 'Ready')
    return {
      units,
      value,
      low,
      lowProducts,
      receiptsOpen: receiptsOpen.length,
      receiptsExpected: receiptsOpen.filter((r) => r.status === 'Expected').length,
      deliveriesOpen: deliveriesOpen.length,
      deliveriesReady: deliveriesOpen.filter((d) => d.status === 'Ready').length,
      categories: stockByCategory(db),
      recent: [...db.ledger].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8),
    }
  }, [db, lk])

  const maxCat = Math.max(1, ...stats.categories.map((c) => c.units))

  return (
    <>
      <PageHeader
        title="Inventory Manager Dashboard"
        description={`Management view of stock, orders, and inventory health across ${db.warehouses.length} warehouses and ${db.locations.length} locations.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Units on hand" value={fmtNum(stats.units)} detail={`${fmtMoney(stats.value)} at cost`} icon={Package} href="/products" />
        <Kpi
          label="Below reorder threshold"
          value={fmtNum(stats.lowProducts)}
          detail={`${stats.low.length} product/warehouse pairs`}
          icon={AlertTriangle}
          tone={stats.lowProducts > 0 ? 'pending' : undefined}
          href="#low-stock"
        />
        <Kpi
          label="Receipts in progress"
          value={fmtNum(stats.receiptsOpen)}
          detail={`${stats.receiptsExpected} expected, ${stats.receiptsOpen - stats.receiptsExpected} draft`}
          icon={ArrowDownToLine}
          href="/receipts"
        />
        <Kpi
          label="Deliveries in progress"
          value={fmtNum(stats.deliveriesOpen)}
          detail={`${stats.deliveriesReady} ready, ${stats.deliveriesOpen - stats.deliveriesReady} draft`}
          icon={Truck}
          href="/deliveries"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel title="Stock by category" description="Units on hand and value at cost" className="lg:col-span-2" bodyClassName="p-4">
          <ul className="flex flex-col gap-4">
            {stats.categories.map((c) => (
              <li key={c.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="font-medium text-foreground">{fmtNum(c.units)}</span> units · {fmtMoney(c.value)}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-sm bg-muted"
                  role="meter"
                  aria-label={`${c.name} units`}
                  aria-valuenow={c.units}
                  aria-valuemin={0}
                  aria-valuemax={maxCat}
                >
                  <div className="h-full rounded-sm bg-primary" style={{ width: `${(c.units / maxCat) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {c.products} {c.products === 1 ? 'product' : 'products'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Low-stock alerts"
          description="On hand below the warehouse reorder minimum"
          className="scroll-mt-6 lg:col-span-3"
          actions={<Badge tone={stats.low.length ? 'pending' : 'neutral'}>{stats.low.length} open</Badge>}
        >
          <div id="low-stock" className="scroll-mt-6">
            <TableShell caption="Products below reorder threshold">
              <thead className={theadClass}>
                <tr>
                  <Th>Product</Th>
                  <Th>Warehouse</Th>
                  <Th align="right">On hand</Th>
                  <Th align="right">Minimum</Th>
                  <Th align="right">Shortfall</Th>
                </tr>
              </thead>
              <tbody>
                {stats.low.length === 0 ? (
                  <EmptyRow colSpan={5} message="All products are at or above their reorder minimum." />
                ) : (
                  stats.low.map((row) => {
                    const p = lk.products.get(row.product_id)
                    return (
                      <tr key={row.id} className={rowClass}>
                        <td className={cellClass}>
                          <div className="font-medium">{p?.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{p?.sku}</div>
                        </td>
                        <td className={cellClass}>{lk.warehouses.get(row.warehouse_id)?.code}</td>
                        <td className={cn(cellClass, 'text-right font-mono tabular-nums text-warning')}>{fmtNum(row.on_hand)}</td>
                        <td className={cn(cellClass, 'text-right font-mono tabular-nums')}>{fmtNum(row.min_qty)}</td>
                        <td className={cn(cellClass, 'text-right font-mono font-medium tabular-nums')}>
                          {fmtNum(row.shortfall)} {p?.uom}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </TableShell>
          </div>
        </Panel>
      </div>

      <Panel
        title="Recent stock activity"
        description="Latest ledger entries"
        className="mt-6"
        actions={
          <Link href="/history" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Move history
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        }
      >
        <TableShell caption="Recent ledger entries">
          <thead className={theadClass}>
            <tr>
              <Th>Time</Th>
              <Th>Type</Th>
              <Th>Reference</Th>
              <Th>Product</Th>
              <Th>Location</Th>
              <Th align="right">Change</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((e) => {
              const p = lk.products.get(e.product_id)
              return (
                <tr key={e.id} className={rowClass}>
                  <td className={cn(cellClass, 'whitespace-nowrap text-muted-foreground tabular-nums')}>{fmtDateTime(e.timestamp)}</td>
                  <td className={cellClass}>
                    <LedgerTypeTag type={e.type} />
                  </td>
                  <td className={cn(cellClass, 'font-mono text-xs')}>{e.reference}</td>
                  <td className={cellClass}>{p?.name}</td>
                  <td className={cn(cellClass, 'font-mono text-xs')}>{lk.locations.get(e.location_id)?.code}</td>
                  <td className={cn(cellClass, 'text-right')}>
                    <Delta value={e.delta} />
                  </td>
                  <td className={cn(cellClass, 'text-right font-mono tabular-nums text-muted-foreground')}>{fmtNum(e.balance_after)}</td>
                </tr>
              )
            })}
          </tbody>
        </TableShell>
      </Panel>
    </>
  )
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  href,
}: {
  label: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'pending'
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <Icon className={cn('size-4', tone === 'pending' ? 'text-warning' : 'text-muted-foreground')} />
      </div>
      <span className={cn('text-3xl font-semibold tracking-tight tabular-nums', tone === 'pending' && 'text-warning')}>{value}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </Link>
  )
}
