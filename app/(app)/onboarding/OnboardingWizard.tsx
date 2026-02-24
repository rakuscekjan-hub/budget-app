'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FREQUENCY_LABELS, EXPENSE_CATEGORIES } from '@/types/database'
import type { Frequency } from '@/types/database'

type Step = 'welcome' | 'name' | 'income' | 'expenses' | 'done'

interface IncomeEntry { name: string; amount: string; frequency: Frequency }
interface ExpenseEntry {
  name: string; amount: string; frequency: Frequency
  category: string; necessary: boolean; cancellable: boolean
}

const SUGGESTED_INCOMES = ['Salaris', 'Freelance', 'Uitkering', 'Pensioen', 'Bijbaan', 'Alimentatie']
const SUGGESTED_EXPENSES = [
  { name: 'Huur/hypotheek', category: 'Wonen', necessary: true, cancellable: false },
  { name: 'Zorgverzekering', category: 'Verzekeringen', necessary: true, cancellable: false },
  { name: 'Netflix', category: 'Abonnementen', necessary: false, cancellable: true },
  { name: 'Spotify', category: 'Abonnementen', necessary: false, cancellable: true },
  { name: 'Energie', category: 'Wonen', necessary: true, cancellable: false },
  { name: 'Internet', category: 'Wonen', necessary: true, cancellable: false },
  { name: 'Telefoonabonnement', category: 'Abonnementen', necessary: true, cancellable: true },
  { name: 'Gym', category: 'Sport & Hobby', necessary: false, cancellable: true },
]

