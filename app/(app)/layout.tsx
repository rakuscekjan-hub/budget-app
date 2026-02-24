import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userEmail={user.email ?? ''} />
      <main className="flex-1 pb-20 md:pb-6 max-w-2xl mx-auto w-full px-4 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
