'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { formatCurrency } from '@/lib/calculations'
import { EXPENSE_CATEGORIES, CATEGORY_TREE, getCategoryDef } from '@/types/database'
import { createTransaction, updateTransaction, deleteTransaction, importTransactions } from './actions'
import { parseCSV, type ParsedTransaction } from '@/lib/csv-parser'

interface Transaction {
  id: string; user_id: string; name: string; amount: number
  type: string; category: string; date: string; notes: string | null; imported: boolean
}

const TYPE_EMOJI: Record<string, string> = { expense: '⬇️', income: '⬆️' }

export default function TransactionsClient({
  transactions,
  currentMonth,
}: {
  transactions: Transaction[]
  currentMonth: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all')
  const [filterCat, setFilterCat] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ParsedTransaction[] | null>(null)
  const [importing, setImporting] = useState(false)

  const monthDate = parseISO(currentMonth + '-01')

  function navigate(delta: number) {
    const next = delta > 0 ? addMonths(monthDate, 1) : subMonths(monthDate, 1)
    router.push(`/transactions?month=${format(next, 'yyyy-MM')}`)
  }

  async function handleCreate(fd: FormData) {
    try { await createTransaction(fd); setShowForm(false); router.refresh() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fout') }
  }
  async function handleUpdate(id: string, fd: FormData) {
    try { await updateTransaction(id, fd); setEditingId(null); router.refresh() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fout') }
  }
  async function handleDelete(id: string) {
    if (!confirm('Verwijderen?')) return
    try { await deleteTransaction(id); router.refresh() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fout') }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const parsed = parseCSV(text)
      setImportPreview(parsed.slice(0, 100))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'CSV fout')
    }
  }

  async function confirmImport() {
    if (!importPreview) return
    setImporting(true)
    try {
      await importTransactions(importPreview)
      setImportPreview(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import mislukt')
    } finally { setImporting(false) }
  }

  // Groepeer per datum
  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCat !== 'all' && t.category !== filterCat) return false
    return true
  })

  const byDate = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    acc[t.date] = [...(acc[t.date] ?? []), t]
    return acc
  }, {})

  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const categories = Array.from(new Set(transactions.map(t => t.category))).sort()

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-xl">
          {error}
        </div>
      )}

      {/* Import preview */}
      {importPreview && (
        <div className="card p-4 border-l-4 border-brand-500">
          <h3 className="font-semibold mb-2">📂 CSV Preview — {importPreview.length} transacties gevonden</h3>
          <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
            {importPreview.slice(0, 20).map((r, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="truncate flex-1">{r.date} · {r.name}</span>
                <span className={`ml-2 font-medium ${r.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {r.type === 'expense' ? '-' : '+'}{formatCurrency(r.amount)}
                </span>
              </div>
            ))}
            {importPreview.length > 20 && <p className="text-xs text-slate-400">...en {importPreview.length - 20} meer</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={confirmImport} disabled={importing} className="btn-primary text-sm">
              {importing ? 'Importeren…' : `✓ Importeer ${importPreview.length} transacties`}
            </button>
            <button onClick={() => setImportPreview(null)} className="btn-secondary text-sm">Annuleer</button>
          </div>
        </div>
      )}

      {/* Maandnavigatie */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary px-3">‹</button>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
          {format(monthDate, 'MMMM yyyy', { locale: nl })}
        </h2>
        <button onClick={() => navigate(1)} className="btn-secondary px-3">›</button>
      </div>

      {/* Acties */}
      <div className="flex gap-2">
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex-1">+ Transactie</button>
        )}
        <button onClick={() => fileRef.current?.click()} className="btn-secondary">
          📂 Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Formulier */}
      {showForm && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Nieuwe transactie</h3>
          <TransactionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} defaultDate={format(monthDate, 'yyyy-MM') + '-' + format(new Date(), 'dd')} />
        </div>
      )}

      {/* Filters */}
      {transactions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['all', 'expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === t ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
              {t === 'all' ? 'Alles' : t === 'expense' ? 'Uitgaven' : 'Inkomsten'}
            </button>
          ))}
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <option value="all">Alle categorieën</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Transacties per dag */}
      {Object.keys(byDate).length === 0 ? (
        <div className="card p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
          <p className="text-slate-500 text-sm">Geen transacties in {format(monthDate, 'MMMM yyyy', { locale: nl })}.</p>
        </div>
      ) : (
        Object.entries(byDate).map(([date, txs]) => (
          <div key={date} className="card overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {format(parseISO(date), 'EEEE d MMMM', { locale: nl })}
              </span>
            </div>
            {txs.map(tx => (
              <div key={tx.id}>
                {editingId === tx.id ? (
                  <div className="p-4">
                    <TransactionForm
                      transaction={tx}
                      onSubmit={(fd) => handleUpdate(tx.id, fd)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="table-row px-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-lg">{getCategoryDef(tx.category).icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{tx.name}</p>
                        <p className="text-xs text-slate-400">{tx.category}{tx.imported ? ' · geïmporteerd' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`font-bold text-sm ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                      </span>
                      <button onClick={() => setEditingId(tx.id)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">✏️</button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sm">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Dag totaal: <strong className="text-red-500">
                  -{formatCurrency(txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0))}
                </strong>
              </span>
            </div>
          </div>
        ))
      )}

      {/* Maand totaal */}
      {filtered.length > 0 && (
        <div className="card p-4 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Maand totaal uitgaven</span>
          <span className="text-xl font-bold text-red-500">-{formatCurrency(totalExpenses)}</span>
        </div>
      )}
    </div>
  )
}

// ── Transactie formulier ──────────────────────────────────────────────────────
function TransactionForm({
  transaction,
  onSubmit,
  onCancel,
  defaultDate,
}: {
  transaction?: Transaction
  onSubmit: (fd: FormData) => Promise<void>
  onCancel: () => void
  defaultDate?: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState(transaction?.type ?? 'expense')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    fd.set('type', type)
    await onSubmit(fd)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      {/* Expense / income toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition ${
              type === t ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}>
            {t === 'expense' ? '⬇️ Uitgave' : '⬆️ Inkomst'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Omschrijving *</label>
          <input name="name" type="text" required defaultValue={transaction?.name} className="input" placeholder="bijv. Albert Heijn" />
        </div>
        <div>
          <label className="label">Bedrag (€) *</label>
          <input name="amount" type="number" required min="0.01" step="0.01" defaultValue={transaction?.amount} className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="label">Datum *</label>
          <input name="date" type="date" required defaultValue={transaction?.date ?? defaultDate} className="input" />
        </div>
        <div className="col-span-2">
          <label className="label">Categorie</label>
          <select name="category" defaultValue={transaction?.category ?? CATEGORY_TREE[0].name} className="input">
            {CATEGORY_TREE.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Notitie</label>
          <input name="notes" type="text" defaultValue={transaction?.notes ?? ''} className="input" placeholder="Optioneel" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">{transaction ? 'Opslaan' : 'Toevoegen'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Annuleer</button>
      </div>
    </form>
  )
}
