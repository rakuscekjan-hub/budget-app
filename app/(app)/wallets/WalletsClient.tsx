'use client'

import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/calculations'
import { WALLET_TYPES, type WalletType } from '@/types/database'
import { createWallet, updateWallet, deleteWallet, setDefaultWallet } from './actions'

export interface WalletWithBalance {
  id: string
  name: string
  type: WalletType
  balance: number
  color: string
  icon: string
  is_default: boolean
  current_balance: number // startbalans + transacties
}

const WALLET_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444','#22c55e','#3b82f6','#6b7280']
const WALLET_ICONS  = ['💳','🏦','💵','👛','💰','🏠','⭐','🎯','👥']

interface FormState {
  name: string; type: WalletType; balance: string; color: string; icon: string
}

const DEFAULT_FORM: FormState = { name: '', type: 'checking', balance: '0', color: '#6366f1', icon: '💳' }

export default function WalletsClient({ wallets }: { wallets: WalletWithBalance[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const totalBalance = wallets.reduce((s, w) => s + w.current_balance, 0)

  function openCreate() {
    setForm(DEFAULT_FORM)
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  function openEdit(w: WalletWithBalance) {
    setForm({ name: w.name, type: w.type, balance: String(w.balance), color: w.color, icon: w.icon })
    setEditingId(w.id)
    setShowForm(true)
    setError(null)
  }

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try { await action(); setShowForm(false) }
      catch (e) { setError((e as Error).message) }
    })
  }

  function handleSave() {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    run(() => editingId ? updateWallet(editingId, fd) : createWallet(fd))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Wallets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Totaal saldo: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Toevoegen</button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {/* Wallet kaarten */}
      {wallets.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <div className="text-5xl">👛</div>
          <p className="text-slate-500 dark:text-slate-400">Nog geen wallets. Voeg je betaalrekening toe om te starten.</p>
          <button onClick={openCreate} className="btn-primary">Eerste wallet toevoegen</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {wallets.map(w => (
            <div key={w.id} className="card p-4 relative overflow-hidden">
              {/* Kleurstrip */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: w.color }} />
              <div className="flex items-start justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                       style={{ background: w.color + '22' }}>
                    {w.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {w.name}
                      {w.is_default && <span className="text-xs bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-1.5 py-0.5 rounded-full">Standaard</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{WALLET_TYPES[w.type].label}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(w.current_balance)}</p>
              </div>
              {w.balance !== w.current_balance && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Startbalans {formatCurrency(w.balance)} · transacties {formatCurrency(w.current_balance - w.balance) }
                </p>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => openEdit(w)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition">
                  Bewerken
                </button>
                {!w.is_default && (
                  <button onClick={() => run(() => setDefaultWallet(w.id))}
                          className="text-xs text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition">
                    Standaard maken
                  </button>
                )}
                <button onClick={() => {
                  if (!confirm(`"${w.name}" verwijderen?`)) return
                  run(() => deleteWallet(w.id))
                }} className="text-xs text-red-400 hover:text-red-600 transition ml-auto">
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulier (slide-in panel) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingId ? 'Wallet bewerken' : 'Nieuwe wallet'}
            </h2>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div>
              <label className="label">Naam</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                     placeholder="bijv. Betaalrekening ING" />
            </div>

            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(WALLET_TYPES) as [WalletType, typeof WALLET_TYPES[WalletType]][]).map(([key, val]) => (
                  <button key={key} type="button"
                          onClick={() => setForm(f => ({...f, type: key, icon: val.icon, color: val.color}))}
                          className={`p-2.5 rounded-xl border-2 text-center transition text-xs font-medium ${
                            form.type === key ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700'
                          }`}>
                    <div className="text-lg mb-0.5">{val.icon}</div>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Huidig saldo (€)</label>
              <input className="input" type="number" step="0.01" value={form.balance}
                     onChange={e => setForm(f => ({...f, balance: e.target.value}))} placeholder="0.00" />
            </div>

            <div>
              <label className="label">Kleur</label>
              <div className="flex gap-2 flex-wrap">
                {WALLET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({...f, color: c}))}
                          className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                          style={{ background: c }} />
                ))}
              </div>
            </div>

            <div>
              <label className="label">Icoon</label>
              <div className="flex gap-2 flex-wrap">
                {WALLET_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm(f => ({...f, icon: ic}))}
                          className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition ${form.icon === ic ? 'bg-brand-100 dark:bg-brand-900/30 ring-2 ring-brand-400' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuleren</button>
              <button onClick={handleSave} disabled={isPending || !form.name.trim()} className="btn-primary flex-1">
                {isPending ? '…' : editingId ? 'Opslaan' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
