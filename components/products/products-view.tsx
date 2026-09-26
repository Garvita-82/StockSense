'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtMoney, fmtNum } from '@/lib/format'
import { lowStock, onHandByProduct } from '@/lib/queries'
import { useReadyDb } from '@/lib/use-db'
import { useTable } from '@/lib/use-table'
import { PageHeader, Panel } from '@/components/common/layout'
import { Badge } from '@/components/common/status-badge'
import { EmptyRow, SearchInput, Select, SortableTh, TableShell, Th, cellClass, rowClass, theadClass } from '@/components/common/controls'

interface ProductRow {
  id: string
  sku: string
  name: string
  category: string
  category_id: string
  uom: string
  unit_cost: number
  on_hand: number
  locations: { code: string; qty: number }[]
  low_in: string[]
}

type SortKey = 'sku' | 'name' | 'category' | 'uom' | 'unit_cost' | 'on_hand'

export function ProductsView() {
  const { db, lk } = useReadyDb()
  const [category, setCategory] = useState('all')

  const rows = useMemo<ProductRow[]>(() => {
    const totals = onHandByProduct(db)
    const low = lowStock(db)
    return db.products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category_id: p.category_id,
      category: lk.categories.get(p.category_id)?.name ?? '-',
      uom: p.uom,
      unit_cost: p.unit_cost,
      on_hand: totals.get(p.id) ?? 0,
      locations: db.stock
        .filter((s) => s.product_id === p.id && s.qty > 0)
        .map((s) => ({ code: lk.locations.get(s.location_id)?.code ?? '?', qty: s.qty }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      low_in: low.filter((l) => l.product_id === p.id).map((l) => lk.warehouses.get(l.warehouse_id)?.code ?? '?'),
    }))
  }, [db, lk])

  const filter = useMemo(() => (category === 'all' ? undefined : (r: ProductRow) => r.category_id === category), [category])

  const table = useTable<ProductRow, SortKey>(rows, {
    sortBy: {
      sku: (r) => r.sku,
      name: (r) => r.name,
      category: (r) => r.category,
      uom: (r) => r.uom,
      unit_cost: (r) => r.unit_cost,
      on_hand: (r) => r.on_hand,
    },
    searchText: (r) => `${r.sku} ${r.name} ${r.category} ${r.uom}`,
    initialSort: { key: 'sku', dir: 'asc' },
    filter,
  })

  return (
    <>
      <PageHeader title="Products" description="Product catalog with live on-hand quantity summed across all locations." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-56">
          <option value="all">All categories</option>
          {db.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <SearchInput value={table.query} onChange={table.setQuery} label="Search products" placeholder="SKU, name, category" />
      </div>

      <Panel>
        <TableShell caption="Products">
          <thead className={theadClass}>
            <tr>
              <SortableTh label="SKU" sortKey="sku" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Name" sortKey="name" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Category" sortKey="category" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="UoM" sortKey="uom" sort={table.sort} onSort={table.toggleSort} />
              <SortableTh label="Unit cost" sortKey="unit_cost" sort={table.sort} onSort={table.toggleSort} align="right" />
              <SortableTh label="On hand" sortKey="on_hand" sort={table.sort} onSort={table.toggleSort} align="right" />
              <Th>Locations</Th>
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <EmptyRow colSpan={7} message="No products match the current filters." />
            ) : (
              table.rows.map((r) => (
                <tr key={r.id} className={rowClass}>
                  <td className={cn(cellClass, 'font-mono text-[13px]')}>{r.sku}</td>
                  <td className={cn(cellClass, 'font-medium')}>{r.name}</td>
                  <td className={cellClass}>{r.category}</td>
                  <td className={cn(cellClass, 'text-muted-foreground')}>{r.uom}</td>
                  <td className={cn(cellClass, 'text-right font-mono tabular-nums')}>{fmtMoney(r.unit_cost)}</td>
                  <td className={cn(cellClass, 'text-right')}>
                    <div className="flex items-center justify-end gap-2">
                      {r.low_in.length ? <Badge tone="pending">Low in {r.low_in.join(', ')}</Badge> : null}
                      <span className="font-mono font-medium tabular-nums">{fmtNum(r.on_hand)}</span>
                    </div>
                  </td>
                  <td className={cellClass}>
                    {r.locations.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No stock</span>
                    ) : (
                      <ul className="flex flex-wrap gap-1">
                        {r.locations.map((l) => (
                          <li key={l.code} className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {l.code} <span className="text-foreground">{fmtNum(l.qty)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
        <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {table.rows.length} of {rows.length} products
        </div>
      </Panel>
    </>
  )
}
