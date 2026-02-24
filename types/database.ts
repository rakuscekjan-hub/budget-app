export type Frequency = 'weekly' | 'biweekly' | 'four_weekly' | 'monthly' | 'yearly'
export type TipType = 'quick_win' | 'contract' | 'category_heavy' | 'annual_visibility' | 'scenario'
export type TipStatus = 'new' | 'seen' | 'done' | 'dismissed' | 'snoozed'

export interface Profile {
  id: string
  user_id: string
  display_name: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Income {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: Frequency
  start_date: string | null
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: Frequency
  category: string
  necessary: boolean
  cancellable: boolean
  contract_end_date: string | null
  merchant_hint: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface TipCatalog {
  tip_id: string
  type: TipType
  template_key: string
  priority: number
  cooldown_days: number
  is_active: boolean
}

export interface GeneratedTip {
  id: string
  user_id: string
  date: string
  tip_id: string
  title: string
  message: string
  estimated_saving_monthly: number
  action_cta: string
  status: TipStatus
  expense_id: string | null
  created_at: string
}

export interface InsightsState {
  user_id: string
  last_tip_at: string | null
  tip_history: string[]
  cooldowns: Record<string, string>
}

export const EXPENSE_CATEGORIES = [
  'Wonen',
  'Vervoer',
  'Verzekeringen',
  'Abonnementen',
  'Boodschappen',
  'Gezondheid',
  'Sport & Hobby',
  'Kleding',
  'Horeca',
  'Onderwijs',
  'Reizen',
  'Persoonlijke verzorging',
  'Kinderen',
  'Huisdieren',
  'Overig',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Per week',
  biweekly: 'Per 2 weken',
  four_weekly: 'Per 4 weken',
  monthly: 'Per maand',
  yearly: 'Per jaar',
}
