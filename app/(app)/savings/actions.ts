'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const target = parseFloat(formData.get('target_amount') as string)
  if (isNaN(target) || target <= 0) throw new Error('Ongeldig doelbedrag')

  const deadline = (formData.get('deadline') as string) || null

  const { error } = await supabase.from('savings_goals').insert({
    user_id: user.id,
    name: (formData.get('name') as string).trim(),
    icon: (formData.get('icon') as string) || '🎯',
    color: (formData.get('color') as string) || '#6366f1',
    target_amount: target,
    current_amount: 0,
    deadline,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/savings')
}

export async function updateGoal(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const target = parseFloat(formData.get('target_amount') as string)
  if (isNaN(target) || target <= 0) throw new Error('Ongeldig doelbedrag')
  const current = parseFloat(formData.get('current_amount') as string) || 0
  const deadline = (formData.get('deadline') as string) || null

  const { error } = await supabase.from('savings_goals')
    .update({
      name: (formData.get('name') as string).trim(),
      icon: (formData.get('icon') as string) || '🎯',
      color: (formData.get('color') as string) || '#6366f1',
      target_amount: target,
      current_amount: current,
      deadline,
    })
    .eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/savings')
}

export async function depositGoal(id: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: goal } = await supabase.from('savings_goals')
    .select('current_amount, target_amount').eq('id', id).eq('user_id', user.id).single()
  if (!goal) throw new Error('Niet gevonden')

  const newAmount = Math.min(Number(goal.current_amount) + amount, Number(goal.target_amount))
  const { error } = await supabase.from('savings_goals')
    .update({ current_amount: newAmount }).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/savings')
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('savings_goals')
    .delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/savings')
}
