'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatPct } from '@/lib/calculations'
import type { InsightsReport, InsightItem } from '@/lib/insights-engine'
import type { Expense } from '@/types/database'
import { toggleExpenseActive } from '@/app/(app)/expenses/actions'

interface Props {
  report: InsightsReport
  incomeMonthly: number
  safeToSpend: number
  expenses: Expense[]
}

type FilterType = 'all' | 'quick_win' | 'category_warning' | 'annual_visibility'

const TYPE_LABELS: Record<FilterType, string> = {
  all: 'Alles',
  quick_win: '⚡ Quick wins',
  category_warning: '📊 Categorieën',
  annual_visibility: '📅 Jaarlijkse kosten',
}

export default function InsightsClient({ report, incomeMonthly, safeToSpend, expenses }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [deactivated, setDeactivated] = useState<Set<string>>(new Set())

  async function handleDeactivate(expenseId: string) {
    await toggleExpenseActive(expenseId, false)
    setDeactivated((prev) => new Set(Array.from(prev).concat(expenseId)))
    router.refresh()
  }

  const filtered = report.items.filter(
    (item) => filter === 'all' || item.type === filter
  )

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Quick win totaal</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(report.quickWinTotal)}/m</p>
          <p className="text-xs text-slate-400">{report.quickWins.length} opzegbare posten</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Jaarlijks bespaarbaar</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(report.quickWinTotal * 12)}</p>
          <p className="text-xs text-slate-400">als je alles opzegt</p>
        </div>
      </div>

      {/* Warning banner */}
      {report.overallWarning && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 text-sm font-semibold">
            ⚠️ Vaste lasten = {formatPct(report.fixedCostsRatio)} van inkomen
          </p>
          <p className="text-red-600 text-xs mt-1">
            De richtlijn is max 70%. Je hebt weinig financiële buffer. Bekijk de quick wins hieronder.
          </p>
        </div>
      )}

      {/* Scenarios */}
      {report.scenarios.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">🎯 Scenario&apos;s</h2>
          <div className="space-y-3">
            {report.scenarios.map((scenario, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-slate-800 flex-1">{scenario.title}</p>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-emerald-600">
                      +{formatCurrency(scenario.totalSavingMonthly)}/m
                    </p>
                    <p className="text-xs text-slate-400">
                      +{formatCurrency(scenario.totalSavingMonthly * 12)}/jaar
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Safe-to-spend wordt:{' '}
                  <strong className="text-emerald-600">
                    {formatCurrency(safeToSpend + scenario.totalSavingMonthly)}/m
                  </strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 kosten */}
      {report.top5Expenses.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">💸 Top 5 duurste posten</h2>
          <ul className="space-y-2">
            {report.top5Expenses.map(({ expense, monthly }, i) => (
              <li key={expense.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm text-slate-800">{expense.name}</p>
                    <p className="text-xs text-slate-400">{expense.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(monthly)}/m
                  </p>
                  <p className="text-xs text-slate-400">{formatCurrency(monthly * 12)}/j</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter tabs */}
      <div>
        <div className="flex gap-2 flex-wrap mb-3">
          {(Object.keys(TYPE_LABELS) as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === type
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Insight items */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="card p-8 text-center border-2 border-dashed border-slate-200 bg-transparent shadow-none">
              <p className="text-slate-500 text-sm">
                {report.items.length === 0
                  ? 'Voeg uitgaven toe om inzichten te zien.'
                  : 'Geen items voor dit filter.'}
              </p>
            </div>
          )}

          {filtered.map((item) => (
            <InsightItemCard
              key={item.id}
              item={item}
              isDeactivated={item.expense_id ? deactivated.has(item.expense_id) : false}
              onDeactivate={item.expense_id ? () => handleDeactivate(item.expense_id!) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function InsightItemCard({
  item,
  isDeactivated,
  onDeactivate,
}: {
  item: InsightItem
  isDeactivated: boolean
  onDeactivate?: () => void
}) {
  const badgeColors: Record<string, string> = {
    'Quick win': 'bg-amber-50 text-amber-700',
    Categorie: 'bg-blue-50 text-blue-700',
    Jaarlijks: 'bg-violet-50 text-violet-700',
  }

  return (
    <div className={`card p-4 ${isDeactivated ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {item.badge && (
              <span className={`badge text-[10px] ${badgeColors[item.badge] ?? 'bg-slate-100 text-slate-600'}`}>
                {item.badge}
              </span>
            )}
            {item.is_cancellable && !item.is_necessary && (
              <span className="badge bg-emerald-50 text-emerald-700 text-[10px]">Opzegbaar</span>
            )}
          </div>
          <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.description}</p>
        </div>

        {item.estimated_saving_monthly > 0 && (
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-emerald-600">
              -{formatCurrency(item.estimated_saving_monthly)}/m
            </p>
            <p className="text-xs text-slate-400">
              {formatCurrency(item.estimated_saving_monthly * 12)}/jaar
            </p>
          </div>
        )}
      </div>

      {onDeactivate && !isDeactivated && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={onDeactivate}
            className="btn-secondary text-xs"
          >
            ✓ Markeer als opgezegd
          </button>
        </div>
      )}

      {isDeactivated && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-emerald-600 font-medium">✓ Gemarkeerd als inactief</span>
        </div>
      )}
    </div>
  )
}
