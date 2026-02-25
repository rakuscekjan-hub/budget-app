'use client'

import { useState, useRef, useTransition } from 'react'
import { formatCurrency } from '@/lib/calculations'
import { createSubscription, updateSubscription, toggleSubscription, deleteSubscription } from './actions'
import { format, parseISO, differenceInDays } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Sub {
  id: string; name: string; icon: string; color: string
  amount: number; billing_cycle: string; next_billing_date: string | null
  category: string; is_active: boolean
}

const ICONS = ['📱','📺','🎵','🎮','☁️','📰','🏋️','🎓','🔒','💬','🛒','✈️','🎬','📦']
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']
const CYCLES: Record<string, { label: string; months: number }> = {
  weekly:    { label: 'Per week',    months: 1/4.33 },
  monthly:   { label: 'Per maand',   months: 1 },
  quarterly: { label: 'Per kwartaal', months: 3 },
  yearly:    { label: 'Per jaar',    months: 12 },
}

function toMonthly(amount: number, cycle: string) {
  const m = CYCLES[cycle]?.months ?? 1
  return amount / m
}

export default function SubscriptionsClient({ subs: initial }: { subs: Sub[] }) {
  const [subs, setSubs] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editSub, setEditSub] = useState<Sub | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  const active   = subs.filter(s => s.is_active)
  const inactive = subs.filter(s => !s.is_active)
  const monthlyTotal = active.reduce((s, sub) => s + toMonthly(Number(sub.amount), sub.billing_cycle), 0)
  const yearlyTotal  = monthlyTotal * 12

  async function handleCreate(fd: FormData) {
    try { await createSubscription(fd); setShowForm(false); location.reload() }
    catch (e) { setError((e as Error).message) }
  }
  async function handleUpdate(fd: FormData) {
    if (!editSub) return
    try { await updateSubscription(editSub.id, fd); setEditSub(null); location.reload() }
    catch (e) { setError((e as Error).message) }
  }
  async function handleToggle(id: string, isActive: boolean) {
    start(async () => {
      try { await toggleSubscription(id, isActive); location.reload() }
      catch (e) { setError((e as Error).message) }
    })
  }
  async function handleDelete(id: string) {
    if (!confirm('Abonnement verwijderen?')) return
    try { await deleteSubscription(id); location.reload() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-xl">
          {error} <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Maandoverzicht */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(monthlyTotal)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Per maand</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(yearlyTotal)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Per jaar</p>
          </div>
        </div>
      </div>

      {/* Add button */}
      {!showForm && !editSub && (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full">+ Abonnement toevoegen</button>
      )}

      {showForm && (
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Nieuw abonnement</h3>
          <SubForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Active subs */}
      {active.length === 0 && !showForm ? (
        <div className="card p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
          <p className="text-3xl mb-2">📱</p>
          <p className="text-slate-500 text-sm">Geen actieve abonnementen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(sub => (
            <SubCard key={sub.id} sub={sub} onEdit={setEditSub} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Edit form */}
      {editSub && (
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Bewerken</h3>
          <SubForm sub={editSub} onSubmit={handleUpdate} onCancel={() => setEditSub(null)} />
        </div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div>
          <button onClick={() => setShowInactive(v => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium">
            {showInactive ? '▲' : '▼'} {inactive.length} gepauzeerde abonnementen
          </button>
          {showInactive && (
            <div className="space-y-2 mt-2">
              {inactive.map(sub => (
                <SubCard key={sub.id} sub={sub} onEdit={setEditSub} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubCard({ sub, onEdit, onToggle, onDelete }: {
  sub: Sub
  onEdit: (s: Sub) => void
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}) {
  const monthly = toMonthly(Number(sub.amount), sub.billing_cycle)
  const daysUntil = sub.next_billing_date
    ? differenceInDays(parseISO(sub.next_billing_date), new Date())
    : null

  return (
    <div className={`card p-4 flex items-center gap-3 ${!sub.is_active ? 'opacity-50' : ''}`}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
           style={{ background: sub.color + '22' }}>
        {sub.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{sub.name}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">{CYCLES[sub.billing_cycle]?.label}</span>
          {sub.next_billing_date && (
            <span className={`text-xs ${daysUntil !== null && daysUntil <= 7 ? 'text-amber-500 font-medium' : 'text-slate-400'}`}>
              · {daysUntil === 0 ? 'vandaag!' : daysUntil === 1 ? 'morgen' : `${daysUntil}d`}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 mr-2">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(Number(sub.amount))}</p>
        {sub.billing_cycle !== 'monthly' && (
          <p className="text-xs text-slate-400">{formatCurrency(monthly)}/m</p>
        )}
      </div>
      <div className="flex gap-0.5">
        <button onClick={() => onEdit(sub)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">✏️</button>
        <button onClick={() => onToggle(sub.id, !sub.is_active)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">
          {sub.is_active ? '⏸' : '▶️'}
        </button>
        <button onClick={() => onDelete(sub.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sm">🗑️</button>
      </div>
    </div>
  )
}

function SubForm({ sub, onSubmit, onCancel }: {
  sub?: Sub
  onSubmit: (fd: FormData) => Promise<void>
  onCancel: () => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [icon, setIcon]   = useState(sub?.icon  ?? '📱')
  const [color, setColor] = useState(sub?.color ?? '#6366f1')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    fd.set('icon', icon)
    fd.set('color', color)
    await onSubmit(fd)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Icoon</label>
        <div className="flex flex-wrap gap-1.5">
          {ICONS.map(i => (
            <button key={i} type="button" onClick={() => setIcon(i)}
                    className={`text-xl p-1.5 rounded-xl border-2 transition ${icon === i ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
              {i}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Kleur</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c }} />
          ))}
        </div>
      </div>
      <div>
        <label className="label">Naam *</label>
        <input name="name" required defaultValue={sub?.name} className="input" placeholder="bijv. Netflix" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Bedrag (€) *</label>
          <input name="amount" type="number" required min="0.01" step="0.01"
                 defaultValue={sub?.amount} className="input" placeholder="9.99" />
        </div>
        <div>
          <label className="label">Cyclus</label>
          <select name="billing_cycle" defaultValue={sub?.billing_cycle ?? 'monthly'} className="input">
            {Object.entries(CYCLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Volgende betaling</label>
          <input name="next_billing_date" type="date" defaultValue={sub?.next_billing_date ?? ''} className="input" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">{sub ? 'Opslaan' : 'Toevoegen'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Annuleer</button>
      </div>
    </form>
  )
}
