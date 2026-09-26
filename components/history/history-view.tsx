'use client'

import { useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fmtDateTime, fmtNum } from '@/lib/format'
import { useReadyDb } from '@/lib/use-db'
import { useTable } from '@/lib/use-table'
import { LEDGER_TYPES, type LedgerEntry, type LedgerType } from '@/lib/types'
import { PageHeader, Panel } from '@/components/common/layout'
import { Delta, LedgerTypeTag, ledgerTypeLabel } from '@/components/common/status-badge'
import { EmptyRow, SearchInput, Select, SortableTh, TableShell, Th, cellClass, rowClass, theadClass } from '@/components/common/controls'

type SortKey = 'timestamp' | 'reference' | 'product' | 'location' | 'delta' | 'balance' | 'type'

const PAGE = 50

export function HistoryView() {
  const { db, lk } = useReadyDb()
  const [type, setType] = useState<LedgerType | 'all'>('all')
  const [warehouse, setWarehouse] = useState('all')
  const [limit, setLimit] = useState(PAGE)

  const filter = useMemo(() => {
    if (type === 'all' && warehouse === 'all') return undefined
    return (e: LedgerEntry) =>
      (type === 'all' || e.type === type) && (warehouse === 'all' || lk.locations.get(e.location_id)?.warehouse_id === warehouse)
  }, [type, warehouse, lk])

  const table = useTable<LedgerEntry, SortKey>(db.ledger, {
    sortBy: {
      timestamp: (e) => e.timestamp,
      reference: (e) => e.reference,
      product: (e) => lk.products.get(e.product_id)?.sku ?? '',
      location: (e) => lk.locations.get(e.location_id)?.code ?? '',
      delta: (e) => e.delta,
      balance: (e) => e.balance_after,
      type: (e) => ledgerTypeLabel[e.type],
    },
    searchText: (e) => {
      const p = lk.products.get(e.product_id)
      return `${e.reference} ${p?.sku} ${p?.name} ${lk.locations.get(e.location_id)?.code} ${ledgerTypeLabel[e.type]} ${lk.users.get(e.user_id)?.name}`
    },
    initialSort: { key: 'timestamp', dir: 'desc' },
    filter,
  })

  const visible = table.rows.slice(0, limit)
  const inflow = table.rows.reduce((s, e) => s + Math.max(0, e.delta), 0)
  const outflow = table.rows.reduce((s, e) => s + Math.min(0, e.delta), 0)

  return (
    <>
      <PageHeader
        title="Move History"
        description="Append-only stock ledger. Every quantity change of any kind inserts one row here; rows are never edited or deleted."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select aria-label="Filter by movement type" value={type} onChange={(e) => setType(e.target.value as LedgerType | 'all')} className="sm:w-44">
            <option value="all">All types</option>
            {LEDGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {ledgerTypeLabel[t]}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="sm:w-52">
            <option value="all">All warehouses</option>
            {db.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} · {w.name}
              </option>
            ))}
          </Select>
        </div>
        <SearchInput value={table.query} onChange={table.setQuery} label="Search ledger" placeholder="Reference, product, location, user" className="lg:w-80" />
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden="true" />
            {fmtNum(db.ledger.length)} entries total
          </span>
          <span>
            Showing <span className="font-medium text-foreground tabular-nums">{fmtNum(table.rows.length)}</span> matching
          </span>
          <span>
            In <span className="font-mono font-medium text-success">+{fmtNum(inflow)}</span>
          </span>
          <span>
            Out <span className="font-mono font-medium text-danger">{fmtNum(outflow)}</span>
          </span>
        </div>
        <TableShell caption="Stock ledger">
          <thead className={theadClass}>
            <tr>
              <SortableTh label="Timestamp" sortKey="timestamp" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Type" sortKey="type" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Reference" sortKey="reference" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Product" sortKey="product" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Location" sortKey="location" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Delta" sortKey="delta" sort={table.sort} onSort={table.toggleSort} align="right" />
              <SortableTh label="Balance" sortKey="balance" sort={table.sort} onSort={table.toggleSort} align="right" />
              <Th>User</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <EmptyRow colSpan={8} message="No ledger entries match the current filters." />
            ) : (
              visible.map((e) => {
                const p = lk.products.get(e.product_id)
                return (
                  <tr key={e.id} className={rowClass}>
                    <td className={cn(cellClass, 'whitespace-nowrap text-muted-foreground tabular-nums')}>{fmtDateTime(e.timestamp)}</td>
                    <td className={cellClass}>
                      <LedgerTypeTag type={e.type} />
                    </td>
                    <td className={cn(cellClass, 'font-mono text-xs')}>{e.reference}</td>
                    <td className={cellClass}>
                      <span className="font-mono text-xs text-muted-foreground">{p?.sku}</span>{' '}
                      <span className="font-medium">{p?.name}</span>
                    </td>
                    <td className={cn(cellClass, 'font-mono text-xs')}>{lk.locations.get(e.location_id)?.code}</td>
                    <td className={cn(cellClass, 'text-right')}>
                      <Delta value={e.delta} />
                    </td>
                    <td className={cn(cellClass, 'text-right font-mono tabular-nums')}>{fmtNum(e.balance_after)}</td>
                    <td className={cn(cellClass, 'whitespace-nowrap text-muted-foreground')}>{lk.users.get(e.user_id)?.name}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </TableShell>
        {table.rows.length > limit ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {fmtNum(limit)} of {fmtNum(table.rows.length)} shown
            </span>
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, table.rows.length - limit)} more
            </Button>
          </div>
        ) : null}
      </Panel>
    </>
  )
}
