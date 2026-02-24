'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, updateExpense, deleteExpense, toggleExpenseActive } from './actions'
import { toMonthly, formatCurrency } from '@/lib/calculations'
import type { Expense } from '@/types/database'
import { FREQUENCY_LABELS, EXPENSE_CATEGORIES } from '@/types/database'
import ExpenseForm from '@/components/expenses/ExpenseForm'

interface Props {
  expenses: Expense[]
}

const CATEGORY_ICONS: Record<string, string> = {
  Wonen: '🏠', Vervoer: '🚗', Verzekeringen: '🛡️', Abonnementen: '📺',
  Boodschappen: '🛒', Gezondheid: '💊', 'Sport & Hobby': '⚽', Kleding: '👕',
  Horeca: '🍽️', Onderwijs: '📚', Reizen: '✈️', 'Persoonlijke verzorging': '🧴',
  Kinderen: '👶', Huisdieren: '🐾', Overig: '📦',
}

export default function ExpensesClient({ expenses }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    try {
      await createExpense(formData)
      setShowForm(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout bij opslaan')
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    try {
      await updateExpense(id, formData)
      setEditingId(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout bij opslaan')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Uitgave verwijderen?')) return
    try {
      await deleteExpense(id)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout bij verwijderen')
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleExpenseActive(id, !current)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout')
    }
  }

  // Filter
  const categories = Array.from(new Set(expenses.map((e) => e.category))).sort()
  const filtered = expenses.filter((e) => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false
    if (filterStatus === 'active' && !e.is_active) return false
    if (filterStatus === 'inactive' && e.is_active) return false
    return true
  })

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full">
          + Uitgave toevoegen
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Nieuwe uitgave</h3>
          <ExpenseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filters */}
      {expenses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="all">Alle</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="all">Alle categorieën</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showForm && (
        <div className="card p-8 text-center border-2 border-dashed border-slate-200 bg-transparent shadow-none">
          <p className="text-slate-500 text-sm">
            {expenses.length === 0
              ? 'Nog geen uitgaven. Voeg je huur, abonnementen en andere vaste lasten toe.'
              : 'Geen uitgaven met dit filter.'}
          </p>
        </div>
      )}

      {/* List */}
      {filtered.map((expense) => (
        <div
          key={expense.id}
          className={`card p-4 ${!expense.is_active ? 'opacity-60' : ''}`}
        >
          {editingId === expense.id ? (
            <>
              <h3 className="font-semibold text-slate-900 mb-4">Bewerken</h3>
              <ExpenseForm
                expense={expense}
                onSubmit={(fd) => handleUpdate(expense.id, fd)}
                onCancel={() => setEditingId(null)}
              />
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base">
                    {CATEGORY_ICONS[expense.category] ?? '📦'}
                  </span>
                  <p className={`font-semibold truncate ${!expense.is_active ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {expense.name}
                  </p>
                  {expense.cancellable && (
                    <span className="badge bg-amber-50 text-amber-700 text-[10px]">Opzegbaar</span>
                  )}
                  {!expense.necessary && (
                    <span className="badge bg-violet-50 text-violet-700 text-[10px]">Nice-to-have</span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  {expense.category} · {FREQUENCY_LABELS[expense.frequency]}
                  {expense.contract_end_date && (
                    <span className="text-amber-600">
                      {' '}· contract t/m {new Date(expense.contract_end_date).toLocaleDateString('nl-NL')}
                    </span>
                  )}
                </p>
                {expense.merchant_hint && (
                  <p className="text-slate-400 text-xs mt-0.5">{expense.merchant_hint}</p>
                )}
              </div>

              <div className="flex items-center gap-2 ml-2 shrink-0">
                <div className="text-right">
                  <p className="font-bold text-slate-900">
                    {formatCurrency(toMonthly(expense.amount, expense.frequency))}
                  </p>
                  <p className="text-xs text-slate-400">per maand</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleToggle(expense.id, expense.is_active)}
                    className={`p-1.5 rounded-lg transition text-sm ${
                      expense.is_active
                        ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        : 'text-emerald-500 hover:bg-emerald-50'
                    }`}
                    title={expense.is_active ? 'Deactiveren' : 'Activeren'}
                  >
                    {expense.is_active ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => setEditingId(expense.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition text-sm"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
