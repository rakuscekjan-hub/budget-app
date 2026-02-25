'use client'

import { useState, useTransition, useRef } from 'react'
import { formatCurrency } from '@/lib/calculations'
import { createGoal, updateGoal, depositGoal, deleteGoal } from './actions'
import { differenceInDays, parseISO, format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Goal {
  id: string; name: string; icon: string; color: string
  target_amount: number; current_amount: number; deadline: string | null
}

const ICONS = ['🎯','🏠','🚗','✈️','💍','📱','🎓','💻','🏖️','🎸','🐶','👶','💪','🌍']
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

export default function SavingsClient({ goals: initial }: { goals: Goal[] }) {
  const [goals, setGoals] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const totalTarget  = goals.reduce((s, g) => s + Number(g.target_amount), 0)
  const totalSaved   = goals.reduce((s, g) => s + Number(g.current_amount), 0)

  async function handleCreate(fd: FormData) {
    try { await createGoal(fd); setShowForm(false); location.reload() }
    catch (e) { setError((e as Error).message) }
  }
  async function handleUpdate(fd: FormData) {
    if (!editGoal) return
    try { await updateGoal(editGoal.id, fd); setEditGoal(null); location.reload() }
    catch (e) { setError((e as Error).message) }
  }
  async function handleDeposit() {
    if (!depositGoalId) return
    const amt = parseFloat(depositAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) { setError('Ongeldig bedrag'); return }
    start(async () => {
      try { await depositGoal(depositGoalId, amt); setDepositGoalId(null); setDepositAmount(''); location.reload() }
      catch (e) { setError((e as Error).message) }
    })
  }
  async function handleDelete(id: string) {
    if (!confirm('Spaardoel verwijderen?')) return
    try { await deleteGoal(id); location.reload() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-xl">
          {error} <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Totaal overzicht */}
      {goals.length > 0 && (
        <div className="card p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Totaal gespaard</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(totalSaved)} / {formatCurrency(totalTarget)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all"
                 style={{ width: `${totalTarget > 0 ? Math.min((totalSaved/totalTarget)*100,100) : 0}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">
            {totalTarget > 0 ? Math.round((totalSaved/totalTarget)*100) : 0}% bereikt
          </p>
        </div>
      )}

      {/* Add button */}
      {!showForm && !editGoal && (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full">+ Spaardoel toevoegen</button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Nieuw spaardoel</h3>
          <GoalForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Goal cards */}
      {goals.length === 0 ? (
        <div className="card p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-slate-500 text-sm">Nog geen spaardoelen. Voeg er een toe!</p>
        </div>
      ) : (
        goals.map(g => {
          const pct = Number(g.target_amount) > 0 ? Math.min((Number(g.current_amount)/Number(g.target_amount))*100,100) : 0
          const done = Number(g.current_amount) >= Number(g.target_amount)
          const daysLeft = g.deadline ? differenceInDays(parseISO(g.deadline), new Date()) : null

          return (
            <div key={g.id}>
              {editGoal?.id === g.id ? (
                <div className="card p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Bewerken</h3>
                  <GoalForm goal={editGoal} onSubmit={handleUpdate} onCancel={() => setEditGoal(null)} />
                </div>
              ) : (
                <div className="card p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                           style={{ background: g.color + '22' }}>
                        {g.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{g.name}</p>
                        {g.deadline && (
                          <p className={`text-xs ${daysLeft !== null && daysLeft < 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {daysLeft !== null && daysLeft > 0
                              ? `${daysLeft} dagen over`
                              : daysLeft === 0 ? 'Deadline vandaag!'
                              : 'Deadline verstreken'}
                            {' '}· {format(parseISO(g.deadline), 'd MMM yyyy', { locale: nl })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditGoal(g)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">✏️</button>
                      <button onClick={() => handleDelete(g.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sm">🗑️</button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(Number(g.current_amount))}</span>
                      <span className="text-slate-400">{formatCurrency(Number(g.target_amount))}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full transition-all"
                           style={{ width: `${pct}%`, background: done ? '#10b981' : g.color }} />
                    </div>
                    <p className="text-xs text-right mt-0.5" style={{ color: done ? '#10b981' : g.color }}>
                      {done ? '✓ Bereikt!' : `${Math.round(pct)}%`}
                    </p>
                  </div>

                  {/* Deposit */}
                  {!done && (
                    depositGoalId === g.id ? (
                      <div className="flex gap-2">
                        <input
                          value={depositAmount}
                          onChange={e => setDepositAmount(e.target.value)}
                          placeholder="Bedrag"
                          className="input flex-1 text-sm py-2"
                          type="number" min="0.01" step="0.01"
                          autoFocus
                        />
                        <button onClick={handleDeposit} disabled={isPending}
                                className="btn-primary text-sm px-3 py-2">
                          {isPending ? '…' : '✓'}
                        </button>
                        <button onClick={() => setDepositGoalId(null)} className="btn-secondary text-sm px-3 py-2">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setDepositGoalId(g.id)}
                              className="w-full py-2 text-sm font-medium rounded-xl border-2 transition"
                              style={{ borderColor: g.color, color: g.color }}>
                        + Bedrag bijschrijven
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function GoalForm({ goal, onSubmit, onCancel }: {
  goal?: Goal
  onSubmit: (fd: FormData) => Promise<void>
  onCancel: () => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [icon, setIcon] = useState(goal?.icon ?? '🎯')
  const [color, setColor] = useState(goal?.color ?? '#6366f1')

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
      {/* Icon picker */}
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

      {/* Color picker */}
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
        <input name="name" required defaultValue={goal?.name} className="input" placeholder="bijv. Vakantie Spanje" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Doelbedrag (€) *</label>
          <input name="target_amount" type="number" required min="1" step="0.01"
                 defaultValue={goal?.target_amount} className="input" placeholder="1000" />
        </div>
        {goal && (
          <div>
            <label className="label">Huidig saldo (€)</label>
            <input name="current_amount" type="number" min="0" step="0.01"
                   defaultValue={goal.current_amount} className="input" placeholder="0" />
          </div>
        )}
        <div>
          <label className="label">Deadline</label>
          <input name="deadline" type="date" defaultValue={goal?.deadline ?? ''} className="input" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">{goal ? 'Opslaan' : 'Aanmaken'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Annuleer</button>
      </div>
    </form>
  )
}
