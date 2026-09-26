import type { Database } from '@/lib/types'

export function LocationOptions({ db }: { db: Database }) {
  return (
    <>
      {db.warehouses.map((w) => (
        <optgroup key={w.id} label={`${w.code} · ${w.name}`}>
          {db.locations
            .filter((l) => l.warehouse_id === w.id)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} · {l.name}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  )
}
