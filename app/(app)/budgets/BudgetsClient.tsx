'use client'

import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/calculations'
import { CATEGORY_TREE, getCategoryDef } from '@/types/database'
import { createBudget, deleteBudget } from './actions'

export interface BudgetWithSpent {
  id: string
  category: string
  amount: number
  period: string
  spent: number // uitgegeven deze maand/week
}

export default function BudgetsClient({ budgets }: { budgets: BudgetWithSpent[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: CATEGORY_TREE[0].name, amount: '', period: 'monthly' })

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try { await action(); setShowForm(false) }
      catch (e) { setError((e as Error).message) }
    })
  }

  function handleSave() {
    const fd = new FormData()
    fd.append('category', form.category)
    fd.append('amount', form.amount)
    fd.append('period', form.period)
    run(() => createBudget(fd))
  }

  // Sorteer: eerst over-budget, dan bijna, dan OK
  const sorted = [...budgets].sort((a, b) => {
    const ra = a.amount > 0 ? a.spent / a.amount : 0
    const rb = b.amount > 0 ? b.spent / b.amount : 0
    return rb - ra
  })

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent  = budgets.reduce((s, b) => s + b.spent, 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Budgetten</h1>
          {budgets.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {formatCurrency(totalSpent)} van {formatCurrency(totalBudget)} gebruikt
            </p>
          )}
        </div>
        <button onClick={() => { setShowForm(true); setError(null) }} className="btn-primary">+ Budget</button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {budgets.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <div className="text-5xl">🎯</div>
          <p className="text-slate-500 dark:text-slate-400">Nog geen budgetten ingesteld. Stel een maandlimiet per categorie in.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Eerste budget instellen</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(b => {
            const cat = getCategoryDef(b.category)
            const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
            const remaining = b.amount - b.spent
            const isOver   = b.spent > b.amount
            const isNear   = !isOver && pct >= 80

            return (
              <div key={b.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                         style={{ background: cat.color + '22' }}>
                      {cat.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{b.category}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {b.period === 'monthly' ? 'Per maand' : 'Per week'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${isOver ? 'text-red-600 dark:text-red-400' : isNear ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {formatCurrency(b.spent)}
                      <span className="font-normal text-slate-400"> / {formatCurrency(b.amount)}</span>
                    </p>
                    <p className={`text-xs ${isOver ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {isOver ? `${formatCurrency(Math.abs(remaining))} over budget` : `${formatCurrency(remaining)} over`}
                    </p>
                  </div>
                </div>

                {/* Voortgangsbalk */}
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-red-500' : isNear ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {(isOver || isNear) && (
                  <p className={`text-xs font-medium ${isOver ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {isOver ? '⚠️ Budget overschreden' : '⚡ Bijna op budget'}
                  </p>
                )}

                <button
                  onClick={() => { if (!confirm('Budget verwijderen?')) return; run(() => deleteBudget(b.id)) }}
                  className="text-xs text-slate-400 hover:text-red-500 transition"
                >
                  Verwijderen
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nieuw budget</h2>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div>
              <label className="label">Categorie</label>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {CATEGORY_TREE.map(c => (
                  <button key={c.name} type="button"
                          onClick={() => setForm(f => ({...f, category: c.name}))}
                          className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                            form.category === c.name
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}>
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] font-medium text-center leading-tight">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Bedrag (€)</label>
              <input className="input" type="number" step="0.01" min="1" value={form.amount}
                     onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="500" />
            </div>

            <div>
              <label className="label">Periode</label>
              <div className="flex gap-2">
                {[{v:'monthly',l:'Per maand'},{v:'weekly',l:'Per week'}].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setForm(f => ({...f, period: opt.v}))}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                            form.period === opt.v ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700'
                          }`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuleren</button>
              <button onClick={handleSave} disabled={isPending || !form.amount} className="btn-primary flex-1">
                {isPending ? '…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
