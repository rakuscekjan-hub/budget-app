'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateDailyTip } from '@/lib/tip-engine'
import { format } from 'date-fns'
import type { TipStatus } from '@/types/database'

export async function ensureDailyTip(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = format(new Date(), 'yyyy-MM-dd')

  // Bestaat er al een tip voor vandaag?
  const { data: existing } = await supabase
    .from('generated_tips')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  if (existing) return

  // Haal data op parallel
  const [
    { data: incomes },
    { data: expenses },
    { data: tipCatalog },
    { data: insightsState },
  ] = await Promise.all([
    supabase.from('incomes').select('*').eq('user_id', user.id),
    supabase.from('expenses').select('*').eq('user_id', user.id),
    supabase.from('tips_catalog').select('*').eq('is_active', true),
    supabase.from('insights_state').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  if (!tipCatalog || tipCatalog.length === 0) return

  const candidate = generateDailyTip({
    incomes: incomes ?? [],
    expenses: expenses ?? [],
    tipCatalog,
    insightsState: insightsState ?? null,
    today,
  })

  if (!candidate) return

  // Sla tip op (negeer conflict — kan race condition zijn)
  const { error: tipError } = await supabase.from('generated_tips').insert({
    user_id: user.id,
    date: today,
    tip_id: candidate.tip_id,
    title: candidate.title,
    message: candidate.message,
    estimated_saving_monthly: candidate.estimated_saving_monthly,
    action_cta: candidate.action_cta,
    status: 'new',
    expense_id: candidate.expense_id ?? null,
  })

  if (tipError) return // Conflict (race) of tabel bestaat niet — stil afhandelen

  // Update insights_state
  const currentHistory: string[] = insightsState?.tip_history ?? []
  const currentCooldowns: Record<string, string> = insightsState?.cooldowns ?? {}

  await supabase.from('insights_state').upsert(
    {
      user_id: user.id,
      last_tip_at: today,
      tip_history: [...currentHistory, candidate.tip_id].slice(-50),
      cooldowns: { ...currentCooldowns, [candidate.tip_id]: today },
    },
    { onConflict: 'user_id' }
  )
}

export async function updateTipStatus(tipId: string, status: TipStatus): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('generated_tips')
    .update({ status })
    .eq('id', tipId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}

export async function markTipDoneAndDeactivate(
  tipId: string,
  expenseId: string | null
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('generated_tips')
    .update({ status: 'done' })
    .eq('id', tipId)
    .eq('user_id', user.id)

  if (expenseId) {
    await supabase
      .from('expenses')
      .update({ is_active: false })
      .eq('id', expenseId)
      .eq('user_id', user.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/expenses')
}
