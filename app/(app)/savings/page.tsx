import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SavingsClient from './SavingsClient'

export const dynamic = 'force-dynamic'

export default async function SavingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: goals } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  const totalTarget  = (goals ?? []).reduce((s: number, g: any) => s + Number(g.target_amount), 0)
  const totalSaved   = (goals ?? []).reduce((s: number, g: any) => s + Number(g.current_amount), 0)
  const totalNeeded  = totalTarget - totalSaved

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Spaardoelen</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Nog {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totalNeeded)} te gaan
          </p>
        </div>
      </div>

      <SavingsClient goals={(goals ?? []).map((g: any) => ({
        id: g.id, name: g.name, icon: g.icon, color: g.color,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount),
        deadline: g.deadline,
      }))} />
    </div>
  )
}
