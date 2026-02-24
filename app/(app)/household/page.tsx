import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toMonthly } from '@/lib/calculations'
import type { Frequency } from '@/types/database'
import HouseholdClient from './HouseholdClient'
import type {
  HouseholdData,
  MemberData,
  PendingInviteData,
  SharedTxData,
  BudgetData,
} from './HouseholdClient'

export const dynamic = 'force-dynamic'

export default async function HouseholdPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Pending invites (by email)
  const { data: rawInvites } = await supabase
    .from('household_members')
    .select('id, household_id, role, households(name)')
    .eq('invited_email', user.email!)
    .eq('status', 'pending')

  const pendingInvites: PendingInviteData[] = (rawInvites ?? []).map((r: any) => ({
    id: r.id,
    household_id: r.household_id,
    role: r.role,
    households: r.households,
  }))

  // Active membership
  const { data: myMembership } = await supabase
    .from('household_members')
    .select('id, household_id, role, households(id, name, created_by, created_at)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const householdRaw = (myMembership as any)?.households ?? null
  const household: HouseholdData | null = householdRaw
    ? {
        id: householdRaw.id,
        name: householdRaw.name,
        created_by: householdRaw.created_by,
        created_at: householdRaw.created_at,
      }
    : null

  // All members (if in household)
  let members: MemberData[] = []
  let sharedTransactions: SharedTxData[] = []

  if (household) {
    const { data: allMembers } = await supabase
      .from('household_members')
      .select('id, user_id, invited_email, role, status')
      .eq('household_id', household.id)
      .order('created_at', { ascending: true })

    members = (allMembers ?? []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      invited_email: m.invited_email,
      role: m.role,
      status: m.status,
    }))

    // Shared transactions this month
    const now = new Date()
    const { data: txns } = await supabase
      .from('transactions')
      .select('id, name, amount, type, category, date, user_id')
      .eq('household_id', household.id)
      .gte('date', format(startOfMonth(now), 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth(now), 'yyyy-MM-dd'))
      .order('date', { ascending: false })

    sharedTransactions = (txns ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      date: t.date,
      user_id: t.user_id,
    }))
  }

  // My own budget totals
  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase
      .from('incomes')
      .select('amount, frequency')
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabase
      .from('expenses')
      .select('amount, frequency')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ])

  const incomeMonthly = (incomes ?? []).reduce(
    (s, i: any) => s + toMonthly(Number(i.amount), i.frequency as Frequency),
    0
  )
  const fixedCostsMonthly = (expenses ?? []).reduce(
    (s, e: any) => s + toMonthly(Number(e.amount), e.frequency as Frequency),
    0
  )
  const myBudget: BudgetData = {
    incomeMonthly,
    fixedCostsMonthly,
    safeToSpend: incomeMonthly - fixedCostsMonthly,
  }

  return (
    <HouseholdClient
      userId={user.id}
      userEmail={user.email!}
      household={household}
      isOwner={household?.created_by === user.id}
      members={members}
      pendingInvites={pendingInvites}
      sharedTransactions={sharedTransactions}
      myBudget={myBudget}
    />
  )
}
