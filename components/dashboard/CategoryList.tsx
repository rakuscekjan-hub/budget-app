import type { CategoryTotal } from '@/lib/calculations'
import { formatCurrency } from '@/lib/calculations'

interface Props {
  categories: CategoryTotal[]
}

const CATEGORY_COLORS = [
  'bg-brand-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
]

export default function CategoryList({ categories }: Props) {
  const maxMonthly = Math.max(...categories.map((c) => c.monthly), 1)

  return (
    <ul className="space-y-3">
      {categories.slice(0, 6).map((cat, i) => (
        <li key={cat.category}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
              />
              <span className="text-sm text-slate-700">{cat.category}</span>
              {cat.percentage > 35 && (
                <span className="badge bg-red-50 text-red-600 text-[10px]">Hoog</span>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(cat.monthly)}
              <span className="text-slate-400 font-normal">/m</span>
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} opacity-70`}
              style={{ width: `${(cat.monthly / maxMonthly) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
