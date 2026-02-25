'use client'

import { useState, useTransition } from 'react'
import { CATEGORY_TREE } from '@/types/database'
import { createTransaction } from '@/app/(app)/transactions/actions'

interface Wallet { id: string; name: string; icon: string }

export default function QuickAdd({ wallets }: { wallets: Wallet[] }) {
  const [open, setOpen]       = useState(false)
  const [step, setStep]       = useState(1)
  const [isPending, start]    = useTransition()
  const [error, setError]     = useState<string | null>(null)

  const [type, setType]       = useState<'expense' | 'income'>('expense')
  const [amount, setAmount]   = useState('')
  const [category, setCategory] = useState(CATEGORY_TREE[0].name)
  const [subcat, setSubcat]   = useState('')
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '')
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])
  const [name, setName]       = useState('')

  function resetAndClose() {
    setOpen(false); setStep(1); setAmount(''); setName(''); setError(null)
    setType('expense'); setCategory(CATEGORY_TREE[0].name); setSubcat('')
    setDate(new Date().toISOString().split('T')[0])
  }

  function onNumpad(val: string) {
    if (val === '⌫') { setAmount(a => a.slice(0, -1)); return }
    if (val === ',' && amount.includes(',')) return
    if (val === ',' && amount === '') { setAmount('0,'); return }
    setAmount(a => (a + val).slice(0, 10))
  }

  function selectCategory(catName: string) {
    const cat = CATEGORY_TREE.find(c => c.name === catName)
    setCategory(catName)
    setSubcat(cat?.subcategories[0] ?? '')
  }

  function handleSave() {
    const numAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(numAmount) || numAmount <= 0) { setError('Voer een geldig bedrag in'); return }
    setError(null)
    start(async () => {
      try {
        const fd = new FormData()
        fd.append('name', name.trim() || subcat || category)
        fd.append('amount', String(numAmount))
        fd.append('type', type)
        fd.append('category', category)
        fd.append('subcategory', subcat)
        fd.append('date', date)
        if (walletId) fd.append('wallet_id', walletId)
        await createTransaction(fd)
        resetAndClose()
      } catch (e) { setError((e as Error).message) }
    })
  }

  const catDef = CATEGORY_TREE.find(c => c.name === category) ?? CATEGORY_TREE[0]

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => { setOpen(true); setStep(1) }}
        aria-label="Transactie toevoegen"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40
                   w-14 h-14 rounded-full text-white
                   flex items-center justify-center text-2xl font-light
                   active:scale-95 transition-all duration-150 md:bottom-6"
        style={{
          background: 'linear-gradient(135deg, #5b4cff 0%, #7c5cfc 100%)',
          boxShadow: '0 6px 28px rgba(91,76,255,0.55)',
        }}
      >
        +
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />
          <div className="relative w-full max-w-md rounded-t-3xl shadow-2xl"
               style={{
                 maxHeight: '92vh', overflowY: 'auto',
                 background: '#0f0c1f',
                 border: '1px solid rgba(91,76,255,0.25)',
                 borderBottom: 'none',
               }}>

            {/* Stap indicator */}
            <div className="flex justify-center gap-1.5 pt-3 pb-1">
              {[1,2,3].map(s => (
                <div key={s} className="h-1 rounded-full transition-all duration-300"
                     style={{
                       width: s === step ? '24px' : '12px',
                       background: s === step ? '#5b4cff' : s < step ? 'rgba(91,76,255,0.5)' : 'rgba(255,255,255,0.1)',
                     }} />
              ))}
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* ── Stap 1: Type + Bedrag ── */}
              {step === 1 && (
                <>
                  <div className="flex rounded-2xl p-1 gap-1"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(91,76,255,0.15)' }}>
                    {(['expense','income'] as const).map(t => (
                      <button key={t} onClick={() => setType(t)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              style={type === t ? {
                                background: t === 'expense' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                                color: t === 'expense' ? '#fca5a5' : '#6ee7b7',
                                border: `1px solid ${t === 'expense' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
                              } : { color: '#6b5f8a' }}>
                        {t === 'expense' ? '⬇ Uitgave' : '⬆ Inkomst'}
                      </button>
                    ))}
                  </div>

                  {/* Bedrag display */}
                  <div className="text-center py-2">
                    <p className="text-5xl font-black tracking-tight"
                       style={{ color: type === 'expense' ? '#fca5a5' : '#6ee7b7' }}>
                      € {amount || '0'}
                    </p>
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1','2','3','4','5','6','7','8','9',',','0','⌫'].map(k => (
                      <button key={k} onClick={() => onNumpad(k)}
                              className="py-3.5 rounded-2xl text-lg font-semibold transition-all active:scale-95"
                              style={{
                                background: k === '⌫' ? 'rgba(239,68,68,0.1)' : 'rgba(91,76,255,0.1)',
                                color: k === '⌫' ? '#f87171' : '#c4baff',
                                border: `1px solid ${k === '⌫' ? 'rgba(239,68,68,0.15)' : 'rgba(91,76,255,0.15)'}`,
                              }}>
                        {k}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => { if (!amount || parseFloat(amount.replace(',','.')) <= 0) { setError('Voer een bedrag in'); return }; setError(null); setStep(2) }}
                          className="btn-primary w-full py-3.5 text-base">
                    Volgende →
                  </button>
                  {error && <p className="text-center text-sm text-red-500">{error}</p>}
                </>
              )}

              {/* ── Stap 2: Categorie ── */}
              {step === 2 && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">←</button>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Kies categorie</h2>
                    <span className={`ml-auto text-sm font-bold ${type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                      € {amount}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORY_TREE.map(c => (
                      <button key={c.name} onClick={() => selectCategory(c.name)}
                              className={`p-2.5 rounded-2xl border-2 flex flex-col items-center gap-1 transition active:scale-95 ${
                                category === c.name
                                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800'
                              }`}>
                        <span className="text-2xl">{c.icon}</span>
                        <span className="text-[10px] font-medium text-center leading-tight text-slate-700 dark:text-slate-300">
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Subcategorieën */}
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Subcategorie</p>
                    <div className="flex flex-wrap gap-1.5">
                      {catDef.subcategories.map(s => (
                        <button key={s} onClick={() => setSubcat(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                  subcat === s
                                    ? 'text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                                style={subcat === s ? { background: catDef.color } : {}}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setStep(3)} className="btn-primary w-full py-3.5 text-base">
                    Volgende →
                  </button>
                </>
              )}

              {/* ── Stap 3: Details ── */}
              {step === 3 && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">←</button>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Details</h2>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-lg">{catDef.icon}</span>
                      <span className={`text-sm font-bold ${type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                        € {amount}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="label">Omschrijving (optioneel)</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)}
                           placeholder={subcat || category} />
                  </div>

                  {wallets.length > 0 && (
                    <div>
                      <label className="label">Wallet</label>
                      <div className="flex gap-2 flex-wrap">
                        {wallets.map(w => (
                          <button key={w.id} onClick={() => setWalletId(w.id)}
                                  className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition flex items-center gap-1.5 ${
                                    walletId === w.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700'
                                  }`}>
                            {w.icon} {w.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Datum</label>
                    <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <button onClick={handleSave} disabled={isPending} className="btn-primary w-full py-3.5 text-base">
                    {isPending ? 'Opslaan…' : '✓ Opslaan'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
