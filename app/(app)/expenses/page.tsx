import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeTotals, formatCurrency } from '@/lib/calculations'
import ExpensesClient from './ExpensesClient'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase.from('incomes').select('*').eq('user_id', user.id),
    supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at'),
  ])

  const inc = incomes ?? []
  const exp = expenses ?? []
  const totals = computeTotals(inc, exp)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Vaste uitgaven</h1>
          <p className="muted">
            Totaal: <strong className="text-red-500">{formatCurrency(totals.fixedCostsMonthly)}/m</strong>
            {' · '}
            <span>{exp.filter((e) => e.is_active).length} actieve posten</span>
          </p>
        </div>
      </div>
      <ExpensesClient expenses={exp} />
    </div>
  )
}
