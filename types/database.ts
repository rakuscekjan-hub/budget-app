export type Frequency = 'weekly' | 'biweekly' | 'four_weekly' | 'monthly' | 'yearly'
export type TipType = 'quick_win' | 'contract' | 'category_heavy' | 'annual_visibility' | 'scenario'
export type TipStatus = 'new' | 'seen' | 'done' | 'dismissed' | 'snoozed'
export type WalletType = 'checking' | 'savings' | 'credit' | 'cash' | 'shared'
export type BudgetPeriod = 'weekly' | 'monthly'
export type TransactionType = 'expense' | 'income'

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

export interface Wallet {
  id: string
  user_id: string
  name: string
  type: WalletType
  balance: number
  color: string
  icon: string
  is_default: boolean
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  period: BudgetPeriod
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  household_id: string | null
  wallet_id: string | null
  name: string
  amount: number
  type: TransactionType
  category: string
  subcategory: string | null
  date: string
  notes: string | null
  imported: boolean
  is_recurring: boolean
  transfer_to: string | null
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

// ── Categorieën (hoofd + subcategorie + kleur + icoon) ────────────────────────

export interface CategoryDef {
  name: string
  color: string
  bgColor: string
  icon: string
  subcategories: string[]
}

export const CATEGORY_TREE: CategoryDef[] = [
  {
    name: 'Vaste lasten',
    color: '#6366f1',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: '🏠',
    subcategories: ['Huur/Hypotheek', 'Energie', 'Water', 'Internet', 'Zorgverzekering', 'Gem. belastingen', 'Wegenbelasting'],
  },
  {
    name: 'Dagelijks',
    color: '#10b981',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: '🛒',
    subcategories: ['Boodschappen', 'Horeca', 'Tanken/OV', 'Abonnementen', 'Streaming'],
  },
  {
    name: 'Extra',
    color: '#f59e0b',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: '⭐',
    subcategories: ['Kinderopvang', 'DUO/Studie', 'Sparen', 'Beleggen', 'Crypto'],
  },
  {
    name: 'Kleding & Zorg',
    color: '#ec4899',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    icon: '👗',
    subcategories: ['Kleding', 'Schoenen', 'Persoonlijke verzorging', 'Kapper'],
  },
  {
    name: 'Vrije tijd',
    color: '#8b5cf6',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    icon: '🎯',
    subcategories: ['Sport/Hobby', 'Vakantie', 'Entertainment', 'Cadeaus'],
  },
  {
    name: 'Gezondheid',
    color: '#ef4444',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: '❤️',
    subcategories: ['Dokter', 'Apotheek', 'Tandarts', 'Opticiën'],
  },
  {
    name: 'Inkomsten',
    color: '#22c55e',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '💰',
    subcategories: ['Salaris', 'Freelance', 'Bijverdiensten', 'Huurinkomsten', 'Toeslagen'],
  },
  {
    name: 'Overig',
    color: '#6b7280',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: '📦',
    subcategories: ['Overig'],
  },
]

export function getCategoryDef(name: string): CategoryDef {
  return CATEGORY_TREE.find(c => c.name === name) ?? CATEGORY_TREE[CATEGORY_TREE.length - 1]
}

export const ALL_SUBCATEGORIES: string[] = CATEGORY_TREE.flatMap(c => c.subcategories)

// Backward-compatible flat list voor bestaande code
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

export const WALLET_TYPES: Record<WalletType, { label: string; icon: string; color: string }> = {
  checking: { label: 'Betaalrekening', icon: '💳', color: '#6366f1' },
  savings:  { label: 'Spaarrekening',  icon: '🏦', color: '#10b981' },
  credit:   { label: 'Creditcard',     icon: '💳', color: '#f59e0b' },
  cash:     { label: 'Contant',        icon: '💵', color: '#22c55e' },
  shared:   { label: 'Gezamenlijk',    icon: '👥', color: '#8b5cf6' },
}
