'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSubscription(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const amount = parseFloat(formData.get('amount') as string)
  if (isNaN(amount) || amount <= 0) throw new Error('Ongeldig bedrag')

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    name: (formData.get('name') as string).trim(),
    icon: (formData.get('icon') as string) || '📱',
    color: (formData.get('color') as string) || '#6366f1',
    amount,
    billing_cycle: formData.get('billing_cycle') as string || 'monthly',
    next_billing_date: (formData.get('next_billing_date') as string) || null,
    category: (formData.get('category') as string) || 'Abonnementen',
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
}

export async function updateSubscription(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const amount = parseFloat(formData.get('amount') as string)
  if (isNaN(amount) || amount <= 0) throw new Error('Ongeldig bedrag')

  const { error } = await supabase.from('subscriptions')
    .update({
      name: (formData.get('name') as string).trim(),
      icon: (formData.get('icon') as string) || '📱',
      color: (formData.get('color') as string) || '#6366f1',
      amount,
      billing_cycle: formData.get('billing_cycle') as string || 'monthly',
      next_billing_date: (formData.get('next_billing_date') as string) || null,
      category: (formData.get('category') as string) || 'Abonnementen',
    })
    .eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
}

export async function toggleSubscription(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('subscriptions')
    .update({ is_active: isActive }).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('subscriptions')
    .delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
}
