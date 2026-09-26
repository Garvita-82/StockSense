'use client'

import { toast } from 'sonner'
import {
  DELIVERY_NEXT,
  DbError,
  RECEIPT_NEXT,
  createDelivery,
  createReceipt,
  setDeliveryStatus,
  setReceiptStatus,
  type OrderInput,
} from '@/lib/db'
import { onHandAt } from '@/lib/queries'
import { DELIVERY_STATUSES, RECEIPT_STATUSES, type Database, type ID, type OrderStatus } from '@/lib/types'

export type OrderKind = 'receipt' | 'delivery'

export interface OrderRow {
  id: ID
  reference: string
  partner: string
  warehouse_id: ID
  location_id: ID
  scheduled_date: string
  status: OrderStatus
  notes: string
  created_by: ID
  updated_at: string
  lines: { id: ID; product_id: ID; qty: number }[]
  units: number
  /** Deliveries only: true when the source location cannot cover every line */
  short: boolean
}

export interface OrderConfig {
  kind: OrderKind
  title: string
  singular: string
  description: string
  partnerLabel: string
  locationLabel: string
  statuses: readonly OrderStatus[]
  openStatuses: readonly OrderStatus[]
  next: Partial<Record<OrderStatus, OrderStatus>>
  advanceLabel: Partial<Record<OrderStatus, string>>
  completeHint: string
}

export const ORDER_CONFIG: Record<OrderKind, OrderConfig> = {
  receipt: {
    kind: 'receipt',
    title: 'Receipts',
    singular: 'receipt',
    description: 'Incoming goods from suppliers. Receiving a receipt adds its lines to stock at the destination location.',
    partnerLabel: 'Supplier',
    locationLabel: 'Destination',
    statuses: RECEIPT_STATUSES,
    openStatuses: ['Draft', 'Expected'],
    next: RECEIPT_NEXT as Partial<Record<OrderStatus, OrderStatus>>,
    advanceLabel: { Draft: 'Mark expected', Expected: 'Receive' },
    completeHint: 'Adds line quantities to stock and writes ledger entries.',
  },
  delivery: {
    kind: 'delivery',
    title: 'Delivery Orders',
    singular: 'delivery order',
    description: 'Outgoing goods to customers. Marking a delivery done removes its lines from stock at the source location.',
    partnerLabel: 'Customer',
    locationLabel: 'Source',
    statuses: DELIVERY_STATUSES,
    openStatuses: ['Draft', 'Ready'],
    next: DELIVERY_NEXT as Partial<Record<OrderStatus, OrderStatus>>,
    advanceLabel: { Draft: 'Mark ready', Ready: 'Mark done' },
    completeHint: 'Removes line quantities from stock and writes ledger entries.',
  },
}

export function selectOrders(db: Database, kind: OrderKind): OrderRow[] {
  if (kind === 'receipt') {
    return db.receipts.map((r) => {
      const lines = db.receipt_lines.filter((l) => l.receipt_id === r.id)
      return {
        id: r.id,
        reference: r.reference,
        partner: r.supplier,
        warehouse_id: r.warehouse_id,
        location_id: r.location_id,
        scheduled_date: r.scheduled_date,
        status: r.status,
        notes: r.notes,
        created_by: r.created_by,
        updated_at: r.updated_at,
        lines,
        units: lines.reduce((s, l) => s + l.qty, 0),
        short: false,
      }
    })
  }
  return db.delivery_orders.map((d) => {
    const lines = db.delivery_order_lines.filter((l) => l.delivery_order_id === d.id)
    const open = d.status === 'Draft' || d.status === 'Ready'
    return {
      id: d.id,
      reference: d.reference,
      partner: d.customer,
      warehouse_id: d.warehouse_id,
      location_id: d.location_id,
      scheduled_date: d.scheduled_date,
      status: d.status,
      notes: d.notes,
      created_by: d.created_by,
      updated_at: d.updated_at,
      lines,
      units: lines.reduce((s, l) => s + l.qty, 0),
      short: open && lines.some((l) => onHandAt(db, l.product_id, d.location_id) < l.qty),
    }
  })
}

export function changeStatus(kind: OrderKind, id: ID, status: OrderStatus): boolean {
  try {
    const result =
      kind === 'receipt'
        ? setReceiptStatus(id, status as (typeof RECEIPT_STATUSES)[number])
        : setDeliveryStatus(id, status as (typeof DELIVERY_STATUSES)[number])
    const moved = result.units > 0 ? ` · ${result.units.toLocaleString('en-US')} units ${kind === 'receipt' ? 'added to' : 'removed from'} stock` : ''
    toast.success(`${result.reference} set to ${status}${moved}`)
    return true
  } catch (err) {
    toast.error(err instanceof DbError ? err.message : 'Could not update status')
    return false
  }
}

export function createOrder(kind: OrderKind, input: OrderInput): string | null {
  try {
    const ref = kind === 'receipt' ? createReceipt(input) : createDelivery(input)
    toast.success(`${ref} created as Draft`)
    return ref
  } catch (err) {
    toast.error(err instanceof DbError ? err.message : 'Could not create order')
    return null
  }
}
