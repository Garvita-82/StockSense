# Stockline

Inventory and warehouse operations tool: receipts, delivery orders, products, stock adjustments, internal transfers, and a full append-only stock ledger.

Stockline is **frontend-only**. There is no backend, no API routes, no server actions, and no third-party services. All data lives in the browser's `localStorage`, and sample data is seeded on first load.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Demo sign-ing

Choose one of the two operational roles on the sign-in page:

| Role | Email | Password |
| --- | --- | --- |
| Inventory Manager | `manager@stockline.com` | `manager123` |
| Warehouse Staff | `warehouse@stockline.com` | `warehouse123` |

The manager opens an oversight dashboard and full navigation. Warehouse staff opens a separate floor-operations dashboard focused on receiving, picking, stock counts, transfers, availability, locations, and move history. The demo role and sign-in are stored in the browser's `localStorage`; this is not production authentication, so do not use real or sensitive credentials.

### Deploy to Vercel

No environment variables are needed.

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New → Project**, import the repository, and accept the detected Next.js defaults.
3. Click **Deploy**.

You can also deploy from the CLI with `npx vercel` (preview) or `npx vercel --prod`.

Each browser keeps its own copy of the data. To restore the sample dataset, go to **Settings → Reset to sample data**.

## Data layer

`lib/db.ts` treats one JSON document in `localStorage` (key `stockline:db:v1`) as a normalized SQL database. Each table is an array of rows. Rows reference each other by `id` (foreign keys), and no row nests another.

### The stock invariant

`moveStock(tx, input)` is the **only** function that changes `stock.qty`. On each call it:

1. validates the product, the location, and a non-zero integer delta,
2. finds or creates the `stock` row for `(product_id, location_id)`,
3. rejects any move that would take the quantity below zero,
4. applies the delta, **and**
5. appends a `ledger` row that records the resulting balance.

Higher-level operations call `moveStock` inside `transact()`: advancing a receipt to *Received*, advancing a delivery to *Done*, `recordAdjustment`, `transferStock`, and seeding. `transact()` runs against a deep copy of the database and commits only if nothing throws. A multi-line order that fails on its third line therefore changes nothing: no stock and no ledger rows.

### Storage safety

- Reads are wrapped in `try/catch`. Empty, unparseable, or structurally invalid data is replaced by a freshly seeded database.
- Failed writes (quota exceeded, private mode) are caught. The app keeps working in memory and shows a warning in Settings.
- Changes made in another tab are picked up through the `storage` event.

## Schema

| Table | Columns |
| --- | --- |
| `roles` | `id`, `name`, `description` |
| `users` | `id`, `name`, `email`, `role_id → roles`, `created_at` |
| `warehouses` | `id`, `code`, `name`, `address` |
| `locations` | `id`, `warehouse_id → warehouses`, `code`, `name` |
| `categories` | `id`, `name` |
| `products` | `id`, `sku`, `name`, `category_id → categories`, `uom`, `unit_cost` |
| `stock` | `id`, `product_id → products`, `location_id → locations`, `qty` (unique per product + location) |
| `reorder_thresholds` | `id`, `product_id → products`, `warehouse_id → warehouses`, `min_qty` |
| `receipts` | `id`, `reference`, `supplier`, `warehouse_id`, `location_id` (destination), `scheduled_date`, `status` (`Draft` \| `Expected` \| `Received` \| `Cancelled`), `notes`, `created_by → users`, `created_at`, `updated_at` |
| `receipt_lines` | `id`, `receipt_id → receipts`, `product_id → products`, `qty` |
| `delivery_orders` | `id`, `reference`, `customer`, `warehouse_id`, `location_id` (source), `scheduled_date`, `status` (`Draft` \| `Ready` \| `Done` \| `Cancelled`), `notes`, `created_by → users`, `created_at`, `updated_at` |
| `delivery_order_lines` | `id`, `delivery_order_id → delivery_orders`, `product_id → products`, `qty` |
| `internal_transfers` | `id`, `reference`, `from_location_id → locations`, `to_location_id → locations`, `product_id → products`, `qty`, `created_by`, `created_at` |
| `adjustments` | `id`, `reference`, `product_id`, `location_id`, `delta`, `reason`, `note`, `created_by`, `created_at` |
| `ledger` (append-only) | `id`, `timestamp`, `product_id`, `location_id`, `delta`, `balance_after`, `type` (`opening` \| `receipt` \| `delivery` \| `transfer_out` \| `transfer_in` \| `adjustment`), `reference`, `user_id` |
| `meta` | `schema_version`, `seeded_at`, `current_user_id`, `sequences` (reference counters) |

### Status transitions

- Receipt: `Draft → Expected → Received`. **Received** writes `+qty` per line to the destination location.
- Delivery: `Draft → Ready → Done`. **Done** writes `−qty` per line from the source location, and fails if stock is short.
- Any order that is not yet final can be set to `Cancelled`. `Received`, `Done`, and `Cancelled` are terminal states.

## Folder structure

```
app/                     Routes (each page renders one client view)
  page.tsx               Dashboard
  receipts/  deliveries/ products/  adjustments/
  history/   settings/   profile/
components/
  shell/                 App shell, two-tier sidebar, theme toggle
  common/                Table, form controls, badges, panels
  dashboard/             KPIs, category breakdown, low-stock, activity
  orders/                Shared receipt/delivery list, kanban, dialogs
  products/  adjustments/  history/  settings/  profile/
lib/
  types.ts               Table row types and enums
  db.ts                  Storage, transact(), moveStock(), domain operations
  seed.ts                Sample dataset (replayed through moveStock)
  queries.ts             Read-only derived data (on-hand, low stock, lookups)
  use-db.ts              React binding (useSyncExternalStore)
  use-table.ts           Sort, search, and filter hook for tables
  theme.ts               Light/dark preference
```

## Tech

Next.js App Router, React, TypeScript, Tailwind CSS, and Lucide icons. Every view that touches data is a client component.
