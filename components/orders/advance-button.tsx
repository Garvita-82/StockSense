'use client'

import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ORDER_CONFIG, changeStatus, type OrderKind, type OrderRow } from './order-model'

export function AdvanceButton({
  kind,
  order,
  size = 'sm',
  className,
}: {
  kind: OrderKind
  order: OrderRow
  size?: 'sm' | 'default'
  className?: string
}) {
  const config = ORDER_CONFIG[kind]
  const next = config.next[order.status]
  if (!next) return null
  const completes = next === 'Received' || next === 'Done'
  const Icon = completes ? Check : ArrowRight
  return (
    <Button
      size={size}
      variant={completes ? 'default' : 'outline'}
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        changeStatus(kind, order.id, next)
      }}
      aria-label={`${config.advanceLabel[order.status]}: ${order.reference}`}
      title={completes ? config.completeHint : `Move to ${next}`}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      {config.advanceLabel[order.status]}
    </Button>
  )
}
