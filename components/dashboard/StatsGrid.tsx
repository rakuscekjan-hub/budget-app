import { formatCurrency } from '@/lib/calculations'
import Link from 'next/link'

interface Props {
  incomeMonthly: number
  fixedCostsMonthly: number
  safeToSpend: number
  incomesCount: number
  expensesCount: number
}

export default function StatsGrid({
  incomeMonthly,
  fixedCostsMonthly,
  safeToSpend,
  incomesCount,
  expensesCount,
}: Props) {
  const stats = [
    {
      label: 'Inkomen / maand',
      value: formatCurrency(incomeMonthly),
      sub: `${incomesCount} bron${incomesCount !== 1 ? 'nen' : ''}`,
      href: '/incomes',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Vaste lasten / maand',
      value: formatCurrency(fixedCostsMonthly),
      sub: `${expensesCount} post${expensesCount !== 1 ? 'en' : ''}`,
      href: '/expenses',
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: 'Jaarlijkse besparing',
      value: formatCurrency(Math.max(0, safeToSpend) * 12),
      sub: 'als je alles vrij spaart',
      href: '/insights',
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href} className="card-hover p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
            <span className="text-slate-400 text-xs font-medium">→</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
