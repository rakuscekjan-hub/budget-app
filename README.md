# BudgetApp MVP

> Grip op je vaste lasten, inkomsten en vrij besteedbaar bedrag.

---

## Snelle start (lokaal runnen)

### 1. Vereisten

- Node.js 20+ (`node -v`)
- npm of pnpm
- Een Supabase project (gratis tier volstaat)

---

### 2. Supabase instellen

1. Ga naar [supabase.com](https://supabase.com) → maak een nieuw project aan
2. Ga naar **SQL Editor** en voer de migrations uit **in volgorde**:

```sql
-- Stap 1: schema
-- Inhoud van supabase/migrations/001_initial_schema.sql

-- Stap 2: RLS policies
-- Inhoud van supabase/migrations/002_rls_policies.sql

-- Stap 3: seed data
-- Inhoud van supabase/migrations/003_seed_tips_catalog.sql
```

3. Ga naar **Settings → API** en kopieer:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Schakel in **Authentication → Providers** de gewenste auth-methode in:
   - **Email** (standaard, werkt direct)
   - Optioneel: Google, GitHub, etc.

5. Zet in **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

---

### 3. Omgevingsvariabelen

```bash
cp .env.local.example .env.local
# Vul NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in
```

---

### 4. Dependencies installeren & starten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

### 5. PWA icons

Zie `public/icons/generate-icons.md` voor instructies om de app-icons te genereren.

---

## Deploy naar Vercel

### Stap 1: Push naar GitHub

```bash
git init
git add .
git commit -m "Initial commit: BudgetApp MVP"
git remote add origin https://github.com/JOUW_USERNAME/budget-app.git
git push -u origin main
```

### Stap 2: Vercel koppelen

1. Ga naar [vercel.com](https://vercel.com) → Import Git Repository
2. Kies je repo
3. Voeg Environment Variables toe:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` → jouw Vercel URL (bijv. `https://budget-app.vercel.app`)

### Stap 3: Supabase redirect URL updaten

Voeg je Vercel URL toe aan **Authentication → URL Configuration → Redirect URLs**:
```
https://budget-app.vercel.app/auth/callback
```

---

## Projectstructuur

```
budget-app/
├── app/
│   ├── (auth)/login/          # Inlogpagina
│   ├── (app)/
│   │   ├── layout.tsx         # Protected layout + navigatie
│   │   ├── dashboard/         # Hoofdscherm met safe-to-spend
│   │   ├── incomes/           # CRUD inkomsten
│   │   ├── expenses/          # CRUD vaste lasten
│   │   ├── insights/          # Analyse & bespaartools
│   │   └── onboarding/        # 2-minuten setup wizard
│   ├── auth/callback/         # Supabase OAuth callback
│   └── layout.tsx             # Root layout (fonts, meta, PWA)
├── components/
│   ├── dashboard/             # SafeToSpendCard, TipCard, StatsGrid
│   ├── expenses/              # ExpenseForm
│   ├── incomes/               # IncomeForm
│   └── layout/                # Navbar, BottomNav
├── lib/
│   ├── supabase/              # Client + server Supabase helpers
│   ├── calculations.ts        # toMonthly, computeTotals, formatCurrency
│   ├── insights-engine.ts     # Rule-based bespaaranalyse
│   ├── tip-engine.ts          # Dagelijkse tip-generator
│   └── ai.ts                  # AI-stub (klaar voor Claude API)
├── types/database.ts          # TypeScript types + enums
├── supabase/migrations/       # SQL migrations + seed
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   └── icons/                 # App-icons (genereer zelf, zie instructies)
├── middleware.ts              # Auth-guard + token refresh
└── .env.local.example
```

---

## Van Web naar Mobiel: Capacitor stappenplan

### Fase 1 (nu): PWA installeerbaar

De app is al installeerbaar via de browser (manifest + SW). Gebruikers kunnen
"Voeg toe aan beginscherm" gebruiken op iOS en Android.

### Fase 2: Capacitor wrapper (geen code-rewrite)

```bash
# 1. Installeer Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 2. Initialiseer
npx cap init BudgetApp com.jouwbedrijf.budgetapp --web-dir=out

# 3. Pas next.config.ts aan voor statische export
#    output: 'export' (met static Supabase client, geen Server Actions)
#    OF gebruik de Capacitor HTTP plugin met Supabase Edge Functions

# 4. Build
npm run build

# 5. Voeg platforms toe
npx cap add ios
npx cap add android

# 6. Sync
npx cap sync

# 7. Open in Xcode / Android Studio
npx cap open ios
npx cap open android
```

**Let op voor Server Actions:** Capacitor vereist statische export of API-calls.
Migratiepad:
- Server Actions → Supabase Edge Functions of Next.js API Routes
- Of: gebruik Supabase direct vanuit de client (al gedeeltelijk gedaan)

### Fase 3: Native features (later)

```bash
npm install @capacitor/push-notifications @capacitor/haptics @capacitor/local-notifications
```

---

## Next steps voor v2

| Feature | Prioriteit | Beschrijving |
|---|---|---|
| Variabele uitgaven | Hoog | Handmatig transacties loggen per maand |
| Bank-import | Hoog | CSV/OFX-import of Open Banking API |
| Export | Middel | PDF/Excel rapport van budget |
| Push-notificaties | Middel | "Contract loopt af" alerts via Capacitor |
| Partner/household | Middel | Gedeeld budget met partner |
| Doelen/spaardoelen | Laag | "Spaar voor vakantie" tracker |
| Dark mode | Laag | Systeem-thema respecteren |
| Budgettenlimiet per categorie | Laag | Stel max in per categorie |
| AI-analyse actief | Laag | Schakel AI_ANALYSIS_ENABLED=true in + bouw prompt |
| Recurring tip scheduling | Laag | Cron-based tip generatie (Supabase Edge Functions) |

---

## Omgevingsvariabelen referentie

| Variabele | Verplicht | Beschrijving |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ja | Jouw Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja | Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Nee | Site URL voor OAuth redirects |
| `AI_ANALYSIS_ENABLED` | Nee | `true` om AI-knop te activeren |
| `ANTHROPIC_API_KEY` | Nee | Vereist als AI_ANALYSIS_ENABLED=true |
