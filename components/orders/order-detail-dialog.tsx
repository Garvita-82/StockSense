'use client'

import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/common/status-badge'
import { TableShell, Th, cellClass, rowClass, theadClass } from '@/components/common/controls'
import { fmtDate, fmtDateTime, fmtNum } from '@/lib/format'
import { onHandAt } from '@/lib/queries'
import { useReadyDb } from '@/lib/use-db'
import { cn } from '@/lib/utils'
import { ORDER_CONFIG, changeStatus, type OrderKind, type OrderRow } from './order-model'
import { AdvanceButton } from './advance-button'

export function OrderDetailDialog({ kind, order, onClose }: { kind: OrderKind; order: OrderRow | null; onClose: () => void }) {
  const config = ORDER_CONFIG[kind]
  const { db, lk } = useReadyDb()

  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {order ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <DialogTitle className="font-mono text-base">{order.reference}</DialogTitle>
                <StatusBadge status={order.status} />
              </div>
              <DialogDescription>
                {config.partnerLabel}: {order.partner}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-border p-3 text-sm sm:grid-cols-4">
              <Meta label="Warehouse" value={lk.warehouses.get(order.warehouse_id)?.name ?? '-'} />
              <Meta label={config.locationLabel} value={lk.locations.get(order.location_id)?.code ?? '-'} mono />
              <Meta label="Scheduled" value={fmtDate(order.scheduled_date)} />
              <Meta label="Last updated" value={fmtDateTime(order.updated_at)} />
              <Meta label="Created by" value={lk.users.get(order.created_by)?.name ?? '-'} />
              {order.notes ? <Meta label="Notes" value={order.notes} className="col-span-2 sm:col-span-3" /> : null}
            </dl>

            <div className="overflow-hidden rounded-md border border-border">
              <TableShell caption={`Lines on ${order.reference}`}>
                <thead className={theadClass}>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Product</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">On hand at {lk.locations.get(order.location_id)?.code}</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => {
                    const p = lk.products.get(l.product_id)
                    const onHand = onHandAt(db, l.product_id, order.location_id)
                    const short = kind === 'delivery' && config.openStatuses.includes(order.status) && onHand < l.qty
                    return (
                      <tr key={l.id} className={rowClass}>
                        <td className={cn(cellClass, 'font-mono text-xs')}>{p?.sku}</td>
                        <td className={cellClass}>{p?.name}</td>
                        <td className={cn(cellClass, 'text-right font-mono tabular-nums')}>
                          {fmtNum(l.qty)} <span className="text-xs text-muted-foreground">{p?.uom}</span>
                        </td>
                        <td className={cn(cellClass, 'text-right font-mono tabular-nums', short ? 'text-warning' : 'text-muted-foreground')}>
                          {fmtNum(onHand)}
                          {short ? <span className="ml-1 text-xs">short {fmtNum(l.qty - onHand)}</span> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/40 text-sm">
                    <td className={cn(cellClass, 'font-medium')} colSpan={2}>
                      Total
                    </td>
                    <td className={cn(cellClass, 'text-right font-mono font-medium tabular-nums')}>{fmtNum(order.units)}</td>
                    <td />
                  </tr>
                </tfoot>
              </TableShell>
            </div>

            {config.openStatuses.includes(order.status) ? (
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {config.next[order.status] === 'Received' || config.next[order.status] === 'Done'
                    ? config.completeHint
                    : `Next step: ${config.next[order.status]}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (changeStatus(kind, order.id, 'Cancelled')) onClose()
                    }}
                  >
                    <Ban data-icon="inline-start" aria-hidden="true" />
                    Cancel {config.singular}
                  </Button>
                  <AdvanceButton kind={kind} order={order} size="default" />
                </div>
              </DialogFooter>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium', mono && 'font-mono text-[13px]')}>{value}</dd>
    </div>
  )
}
