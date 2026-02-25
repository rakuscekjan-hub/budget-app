import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/calculations'
import SubscriptionsClient from './SubscriptionsClient'

export const dynamic = 'force-dynamic'

const CYCLE_MONTHS: Record<string, number> = {
  weekly: 1/4.33, monthly: 1, quarterly: 3, yearly: 12,
}

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  const list = (subs ?? []).map((s: any) => ({
    id: s.id, name: s.name, icon: s.icon, color: s.color,
    amount: Number(s.amount), billing_cycle: s.billing_cycle,
    next_billing_date: s.next_billing_date, category: s.category,
    is_active: s.is_active,
  }))

  const monthlyTotal = list
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + s.amount / (CYCLE_MONTHS[s.billing_cycle] ?? 1), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Abonnementen</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {formatCurrency(monthlyTotal)}/maand aan actieve abonnementen
        </p>
      </div>

      <SubscriptionsClient subs={list} />
    </div>
  )
}
