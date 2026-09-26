export type ID = string
export type ISODate = string

export interface Role {
  id: ID
  name: string
  description: string
}

export interface User {
  id: ID
  name: string
  email: string
  role_id: ID
  created_at: ISODate
}

export interface Warehouse {
  id: ID
  code: string
  name: string
  address: string
}

export interface Location {
  id: ID
  warehouse_id: ID
  code: string
  name: string
}

export interface Category {
  id: ID
  name: string
}

export interface Product {
  id: ID
  sku: string
  name: string
  category_id: ID
  uom: string
  unit_cost: number
}

export interface StockRow {
  id: ID
  product_id: ID
  location_id: ID
  qty: number
}

export interface ReorderThreshold {
  id: ID
  product_id: ID
  warehouse_id: ID
  min_qty: number
}

export const RECEIPT_STATUSES = ['Draft', 'Expected', 'Received', 'Cancelled'] as const
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number]

export const DELIVERY_STATUSES = ['Draft', 'Ready', 'Done', 'Cancelled'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export type OrderStatus = ReceiptStatus | DeliveryStatus

export interface Receipt {
  id: ID
  reference: string
  supplier: string
  warehouse_id: ID
  /** Destination location for received goods */
  location_id: ID
  scheduled_date: ISODate
  status: ReceiptStatus
  notes: string
  created_by: ID
  created_at: ISODate
  updated_at: ISODate
}

export interface ReceiptLine {
  id: ID
  receipt_id: ID
  product_id: ID
  qty: number
}

export interface DeliveryOrder {
  id: ID
  reference: string
  customer: string
  warehouse_id: ID
  /** Source location goods are picked from */
  location_id: ID
  scheduled_date: ISODate
  status: DeliveryStatus
  notes: string
  created_by: ID
  created_at: ISODate
  updated_at: ISODate
}

export interface DeliveryOrderLine {
  id: ID
  delivery_order_id: ID
  product_id: ID
  qty: number
}

export interface InternalTransfer {
  id: ID
  reference: string
  from_location_id: ID
  to_location_id: ID
  product_id: ID
  qty: number
  created_by: ID
  created_at: ISODate
}

export const ADJUSTMENT_REASONS = [
  'Cycle count correction',
  'Damaged',
  'Expired',
  'Lost / missing',
  'Found stock',
  'Quality hold release',
  'Other',
] as const
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]

export interface Adjustment {
  id: ID
  reference: string
  product_id: ID
  location_id: ID
  delta: number
  reason: AdjustmentReason
  note: string
  created_by: ID
  created_at: ISODate
}

export const LEDGER_TYPES = [
  'opening',
  'receipt',
  'delivery',
  'transfer_out',
  'transfer_in',
  'adjustment',
] as const
export type LedgerType = (typeof LEDGER_TYPES)[number]

export interface LedgerEntry {
  id: ID
  timestamp: ISODate
  product_id: ID
  location_id: ID
  delta: number
  /** Stock qty at this product/location immediately after the move */
  balance_after: number
  type: LedgerType
  reference: string
  user_id: ID
}

export interface MoveInput {
  product_id: ID
  location_id: ID
  delta: number
  type: LedgerType
  reference: string
  user_id: ID
  timestamp?: ISODate
}

export interface Meta {
  schema_version: number
  seeded_at: ISODate
  current_user_id: ID
  sequences: {
    receipt: number
    delivery: number
    transfer: number
    adjustment: number
  }
}

export interface Database {
  meta: Meta
  roles: Role[]
  users: User[]
  warehouses: Warehouse[]
  locations: Location[]
  categories: Category[]
  products: Product[]
  stock: StockRow[]
  reorder_thresholds: ReorderThreshold[]
  receipts: Receipt[]
  receipt_lines: ReceiptLine[]
  delivery_orders: DeliveryOrder[]
  delivery_order_lines: DeliveryOrderLine[]
  internal_transfers: InternalTransfer[]
  adjustments: Adjustment[]
  ledger: LedgerEntry[]
}

export type TableName = Exclude<keyof Database, 'meta'>

export const TABLE_NAMES: TableName[] = [
  'roles',
  'users',
  'warehouses',
  'locations',
  'categories',
  'products',
  'stock',
  'reorder_thresholds',
  'receipts',
  'receipt_lines',
  'delivery_orders',
  'delivery_order_lines',
  'internal_transfers',
  'adjustments',
  'ledger',
]
