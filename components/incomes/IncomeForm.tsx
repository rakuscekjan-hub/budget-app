'use client'

import { useRef } from 'react'
import type { Income } from '@/types/database'
import { FREQUENCY_LABELS } from '@/types/database'

interface Props {
  income?: Income
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
}

export default function IncomeForm({ income, onSubmit, onCancel }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    await onSubmit(fd)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">Omschrijving *</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={income?.name}
          className="input"
          placeholder="bijv. Salaris, Freelance inkomen"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className="label">Bedrag (€) *</label>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            defaultValue={income?.amount}
            className="input"
            placeholder="2500"
          />
        </div>
        <div>
          <label htmlFor="frequency" className="label">Frequentie *</label>
          <select
            id="frequency"
            name="frequency"
            required
            defaultValue={income?.frequency ?? 'monthly'}
            className="input"
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="start_date" className="label">Startdatum</label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          defaultValue={income?.start_date ?? ''}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="notes" className="label">Notitie</label>
        <input
          id="notes"
          name="notes"
          type="text"
          defaultValue={income?.notes ?? ''}
          className="input"
          placeholder="Optionele aantekening"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">
          {income ? 'Opslaan' : 'Toevoegen'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuleer
        </button>
      </div>
    </form>
  )
}
