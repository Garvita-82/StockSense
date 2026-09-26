'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, Moon, RotateCcw, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader, Panel } from '@/components/common/layout'
import { Input, Segmented, TableShell, Th, cellClass, rowClass, theadClass } from '@/components/common/controls'
import { DbError, STORAGE_KEY, exportDatabase, getLastWriteError, resetDatabase, setReorderThreshold } from '@/lib/db'
import { fmtDateTime, fmtNum } from '@/lib/format'
import { onHandByProductWarehouse } from '@/lib/queries'
import { setTheme, useTheme, type Theme } from '@/lib/theme'
import { TABLE_NAMES } from '@/lib/types'
import { useReadyDb } from '@/lib/use-db'
import { cn } from '@/lib/utils'

export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" description="Appearance, reorder thresholds and local data management." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <ThresholdsPanel />
        <div className="flex flex-col gap-6">
          <AppearancePanel />
          <DataPanel />
        </div>
      </div>
    </>
  )
}

function AppearancePanel() {
  const theme = useTheme() ?? 'light'
  return (
    <Panel title="Appearance" bodyClassName="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-medium">Color theme</p>
        <p className="text-xs text-muted-foreground">Saved on this device</p>
      </div>
      <Segmented<Theme>
        label="Color theme"
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'light', label: 'Light', icon: Sun },
          { value: 'dark', label: 'Dark', icon: Moon },
        ]}
      />
    </Panel>
  )
}

function ThresholdsPanel() {
  const { db, lk } = useReadyDb()
  const totals = useMemo(() => onHandByProductWarehouse(db), [db])
  const minFor = (p: string, w: string) => db.reorder_thresholds.find((t) => t.product_id === p && t.warehouse_id === w)?.min_qty ?? 0

  return (
    <Panel title="Reorder thresholds" description="Minimum on-hand quantity per product per warehouse. Below this, the product is flagged as low stock.">
      <TableShell caption="Reorder thresholds">
        <thead className={theadClass}>
          <tr>
            <Th>Product</Th>
            {db.warehouses.map((w) => (
              <Th key={w.id} align="right">
                {w.code} <span className="font-normal normal-case">on hand / min</span>
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {db.products.map((p) => (
            <tr key={p.id} className={rowClass}>
              <td className={cellClass}>
                <div className="font-medium">{p.name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {p.sku} · {lk.categories.get(p.category_id)?.name}
                </div>
              </td>
              {db.warehouses.map((w) => {
                const onHand = totals.get(`${p.id}:${w.id}`) ?? 0
                const min = minFor(p.id, w.id)
                return (
                  <td key={w.id} className={cn(cellClass, 'text-right')}>
                    <div className="flex items-center justify-end gap-2">
                      <span className={cn('font-mono text-sm tabular-nums', onHand < min ? 'text-warning' : 'text-muted-foreground')}>
                        {fmtNum(onHand)}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <ThresholdInput
                        key={`${p.id}-${w.id}-${min}`}
                        initial={min}
                        label={`Minimum for ${p.sku} in ${w.code}`}
                        onCommit={(v) => {
                          try {
                            setReorderThreshold(p.id, w.id, v)
                            toast.success(`${p.sku} minimum in ${w.code} set to ${fmtNum(v)}`)
                          } catch (err) {
                            toast.error(err instanceof DbError ? err.message : 'Could not save threshold')
                          }
                        }}
                      />
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Panel>
  )
}

function ThresholdInput({ initial, label, onCommit }: { initial: number; label: string; onCommit: (v: number) => void }) {
  const [value, setValue] = useState(String(initial))
  const commit = () => {
    const n = Number(value)
    if (value === '' || !Number.isInteger(n) || n < 0) {
      setValue(String(initial))
      toast.error('Minimum must be a whole number of 0 or more')
      return
    }
    if (n !== initial) onCommit(n)
  }
  return (
    <Input
      aria-label={label}
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
          e.preventDefault()
          commit()
        }
      }}
      className="h-8 w-20 text-right font-mono tabular-nums"
    />
  )
}

function DataPanel() {
  const { db } = useReadyDb()
  const [confirming, setConfirming] = useState(false)
  const writeError = getLastWriteError()

  const sizeKb = useMemo(() => {
    try {
      return (new Blob([JSON.stringify(db)]).size / 1024).toFixed(1)
    } catch {
      return '?'
    }
  }, [db])

  const download = () => {
    const blob = new Blob([exportDatabase()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stockline-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel title="Local data" description={`Stored in this browser under "${STORAGE_KEY}"`} bodyClassName="flex flex-col gap-4 p-4">
      {writeError ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          Last save failed: {writeError}. Changes are kept in memory until the page is closed.
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Seeded</dt>
        <dd className="text-right tabular-nums">{fmtDateTime(db.meta.seeded_at)}</dd>
        <dt className="text-muted-foreground">Schema version</dt>
        <dd className="text-right tabular-nums">{db.meta.schema_version}</dd>
        <dt className="text-muted-foreground">Size</dt>
        <dd className="text-right tabular-nums">{sizeKb} KB</dd>
      </dl>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-xs">
          <caption className="sr-only">Row counts per table</caption>
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-1.5 text-left font-medium">
                Table
              </th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">
                Rows
              </th>
            </tr>
          </thead>
          <tbody>
            {TABLE_NAMES.map((t) => (
              <tr key={t} className="border-t border-border">
                <td className="px-3 py-1.5 font-mono">{t}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">{db[t].length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
        <Button variant="outline" onClick={download} className="flex-1">
          <Download data-icon="inline-start" aria-hidden="true" />
          Export JSON
        </Button>
        <Button variant="destructive" onClick={() => setConfirming(true)} className="flex-1">
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          Reset to sample data
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data?</DialogTitle>
            <DialogDescription>
              This replaces every table, including the ledger, with the original sample data. Receipts, deliveries and
              adjustments you created will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Keep data
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDatabase()
                setConfirming(false)
                toast.success('Data reset to sample')
              }}
            >
              Reset data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
