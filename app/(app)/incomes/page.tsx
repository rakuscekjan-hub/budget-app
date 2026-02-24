import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeTotals, formatCurrency } from '@/lib/calculations'
import IncomesClient from './IncomesClient'

export const dynamic = 'force-dynamic'

export default async function IncomesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase.from('incomes').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('expenses').select('*').eq('user_id', user.id),
  ])

  const inc = incomes ?? []
  const exp = expenses ?? []
  const totals = computeTotals(inc, exp)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Inkomsten</h1>
          <p className="muted">
            Totaal: <strong className="text-emerald-600">{formatCurrency(totals.incomeMonthly)}/m</strong>
          </p>
        </div>
      </div>

      <IncomesClient incomes={inc} />
    </div>
  )
}
