import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeTotals, computeCategoryTotals, formatCurrency, toMonthly } from '@/lib/calculations'
import { ensureDailyTip } from './actions'
import TipCard from '@/components/dashboard/TipCard'
import SafeToSpendCard from '@/components/dashboard/SafeToSpendCard'
import StatsGrid from '@/components/dashboard/StatsGrid'
import CategoryList from '@/components/dashboard/CategoryList'
import Link from 'next/link'
import type { Expense } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check profiel — gebruik maybeSingle() zodat ontbrekend profiel geen error gooit
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  // Database niet opgezet → toon setup-instructie i.p.v. redirect-loop
  if (profileError?.code === 'PGRST205') {
    return <DbSetupBanner />
  }

  if (!profile?.onboarding_completed) redirect('/onboarding')

  // Genereer dagelijkse tip (vangt eigen fouten af)
  await ensureDailyTip().catch(() => null)

  const today = new Date().toISOString().split('T')[0]
  const [
    { data: incomes },
    { data: expenses },
    { data: todayTip },
  ] = await Promise.all([
    supabase.from('incomes').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at'),
    supabase
      .from('generated_tips')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .neq('status', 'dismissed')
      .neq('status', 'done')
      .maybeSingle(),
  ])

  const inc = incomes ?? []
  const exp = expenses ?? []
  const totals = computeTotals(inc, exp)
  const categories = computeCategoryTotals(exp, totals.incomeMonthly)

  const top5expenses = exp
    .filter((e: Expense) => e.is_active)
    .map((e: Expense) => ({ name: e.name, monthly: toMonthly(e.amount, e.frequency) }))
    .sort((a: { monthly: number }, b: { monthly: number }) => b.monthly - a.monthly)
    .slice(0, 5)

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'je'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hoi {displayName} 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('nl-NL', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </div>

      <SafeToSpendCard
        safeToSpend={totals.safeToSpend}
        incomeMonthly={totals.incomeMonthly}
        fixedCostsMonthly={totals.fixedCostsMonthly}
        fixedCostsRatio={totals.fixedCostsRatio}
      />

      {todayTip && <TipCard tip={todayTip} />}

      <StatsGrid
        incomeMonthly={totals.incomeMonthly}
        fixedCostsMonthly={totals.fixedCostsMonthly}
        safeToSpend={totals.safeToSpend}
        incomesCount={inc.length}
        expensesCount={exp.filter((e: Expense) => e.is_active).length}
      />

      {categories.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Per categorie</h2>
            <Link href="/insights" className="text-sm text-brand-600 font-medium hover:underline">
              Alle inzichten →
            </Link>
          </div>
          <CategoryList categories={categories} />
        </div>
      )}

      {top5expenses.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Top 5 kosten</h2>
            <Link href="/expenses" className="text-sm text-brand-600 font-medium hover:underline">
              Beheer →
            </Link>
          </div>
          <ul className="space-y-2">
            {top5expenses.map((item: { name: string; monthly: number }, i: number) => (
              <li key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(item.monthly)}
                  <span className="text-slate-400 font-normal">/m</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {inc.length === 0 && (
        <div className="card p-6 text-center border-2 border-dashed border-slate-200 bg-transparent shadow-none">
          <p className="text-slate-500 text-sm mb-3">Nog geen inkomsten ingevuld.</p>
          <Link href="/incomes" className="btn-primary">
            Voeg inkomsten toe
          </Link>
        </div>
      )}
    </div>
  )
}

function DbSetupBanner() {
  return (
    <div className="space-y-5">
      <div className="card p-6 border-l-4 border-amber-400">
        <div className="flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="font-bold text-slate-900 mb-1">Database nog niet opgezet</h2>
            <p className="text-slate-600 text-sm mb-4">
              De tabellen bestaan nog niet in Supabase. Voer de SQL-migrations éénmalig uit.
            </p>
            <ol className="text-sm text-slate-700 space-y-2 mb-4">
              <li className="flex gap-2">
                <span className="font-bold text-amber-600">1.</span>
                Ga naar{' '}
                <strong>supabase.com → jouw project → SQL Editor</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-amber-600">2.</span>
                Klik <strong>New query</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-amber-600">3.</span>
                Plak de inhoud van <code className="bg-slate-100 px-1 rounded">supabase/migrations/setup_all.sql</code>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-amber-600">4.</span>
                Klik <strong>Run</strong> → herlaad deze pagina
              </li>
            </ol>
            <p className="text-xs text-slate-400">
              Het bestand staat in je project-map als <code>supabase/migrations/setup_all.sql</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
