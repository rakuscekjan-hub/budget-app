'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Overzicht',   icon: '🏠' },
  { href: '/transactions', label: 'Transacties', icon: '💳' },
  { href: '/budgets',      label: 'Budgetten',   icon: '🎯' },
  { href: '/wallets',      label: 'Wallets',     icon: '👛' },
  { href: '/insights',     label: 'Analyse',     icon: '📊' },
  { href: '/household',    label: 'Huishouden',  icon: '👥' },
]

export default function Navbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="hidden md:block sticky top-0 z-40
                       bg-white/80 dark:bg-slate-950/80
                       backdrop-blur border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white shrink-0">
          <span className="text-xl">💰</span>
          <span>BudgetApp</span>
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                pathname.startsWith(item.href)
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <span className="text-xs text-slate-400 hidden lg:block truncate max-w-[100px]">
            {userEmail}
          </span>
          <button
            onClick={signOut}
            className="text-sm text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg
                       hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition"
          >
            Uit
          </button>
        </div>
      </div>
    </header>
  )
}
