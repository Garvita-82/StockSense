'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Toaster } from 'sonner'
import { useDb } from '@/lib/use-db'
import { useTheme } from '@/lib/theme'
import { Sidebar } from './sidebar'
import { Brand } from './brand'
import { AUTH_STORAGE_KEY, ROLE_STORAGE_KEY, isOperationalRole, type OperationalRole } from '@/lib/auth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const db = useDb()
  const theme = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)
  const [authReady, setAuthReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [authRole, setAuthRole] = useState<OperationalRole | null>(null)
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    const signedIn = window.localStorage.getItem(AUTH_STORAGE_KEY) === 'signed-in'
    const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY)
    const role = isOperationalRole(storedRole) ? storedRole : null
    setAuthRole(role)
    setAuthenticated(signedIn && role !== null)
    setAuthReady(true)
    if ((!signedIn || !role) && !isLoginPage) {
      const next = `${window.location.pathname}${window.location.search}`
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    } else if (signedIn && role && !isLoginPage) {
      const staffPaths = ['/warehouse', '/receipts', '/deliveries', '/products', '/adjustments', '/history', '/transfers']
      if (role === 'staff' && !staffPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) router.replace('/warehouse')
      if (role === 'manager' && pathname === '/warehouse') router.replace('/')
    }
  }, [isLoginPage, pathname, router])

  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  if (isLoginPage) return <>{children}</>
  if (!authReady || !authenticated) return <LoginLoadingState />
  if (!authRole) return <LoginLoadingState />

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <Sidebar role={authRole} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-64 border-r border-sidebar-border bg-sidebar">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <Sidebar role={authRole} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Brand />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{db ? children : <LoadingState />}</div>
        </main>
      </div>

      <Toaster theme={theme ?? 'light'} position="bottom-right" richColors closeButton />
    </div>
  )
}

function LoginLoadingState() {
  return <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Checking your session…</div>
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading inventory data</span>
      <div className="h-7 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
    </div>
  )
}
