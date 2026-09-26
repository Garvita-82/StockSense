import { cn } from '@/lib/utils'
import type { LedgerType, OrderStatus } from '@/lib/types'

type Tone = 'neutral' | 'pending' | 'success' | 'danger' | 'brand'

const toneClass: Record<Tone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  pending: 'border-warning/30 bg-warning/10 text-warning',
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  brand: 'border-primary/25 bg-primary/10 text-primary',
}

const dotClass: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  pending: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
  brand: 'bg-primary',
}

export const statusTone: Record<OrderStatus, Tone> = {
  Draft: 'neutral',
  Expected: 'pending',
  Ready: 'pending',
  Received: 'success',
  Done: 'success',
  Cancelled: 'danger',
}

export function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap',
        toneClass[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dotClass[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>
}

export const ledgerTypeLabel: Record<LedgerType, string> = {
  opening: 'Opening balance',
  receipt: 'Receipt',
  delivery: 'Delivery',
  transfer_out: 'Transfer out',
  transfer_in: 'Transfer in',
  adjustment: 'Adjustment',
}

export function LedgerTypeTag({ type }: { type: LedgerType }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-border px-2 text-xs text-muted-foreground whitespace-nowrap">
      {ledgerTypeLabel[type]}
    </span>
  )
}

export function Delta({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('font-mono tabular-nums', value > 0 ? 'text-foreground' : 'text-muted-foreground', className)}>
      {value > 0 ? `+${value.toLocaleString('en-US')}` : value.toLocaleString('en-US')}
    </span>
  )
}
