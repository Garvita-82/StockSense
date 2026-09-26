'use client'

import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'
export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

type Accessor<T> = (row: T) => string | number

export function useTable<T, K extends string>(
  rows: T[],
  opts: {
    sortBy: Record<K, Accessor<T>>
    searchText: (row: T) => string
    initialSort: SortState<K>
    filter?: (row: T) => boolean
  },
) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState<K>>(opts.initialSort)
  const { sortBy, searchText, filter } = opts

  const result = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = rows.filter((r) => (!filter || filter(r)) && (!q || searchText(r).toLowerCase().includes(q)))
    const get = sortBy[sort.key]
    const factor = sort.dir === 'asc' ? 1 : -1
    return filtered.sort((a, b) => {
      const av = get(a)
      const bv = get(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * factor
    })
    // sortBy/searchText are expected to be stable per render of rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, sort, filter])

  const toggleSort = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  return { rows: result, query, setQuery, sort, toggleSort }
}
