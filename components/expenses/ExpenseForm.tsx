'use client'

import { useRef, useState } from 'react'
import type { Expense } from '@/types/database'
import { FREQUENCY_LABELS, EXPENSE_CATEGORIES } from '@/types/database'

interface Props {
  expense?: Expense
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
}

export default function ExpenseForm({ expense, onSubmit, onCancel }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [necessary, setNecessary] = useState(expense?.necessary ?? true)
  const [cancellable, setCancellable] = useState(expense?.cancellable ?? false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    // Checkboxes
    fd.set('necessary', String(necessary))
    fd.set('cancellable', String(cancellable))
    await onSubmit(fd)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {/* Naam + bedrag */}
      <div>
        <label className="label">Omschrijving *</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={expense?.name}
          className="input"
          placeholder="bijv. Netflix, Huur, Zorgverzekering"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Bedrag (€) *</label>
          <input
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            defaultValue={expense?.amount}
            className="input"
            placeholder="12.99"
          />
        </div>
        <div>
          <label className="label">Frequentie *</label>
          <select
            name="frequency"
            required
            defaultValue={expense?.frequency ?? 'monthly'}
            className="input"
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Categorie */}
      <div>
        <label className="label">Categorie *</label>
        <select
          name="category"
          required
          defaultValue={expense?.category ?? 'Overig'}
          className="input"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setNecessary(!necessary)}
          className={`flex items-center justify-between p-3 rounded-xl border-2 text-left transition ${
            necessary
              ? 'border-brand-500 bg-brand-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">Noodzakelijk</p>
            <p className="text-xs text-slate-500">Huur, zorg, etc.</p>
          </div>
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            necessary ? 'border-brand-500 bg-brand-500' : 'border-slate-300'
          }`}>
            {necessary && <span className="text-white text-xs">✓</span>}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCancellable(!cancellable)}
          className={`flex items-center justify-between p-3 rounded-xl border-2 text-left transition ${
            cancellable
              ? 'border-amber-500 bg-amber-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">Opzegbaar</p>
            <p className="text-xs text-slate-500">Kan worden opgezegd</p>
          </div>
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            cancellable ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
          }`}>
            {cancellable && <span className="text-white text-xs">✓</span>}
          </span>
        </button>
      </div>

      {/* Optionele velden */}
      <div>
        <label className="label">Contracteinddatum</label>
        <input
          name="contract_end_date"
          type="date"
          defaultValue={expense?.contract_end_date ?? ''}
          className="input"
        />
      </div>

      <div>
        <label className="label">Merchant / label</label>
        <input
          name="merchant_hint"
          type="text"
          defaultValue={expense?.merchant_hint ?? ''}
          className="input"
          placeholder="bijv. Netflix NL, ANWB, Ziggo"
        />
      </div>

      <div>
        <label className="label">Notitie</label>
        <input
          name="notes"
          type="text"
          defaultValue={expense?.notes ?? ''}
          className="input"
          placeholder="Optionele aantekening"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">
          {expense ? 'Opslaan' : 'Toevoegen'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuleer
        </button>
      </div>
    </form>
  )
}
