import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/calculations'
import TransactionsClient from './TransactionsClient'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const monthParam = params.month || format(new Date(), 'yyyy-MM')
  const [year, month] = monthParam.split('-').map(Number)
  const from = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  const to = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  const tx = transactions ?? []
  const totalExpenses = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome   = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-header">Transacties</h1>
          <p className="muted">
            Uitgaven: <strong className="text-red-500">{formatCurrency(totalExpenses)}</strong>
            {totalIncome > 0 && <> · Inkomsten: <strong className="text-emerald-600">{formatCurrency(totalIncome)}</strong></>}
          </p>
        </div>
      </div>
      <TransactionsClient
        transactions={tx}
        currentMonth={monthParam}
      />
    </div>
  )
}
