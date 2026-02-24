'use client'

import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/calculations'
import { PushNotificationButton } from '@/components/PushNotificationButton'
import {
  createHousehold,
  inviteMember,
  acceptInvite,
  declineInvite,
  leaveHousehold,
  removeMember,
} from './actions'

export type HouseholdData = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export type MemberData = {
  id: string
  user_id: string | null
  invited_email: string | null
  role: string
  status: string
}

export type PendingInviteData = {
  id: string
  household_id: string
  role: string
  households: { name: string } | null
}

export type SharedTxData = {
  id: string
  name: string
  amount: number
  type: string
  category: string
  date: string
  user_id: string
}

export type BudgetData = {
  incomeMonthly: number
  fixedCostsMonthly: number
  safeToSpend: number
}

interface Props {
  userId: string
  userEmail: string
  household: HouseholdData | null
  isOwner: boolean
  members: MemberData[]
  pendingInvites: PendingInviteData[]
  sharedTransactions: SharedTxData[]
  myBudget: BudgetData
}

export default function HouseholdClient({
  userId,
  userEmail,
  household,
  isOwner,
  members,
  pendingInvites,
  sharedTransactions,
  myBudget,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [householdName, setHouseholdName] = useState('')

  function run(action: () => Promise<void>, successMsg?: string) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        await action()
        if (successMsg) setSuccess(successMsg)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  // ── No household ─────────────────────────────────────────────────────────────
  if (!household) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {pendingInvites.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              📨 Uitnodigingen
            </h2>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {inv.households?.name ?? 'Huishouden'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Uitnodiging als {inv.role === 'owner' ? 'eigenaar' : 'lid'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isPending}
                    onClick={() => run(() => acceptInvite(inv.id), 'Uitnodiging geaccepteerd!')}
                    className="btn-primary text-xs"
                  >
                    Accepteren
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => run(() => declineInvite(inv.id), 'Uitnodiging afgewezen.')}
                    className="btn-secondary text-xs"
                  >
                    Afwijzen
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <div className="card p-8 text-center space-y-5">
          <div className="text-5xl">👥</div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Geen huishouden
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Maak een huishouden aan om samen met je partner je budget te beheren.
            </p>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="text"
              placeholder="Naam huishouden (bijv. 'Jan & Marie')"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && householdName.trim()) {
                  const fd = new FormData()
                  fd.append('name', householdName)
                  run(() => createHousehold(fd))
                }
              }}
              className="input flex-1 text-sm"
            />
            <button
              disabled={isPending || !householdName.trim()}
              onClick={() => {
                const fd = new FormData()
                fd.append('name', householdName)
                run(() => createHousehold(fd))
              }}
              className="btn-primary"
            >
              {isPending ? '…' : 'Aanmaken'}
            </button>
          </div>
        </div>

        <PushNotificationButton />
      </div>
    )
  }

  // ── In household ─────────────────────────────────────────────────────────────
  const activeMembers = members.filter((m) => m.status === 'active')
  const pendingMembers = members.filter((m) => m.status === 'pending')
  const sharedExpenses = sharedTransactions.filter((t) => t.type === 'expense')
  const sharedTotalExpenses = sharedExpenses.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            👥 {household.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeMembers.length} {activeMembers.length === 1 ? 'lid' : 'leden'}
            {pendingMembers.length > 0 && ` · ${pendingMembers.length} uitgenodigd`}
          </p>
        </div>
        <button
          disabled={isPending}
          onClick={() => {
            if (!confirm(
              isOwner
                ? 'Huishouden verwijderen? Alle leden worden verwijderd. Dit kan niet ongedaan worden.'
                : 'Huishouden verlaten?'
            )) return
            run(() => leaveHousehold(household.id))
          }}
          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded
                     hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          {isOwner ? '🗑 Verwijderen' : '🚪 Verlaten'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-400">
          {success}
        </div>
      )}

      {/* Members */}
      <div className="card p-4 space-y-1">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Leden
        </h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  m.status === 'active' ? 'bg-emerald-500' :
                  m.status === 'pending' ? 'bg-amber-400' : 'bg-slate-300'
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {m.user_id === userId
                      ? `Jij (${userEmail})`
                      : (m.invited_email ?? 'Onbekend')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {m.role === 'owner' ? 'Eigenaar' : 'Lid'}
                    {m.status === 'pending' ? ' · Uitnodiging verstuurd' : ''}
                  </p>
                </div>
              </div>
              {isOwner && m.user_id !== userId && (
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm('Dit lid verwijderen?')) return
                    run(() => removeMember(m.id, household.id), 'Lid verwijderd.')
                  }}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded
                             hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
                >
                  Verwijderen
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="pt-3 flex gap-2">
            <input
              type="email"
              placeholder="Partner uitnodigen via e-mail"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteEmail.trim()) {
                  const email = inviteEmail
                  setInviteEmail('')
                  run(() => inviteMember(household.id, email), 'Uitnodiging verstuurd!')
                }
              }}
              className="input flex-1 text-sm"
            />
            <button
              disabled={isPending || !inviteEmail.trim()}
              onClick={() => {
                const email = inviteEmail
                setInviteEmail('')
                run(() => inviteMember(household.id, email), 'Uitnodiging verstuurd!')
              }}
              className="btn-primary text-sm"
            >
              {isPending ? '…' : 'Uitnodigen'}
            </button>
          </div>
        )}
      </div>

      {/* My budget */}
      <div className="card p-4">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Mijn budget (maandelijks)
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(myBudget.incomeMonthly)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inkomen</p>
          </div>
          <div>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(myBudget.fixedCostsMonthly)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vaste lasten</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${
              myBudget.safeToSpend >= 0
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(myBudget.safeToSpend)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vrij besteedbaar</p>
          </div>
        </div>
      </div>

      {/* Shared transactions */}
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gedeelde transacties deze maand
          </h2>
          {sharedExpenses.length > 0 && (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(sharedTotalExpenses)}
            </span>
          )}
        </div>

        {sharedTransactions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
            Nog geen gedeelde transacties deze maand.<br />
            <span className="text-xs">
              Voeg transacties toe op de Transacties-pagina en koppel ze aan dit huishouden.
            </span>
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sharedTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {tx.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tx.category} · {tx.user_id === userId ? 'Jij' : 'Partner'}
                  </p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ml-3 ${
                  tx.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Push notifications */}
      <PushNotificationButton />
    </div>
  )
}
