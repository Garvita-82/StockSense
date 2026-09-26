'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Boxes, Layers, LockKeyhole, Mail, Warehouse } from 'lucide-react'
import { AUTH_STORAGE_KEY, DEMO_ACCOUNTS, ROLE_STORAGE_KEY, type OperationalRole } from '@/lib/auth'
import { setCurrentUser } from '@/lib/db'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<OperationalRole>('manager')
  const [email, setEmail] = useState(DEMO_ACCOUNTS.manager.email)
  const [password, setPassword] = useState(DEMO_ACCOUNTS.manager.password)
  const [error, setError] = useState('')
  const account = DEMO_ACCOUNTS[role]

  function chooseRole(nextRole: OperationalRole) {
    setRole(nextRole)
    setEmail(DEMO_ACCOUNTS[nextRole].email)
    setPassword(DEMO_ACCOUNTS[nextRole].password)
    setError('')
  }

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim().toLowerCase() !== account.email || password !== account.password) {
      setError(`Those credentials do not match the ${account.label} demo account.`)
      return
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, 'signed-in')
    window.localStorage.setItem(ROLE_STORAGE_KEY, role)
    setCurrentUser(role === 'manager' ? 'usr_1' : 'usr_2')
    router.replace(role === 'manager' ? '/' : '/warehouse')
  }

  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex xl:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,rgba(59,130,246,0.35),transparent_42%),radial-gradient(ellipse_at_85%_85%,rgba(14,165,233,0.18),transparent_40%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-500 text-white"><Layers className="size-5" /></span>
          <span className="text-lg font-semibold tracking-tight">Stockline</span>
        </div>
        <div className="relative max-w-xl pb-8">
          <h1 className="mb-5 text-4xl leading-tight font-semibold tracking-tight text-blue-200 xl:text-5xl">WAREHOUSE OPERATIONS</h1>
          <p className="max-w-md text-base leading-7 text-slate-300">Choose the workspace that matches your role: monitor the full inventory picture or get today’s physical warehouse work done.</p>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-5 border-t border-white/15 pt-6 text-sm">
            <div><span className="block font-semibold text-white">Inventory Manager</span><span className="mt-1 block text-slate-400">KPIs, policies, and oversight</span></div>
            <div><span className="block font-semibold text-white">Warehouse Staff</span><span className="mt-1 block text-slate-400">Receiving, picking, and counts</span></div>
          </div>
        </div>
        <p className="relative text-xs text-slate-400">Stockline Warehouse Operations</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Layers className="size-5" /></span>
            <span className="text-lg font-semibold tracking-tight">Stockline</span>
          </div>
          <p className="text-sm font-medium text-primary">WELCOME BACK</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">Choose one of the two demo roles to continue.</p>

          <div role="radiogroup" aria-label="Sign-in role" className="mt-6 grid grid-cols-2 gap-3">
            <RoleOption selected={role === 'manager'} title="Inventory Manager" detail="Management & monitoring" icon={Boxes} onClick={() => chooseRole('manager')} />
            <RoleOption selected={role === 'staff'} title="Warehouse Staff" detail="Floor operations & tasks" icon={Warehouse} onClick={() => chooseRole('staff')} />
          </div>

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm font-medium" htmlFor="email">Email address
              <span className="relative mt-2 block">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
              </span>
            </label>
            <label className="block text-sm font-medium" htmlFor="password">Password
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
              </span>
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Sign in as {account.label} <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-5 rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{account.label} demo credentials</p>
            <dl className="mt-2 grid grid-cols-[5rem_1fr] gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Email</dt><dd className="font-medium">{DEMO_ACCOUNTS[role].email}</dd>
              <dt className="text-muted-foreground">Password</dt><dd className="font-medium">{DEMO_ACCOUNTS[role].password}</dd>
            </dl>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Demo access is stored in this browser only. Do not use real or sensitive credentials.</p>
        </div>
      </section>
    </main>
  )
}

function RoleOption({ selected, title, detail, icon: Icon, onClick }: { selected: boolean; title: string; detail: string; icon: typeof Boxes; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className={`rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/40'}`}>
      <Icon className={`mb-2 size-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-4 text-muted-foreground">{detail}</span>
    </button>
  )
}
