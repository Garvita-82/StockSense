'use client'

import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/common/controls'
import { LocationOptions } from '@/components/common/location-options'
import { todayISO } from '@/lib/format'
import { useReadyDb } from '@/lib/use-db'
import { ORDER_CONFIG, createOrder, type OrderKind } from './order-model'

interface LineDraft {
  key: number
  product_id: string
  qty: string
}

export function OrderFormDialog({ kind, open, onOpenChange }: { kind: OrderKind; open: boolean; onOpenChange: (o: boolean) => void }) {
  const config = ORDER_CONFIG[kind]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New {config.singular}</DialogTitle>
          <DialogDescription>Created as Draft. Stock only changes when it is marked {kind === 'receipt' ? 'Received' : 'Done'}.</DialogDescription>
        </DialogHeader>
        {open ? <OrderForm kind={kind} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function OrderForm({ kind, onDone }: { kind: OrderKind; onDone: () => void }) {
  const config = ORDER_CONFIG[kind]
  const { db } = useReadyDb()
  const id = useId()
  const [partner, setPartner] = useState('')
  const [locationId, setLocationId] = useState(db.locations[0]?.id ?? '')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([{ key: 1, product_id: db.products[0]?.id ?? '', qty: '1' }])

  const updateLine = (key: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const ref = createOrder(kind, {
      partner,
      location_id: locationId,
      scheduled_date: date,
      notes,
      lines: lines.map((l) => ({ product_id: l.product_id, qty: Number(l.qty) })),
    })
    if (ref) onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={config.partnerLabel} htmlFor={`${id}-partner`}>
          <Input id={`${id}-partner`} value={partner} onChange={(e) => setPartner(e.target.value)} required autoComplete="organization" />
        </Field>
        <Field label="Scheduled date" htmlFor={`${id}-date`}>
          <Input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label={`${config.locationLabel} location`} htmlFor={`${id}-loc`}>
          <Select id={`${id}-loc`} value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            <LocationOptions db={db} />
          </Select>
        </Field>
        <Field label="Notes" htmlFor={`${id}-notes`}>
          <Input id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">Lines</legend>
        {lines.map((line, i) => (
          <div key={line.key} className="flex items-center gap-2">
            <Select
              aria-label={`Line ${i + 1} product`}
              value={line.product_id}
              onChange={(e) => updateLine(line.key, { product_id: e.target.value })}
              className="flex-1"
            >
              {db.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </Select>
            <Input
              aria-label={`Line ${i + 1} quantity`}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={line.qty}
              onChange={(e) => updateLine(line.key, { qty: e.target.value })}
              className="w-24 text-right tabular-nums"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove line ${i + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((ls) => [...ls, { key: Math.max(0, ...ls.map((l) => l.key)) + 1, product_id: db.products[0]?.id ?? '', qty: '1' }])
            }
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add line
          </Button>
        </div>
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Discard
        </Button>
        <Button type="submit">Create draft</Button>
      </DialogFooter>
    </form>
  )
}
