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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4"
      style={{
        background: 'rgba(10,8,20,0.92)',
        borderTop: '1px solid rgba(91,76,255,0.18)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all duration-150"
            style={{ color: active ? '#8b7aff' : '#4a4270' }}
          >
            {active && (
              <span className="absolute w-8 h-px rounded-full -mt-2.5"
                    style={{ background: 'linear-gradient(90deg, transparent, #5b4cff, transparent)' }} />
            )}
            <span className="text-lg">{item.icon}</span>
            <span className={`text-[9px] font-semibold leading-none`}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
