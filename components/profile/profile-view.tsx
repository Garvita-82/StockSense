'use client'

import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader, Panel } from '@/components/common/layout'
import { Field, Input, Select } from '@/components/common/controls'
import { Delta, LedgerTypeTag } from '@/components/common/status-badge'
import { initials } from '@/components/shell/sidebar'
import { DbError, setCurrentUser, updateUser } from '@/lib/db'
import { fmtDate, fmtDateTime, fmtNum } from '@/lib/format'
import { useReadyDb } from '@/lib/use-db'
import type { User } from '@/lib/types'

export function ProfileView() {
  const { db, lk } = useReadyDb()
  const user = lk.users.get(db.meta.current_user_id) ?? db.users[0]

  return (
    <>
      <PageHeader title="Profile" description="Your details and recent stock activity recorded under your name." />
      <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <div className="flex flex-col gap-6">
          {user ? <ProfileForm key={`${user.id}-${user.name}-${user.email}`} user={user} /> : null}
          <ActingUserPanel />
        </div>
        {user ? <ActivityPanel userId={user.id} /> : null}
      </div>
    </>
  )
}

function ProfileForm({ user }: { user: User }) {
  const { lk } = useReadyDb()
  const id = useId()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const role = lk.roles.get(user.role_id)
  const dirty = name !== user.name || email !== user.email

  return (
    <Panel title="Account" bodyClassName="p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground" aria-hidden="true">
          {initials(user.name)}
        </span>
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">
            {role?.name} · since {fmtDate(user.created_at)}
          </p>
        </div>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          try {
            updateUser(user.id, { name, email })
            toast.success('Profile saved')
          } catch (err) {
            toast.error(err instanceof DbError ? err.message : 'Could not save profile')
          }
        }}
      >
        <Field label="Full name" htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`}>
          <Input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Role" htmlFor={`${id}-role`} hint={role?.description}>
          <Input id={`${id}-role`} value={role?.name ?? ''} readOnly disabled />
        </Field>
        <Button type="submit" disabled={!dirty}>
          Save changes
        </Button>
      </form>
    </Panel>
  )
}

function ActingUserPanel() {
  const { db, lk } = useReadyDb()
  const id = useId()
  return (
    <Panel title="Acting user" description="Operations are recorded in the ledger under this user." bodyClassName="p-4">
      <Field label="Signed in as" htmlFor={`${id}-user`}>
        <Select
          id={`${id}-user`}
          value={db.meta.current_user_id}
          onChange={(e) => {
            setCurrentUser(e.target.value)
            toast.success(`Now acting as ${lk.users.get(e.target.value)?.name}`)
          }}
        >
          {db.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {lk.roles.get(u.role_id)?.name}
            </option>
          ))}
        </Select>
      </Field>
    </Panel>
  )
}

function ActivityPanel({ userId }: { userId: string }) {
  const { db, lk } = useReadyDb()
  const entries = useMemo(
    () => db.ledger.filter((e) => e.user_id === userId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [db, userId],
  )
  const moved = entries.reduce((s, e) => s + Math.abs(e.delta), 0)

  return (
    <Panel title="Your recent activity" description={`${fmtNum(entries.length)} ledger entries · ${fmtNum(moved)} units moved`}>
      {entries.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">No stock movements recorded under this user yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.slice(0, 15).map((e) => {
            const p = lk.products.get(e.product_id)
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <LedgerTypeTag type={e.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span className="font-medium">{p?.name}</span>{' '}
                    <span className="text-muted-foreground">at</span> <span className="font-mono text-xs">{lk.locations.get(e.location_id)?.code}</span>
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {e.reference} · {fmtDateTime(e.timestamp)}
                  </p>
                </div>
                <Delta value={e.delta} />
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
