'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createIncome, updateIncome, deleteIncome } from './actions'
import { toMonthly, formatCurrency } from '@/lib/calculations'
import type { Income, Frequency } from '@/types/database'
import { FREQUENCY_LABELS } from '@/types/database'
import IncomeForm from '@/components/incomes/IncomeForm'

interface Props {
  incomes: Income[]
}

export default function IncomesClient({ incomes }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    try {
      await createIncome(formData)
      setShowForm(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout bij opslaan')
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    try {
      await updateIncome(id, formData)
      setEditingId(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout bij opslaan')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Inkomen verwijderen?')) return
    try {
      await deleteIncome(id)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout bij verwijderen')
    }
  }

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
          + Inkomen toevoegen
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Nieuw inkomen</h3>
          <IncomeForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* List */}
      {incomes.length === 0 && !showForm && (
        <div className="card p-8 text-center border-2 border-dashed border-slate-200 bg-transparent shadow-none">
          <p className="text-slate-500 text-sm">Nog geen inkomsten. Voeg je salaris of andere inkomstenbronnen toe.</p>
        </div>
      )}

      {incomes.map((income) => (
        <div key={income.id} className="card p-4">
          {editingId === income.id ? (
            <>
              <h3 className="font-semibold text-slate-900 mb-4">Bewerken</h3>
              <IncomeForm
                income={income}
                onSubmit={(fd) => handleUpdate(income.id, fd)}
                onCancel={() => setEditingId(null)}
              />
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{income.name}</p>
                <p className="text-slate-500 text-sm">
                  {formatCurrency(income.amount, 2)} · {FREQUENCY_LABELS[income.frequency]}
                </p>
                {income.notes && <p className="text-slate-400 text-xs mt-0.5 truncate">{income.notes}</p>}
              </div>
              <div className="flex items-center gap-3 ml-3">
                <div className="text-right">
                  <p className="font-bold text-emerald-600">
                    {formatCurrency(toMonthly(income.amount, income.frequency))}
                  </p>
                  <p className="text-xs text-slate-400">per maand</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingId(income.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition text-sm"
                    title="Bewerken"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                    title="Verwijderen"
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
