'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowDownToLine,
  ArrowRightLeft,
  Boxes,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  SlidersHorizontal,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDb } from '@/lib/use-db'
import { Brand } from './brand'
import { ThemeToggle } from './theme-toggle'
import type { OperationalRole } from '@/lib/auth'
import { AUTH_STORAGE_KEY, ROLE_STORAGE_KEY } from '@/lib/auth'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  count?: number
}

export function Sidebar({ role }: { role: OperationalRole }) {
  const pathname = usePathname()
  const db = useDb()

  const openReceipts = db?.receipts.filter((r) => r.status === 'Draft' || r.status === 'Expected').length
  const openDeliveries = db?.delivery_orders.filter((d) => d.status === 'Draft' || d.status === 'Ready').length
  const user = db?.users.find((u) => u.id === db.meta.current_user_id)
  const userRole = db?.roles.find((r) => r.id === user?.role_id)

  const primary: NavItem[] = role === 'manager' ? [
    { href: '/', label: 'Manager Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Products & Stock', icon: Boxes },
    { href: '/receipts', label: 'Incoming Receipts', icon: ArrowDownToLine, count: openReceipts },
    { href: '/deliveries', label: 'Delivery Orders', icon: Truck, count: openDeliveries },
    { href: '/transfers', label: 'Internal Transfers', icon: ArrowRightLeft },
    { href: '/adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal },
  ] : [
    { href: '/warehouse', label: 'Staff Dashboard', icon: LayoutDashboard },
    { href: '/receipts', label: 'Receive Goods', icon: ArrowDownToLine, count: openReceipts },
    { href: '/deliveries', label: 'Pick & Deliver', icon: Truck, count: openDeliveries },
    { href: '/products', label: 'Find Stock', icon: Boxes },
    { href: '/transfers', label: 'Move Stock', icon: ArrowRightLeft },
    { href: '/adjustments', label: 'Stock Counts', icon: SlidersHorizontal },
  ]
  const secondary: NavItem[] = role === 'manager' ? [
    { href: '/history', label: 'Move History & Ledger', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/profile', label: 'Profile', icon: UserRound },
  ] : [
    { href: '/history', label: 'Move History', icon: History },
  ]

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  function signOut() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    window.localStorage.removeItem(ROLE_STORAGE_KEY)
    window.location.assign('/login')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-16">
        <Brand />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <div>
          <p className="px-2.5 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Operations
          </p>
          <ul className="flex flex-col gap-0.5">
            {primary.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-md px-2.5 text-[15px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon className={cn('size-[18px]', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.count ? (
                      <span className="min-w-6 rounded bg-muted px-1.5 py-0.5 text-center text-xs font-medium text-muted-foreground tabular-nums">
                        {item.count}
                        <span className="sr-only"> open</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="border-t border-sidebar-border pt-4">
          <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground/80 uppercase">
            Supporting
          </p>
          <ul className="flex flex-col">
            {secondary.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      active
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <item.icon className="size-3.5" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <div className="flex items-center gap-2 border-t border-sidebar-border p-3">
        <Link
          href={role === 'manager' ? '/profile' : '/warehouse'}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
            {user ? initials(user.name) : '--'}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-medium">{user?.name ?? 'Loading'}</span>
            <span className="truncate text-[11px] text-muted-foreground">{userRole?.name ?? ''}</span>
          </span>
        </Link>
        <ThemeToggle />
        <button
          type="button"
          onClick={signOut}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}
