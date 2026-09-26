import type { Database, ID } from './types'

export function indexById<T extends { id: ID }>(rows: T[]): Map<ID, T> {
  return new Map(rows.map((r) => [r.id, r]))
}

export function lookups(db: Database) {
  return {
    products: indexById(db.products),
    categories: indexById(db.categories),
    locations: indexById(db.locations),
    warehouses: indexById(db.warehouses),
    users: indexById(db.users),
    roles: indexById(db.roles),
  }
}
export type Lookups = ReturnType<typeof lookups>

export function onHandByProduct(db: Database): Map<ID, number> {
  const totals = new Map<ID, number>()
  for (const s of db.stock) totals.set(s.product_id, (totals.get(s.product_id) ?? 0) + s.qty)
  return totals
}

export function onHandAt(db: Database, productId: ID, locationId: ID): number {
  return db.stock.find((s) => s.product_id === productId && s.location_id === locationId)?.qty ?? 0
}

export function onHandByProductWarehouse(db: Database): Map<string, number> {
  const locs = indexById(db.locations)
  const totals = new Map<string, number>()
  for (const s of db.stock) {
    const wh = locs.get(s.location_id)?.warehouse_id
    if (!wh) continue
    const key = `${s.product_id}:${wh}`
    totals.set(key, (totals.get(key) ?? 0) + s.qty)
  }
  return totals
}

export interface LowStockRow {
  id: ID
  product_id: ID
  warehouse_id: ID
  on_hand: number
  min_qty: number
  shortfall: number
}

export function lowStock(db: Database): LowStockRow[] {
  const totals = onHandByProductWarehouse(db)
  return db.reorder_thresholds
    .map((t) => {
      const on_hand = totals.get(`${t.product_id}:${t.warehouse_id}`) ?? 0
      return { id: t.id, product_id: t.product_id, warehouse_id: t.warehouse_id, on_hand, min_qty: t.min_qty, shortfall: t.min_qty - on_hand }
    })
    .filter((r) => r.on_hand < r.min_qty)
    .sort((a, b) => b.shortfall - a.shortfall)
}

export function stockByCategory(db: Database) {
  const products = indexById(db.products)
  const totals = new Map<ID, { units: number; value: number }>()
  for (const s of db.stock) {
    const p = products.get(s.product_id)
    if (!p) continue
    const t = totals.get(p.category_id) ?? { units: 0, value: 0 }
    t.units += s.qty
    t.value += s.qty * p.unit_cost
    totals.set(p.category_id, t)
  }
  return db.categories
    .map((c) => ({ id: c.id, name: c.name, units: totals.get(c.id)?.units ?? 0, value: totals.get(c.id)?.value ?? 0, products: db.products.filter((p) => p.category_id === c.id).length }))
    .sort((a, b) => b.units - a.units)
}

export function linesByOrder<T extends { qty: number }>(lines: T[], key: (l: T) => ID) {
  const map = new Map<ID, T[]>()
  for (const l of lines) {
    const k = key(l)
    const list = map.get(k)
    if (list) list.push(l)
    else map.set(k, [l])
  }
  return map
}
