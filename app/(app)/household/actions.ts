'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createHousehold(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 1) throw new Error('Naam is verplicht')
  if (name.length > 80) throw new Error('Naam mag maximaal 80 tekens zijn')

  const { data: household, error: hErr } = await supabase
    .from('households')
    .insert({ name, created_by: user.id })
    .select('id')
    .single()
  if (hErr) throw new Error(hErr.message)

  const { error: mErr } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'owner', status: 'active' })
  if (mErr) throw new Error(mErr.message)

  revalidatePath('/household')
}

export async function inviteMember(householdId: string, email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const trimEmail = email.trim().toLowerCase()
  if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
    throw new Error('Voer een geldig e-mailadres in')
  }
  if (trimEmail === user.email?.toLowerCase()) {
    throw new Error('Je kunt jezelf niet uitnodigen')
  }

  const { data: existing } = await supabase
    .from('household_members')
    .select('id, status')
    .eq('household_id', householdId)
    .eq('invited_email', trimEmail)
    .maybeSingle()

  if (existing?.status === 'active') throw new Error('Dit e-mailadres is al lid')
  if (existing?.status === 'pending') throw new Error('Dit e-mailadres heeft al een openstaande uitnodiging')

  const { error } = await supabase.from('household_members').insert({
    household_id: householdId,
    invited_email: trimEmail,
    role: 'member',
    status: 'pending',
  })
  if (error) throw new Error(error.message)

  revalidatePath('/household')
}

export async function acceptInvite(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase
    .from('household_members')
    .update({ user_id: user.id, status: 'active' })
    .eq('id', memberId)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)

  revalidatePath('/household')
}

export async function declineInvite(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase
    .from('household_members')
    .update({ status: 'declined' })
    .eq('id', memberId)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)

  revalidatePath('/household')
}

export async function leaveHousehold(householdId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: household } = await supabase
    .from('households')
    .select('created_by')
    .eq('id', householdId)
    .single()

  if (household?.created_by === user.id) {
    const { error } = await supabase.from('households').delete().eq('id', householdId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/household')
}

export async function removeMember(memberId: string, householdId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: household } = await supabase
    .from('households')
    .select('created_by')
    .eq('id', householdId)
    .single()
  if (household?.created_by !== user.id) throw new Error('Geen rechten')

  const { error } = await supabase.from('household_members').delete().eq('id', memberId)
  if (error) throw new Error(error.message)

  revalidatePath('/household')
}
