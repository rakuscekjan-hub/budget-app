import type { Expense, Income } from '@/types/database'
import { toMonthly, computeCategoryTotals, computeTotals } from './calculations'

export interface InsightItem {
  id: string
  expense_id?: string
  type: 'quick_win' | 'top_cost' | 'category_warning' | 'annual_visibility' | 'scenario'
  title: string
  description: string
  estimated_saving_monthly: number
  is_cancellable: boolean
  is_necessary: boolean
  contract_end_date?: string | null
  category?: string
  badge?: string
  relatedExpenses?: Expense[]
}

export interface ScenarioItem {
  title: string
  expenses: Expense[]
  totalSavingMonthly: number
}

export interface InsightsReport {
  top5Expenses: Array<{ expense: Expense; monthly: number }>
  quickWins: Array<{ expense: Expense; monthly: number }>
  quickWinTotal: number
  categoryWarnings: Array<{ category: string; monthly: number; percentage: number }>
  annualItems: Array<{ expense: Expense; monthly: number; annual: number }>
  scenarios: ScenarioItem[]
  overallWarning: boolean
  fixedCostsRatio: number
  items: InsightItem[]
}

export function generateInsights(
  incomes: Income[],
  expenses: Expense[],
  categoryThreshold = 35,
  overallThreshold = 70
): InsightsReport {
  const active = expenses.filter((e) => e.is_active)
  const { incomeMonthly, fixedCostsRatio } = computeTotals(incomes, active)
  const categoryTotals = computeCategoryTotals(active, incomeMonthly)

  // Alle actieve posten gesorteerd op maandimpact
  const withMonthly = active
    .map((e) => ({ expense: e, monthly: toMonthly(e.amount, e.frequency) }))
    .sort((a, b) => b.monthly - a.monthly)

  const top5Expenses = withMonthly.slice(0, 5)

  // Quick wins: opzegbaar + niet noodzakelijk
  const quickWins = withMonthly.filter(
    ({ expense }) => expense.cancellable && !expense.necessary
  )
  const quickWinTotal = quickWins.reduce((s, { monthly }) => s + monthly, 0)

  // Categorie-waarschuwingen
  const categoryWarnings = categoryTotals
    .filter((c) => c.percentage > categoryThreshold)
    .map((c) => ({ category: c.category, monthly: c.monthly, percentage: c.percentage }))

  // Jaarlijkse posten
  const annualItems = withMonthly
    .filter(({ expense }) => expense.frequency === 'yearly')
    .map(({ expense, monthly }) => ({ expense, monthly, annual: expense.amount }))

  // Scenario's: combinaties van opzegbare posten
  const cancellable = withMonthly.filter(({ expense }) => expense.cancellable)
  const scenarios: ScenarioItem[] = []

  if (cancellable.length >= 2) {
    // Top-2 combo
    scenarios.push({
      title: `Zeg ${cancellable[0].expense.name} & ${cancellable[1].expense.name} op`,
      expenses: [cancellable[0].expense, cancellable[1].expense],
      totalSavingMonthly: cancellable[0].monthly + cancellable[1].monthly,
    })
  }
  if (cancellable.length >= 1) {
    // Top-1 solo
    scenarios.push({
      title: `Alleen ${cancellable[0].expense.name} opzeggen`,
      expenses: [cancellable[0].expense],
      totalSavingMonthly: cancellable[0].monthly,
    })
  }
  if (quickWins.length >= 3) {
    // Alle quick wins
    const total = quickWins.reduce((s, { monthly }) => s + monthly, 0)
    scenarios.push({
      title: `Alle ${quickWins.length} quick wins opzeggen`,
      expenses: quickWins.map(({ expense }) => expense),
      totalSavingMonthly: total,
    })
  }

  // Build insight items list (gesorteerd op impact)
  const items: InsightItem[] = []

  // 1. Quick wins
  quickWins.slice(0, 5).forEach(({ expense, monthly }) => {
    items.push({
      id: `qw_${expense.id}`,
      expense_id: expense.id,
      type: 'quick_win',
      title: `Zeg "${expense.name}" op`,
      description: `Opzegbaar en niet noodzakelijk. Direct besparing mogelijk.`,
      estimated_saving_monthly: monthly,
      is_cancellable: true,
      is_necessary: false,
      category: expense.category,
      badge: 'Quick win',
    })
  })

  // 2. Categorie-waarschuwingen
  categoryWarnings.forEach(({ category, monthly, percentage }) => {
    const excess = Math.max(0, monthly - incomeMonthly * (categoryThreshold / 100))
    items.push({
      id: `cat_${category}`,
      type: 'category_warning',
      title: `${category} = ${Math.round(percentage)}% van inkomen`,
      description: `Je besteedt ${Math.round(percentage)}% aan ${category}. Richtlijn: max ${categoryThreshold}%.`,
      estimated_saving_monthly: excess,
      is_cancellable: false,
      is_necessary: false,
      category,
      badge: 'Categorie',
    })
  })

  // 3. Jaarlijkse posten
  annualItems.forEach(({ expense, monthly }) => {
    items.push({
      id: `ann_${expense.id}`,
      expense_id: expense.id,
      type: 'annual_visibility',
      title: `${expense.name}: €${Math.round(expense.amount)}/jaar`,
      description: `Verborgen jaarlijkse kost. Maandimpact: €${Math.round(monthly)}.`,
      estimated_saving_monthly: monthly,
      is_cancellable: expense.cancellable,
      is_necessary: expense.necessary,
      category: expense.category,
      badge: 'Jaarlijks',
    })
  })

  // Sorteren op impact, dedupliceren
  const seen = new Set<string>()
  const dedupedItems = items
    .sort((a, b) => b.estimated_saving_monthly - a.estimated_saving_monthly)
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .slice(0, 10)

  return {
    top5Expenses,
    quickWins,
    quickWinTotal,
    categoryWarnings,
    annualItems,
    scenarios,
    overallWarning: fixedCostsRatio > overallThreshold,
    fixedCostsRatio,
    items: dedupedItems,
  }
}
