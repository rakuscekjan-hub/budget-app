import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WalletsClient, { type WalletWithBalance } from './WalletsClient'
import type { WalletType } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Wallets ophalen
  const { data: rawWallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // Transactie-sommen per wallet berekenen
  const { data: txSums } = await supabase
    .from('transactions')
    .select('wallet_id, type, amount')
    .eq('user_id', user.id)
    .not('wallet_id', 'is', null)

  const balanceMap: Record<string, number> = {}
  for (const tx of txSums ?? []) {
    if (!tx.wallet_id) continue
    const delta = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)
    balanceMap[tx.wallet_id] = (balanceMap[tx.wallet_id] ?? 0) + delta
  }

  const wallets: WalletWithBalance[] = (rawWallets ?? []).map((w: any) => ({
    id: w.id,
    name: w.name,
    type: w.type as WalletType,
    balance: Number(w.balance),
    color: w.color,
    icon: w.icon,
    is_default: w.is_default,
    current_balance: Number(w.balance) + (balanceMap[w.id] ?? 0),
  }))

  return <WalletsClient wallets={wallets} />
}
