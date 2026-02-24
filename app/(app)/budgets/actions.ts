'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const amount = parseFloat(formData.get('amount') as string)
  if (isNaN(amount) || amount <= 0) throw new Error('Voer een geldig bedrag in')

  const { error } = await supabase.from('budgets').upsert({
    user_id: user.id,
    category: formData.get('category') as string,
    amount,
    period: formData.get('period') as string || 'monthly',
  }, { onConflict: 'user_id,category,period' })
  if (error) throw new Error(error.message)
  revalidatePath('/budgets')
  revalidatePath('/dashboard')
}

export async function deleteBudget(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/budgets')
  revalidatePath('/dashboard')
}
