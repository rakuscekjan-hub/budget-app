import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { nl } from 'date-fns/locale'
import { computeTotals, formatCurrency } from '@/lib/calculations'
import { getCategoryDef } from '@/types/database'
import { ensureDailyTip } from './actions'
import TipCard from '@/components/dashboard/TipCard'
import MonthChart from '@/components/dashboard/MonthChart'
import Link from 'next/link'
import type { Expense } from '@/types/database'

export const dynamic = 'force-dynamic'

const CYCLE_MONTHS: Record<string, number> = {
  weekly: 1/4.33, monthly: 1, quarterly: 3, yearly: 12,
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('onboarding_completed, display_name')
    .eq('user_id', user.id).maybeSingle()

  if (profileError?.code === 'PGRST205') return <DbSetupBanner />
  if (!profile?.onboarding_completed) redirect('/onboarding')

  await ensureDailyTip().catch(() => null)

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(now), 'yyyy-MM-dd')

  // Last 6 months for chart
  const chartStart = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd')

  const [
    { data: incomes },
    { data: expenses },
    { data: todayTip },
    { data: wallets },
    { data: budgets },
    { data: monthTxns },
    { data: allTxns },
    { data: chartTxns },
    { data: savingsGoals },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from('incomes').select('*').eq('user_id', user.id),
    supabase.from('expenses').select('*').eq('user_id', user.id),
    supabase.from('generated_tips').select('*').eq('user_id', user.id)
      .eq('date', format(now, 'yyyy-MM-dd'))
      .neq('status', 'dismissed').neq('status', 'done').maybeSingle(),
    supabase.from('wallets').select('id, name, icon, color, balance')
      .eq('user_id', user.id).order('is_default', { ascending: false }),
    supabase.from('budgets').select('category, amount').eq('user_id', user.id),
    supabase.from('transactions').select('category, amount, type, wallet_id')
      .eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('transactions').select('wallet_id, type, amount')
      .eq('user_id', user.id).not('wallet_id', 'is', null),
    supabase.from('transactions').select('date, amount, type')
      .eq('user_id', user.id).gte('date', chartStart).lte('date', monthEnd),
    supabase.from('savings_goals').select('id, name, icon, color, target_amount, current_amount')
      .eq('user_id', user.id).order('created_at').limit(3),
    supabase.from('subscriptions').select('amount, billing_cycle')
      .eq('user_id', user.id).eq('is_active', true),
  ])

  const inc = incomes ?? []
  const exp = expenses ?? []
  const totals = computeTotals(inc, exp)
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'je'

  // Wallet balances
  const allTxBalanceMap: Record<string, number> = {}
  for (const tx of allTxns ?? []) {
    if (!tx.wallet_id) continue
    const delta = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)
    allTxBalanceMap[tx.wallet_id] = (allTxBalanceMap[tx.wallet_id] ?? 0) + delta
  }
  const walletCards = (wallets ?? []).map((w: any) => ({
    id: w.id, name: w.name, icon: w.icon, color: w.color,
    currentBalance: Number(w.balance) + (allTxBalanceMap[w.id] ?? 0),
  }))
  const totalBalance = walletCards.reduce((s, w) => s + w.currentBalance, 0)

  // Budget progress
  const spentMap: Record<string, number> = {}
  for (const tx of monthTxns ?? []) {
    if (tx.type === 'expense') spentMap[tx.category] = (spentMap[tx.category] ?? 0) + Number(tx.amount)
  }
  const budgetProgress = (budgets ?? [])
    .map((b: any) => ({ category: b.category, amount: Number(b.amount), spent: spentMap[b.category] ?? 0 }))
    .sort((a, b) => (b.spent / b.amount) - (a.spent / a.amount)).slice(0, 4)

  // Top categories
  const catMap: Record<string, number> = {}
  for (const tx of monthTxns ?? []) {
    if (tx.type === 'expense') catMap[tx.category] = (catMap[tx.category] ?? 0) + Number(tx.amount)
  }
  const topCats   = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const monthTotal = Object.values(catMap).reduce((s, v) => s + v, 0)
  const maand      = format(now, 'MMMM', { locale: nl })

  // Chart: last 6 months
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    const key = format(d, 'yyyy-MM')
    return {
      label: format(d, 'MMM', { locale: nl }),
      expenses: 0,
      income: 0,
      isCurrent: i === 5,
      key,
    }
  })
  for (const tx of chartTxns ?? []) {
    const key = (tx.date as string).slice(0, 7)
    const entry = chartData.find(c => c.key === key)
    if (!entry) continue
    if (tx.type === 'expense') entry.expenses += Number(tx.amount)
    else entry.income += Number(tx.amount)
  }

  // Savings summary
  const goals = (savingsGoals ?? []).map((g: any) => ({
    id: g.id, name: g.name, icon: g.icon, color: g.color,
    target: Number(g.target_amount), current: Number(g.current_amount),
  }))
  const totalSaved  = goals.reduce((s, g) => s + g.current, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)

  // Subscriptions monthly total
  const subMonthly = (subscriptions ?? [])
    .reduce((s: number, sub: any) => s + Number(sub.amount) / (CYCLE_MONTHS[sub.billing_cycle] ?? 1), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Hoi {displayName} 👋</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 capitalize">
            {format(now, 'EEEE d MMMM', { locale: nl })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">Totaal saldo</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalBalance)}</p>
        </div>
      </div>

      {/* Wallet scroll */}
      {walletCards.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x scrollbar-hide">
          {walletCards.map(w => (
            <Link key={w.id} href="/wallets"
                  className="flex-shrink-0 snap-start card p-4 w-44 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: w.color }} />
              <p className="text-2xl mt-1">{w.icon}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{w.name}</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(w.currentBalance)}
              </p>
            </Link>
          ))}
          <Link href="/wallets"
                className="flex-shrink-0 snap-start card p-4 w-36 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:shadow-md transition">
            <span className="text-2xl">+</span>
            <span className="text-xs text-center">Wallet toevoegen</span>
          </Link>
        </div>
      ) : (
        <Link href="/wallets" className="card p-4 flex items-center gap-3 hover:shadow-md transition">
          <span className="text-2xl">👛</span>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Voeg een wallet toe</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Houd je saldo bij per rekening</p>
          </div>
          <span className="ml-auto text-slate-400">→</span>
        </Link>
      )}

      {todayTip && <TipCard tip={todayTip} />}

      {/* Maandgrafiek */}
      {chartTxns && chartTxns.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Uitgaven afgelopen 6 maanden</h2>
          </div>
          <MonthChart data={chartData} />
        </div>
      )}

      {/* Budget voortgang */}
      {budgetProgress.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">Budgetten {maand}</h2>
            <Link href="/budgets" className="text-xs text-brand-600 dark:text-brand-400 font-medium">Alle →</Link>
          </div>
          <div className="space-y-3">
            {budgetProgress.map(b => {
              const pct    = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
              const isOver = b.spent > b.amount
              const cat    = getCategoryDef(b.category)
              return (
                <div key={b.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {cat.icon} {b.category}
                    </span>
                    <span className={`text-xs font-medium ${isOver ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                      {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                         style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Uitgaven deze maand */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">Uitgaven {maand}</h2>
          <Link href="/transactions" className="text-xs text-brand-600 dark:text-brand-400 font-medium">Alle →</Link>
        </div>
        {topCats.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
            Nog geen transacties. Druk op <span className="font-bold">+</span> om te starten.
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{formatCurrency(monthTotal)}</p>
            <div className="space-y-2.5">
              {topCats.map(([cat, amount]) => {
                const catDef = getCategoryDef(cat)
                const pct    = monthTotal > 0 ? (amount / monthTotal) * 100 : 0
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-base w-6 text-center flex-shrink-0">{catDef.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{cat}</span>
                        <span className="text-xs font-medium text-slate-900 dark:text-slate-100 ml-2 flex-shrink-0">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${pct}%`, background: catDef.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Spaardoelen preview */}
      {goals.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Spaardoelen</h2>
            <Link href="/savings" className="text-xs text-brand-600 dark:text-brand-400 font-medium">Alle →</Link>
          </div>
          <div className="space-y-3">
            {goals.map(g => {
              const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {g.icon} {g.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(g.current)} / {formatCurrency(g.target)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${pct}%`, background: g.color }} />
                  </div>
                </div>
              )
            })}
          </div>
          {totalTarget > 0 && (
            <p className="text-xs text-slate-400 mt-2 text-right">
              {formatCurrency(totalSaved)} / {formatCurrency(totalTarget)} gespaard
            </p>
          )}
        </div>
      )}

      {/* Abonnementen */}
      {subMonthly > 0 && (
        <Link href="/subscriptions" className="card p-4 flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Abonnementen</p>
              <p className="text-xs text-slate-400">Per maand</p>
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">{formatCurrency(subMonthly)}</p>
        </Link>
      )}

      {/* Vaste lasten */}
      {(inc.length > 0 || exp.filter((e: Expense) => e.is_active).length > 0) && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Vaste lasten</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.incomeMonthly)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Inkomen</p>
            </div>
            <div>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totals.fixedCostsMonthly)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lasten</p>
            </div>
            <div>
              <p className={`text-base font-bold ${totals.safeToSpend >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(totals.safeToSpend)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Vrij besteedbaar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DbSetupBanner() {
  return (
    <div className="card p-6 border-l-4 border-amber-400">
      <div className="flex gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Database nog niet opgezet</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Voer de SQL-migraties uit in de Supabase SQL Editor.</p>
        </div>
      </div>
    </div>
  )
}
