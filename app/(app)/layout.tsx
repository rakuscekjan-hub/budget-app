import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import QuickAdd from '@/components/QuickAdd'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Wallets ophalen voor QuickAdd
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, icon')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at')

  const walletList = (wallets ?? []).map((w: any) => ({ id: w.id, name: w.name, icon: w.icon }))

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userEmail={user.email ?? ''} />
      <main className="flex-1 pb-24 md:pb-8 max-w-2xl mx-auto w-full px-4 pt-6">
        {children}
      </main>
      <BottomNav />
      <QuickAdd wallets={walletList} />
    </div>
  )
}
