'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const amount = parseFloat(formData.get('amount') as string)
  if (isNaN(amount) || amount <= 0) throw new Error('Ongeldig bedrag')

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    name: (formData.get('name') as string).trim(),
    amount,
    type: formData.get('type') as string || 'expense',
    category: formData.get('category') as string || 'Overig',
    date: formData.get('date') as string || new Date().toISOString().split('T')[0],
    notes: (formData.get('notes') as string)?.trim() || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const amount = parseFloat(formData.get('amount') as string)
  if (isNaN(amount) || amount <= 0) throw new Error('Ongeldig bedrag')

  const { error } = await supabase.from('transactions')
    .update({
      name: (formData.get('name') as string).trim(),
      amount,
      type: formData.get('type') as string,
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      notes: (formData.get('notes') as string)?.trim() || null,
    })
    .eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('transactions')
    .delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function importTransactions(
  rows: Array<{ name: string; amount: number; type: string; category: string; date: string }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('transactions').insert(
    rows.map(r => ({ ...r, user_id: user.id, imported: true }))
  )
  if (error) throw new Error(error.message)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}
