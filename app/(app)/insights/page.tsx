import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeTotals, formatCurrency } from '@/lib/calculations'
import { generateInsights } from '@/lib/insights-engine'
import InsightsClient from './InsightsClient'
import { AI_ANALYSIS_ENABLED } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase.from('incomes').select('*').eq('user_id', user.id),
    supabase.from('expenses').select('*').eq('user_id', user.id),
  ])

  const inc = incomes ?? []
  const exp = expenses ?? []
  const totals = computeTotals(inc, exp)
  const report = generateInsights(inc, exp)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Analyse & Besparing</h1>
          <p className="muted">
            Potentieel:{' '}
            <strong className="text-emerald-600">
              {formatCurrency(report.quickWinTotal)}/m
            </strong>{' '}
            besparing mogelijk
          </p>
        </div>
        {AI_ANALYSIS_ENABLED && (
          <button disabled className="btn-secondary text-xs opacity-50 cursor-not-allowed">
            🤖 AI-analyse
          </button>
        )}
      </div>

      <InsightsClient
        report={report}
        incomeMonthly={totals.incomeMonthly}
        safeToSpend={totals.safeToSpend}
        expenses={exp}
      />
    </div>
  )
}
