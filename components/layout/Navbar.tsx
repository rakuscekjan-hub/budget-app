'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Overzicht'    },
  { href: '/transactions',  label: 'Transacties'  },
  { href: '/budgets',       label: 'Budgetten'    },
  { href: '/wallets',       label: 'Wallets'      },
  { href: '/savings',       label: 'Sparen'       },
  { href: '/subscriptions', label: 'Abonnementen' },
  { href: '/insights',      label: 'Analyse'      },
  { href: '/household',     label: 'Huishouden'   },
]

export default function Navbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="hidden md:block sticky top-0 z-40 px-4 pt-3 pb-2">
      {/* Pill navbar — EternaCloud style */}
      <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 h-12 rounded-2xl"
           style={{
             background: 'rgba(19,16,42,0.85)',
             border: '1px solid rgba(91,76,255,0.25)',
             backdropFilter: 'blur(16px)',
             WebkitBackdropFilter: 'blur(16px)',
             boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(91,76,255,0.05) inset',
           }}>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-black text-white shrink-0 mr-2">
          <span className="text-lg">💰</span>
          <span className="text-sm tracking-tight">BudgetApp</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150"
              style={pathname.startsWith(item.href) ? {
                background: 'rgba(91,76,255,0.25)',
                color: '#a594ff',
                boxShadow: '0 0 12px rgba(91,76,255,0.2)',
              } : {
                color: '#9b8fc4',
              }}
              onMouseEnter={e => {
                if (!pathname.startsWith(item.href))
                  (e.currentTarget as HTMLAnchorElement).style.color = '#fff'
              }}
              onMouseLeave={e => {
                if (!pathname.startsWith(item.href))
                  (e.currentTarget as HTMLAnchorElement).style.color = '#9b8fc4'
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <span className="text-xs hidden lg:block truncate max-w-[90px]" style={{ color: '#6b5f8a' }}>
            {userEmail}
          </span>
          <button
            onClick={signOut}
            className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all duration-150"
            style={{ color: '#9b8fc4', background: 'rgba(91,76,255,0.08)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(91,76,255,0.2)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(91,76,255,0.08)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#9b8fc4'
            }}
          >
            Uitloggen
          </button>
        </div>
      </div>
    </header>
  )
}
