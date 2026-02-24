import Papa from 'papaparse'
import { EXPENSE_CATEGORIES } from '@/types/database'

export interface ParsedTransaction {
  name: string
  amount: number
  type: 'expense' | 'income'
  category: string
  date: string
  raw?: Record<string, string>
}

// ── Categorie-guesser op basis van naam ───────────────────────────────────────
const CATEGORY_HINTS: Array<{ patterns: RegExp[]; category: string }> = [
  { patterns: [/huur|hypotheek|energie|gas|water|elektr/i],     category: 'Wonen' },
  { patterns: [/netflix|spotify|youtube|disney|prime|hbo/i],    category: 'Abonnementen' },
  { patterns: [/zorgverzekering|achmea|vgz|cz|menzis/i],        category: 'Verzekeringen' },
  { patterns: [/ah|jumbo|lidl|albert.heijn|boodschap|supermarkt|dekamarkt/i], category: 'Boodschappen' },
  { patterns: [/ns |trein|bus |ov-|benzine|shell|total|bp |tankstation/i],    category: 'Vervoer' },
  { patterns: [/gym|fitness|sport|voetbal/i],                   category: 'Sport & Hobby' },
  { patterns: [/restaurant|eten|pizza|cafe|koffie|mcdonalds|kfc/i], category: 'Horeca' },
  { patterns: [/dokter|apothek|tandarts|ziekenhuis/i],          category: 'Gezondheid' },
  { patterns: [/school|universiteit|studie|cursus/i],           category: 'Onderwijs' },
  { patterns: [/h&m|zara|primark|kleding|schoenen/i],           category: 'Kleding' },
  { patterns: [/telefoon|vodafone|kpn|t-mobile|tele2/i],        category: 'Abonnementen' },
]

export function guessCategory(name: string): string {
  for (const { patterns, category } of CATEGORY_HINTS) {
    if (patterns.some(p => p.test(name))) return category
  }
  return 'Overig'
}

// ── ING CSV parser ────────────────────────────────────────────────────────────
function parseING(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    const raw = r['Naam / Omschrijving'] || r['Omschrijving'] || 'Onbekend'
    const dateStr = r['Datum'] || ''           // DD-MM-YYYY
    const amountStr = (r['Bedrag (EUR)'] || r['Bedrag'] || '0').replace(',', '.')
    const direction = r['Af Bij'] || r['Debet/Credit'] || 'Af'
    const amount = Math.abs(parseFloat(amountStr))
    const type: 'expense' | 'income' = direction.toLowerCase().includes('bij') ? 'income' : 'expense'

    // Datum: DD-MM-YYYY → YYYY-MM-DD
    const [d, m, y] = dateStr.split('-')
    const date = y && m && d ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : new Date().toISOString().split('T')[0]

    return { name: raw.trim(), amount, type, category: guessCategory(raw), date, raw: r }
  }).filter(r => r.amount > 0)
}

// ── Rabobank CSV parser ───────────────────────────────────────────────────────
function parseRabobank(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    const name = r['Naam tegenpartij'] || r['Omschrijving-1'] || 'Onbekend'
    const dateStr = r['Datum'] || ''           // YYYY-MM-DD
    const amountStr = (r['Bedrag'] || '0').replace(',', '.')
    const amount = Math.abs(parseFloat(amountStr))
    const type: 'expense' | 'income' = parseFloat(amountStr.replace(',','.')) >= 0 ? 'income' : 'expense'
    return { name: name.trim(), amount, type, category: guessCategory(name), date: dateStr || new Date().toISOString().split('T')[0], raw: r }
  }).filter(r => r.amount > 0)
}

// ── ABN AMRO CSV parser ───────────────────────────────────────────────────────
function parseABN(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    // ABN: Rekeningnummer;Muntsoort;Transactiedatum;Rentedatum;Beginsaldo;Eindsaldo;Bedrag;Omschrijving
    const name = r['Omschrijving'] || r['Naam tegenpartij'] || 'Onbekend'
    const dateStr = r['Transactiedatum'] || ''  // YYYYMMDD
    const amountStr = (r['Bedrag'] || '0').replace(',', '.')
    const amount = Math.abs(parseFloat(amountStr))
    const type: 'expense' | 'income' = parseFloat(amountStr) >= 0 ? 'income' : 'expense'
    // YYYYMMDD → YYYY-MM-DD
    const date = dateStr.length === 8
      ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`
      : new Date().toISOString().split('T')[0]
    return { name: name.trim(), amount, type, category: guessCategory(name), date, raw: r }
  }).filter(r => r.amount > 0)
}

// ── Auto-detect & parse ───────────────────────────────────────────────────────
export function parseCSV(csvText: string): ParsedTransaction[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: '', // auto-detect
  })

  if (result.errors.length && result.data.length === 0) {
    throw new Error('Kan CSV niet lezen. Controleer het bestandsformaat.')
  }

  const headers = Object.keys(result.data[0] || {}).join(',').toLowerCase()

  // Detecteer bank
  if (headers.includes('af bij') || headers.includes('debet/credit')) {
    return parseING(result.data)
  }
  if (headers.includes('naam tegenpartij') && headers.includes('bedrag')) {
    return parseRabobank(result.data)
  }
  if (headers.includes('transactiedatum') || headers.includes('beginsaldo')) {
    return parseABN(result.data)
  }

  // Generiek formaat: probeer datum/bedrag/omschrijving te raden
  return result.data.map(r => {
    const vals = Object.values(r)
    const name = vals[0] || 'Import'
    const amountStr = vals.find(v => /^-?\d+[,.]?\d*$/.test(v.replace(/[€\s]/g, ''))) || '0'
    const amount = Math.abs(parseFloat(amountStr.replace(',','.')))
    return {
      name: name.trim(),
      amount,
      type: 'expense' as const,
      category: guessCategory(name),
      date: new Date().toISOString().split('T')[0],
    }
  }).filter(r => r.amount > 0)
}
