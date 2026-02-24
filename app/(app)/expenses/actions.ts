'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Frequency } from '@/types/database'

function validateAmount(raw: FormDataEntryValue | null): number {
  const n = parseFloat(raw as string)
  if (isNaN(n) || n <= 0) throw new Error('Voer een geldig bedrag in (groter dan 0)')
  return n
}

function validateName(raw: FormDataEntryValue | null): string {
  const s = (raw as string)?.trim()
  if (!s || s.length < 1) throw new Error('Naam is verplicht')
  if (s.length > 120) throw new Error('Naam mag maximaal 120 tekens zijn')
  return s
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    name: validateName(formData.get('name')),
    amount: validateAmount(formData.get('amount')),
    frequency: formData.get('frequency') as Frequency,
    category: (formData.get('category') as string) || 'Overig',
    necessary: formData.get('necessary') === 'true',
    cancellable: formData.get('cancellable') === 'true',
    contract_end_date: (formData.get('contract_end_date') as string) || null,
    merchant_hint: (formData.get('merchant_hint') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    is_active: true,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/insights')
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase
    .from('expenses')
    .update({
      name: validateName(formData.get('name')),
      amount: validateAmount(formData.get('amount')),
      frequency: formData.get('frequency') as Frequency,
      category: (formData.get('category') as string) || 'Overig',
      necessary: formData.get('necessary') === 'true',
      cancellable: formData.get('cancellable') === 'true',
      contract_end_date: (formData.get('contract_end_date') as string) || null,
      merchant_hint: (formData.get('merchant_hint') as string)?.trim() || null,
      notes: (formData.get('notes') as string)?.trim() || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/insights')
}

export async function toggleExpenseActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase
    .from('expenses')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/insights')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/insights')
}