export default function OnboardingWizard({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('welcome')
  const [displayName, setDisplayName] = useState('')
  const [incomes, setIncomes] = useState<IncomeEntry[]>([
    { name: 'Salaris', amount: '', frequency: 'monthly' },
  ])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addIncome() {
    setIncomes([...incomes, { name: '', amount: '', frequency: 'monthly' }])
  }
  function updateIncome(i: number, field: keyof IncomeEntry, val: string) {
    const next = [...incomes]
    next[i] = { ...next[i], [field]: val }
    setIncomes(next)
  }
  function removeIncome(i: number) {
    setIncomes(incomes.filter((_, idx) => idx !== i))
  }
  function addSuggestedExpense(sug: typeof SUGGESTED_EXPENSES[0]) {
    setExpenses([...expenses, { ...sug, amount: '', frequency: 'monthly' }])
  }
  function addExpense() {
    setExpenses([
      ...expenses,
      { name: '', amount: '', frequency: 'monthly', category: 'Overig', necessary: true, cancellable: false },
    ])
  }
  function updateExpense(i: number, field: keyof ExpenseEntry, val: string | boolean) {
    const next = [...expenses]
    next[i] = { ...next[i], [field]: val }
    setExpenses(next)
  }
  function removeExpense(i: number) {
    setExpenses(expenses.filter((_, idx) => idx !== i))
  }

  async function finish() {
    setLoading(true)
    setError(null)

    try {
      // 1. Upsert profile — gebruik onConflict voor idempotentie
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: userId,
            display_name: displayName.trim() || null,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      if (profileError) throw new Error(`Profiel opslaan mislukt: ${profileError.message}`)

      // 2. Insert geldige inkomsten
      const validIncomes = incomes.filter((i) => i.name.trim() && parseFloat(i.amount) > 0)
      if (validIncomes.length > 0) {
        const { error: incError } = await supabase.from('incomes').insert(
          validIncomes.map((i) => ({
            user_id: userId,
            name: i.name.trim(),
            amount: parseFloat(i.amount),
            frequency: i.frequency,
          }))
        )
        if (incError) throw new Error(`Inkomsten opslaan mislukt: ${incError.message}`)
      }

      // 3. Insert geldige uitgaven
      const validExpenses = expenses.filter((e) => e.name.trim() && parseFloat(e.amount) > 0)
      if (validExpenses.length > 0) {
        const { error: expError } = await supabase.from('expenses').insert(
          validExpenses.map((e) => ({
            user_id: userId,
            name: e.name.trim(),
            amount: parseFloat(e.amount),
            frequency: e.frequency,
            category: e.category,
            necessary: e.necessary,
            cancellable: e.cancellable,
            is_active: true,
          }))
        )
        if (expError) throw new Error(`Uitgaven opslaan mislukt: ${expError.message}`)
      }

      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const STEPS: Step[] = ['welcome', 'name', 'income', 'expenses']
  const stepIndex = STEPS.indexOf(step)

  if (step === 'done') {
    return (
      <div className="card p-8 max-w-sm w-full text-center mx-4">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">Je bent klaar!</h2>
        <p className="text-slate-500 text-sm mb-6">
          Je budget is opgezet. Bekijk nu je safe-to-spend op het dashboard.
        </p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
          Naar dashboard →
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-4">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              stepIndex >= i ? 'bg-brand-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl mb-4 flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <div>
            <p className="font-medium">Er ging iets mis</p>
            <p className="text-red-600 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Step: Welcome */}
      {step === 'welcome' && (
        <div className="card p-6 text-center">
          <div className="text-5xl mb-4">💰</div>
          <h1 className="text-2xl font-bold mb-2">Welkom bij BudgetApp</h1>
          <p className="text-slate-500 text-sm mb-6">
            In 2 minuten weet je exact hoeveel geld je vrij kunt besteden elke maand.
          </p>
          <ul className="text-left text-sm text-slate-600 space-y-2 mb-6">
            <li className="flex gap-2"><span className="text-brand-500">✓</span> Vul je inkomsten in</li>
            <li className="flex gap-2"><span className="text-brand-500">✓</span> Voeg vaste lasten toe</li>
            <li className="flex gap-2"><span className="text-brand-500">✓</span> Zie direct je vrij besteedbaar bedrag</li>
          </ul>
          <button onClick={() => setStep('name')} className="btn-primary w-full">
            Start in 2 minuten →
          </button>
        </div>
      )}

      {/* Step: Name */}
      {step === 'name' && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-1">Hoe mogen we je noemen?</h2>
          <p className="text-slate-500 text-sm mb-4">Optioneel — voor de persoonlijke begroeting.</p>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input mb-4"
            placeholder="Jouw naam (optioneel)"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setStep('income')} className="btn-primary flex-1">
              Volgende →
            </button>
            <button onClick={() => setStep('welcome')} className="btn-secondary">
              Terug
            </button>
          </div>
        </div>
      )}

      {/* Step: Income */}
      {step === 'income' && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-1">Wat zijn je inkomsten?</h2>
          <p className="text-slate-500 text-sm mb-4">Voeg alle inkomstenbronnen toe.</p>

          <div className="space-y-3 mb-4">
            {incomes.map((inc, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inc.name}
                    onChange={(e) => updateIncome(i, 'name', e.target.value)}
                    className="input flex-1"
                    placeholder="Omschrijving"
                    list="income-suggestions"
                  />
                  {incomes.length > 1 && (
                    <button
                      onClick={() => removeIncome(i)}
                      className="text-slate-400 hover:text-red-500 px-2 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <datalist id="income-suggestions">
                  {SUGGESTED_INCOMES.map((s) => <option key={s} value={s} />)}
                </datalist>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={inc.amount}
                    onChange={(e) => updateIncome(i, 'amount', e.target.value)}
                    className="input"
                    placeholder="Bedrag €"
                    min="0.01"
                    step="0.01"
                  />
                  <select
                    value={inc.frequency}
                    onChange={(e) => updateIncome(i, 'frequency', e.target.value as Frequency)}
                    className="input"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addIncome} className="btn-secondary w-full mb-4 text-sm">
            + Inkomen toevoegen
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('expenses')}
              disabled={!incomes.some((i) => i.name.trim() && parseFloat(i.amount) > 0)}
              className="btn-primary flex-1"
            >
              Volgende →
            </button>
            <button onClick={() => setStep('name')} className="btn-secondary">
              Terug
            </button>
          </div>
        </div>
      )}

      {/* Step: Expenses */}
      {step === 'expenses' && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-1">Wat zijn je vaste lasten?</h2>
          <p className="text-slate-500 text-sm mb-3">
            Huur, abonnementen, verzekeringen, etc.
          </p>

          {/* Snelle suggesties */}
          <div className="mb-4">
            <p className="text-xs text-slate-500 font-medium mb-2">Snel toevoegen:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_EXPENSES.filter(
                (s) => !expenses.some((e) => e.name === s.name)
              ).map((sug) => (
                <button
                  key={sug.name}
                  onClick={() => addSuggestedExpense(sug)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs rounded-lg transition"
                >
                  + {sug.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
            {expenses.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">
                Nog geen uitgaven. Gebruik de suggesties hierboven of voeg handmatig toe.
              </p>
            )}
            {expenses.map((exp, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exp.name}
                    onChange={(e) => updateExpense(i, 'name', e.target.value)}
                    className="input flex-1"
                    placeholder="Omschrijving"
                  />
                  <button
                    onClick={() => removeExpense(i)}
                    className="text-slate-400 hover:text-red-500 px-2 transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={exp.amount}
                    onChange={(e) => updateExpense(i, 'amount', e.target.value)}
                    className="input"
                    placeholder="Bedrag €"
                    min="0.01"
                    step="0.01"
                  />
                  <select
                    value={exp.frequency}
                    onChange={(e) => updateExpense(i, 'frequency', e.target.value as Frequency)}
                    className="input"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <select
                  value={exp.category}
                  onChange={(e) => updateExpense(i, 'category', e.target.value)}
                  className="input text-xs"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button onClick={addExpense} className="btn-secondary w-full mb-4 text-sm">
            + Uitgave handmatig toevoegen
          </button>

          <div className="flex gap-2">
            <button onClick={finish} disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Opslaan…
                </span>
              ) : 'Klaar, naar dashboard →'}
            </button>
            <button onClick={() => setStep('income')} className="btn-secondary">
              Terug
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            Je kunt later altijd meer toevoegen of aanpassen.
          </p>
        </div>
      )}
    </div>
  )
}
