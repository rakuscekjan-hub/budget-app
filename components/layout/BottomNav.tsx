'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Overzicht',   icon: '🏠' },
  { href: '/transactions', label: 'Transacties', icon: '💳' },
  { href: '/budgets',      label: 'Budgetten',   icon: '🎯' },
  { href: '/wallets',      label: 'Wallets',     icon: '👛' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-white/90 dark:bg-slate-950/90 backdrop-blur
                 border-t border-slate-100 dark:border-slate-800
                 grid grid-cols-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-2 gap-0.5 transition ${
              active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-500'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className={`text-[9px] font-medium leading-none ${
              active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
            }`}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
