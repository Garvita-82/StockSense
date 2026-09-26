'use client'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeftRight, Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Segmented, Select } from '@/components/common/controls'
import { LocationOptions } from '@/components/common/location-options'
import { Panel } from '@/components/common/layout'
import { DbError, recordAdjustment, transferStock } from '@/lib/db'
import { fmtNum } from '@/lib/format'
import { onHandAt } from '@/lib/queries'
import { useReadyDb } from '@/lib/use-db'
import { ADJUSTMENT_REASONS, type AdjustmentReason } from '@/lib/types'
import { cn } from '@/lib/utils'

type Mode = 'adjust' | 'transfer'

export function StockMovementPanel() {
  const [mode, setMode] = useState<Mode>('adjust')
  return (
    <Panel
      title={mode === 'adjust' ? 'Record adjustment' : 'Internal transfer'}
      description={mode === 'adjust' ? 'Correct on-hand quantity at one location' : 'Move stock between two locations'}
      actions={
        <Segmented<Mode>
          label="Movement type"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
            { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
          ]}
        />
      }
      bodyClassName="p-4"
    >
      {mode === 'adjust' ? <AdjustmentForm /> : <TransferForm />}
    </Panel>
  )
}

function BalancePreview({ current, next, uom }: { current: number; next: number | null; uom: string }) {
  const invalid = next !== null && next < 0
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">On hand</span>
      <span className="font-mono tabular-nums">
        {fmtNum(current)}
        {next !== null ? (
          <>
            <span className="mx-1.5 text-muted-foreground">{'→'}</span>
            <span className={cn('font-medium', invalid && 'text-danger')}>{fmtNum(next)}</span>
          </>
        ) : null}
        <span className="ml-1 text-xs text-muted-foreground">{uom}</span>
      </span>
    </div>
  )
}

function parseQty(v: string) {
  const n = Number(v)
  return v !== '' && Number.isInteger(n) && n > 0 ? n : null
}

function AdjustmentForm() {
  const { db, lk } = useReadyDb()
  const id = useId()
  const [productId, setProductId] = useState(db.products[0]?.id ?? '')
  const [locationId, setLocationId] = useState(db.locations[0]?.id ?? '')
  const [direction, setDirection] = useState<'add' | 'remove'>('remove')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState<AdjustmentReason>(ADJUSTMENT_REASONS[0])
  const [note, setNote] = useState('')

  const current = onHandAt(db, productId, locationId)
  const parsed = parseQty(qty)
  const delta = parsed === null ? null : direction === 'add' ? parsed : -parsed
  const uom = lk.products.get(productId)?.uom ?? ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (delta === null) {
      toast.error('Enter a quantity greater than zero')
      return
    }
    try {
      const { reference, balance } = recordAdjustment({ product_id: productId, location_id: locationId, delta, reason, note })
      toast.success(`${reference} recorded · new balance ${fmtNum(balance)} ${uom}`)
      setQty('')
      setNote('')
    } catch (err) {
      toast.error(err instanceof DbError ? err.message : 'Could not record adjustment')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Product" htmlFor={`${id}-product`}>
        <Select id={`${id}-product`} value={productId} onChange={(e) => setProductId(e.target.value)}>
          {db.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Location" htmlFor={`${id}-loc`}>
        <Select id={`${id}-loc`} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <LocationOptions db={db} />
        </Select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium" id={`${id}-qty-label`}>
          Quantity change
        </span>
        <div className="flex gap-2">
          <Segmented<'add' | 'remove'>
            label="Direction"
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'remove', label: 'Remove', icon: Minus },
              { value: 'add', label: 'Add', icon: Plus },
            ]}
          />
          <Input
            aria-labelledby={`${id}-qty-label`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="flex-1 text-right tabular-nums"
            required
          />
        </div>
      </div>
      <BalancePreview current={current} next={delta === null ? null : current + delta} uom={uom} />
      <Field label="Reason" htmlFor={`${id}-reason`}>
        <Select id={`${id}-reason`} value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
          {ADJUSTMENT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Note" htmlFor={`${id}-note`}>
        <Input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" maxLength={200} />
      </Field>
      <Button type="submit" className="w-full" disabled={delta === null || current + delta < 0}>
        Record adjustment
      </Button>
    </form>
  )
}

function TransferForm() {
  const { db, lk } = useReadyDb()
  const id = useId()
  const [productId, setProductId] = useState(db.products[0]?.id ?? '')
  const [fromId, setFromId] = useState(db.locations[0]?.id ?? '')
  const [toId, setToId] = useState(db.locations[1]?.id ?? '')
  const [qty, setQty] = useState('')

  const available = onHandAt(db, productId, fromId)
  const parsed = parseQty(qty)
  const uom = lk.products.get(productId)?.uom ?? ''
  const same = fromId === toId

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (parsed === null) {
      toast.error('Enter a quantity greater than zero')
      return
    }
    try {
      const ref = transferStock({ product_id: productId, from_location_id: fromId, to_location_id: toId, qty: parsed })
      toast.success(`${ref} moved ${fmtNum(parsed)} ${uom} to ${lk.locations.get(toId)?.code}`)
      setQty('')
    } catch (err) {
      toast.error(err instanceof DbError ? err.message : 'Could not transfer stock')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Product" htmlFor={`${id}-product`}>
        <Select id={`${id}-product`} value={productId} onChange={(e) => setProductId(e.target.value)}>
          {db.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="From location" htmlFor={`${id}-from`}>
        <Select id={`${id}-from`} value={fromId} onChange={(e) => setFromId(e.target.value)}>
          <LocationOptions db={db} />
        </Select>
      </Field>
      <Field label="To location" htmlFor={`${id}-to`} hint={same ? 'Source and destination must differ.' : undefined}>
        <Select id={`${id}-to`} value={toId} onChange={(e) => setToId(e.target.value)} aria-invalid={same}>
          <LocationOptions db={db} />
        </Select>
      </Field>
      <Field label="Quantity" htmlFor={`${id}-qty`}>
        <Input
          id={`${id}-qty`}
          type="number"
          min={1}
          max={available}
          step={1}
          inputMode="numeric"
          placeholder="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="text-right tabular-nums"
          required
        />
      </Field>
      <BalancePreview current={available} next={parsed === null ? null : available - parsed} uom={uom} />
      <Button type="submit" className="w-full" disabled={same || parsed === null || parsed > available}>
        Transfer stock
      </Button>
    </form>
  )
}
