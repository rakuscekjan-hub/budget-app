import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import QuickAdd from '@/components/QuickAdd'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, icon')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at')

  const walletList = (wallets ?? []).map((w: any) => ({ id: w.id, name: w.name, icon: w.icon }))

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Atmospheric background glows — EternaCloud style */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-30"
             style={{ background: 'radial-gradient(ellipse, rgba(91,76,255,0.55) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[500px] rounded-full opacity-20"
             style={{ background: 'radial-gradient(ellipse, rgba(91,76,255,0.5) 0%, transparent 70%)' }} />
        <div className="absolute top-1/4 -right-32 w-[350px] h-[450px] rounded-full opacity-15"
             style={{ background: 'radial-gradient(ellipse, rgba(180,100,255,0.6) 0%, transparent 70%)' }} />
      </div>

      <Navbar userEmail={user.email ?? ''} />
      <main className="flex-1 pb-24 md:pb-8 max-w-2xl mx-auto w-full px-4 pt-6 relative z-10">
        {children}
      </main>
      <BottomNav />
      <QuickAdd wallets={walletList} />
    </div>
  )
}
