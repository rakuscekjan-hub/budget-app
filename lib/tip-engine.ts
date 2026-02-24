import type { Expense, Income, TipCatalog, InsightsState } from '@/types/database'
import { toMonthly, computeTotals, computeCategoryTotals } from './calculations'
import { addDays, format, parseISO, isAfter } from 'date-fns'

export interface TipCandidate {
  tip_id: string
  title: string
  message: string
  estimated_saving_monthly: number
  action_cta: string
  score: number
  expense_id?: string | null
}

export interface TipContext {
  incomes: Income[]
  expenses: Expense[]
  tipCatalog: TipCatalog[]
  insightsState: InsightsState | null
  today: string // yyyy-MM-dd
  categoryThreshold?: number
}

// ── Hulpfuncties ─────────────────────────────────────────────────────────────

function isInCooldown(
  tipId: string,
  cooldownDays: number,
  cooldowns: Record<string, string>,
  today: string
): boolean {
  const lastShown = cooldowns[tipId]
  if (!lastShown) return false
  const cooldownUntil = format(addDays(parseISO(lastShown), cooldownDays), 'yyyy-MM-dd')
  return today < cooldownUntil
}

function repetitionPenalty(tipId: string, history: string[]): number {
  return history.filter((h) => h === tipId).length * 5
}

// ── Kandidaat-generators per type ─────────────────────────────────────────────

function makeQuickWinCandidate(
  catalog: TipCatalog,
  expenses: Expense[]
): Omit<TipCandidate, 'score'> | null {
  const quickWins = expenses
    .filter((e) => e.cancellable && !e.necessary && e.is_active)
    .map((e) => ({ expense: e, monthly: toMonthly(e.amount, e.frequency) }))
    .sort((a, b) => b.monthly - a.monthly)

  if (quickWins.length === 0) return null
  const top = quickWins[0]

  return {
    tip_id: catalog.tip_id,
    title: `💡 Bespaar €${Math.round(top.monthly)}/m: zeg "${top.expense.name}" op`,
    message: `"${top.expense.name}" is opzegbaar en niet noodzakelijk. Als je dit abonnement of deze dienst opzegt, houd je €${Math.round(top.monthly)} extra per maand over.`,
    estimated_saving_monthly: top.monthly,
    action_cta: 'Markeer als opgezegd',
    expense_id: top.expense.id,
  }
}

