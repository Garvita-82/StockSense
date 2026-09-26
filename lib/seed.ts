import type { Database, MoveInput } from './types'

export const SCHEMA_VERSION = 3

const at = (date: string, time = '09:00') => new Date(`${date}T${time}:00`).toISOString()

/**
 * Seed tables with empty `stock` and `ledger`. Opening balances and the stock
 * effects of completed documents are returned as `movements`, which the db
 * layer replays through moveStock() so stock and ledger are always consistent.
 */
export function buildSeedTables(): { tables: Database; movements: MoveInput[] } {
  const created = at('2026-09-01', '07:30')

  const tables: Database = {
    meta: {
      schema_version: SCHEMA_VERSION,
      seeded_at: new Date().toISOString(),
      current_user_id: 'usr_1',
      sequences: { receipt: 4, delivery: 4, transfer: 1, adjustment: 2 },
    },
    roles: [
      { id: 'rol_manager', name: 'Inventory Manager', description: 'Manage inventory, policies, warehouses, and reporting' },
      { id: 'rol_staff', name: 'Warehouse Staff', description: 'Execute receiving, picking, putaway, counts, and stock movements' },
    ],
    users: [
      { id: 'usr_1', name: 'Garvita Dwivedi', email: 'garvita.dwivedi@stockline.local', role_id: 'rol_manager', created_at: created },
      { id: 'usr_2', name: 'Mehvish Khan', email: 'mehvish.khan@stockline.local', role_id: 'rol_staff', created_at: created },
      { id: 'usr_3', name: 'Priya Raman', email: 'priya.raman@stockline.local', role_id: 'rol_manager', created_at: created },
    ],
    warehouses: [
      { id: 'wh_1', code: 'CDC', name: 'Central Distribution Center', address: '4100 Commerce Pkwy, Columbus, OH 43219' },
      { id: 'wh_2', code: 'EDP', name: 'East Depot', address: '88 Port St, Newark, NJ 07114' },
    ],
    locations: [
      { id: 'loc_1', warehouse_id: 'wh_1', code: 'CDC/STOCK/A1', name: 'Aisle A, Rack 1' },
      { id: 'loc_2', warehouse_id: 'wh_1', code: 'CDC/STOCK/B1', name: 'Aisle B, Rack 1' },
      { id: 'loc_3', warehouse_id: 'wh_1', code: 'CDC/RECV', name: 'Receiving Bay' },
      { id: 'loc_4', warehouse_id: 'wh_2', code: 'EDP/STOCK/01', name: 'Main Floor' },
      { id: 'loc_5', warehouse_id: 'wh_2', code: 'EDP/SHIP', name: 'Shipping Dock' },
    ],
    categories: [
      { id: 'cat_1', name: 'Fasteners' },
      { id: 'cat_2', name: 'Packaging' },
      { id: 'cat_3', name: 'Electrical' },
      { id: 'cat_4', name: 'Safety Equipment' },
    ],
    products: [
      { id: 'prd_1', sku: 'FST-M8-40', name: 'Hex Bolt M8 x 40 mm, Zinc', category_id: 'cat_1', uom: 'Box/100', unit_cost: 14.2 },
      { id: 'prd_2', sku: 'FST-WSH-M8', name: 'Flat Washer M8', category_id: 'cat_1', uom: 'Box/200', unit_cost: 6.5 },
      { id: 'prd_3', sku: 'PKG-CTN-12', name: 'Corrugated Carton 12 x 12 x 12 in', category_id: 'cat_2', uom: 'Each', unit_cost: 0.95 },
      { id: 'prd_4', sku: 'PKG-TAPE-48', name: 'Packing Tape 48 mm x 100 m', category_id: 'cat_2', uom: 'Roll', unit_cost: 3.4 },
      { id: 'prd_5', sku: 'ELC-THHN-14', name: 'THHN Wire 14 AWG, Black, 500 ft', category_id: 'cat_3', uom: 'Spool', unit_cost: 62 },
      { id: 'prd_6', sku: 'SAF-GLV-NL', name: 'Nitrile Gloves, Large', category_id: 'cat_4', uom: 'Box/100', unit_cost: 11.75 },
    ],
    stock: [],
    reorder_thresholds: [
      { id: 'rt_1', product_id: 'prd_1', warehouse_id: 'wh_1', min_qty: 50 },
      { id: 'rt_2', product_id: 'prd_1', warehouse_id: 'wh_2', min_qty: 30 },
      { id: 'rt_3', product_id: 'prd_2', warehouse_id: 'wh_1', min_qty: 100 },
      { id: 'rt_4', product_id: 'prd_2', warehouse_id: 'wh_2', min_qty: 50 },
      { id: 'rt_5', product_id: 'prd_3', warehouse_id: 'wh_1', min_qty: 200 },
      { id: 'rt_6', product_id: 'prd_3', warehouse_id: 'wh_2', min_qty: 60 },
      { id: 'rt_7', product_id: 'prd_4', warehouse_id: 'wh_1', min_qty: 50 },
      { id: 'rt_8', product_id: 'prd_5', warehouse_id: 'wh_1', min_qty: 40 },
      { id: 'rt_9', product_id: 'prd_6', warehouse_id: 'wh_1', min_qty: 40 },
      { id: 'rt_10', product_id: 'prd_6', warehouse_id: 'wh_2', min_qty: 20 },
    ],
    receipts: [
      {
        id: 'rcp_1', reference: 'WH/IN/0001', supplier: 'Northgate Fasteners Inc.', warehouse_id: 'wh_1', location_id: 'loc_3',
        scheduled_date: '2026-09-10', status: 'Received', notes: 'PO 44810', created_by: 'usr_2',
        created_at: at('2026-09-05', '10:12'), updated_at: at('2026-09-10', '14:05'),
      },
      {
        id: 'rcp_2', reference: 'WH/IN/0002', supplier: 'Harbor Packaging Ltd.', warehouse_id: 'wh_1', location_id: 'loc_2',
        scheduled_date: '2026-09-29', status: 'Expected', notes: 'PO 44852, carrier ETA confirmed', created_by: 'usr_2',
        created_at: at('2026-09-18', '11:40'), updated_at: at('2026-09-22', '08:15'),
      },
      {
        id: 'rcp_3', reference: 'WH/IN/0003', supplier: 'Voltline Electrical Supply', warehouse_id: 'wh_1', location_id: 'loc_1',
        scheduled_date: '2026-10-03', status: 'Draft', notes: 'Awaiting PO approval', created_by: 'usr_1',
        created_at: at('2026-09-24', '15:22'), updated_at: at('2026-09-24', '15:22'),
      },
      {
        id: 'rcp_4', reference: 'WH/IN/0004', supplier: 'Shieldpro Safety Co.', warehouse_id: 'wh_2', location_id: 'loc_4',
        scheduled_date: '2026-09-16', status: 'Cancelled', notes: 'Supplier backorder; re-sourced', created_by: 'usr_2',
        created_at: at('2026-09-08', '09:03'), updated_at: at('2026-09-13', '16:48'),
      },
    ],
    receipt_lines: [
      { id: 'rl_1', receipt_id: 'rcp_1', product_id: 'prd_1', qty: 60 },
      { id: 'rl_2', receipt_id: 'rcp_1', product_id: 'prd_5', qty: 10 },
      { id: 'rl_3', receipt_id: 'rcp_2', product_id: 'prd_3', qty: 200 },
      { id: 'rl_4', receipt_id: 'rcp_2', product_id: 'prd_4', qty: 48 },
      { id: 'rl_5', receipt_id: 'rcp_3', product_id: 'prd_5', qty: 30 },
      { id: 'rl_6', receipt_id: 'rcp_4', product_id: 'prd_6', qty: 50 },
    ],
    delivery_orders: [
      {
        id: 'dlv_1', reference: 'WH/OUT/0001', customer: 'Ridgeway Construction', warehouse_id: 'wh_1', location_id: 'loc_1',
        scheduled_date: '2026-09-12', status: 'Done', notes: 'SO 20931', created_by: 'usr_2',
        created_at: at('2026-09-09', '13:30'), updated_at: at('2026-09-12', '10:20'),
      },
      {
        id: 'dlv_2', reference: 'WH/OUT/0002', customer: 'Ohio Valley Fabrication', warehouse_id: 'wh_1', location_id: 'loc_2',
        scheduled_date: '2026-09-27', status: 'Ready', notes: 'SO 20977, picked and staged', created_by: 'usr_2',
        created_at: at('2026-09-21', '09:45'), updated_at: at('2026-09-25', '16:10'),
      },
      {
        id: 'dlv_3', reference: 'WH/OUT/0003', customer: 'Metro Facilities Group', warehouse_id: 'wh_2', location_id: 'loc_4',
        scheduled_date: '2026-09-30', status: 'Draft', notes: 'SO 21004', created_by: 'usr_1',
        created_at: at('2026-09-25', '11:05'), updated_at: at('2026-09-25', '11:05'),
      },
      {
        id: 'dlv_4', reference: 'WH/OUT/0004', customer: 'Lakeside Electric', warehouse_id: 'wh_1', location_id: 'loc_1',
        scheduled_date: '2026-09-19', status: 'Cancelled', notes: 'Customer cancelled order', created_by: 'usr_2',
        created_at: at('2026-09-15', '14:00'), updated_at: at('2026-09-17', '09:30'),
      },
    ],
    delivery_order_lines: [
      { id: 'dl_1', delivery_order_id: 'dlv_1', product_id: 'prd_1', qty: 30 },
      { id: 'dl_2', delivery_order_id: 'dlv_1', product_id: 'prd_2', qty: 100 },
      { id: 'dl_3', delivery_order_id: 'dlv_2', product_id: 'prd_3', qty: 120 },
      { id: 'dl_4', delivery_order_id: 'dlv_2', product_id: 'prd_4', qty: 10 },
      { id: 'dl_5', delivery_order_id: 'dlv_3', product_id: 'prd_6', qty: 6 },
      { id: 'dl_6', delivery_order_id: 'dlv_3', product_id: 'prd_1', qty: 10 },
      { id: 'dl_7', delivery_order_id: 'dlv_4', product_id: 'prd_5', qty: 15 },
    ],
    internal_transfers: [
      {
        id: 'trf_1', reference: 'INT/0001', from_location_id: 'loc_2', to_location_id: 'loc_5', product_id: 'prd_3',
        qty: 40, created_by: 'usr_2', created_at: at('2026-09-14', '11:15'),
      },
    ],
    adjustments: [
      {
        id: 'adj_1', reference: 'ADJ/0001', product_id: 'prd_6', location_id: 'loc_2', delta: -4, reason: 'Damaged',
        note: 'Crushed cartons found during put-away', created_by: 'usr_2', created_at: at('2026-09-15', '15:40'),
      },
      {
        id: 'adj_2', reference: 'ADJ/0002', product_id: 'prd_2', location_id: 'loc_1', delta: 12, reason: 'Cycle count correction',
        note: 'Weekly count, rack A1', created_by: 'usr_1', created_at: at('2026-09-20', '08:50'),
      },
    ],
    ledger: [],
  }

  const opening: [string, string, number][] = [
    ['prd_1', 'loc_1', 120],
    ['prd_1', 'loc_4', 40],
    ['prd_2', 'loc_1', 300],
    ['prd_2', 'loc_4', 25],
    ['prd_3', 'loc_2', 450],
    ['prd_3', 'loc_5', 80],
    ['prd_4', 'loc_2', 36],
    ['prd_4', 'loc_4', 60],
    ['prd_5', 'loc_1', 18],
    ['prd_6', 'loc_2', 70],
    ['prd_6', 'loc_4', 12],
  ]

  const movements: MoveInput[] = opening.map(([product_id, location_id, qty]) => ({
    product_id,
    location_id,
    delta: qty,
    type: 'opening',
    reference: 'OPENING',
    user_id: 'usr_3',
    timestamp: created,
  }))

  for (const r of tables.receipts.filter((r) => r.status === 'Received')) {
    for (const l of tables.receipt_lines.filter((l) => l.receipt_id === r.id)) {
      movements.push({ product_id: l.product_id, location_id: r.location_id, delta: l.qty, type: 'receipt', reference: r.reference, user_id: 'usr_1', timestamp: r.updated_at })
    }
  }
  for (const d of tables.delivery_orders.filter((d) => d.status === 'Done')) {
    for (const l of tables.delivery_order_lines.filter((l) => l.delivery_order_id === d.id)) {
      movements.push({ product_id: l.product_id, location_id: d.location_id, delta: -l.qty, type: 'delivery', reference: d.reference, user_id: 'usr_1', timestamp: d.updated_at })
    }
  }
  for (const t of tables.internal_transfers) {
    movements.push({ product_id: t.product_id, location_id: t.from_location_id, delta: -t.qty, type: 'transfer_out', reference: t.reference, user_id: t.created_by, timestamp: t.created_at })
    movements.push({ product_id: t.product_id, location_id: t.to_location_id, delta: t.qty, type: 'transfer_in', reference: t.reference, user_id: t.created_by, timestamp: t.created_at })
  }
  for (const a of tables.adjustments) {
    movements.push({ product_id: a.product_id, location_id: a.location_id, delta: a.delta, type: 'adjustment', reference: a.reference, user_id: a.created_by, timestamp: a.created_at })
  }

  movements.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
  return { tables, movements }
}
