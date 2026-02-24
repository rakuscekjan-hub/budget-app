import type { Frequency, Income, Expense } from '@/types/database'

// ── Conversie naar maandbedrag ────────────────────────────────────────────────

export function toMonthly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'weekly':      return (amount * 52) / 12
    case 'biweekly':   return (amount * 26) / 12
    case 'four_weekly': return (amount * 13) / 12
    case 'monthly':    return amount
    case 'yearly':     return amount / 12
    default:           return amount
  }
}

export function toYearly(amount: number, frequency: Frequency): number {
  return toMonthly(amount, frequency) * 12
}

// ── Totalen ───────────────────────────────────────────────────────────────────

export interface Totals {
  incomeMonthly: number
  fixedCostsMonthly: number
  safeToSpend: number
  /** percentage vaste lasten van inkomen */
  fixedCostsRatio: number
}

export function computeTotals(incomes: Income[], expenses: Expense[]): Totals {
  const incomeMonthly = incomes.reduce(
    (sum, inc) => sum + toMonthly(inc.amount, inc.frequency),
    0
  )
  const fixedCostsMonthly = expenses
    .filter((e) => e.is_active)
    .reduce((sum, exp) => sum + toMonthly(exp.amount, exp.frequency), 0)

  const safeToSpend = incomeMonthly - fixedCostsMonthly
  const fixedCostsRatio =
    incomeMonthly > 0 ? (fixedCostsMonthly / incomeMonthly) * 100 : 0

  return { incomeMonthly, fixedCostsMonthly, safeToSpend, fixedCostsRatio }
}

// ── Categorie-totalen ─────────────────────────────────────────────────────────

export interface CategoryTotal {
  category: string
  monthly: number
  yearly: number
  percentage: number
  count: number
}

export function computeCategoryTotals(
  expenses: Expense[],
  totalIncomeMonthly: number
): CategoryTotal[] {
  const active = expenses.filter((e) => e.is_active)
  const map = new Map<string, { monthly: number; count: number }>()

  for (const exp of active) {
    const monthly = toMonthly(exp.amount, exp.frequency)
    const prev = map.get(exp.category) ?? { monthly: 0, count: 0 }
    map.set(exp.category, { monthly: prev.monthly + monthly, count: prev.count + 1 })
  }

  return Array.from(map.entries())
    .map(([category, { monthly, count }]) => ({
      category,
      monthly,
      yearly: monthly * 12,
      percentage: totalIncomeMonthly > 0 ? (monthly / totalIncomeMonthly) * 100 : 0,
      count,
    }))
    .sort((a, b) => b.monthly - a.monthly)
}

// ── Opmaak ────────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatPct(value: number): string {
  return `${Math.round(value)}%`
}