function makeContractCandidate(
  catalog: TipCatalog,
  expenses: Expense[],
  today: string
): Omit<TipCandidate, 'score'> | null {
  const todayDate = parseISO(today)
  const soon = expenses
    .filter((e) => {
      if (!e.contract_end_date || !e.is_active) return false
      const end = parseISO(e.contract_end_date)
      const diff = (end.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 30
    })
    .map((e) => ({ expense: e, monthly: toMonthly(e.amount, e.frequency) }))
    .sort((a, b) => b.monthly - a.monthly)

  if (soon.length === 0) return null
  const top = soon[0]
  const daysLeft = Math.round(
    (parseISO(top.expense.contract_end_date!).getTime() - todayDate.getTime()) /
      (1000 * 60 * 60 * 24)
  )

  return {
    tip_id: catalog.tip_id,
    title: `⏰ Contract "${top.expense.name}" loopt over ${daysLeft} dagen af`,
    message: `Je contract voor "${top.expense.name}" (€${Math.round(top.monthly)}/m) loopt binnenkort af. Nu opzeggen of heronderhandelen? Dit is het moment.`,
    estimated_saving_monthly: top.monthly,
    action_cta: 'Opzeggen / heronderhandelen',
    expense_id: top.expense.id,
  }
}

function makeCategoryCandidate(
  catalog: TipCatalog,
  expenses: Expense[],
  incomeMonthly: number,
  categoryThreshold: number
): Omit<TipCandidate, 'score'> | null {
  const categories = computeCategoryTotals(expenses, incomeMonthly)
  const heavy = categories.filter((c) => c.percentage > categoryThreshold)
  if (heavy.length === 0) return null

  const top = heavy[0]
  const excess = Math.max(0, top.monthly - incomeMonthly * (categoryThreshold / 100))

  return {
    tip_id: catalog.tip_id,
    title: `📊 ${top.category} slokt ${Math.round(top.percentage)}% van je inkomen op`,
    message: `Je geeft €${Math.round(top.monthly)}/m aan ${top.category}. De richtlijn is max ${categoryThreshold}%. Snijden in deze categorie bespaart snel €${Math.round(excess)}/m.`,
    estimated_saving_monthly: excess,
    action_cta: 'Bekijk categorie in Insights',
    expense_id: null,
  }
}

function makeAnnualCandidate(
  catalog: TipCatalog,
  expenses: Expense[]
): Omit<TipCandidate, 'score'> | null {
  const annual = expenses
    .filter((e) => e.frequency === 'yearly' && e.is_active)
    .map((e) => ({ expense: e, monthly: toMonthly(e.amount, e.frequency) }))
    .sort((a, b) => b.monthly - a.monthly)

  if (annual.length === 0) return null
  const top = annual[0]

  return {
    tip_id: catalog.tip_id,
    title: `📅 ${top.expense.name} kost €${Math.round(top.expense.amount)}/jaar`,
    message: `Dit staat niet direct in je budget, maar kost je €${Math.round(top.monthly)}/m als je het uitsmiert. Wil je dit blijven betalen, of is er een goedkoper alternatief?`,
    estimated_saving_monthly: top.expense.cancellable ? top.monthly : 0,
    action_cta: top.expense.cancellable ? 'Overwegen op te zeggen' : 'Bekijk jaarlasten',
    expense_id: top.expense.id,
  }
}

function makeScenarioCandidate(
  catalog: TipCatalog,
  expenses: Expense[]
): Omit<TipCandidate, 'score'> | null {
  const cancellable = expenses
    .filter((e) => e.cancellable && e.is_active)
    .map((e) => ({ expense: e, monthly: toMonthly(e.amount, e.frequency) }))
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 2)

  if (cancellable.length === 0) return null

  const total = cancellable.reduce((s, { monthly }) => s + monthly, 0)
  const names = cancellable.map(({ expense }) => `"${expense.name}"`).join(' + ')

  return {
    tip_id: catalog.tip_id,
    title: `🎯 Scenario: zeg ${names} op → +€${Math.round(total)}/m`,
    message: `Als je ${names} opzegt, stijgt je vrij besteedbare bedrag met €${Math.round(total)} per maand (€${Math.round(total * 12)}/jaar).`,
    estimated_saving_monthly: total,
    action_cta: 'Bekijk scenario in Insights',
    expense_id: cancellable[0].expense.id,
  }
}

// ── Hoofd-generator ───────────────────────────────────────────────────────────

export function generateDailyTip(ctx: TipContext): TipCandidate | null {
  const { incomes, expenses, tipCatalog, insightsState, today, categoryThreshold = 35 } = ctx
  const active = expenses.filter((e) => e.is_active)
  const { incomeMonthly } = computeTotals(incomes, active)
  const history = insightsState?.tip_history ?? []
  const cooldowns = insightsState?.cooldowns ?? {}

  const candidates: TipCandidate[] = []

  for (const catalog of tipCatalog.filter((t) => t.is_active)) {
    if (isInCooldown(catalog.tip_id, catalog.cooldown_days, cooldowns, today)) continue

    let base: Omit<TipCandidate, 'score'> | null = null

    switch (catalog.type) {
      case 'quick_win':
        base = makeQuickWinCandidate(catalog, expenses)
        break
      case 'contract':
        base = makeContractCandidate(catalog, expenses, today)
        break
      case 'category_heavy':
        base = makeCategoryCandidate(catalog, expenses, incomeMonthly, categoryThreshold)
        break
      case 'annual_visibility':
        base = makeAnnualCandidate(catalog, expenses)
        break
      case 'scenario':
        base = makeScenarioCandidate(catalog, expenses)
        break
    }

    if (!base) continue

    const penalty = repetitionPenalty(catalog.tip_id, history)
    const score = catalog.priority * 10 + base.estimated_saving_monthly - penalty

    candidates.push({ ...base, score })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]
}
