'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { WalletType } from '@/types/database'

export async function createWallet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('Naam is verplicht')

  const balance = parseFloat(formData.get('balance') as string || '0')
  if (isNaN(balance)) throw new Error('Ongeldig saldo')

  // Eerste wallet wordt standaard
  const { count } = await supabase.from('wallets').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const is_default = (count ?? 0) === 0

  const { error } = await supabase.from('wallets').insert({
    user_id: user.id,
    name,
    type: formData.get('type') as WalletType || 'checking',
    balance,
    color: formData.get('color') as string || '#6366f1',
    icon: formData.get('icon') as string || '💳',
    is_default,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/wallets')
  revalidatePath('/dashboard')
}

export async function updateWallet(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('Naam is verplicht')

  const balance = parseFloat(formData.get('balance') as string || '0')
  if (isNaN(balance)) throw new Error('Ongeldig saldo')

  const { error } = await supabase.from('wallets').update({
    name,
    type: formData.get('type') as WalletType,
    balance,
    color: formData.get('color') as string,
    icon: formData.get('icon') as string,
  }).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/wallets')
  revalidatePath('/dashboard')
}

export async function deleteWallet(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('wallets').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/wallets')
  revalidatePath('/dashboard')
}

export async function setDefaultWallet(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  await supabase.from('wallets').update({ is_default: false }).eq('user_id', user.id)
  const { error } = await supabase.from('wallets').update({ is_default: true }).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/wallets')
}
