import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import BudgetsClient, { type BudgetWithSpent } from './BudgetsClient'

export const dynamic = 'force-dynamic'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(now), 'yyyy-MM-dd')

  const [{ data: rawBudgets }, { data: txns }] = await Promise.all([
    supabase.from('budgets').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('transactions')
      .select('category, amount, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', monthStart)
      .lte('date', monthEnd),
  ])

  // Uitgaven per categorie deze maand
  const spentMap: Record<string, number> = {}
  for (const tx of txns ?? []) {
    spentMap[tx.category] = (spentMap[tx.category] ?? 0) + Number(tx.amount)
  }

  const budgets: BudgetWithSpent[] = (rawBudgets ?? []).map((b: any) => ({
    id: b.id,
    category: b.category,
    amount: Number(b.amount),
    period: b.period,
    spent: spentMap[b.category] ?? 0,
  }))

  return <BudgetsClient budgets={budgets} />
}
