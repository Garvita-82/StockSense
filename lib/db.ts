'use client'

import { SCHEMA_VERSION, buildSeedTables } from './seed'
import {
  TABLE_NAMES,
  type AdjustmentReason,
  type Database,
  type DeliveryStatus,
  type ID,
  type LedgerEntry,
  type MoveInput,
  type ReceiptStatus,
  type User,
} from './types'

export const STORAGE_KEY = 'stockline:db:v1'

export class DbError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DbError'
  }
}

let idCounter = 0
export function uid(prefix: string): ID {
  idCounter = (idCounter + 1) % 1_000_000
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${rand}`
}

/* ------------------------------------------------------------------ */
/* Transactions & the single stock-mutation primitive                  */
/* ------------------------------------------------------------------ */

const TX_BRAND = Symbol('stockline.tx')

/** A working copy of the database. Only obtainable through transact(). */
export interface Tx {
  readonly [TX_BRAND]: true
  readonly db: Database
  readonly now: string
}

function createTx(db: Database): Tx {
  return { [TX_BRAND]: true, db, now: new Date().toISOString() }
}

/**
 * The ONLY function that changes a stock quantity. Every call updates exactly
 * one stock row (creating it if needed) and appends exactly one ledger row.
 * Throws DbError on invalid input or if the result would be negative; because
 * callers run inside transact(), a throw discards the whole transaction.
 */
export function moveStock(tx: Tx, input: MoveInput): LedgerEntry {
  if (!tx || tx[TX_BRAND] !== true) throw new DbError('moveStock must run inside transact()')
  const { db } = tx
  const { product_id, location_id, delta, type, reference, user_id } = input

  if (!Number.isInteger(delta) || delta === 0) throw new DbError('Quantity change must be a non-zero whole number')
  const product = db.products.find((p) => p.id === product_id)
  if (!product) throw new DbError('Unknown product')
  const location = db.locations.find((l) => l.id === location_id)
  if (!location) throw new DbError('Unknown location')

  let row = db.stock.find((s) => s.product_id === product_id && s.location_id === location_id)
  const current = row?.qty ?? 0
  const next = current + delta
  if (next < 0) {
    throw new DbError(
      `Insufficient stock: ${product.sku} at ${location.code} has ${current}, cannot remove ${Math.abs(delta)}`,
    )
  }

  if (!row) {
    row = { id: uid('stk'), product_id, location_id, qty: 0 }
    db.stock.push(row)
  }
  row.qty = next

  const entry: LedgerEntry = {
    id: uid('led'),
    timestamp: input.timestamp ?? tx.now,
    product_id,
    location_id,
    delta,
    balance_after: next,
    type,
    reference,
    user_id,
  }
  db.ledger.push(entry)
  return entry
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function isValidDatabase(value: unknown): value is Database {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const meta = v.meta as Database['meta'] | undefined
  if (!meta || meta.schema_version !== SCHEMA_VERSION || typeof meta.current_user_id !== 'string') return false
  if (!meta.sequences || typeof meta.sequences !== 'object') return false
  return TABLE_NAMES.every((t) => Array.isArray(v[t]))
}

function migrateLegacyDatabase(value: unknown): Database | null {
  if (!value || typeof value !== 'object') return null
  const db = value as Database
  if (!db.meta || (db.meta.schema_version !== 1 && db.meta.schema_version !== 2) || !Array.isArray(db.roles) || !Array.isArray(db.users)) return null
  if (!TABLE_NAMES.every((table) => Array.isArray((db as unknown as Record<string, unknown>)[table]))) return null

  if (db.meta.schema_version === 1) {
    const oldRoleNames = new Map(db.roles.map((role) => [role.id, role.name]))
    db.roles = [
      { id: 'rol_manager', name: 'Inventory Manager', description: 'Manage inventory, policies, warehouses, and reporting' },
      { id: 'rol_staff', name: 'Warehouse Staff', description: 'Execute receiving, picking, putaway, counts, and stock movements' },
    ]
    db.users = db.users.map((user) => ({
      ...user,
      role_id: oldRoleNames.get(user.role_id) === 'Operator' ? 'rol_staff' : 'rol_manager',
    }))
  }
  db.users = db.users.map((user) => ({
    ...user,
    name: user.name === 'Dana Whitfield' ? 'Garvita Dwivedi' : user.name === 'Marcus Oyelaran' ? 'Mehvish Khan' : user.name,
    email: user.email === 'dana.whitfield@stockline.local' ? 'garvita.dwivedi@stockline.local' : user.email === 'marcus.oyelaran@stockline.local' ? 'mehvish.khan@stockline.local' : user.email,
  }))
  db.meta.schema_version = SCHEMA_VERSION
  return isValidDatabase(db) ? db : null
}

export function buildSeedDatabase(): Database {
  const { tables, movements } = buildSeedTables()
  const tx = createTx(tables)
  for (const m of movements) moveStock(tx, m)
  return tx.db
}

function readStorage(): Database {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isValidDatabase(parsed)) return parsed
      const migrated = migrateLegacyDatabase(parsed)
      if (migrated) {
        writeStorage(migrated)
        console.info('[stockline] Updated stored data to the two-role model')
        return migrated
      }
      console.warn('[stockline] Stored data failed validation; restoring sample data')
    }
  } catch (err) {
    console.warn('[stockline] Could not read stored data; restoring sample data', err)
  }
  const seeded = buildSeedDatabase()
  writeStorage(seeded)
  return seeded
}

let lastWriteError: string | null = null

function writeStorage(db: Database): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    lastWriteError = null
    return true
  } catch (err) {
    lastWriteError = err instanceof Error ? err.message : 'Unknown storage error'
    console.warn('[stockline] Could not persist data; changes kept in memory only', err)
    return false
  }
}

export function getLastWriteError() {
  return lastWriteError
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let cache: Database | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function getDb(): Database | null {
  if (typeof window === 'undefined') return null
  if (!cache) cache = readStorage()
  return cache
}

export function getServerDb(): Database | null {
  return null
}

function onStorageEvent(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return
  cache = null
  emit()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) window.addEventListener('storage', onStorageEvent)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorageEvent)
  }
}

/**
 * Run `fn` against a deep copy of the database. If it returns normally the
 * copy is committed and persisted; if it throws nothing is changed.
 */
export function transact<T>(fn: (tx: Tx) => T): T {
  const current = getDb()
  if (!current) throw new DbError('Data is not available yet')
  const tx = createTx(structuredClone(current))
  const result = fn(tx)
  cache = tx.db
  writeStorage(tx.db)
  emit()
  return result
}

export function resetDatabase() {
  const seeded = buildSeedDatabase()
  cache = seeded
  writeStorage(seeded)
  emit()
}

export function exportDatabase(): string {
  return JSON.stringify(getDb(), null, 2)
}

/* ------------------------------------------------------------------ */
/* Domain operations                                                   */
/* ------------------------------------------------------------------ */

function nextReference(tx: Tx, kind: keyof Database['meta']['sequences'], prefix: string) {
  tx.db.meta.sequences[kind] += 1
  return `${prefix}${String(tx.db.meta.sequences[kind]).padStart(4, '0')}`
}

export interface OrderLineInput {
  product_id: ID
  qty: number
}

export interface OrderInput {
  partner: string
  location_id: ID
  scheduled_date: string
  notes: string
  lines: OrderLineInput[]
}

function validateOrderInput(tx: Tx, input: OrderInput) {
  if (!input.partner.trim()) throw new DbError('Partner name is required')
  const location = tx.db.locations.find((l) => l.id === input.location_id)
  if (!location) throw new DbError('Select a location')
  if (!input.scheduled_date) throw new DbError('Scheduled date is required')
  if (input.lines.length === 0) throw new DbError('Add at least one line')
  for (const line of input.lines) {
    if (!tx.db.products.some((p) => p.id === line.product_id)) throw new DbError('Each line needs a product')
    if (!Number.isInteger(line.qty) || line.qty <= 0) throw new DbError('Line quantities must be positive whole numbers')
  }
  return location
}

export const RECEIPT_NEXT: Partial<Record<ReceiptStatus, ReceiptStatus>> = {
  Draft: 'Expected',
  Expected: 'Received',
}

export const DELIVERY_NEXT: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  Draft: 'Ready',
  Ready: 'Done',
}

export function createReceipt(input: OrderInput) {
  return transact((tx) => {
    const location = validateOrderInput(tx, input)
    const userId = tx.db.meta.current_user_id
    const id = uid('rcp')
    const reference = nextReference(tx, 'receipt', 'WH/IN/')
    tx.db.receipts.push({
      id,
      reference,
      supplier: input.partner.trim(),
      warehouse_id: location.warehouse_id,
      location_id: location.id,
      scheduled_date: input.scheduled_date,
      status: 'Draft',
      notes: input.notes.trim(),
      created_by: userId,
      created_at: tx.now,
      updated_at: tx.now,
    })
    for (const line of input.lines) {
      tx.db.receipt_lines.push({ id: uid('rl'), receipt_id: id, product_id: line.product_id, qty: line.qty })
    }
    return reference
  })
}

export function setReceiptStatus(id: ID, status: ReceiptStatus) {
  return transact((tx) => {
    const receipt = tx.db.receipts.find((r) => r.id === id)
    if (!receipt) throw new DbError('Receipt not found')
    const allowed =
      RECEIPT_NEXT[receipt.status] === status ||
      (status === 'Cancelled' && (receipt.status === 'Draft' || receipt.status === 'Expected'))
    if (!allowed) throw new DbError(`Cannot move ${receipt.reference} from ${receipt.status} to ${status}`)

    let units = 0
    if (status === 'Received') {
      const lines = tx.db.receipt_lines.filter((l) => l.receipt_id === id)
      for (const line of lines) {
        moveStock(tx, {
          product_id: line.product_id,
          location_id: receipt.location_id,
          delta: line.qty,
          type: 'receipt',
          reference: receipt.reference,
          user_id: tx.db.meta.current_user_id,
        })
        units += line.qty
      }
    }
    receipt.status = status
    receipt.updated_at = tx.now
    return { reference: receipt.reference, units }
  })
}

export function createDelivery(input: OrderInput) {
  return transact((tx) => {
    const location = validateOrderInput(tx, input)
    const userId = tx.db.meta.current_user_id
    const id = uid('dlv')
    const reference = nextReference(tx, 'delivery', 'WH/OUT/')
    tx.db.delivery_orders.push({
      id,
      reference,
      customer: input.partner.trim(),
      warehouse_id: location.warehouse_id,
      location_id: location.id,
      scheduled_date: input.scheduled_date,
      status: 'Draft',
      notes: input.notes.trim(),
      created_by: userId,
      created_at: tx.now,
      updated_at: tx.now,
    })
    for (const line of input.lines) {
      tx.db.delivery_order_lines.push({ id: uid('dl'), delivery_order_id: id, product_id: line.product_id, qty: line.qty })
    }
    return reference
  })
}

export function setDeliveryStatus(id: ID, status: DeliveryStatus) {
  return transact((tx) => {
    const order = tx.db.delivery_orders.find((d) => d.id === id)
    if (!order) throw new DbError('Delivery order not found')
    const allowed =
      DELIVERY_NEXT[order.status] === status ||
      (status === 'Cancelled' && (order.status === 'Draft' || order.status === 'Ready'))
    if (!allowed) throw new DbError(`Cannot move ${order.reference} from ${order.status} to ${status}`)

    let units = 0
    if (status === 'Done') {
      const lines = tx.db.delivery_order_lines.filter((l) => l.delivery_order_id === id)
      for (const line of lines) {
        moveStock(tx, {
          product_id: line.product_id,
          location_id: order.location_id,
          delta: -line.qty,
          type: 'delivery',
          reference: order.reference,
          user_id: tx.db.meta.current_user_id,
        })
        units += line.qty
      }
    }
    order.status = status
    order.updated_at = tx.now
    return { reference: order.reference, units }
  })
}

export interface AdjustmentInput {
  product_id: ID
  location_id: ID
  delta: number
  reason: AdjustmentReason
  note: string
}

export function recordAdjustment(input: AdjustmentInput) {
  return transact((tx) => {
    const reference = nextReference(tx, 'adjustment', 'ADJ/')
    const userId = tx.db.meta.current_user_id
    const entry = moveStock(tx, {
      product_id: input.product_id,
      location_id: input.location_id,
      delta: input.delta,
      type: 'adjustment',
      reference,
      user_id: userId,
    })
    tx.db.adjustments.push({
      id: uid('adj'),
      reference,
      product_id: input.product_id,
      location_id: input.location_id,
      delta: input.delta,
      reason: input.reason,
      note: input.note.trim(),
      created_by: userId,
      created_at: tx.now,
    })
    return { reference, balance: entry.balance_after }
  })
}

export function transferStock(input: { product_id: ID; from_location_id: ID; to_location_id: ID; qty: number }) {
  return transact((tx) => {
    if (input.from_location_id === input.to_location_id) throw new DbError('Source and destination must differ')
    if (!Number.isInteger(input.qty) || input.qty <= 0) throw new DbError('Quantity must be a positive whole number')
    const reference = nextReference(tx, 'transfer', 'INT/')
    const userId = tx.db.meta.current_user_id
    moveStock(tx, { product_id: input.product_id, location_id: input.from_location_id, delta: -input.qty, type: 'transfer_out', reference, user_id: userId })
    moveStock(tx, { product_id: input.product_id, location_id: input.to_location_id, delta: input.qty, type: 'transfer_in', reference, user_id: userId })
    tx.db.internal_transfers.push({ id: uid('trf'), reference, ...input, created_by: userId, created_at: tx.now })
    return reference
  })
}

export function setReorderThreshold(product_id: ID, warehouse_id: ID, min_qty: number) {
  return transact((tx) => {
    if (!Number.isInteger(min_qty) || min_qty < 0) throw new DbError('Minimum must be a whole number of 0 or more')
    const existing = tx.db.reorder_thresholds.find((t) => t.product_id === product_id && t.warehouse_id === warehouse_id)
    if (existing) existing.min_qty = min_qty
    else tx.db.reorder_thresholds.push({ id: uid('rt'), product_id, warehouse_id, min_qty })
  })
}

export function updateUser(id: ID, patch: Pick<User, 'name' | 'email'>) {
  return transact((tx) => {
    const user = tx.db.users.find((u) => u.id === id)
    if (!user) throw new DbError('User not found')
    const name = patch.name.trim()
    const email = patch.email.trim()
    if (!name) throw new DbError('Name is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DbError('Enter a valid email address')
    user.name = name
    user.email = email
  })
}

export function setCurrentUser(id: ID) {
  return transact((tx) => {
    if (!tx.db.users.some((u) => u.id === id)) throw new DbError('User not found')
    tx.db.meta.current_user_id = id
  })
}
