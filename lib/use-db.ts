'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { getDb, getServerDb, subscribe } from './db'
import { lookups } from './queries'

/** Returns the live database, or null during server render / before hydration. */
export function useDb() {
  return useSyncExternalStore(subscribe, getDb, getServerDb)
}

/** For components rendered inside AppShell, which only mounts children once data is loaded. */
export function useReadyDb() {
  const db = useDb()
  if (!db) throw new Error('useReadyDb used before data was loaded')
  const lk = useMemo(() => lookups(db), [db])
  return { db, lk }
}
