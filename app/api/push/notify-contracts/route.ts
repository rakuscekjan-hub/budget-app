import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push'
import { addDays, format } from 'date-fns'

// Roep dit dagelijks aan via Vercel Cron: vercel.json crons
// of handmatig via GET /api/push/notify-contracts?secret=...

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const in30 = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  // Zoek contracten die de komende 30 dagen aflopen
  const { data: expenses } = await supabase
    .from('expenses')
    .select('user_id, name, contract_end_date, amount, frequency')
    .not('contract_end_date', 'is', null)
    .gte('contract_end_date', today)
    .lte('contract_end_date', in30)
    .eq('is_active', true)

  if (!expenses || expenses.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const exp of expenses) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', exp.user_id)

    for (const sub of subs ?? []) {
      try {
        await sendPushNotification(sub, {
          title: `⏰ Contract "${exp.name}" loopt binnenkort af`,
          body: `Contracteinddatum: ${exp.contract_end_date}. Nu opzeggen of heronderhandelen?`,
          url: '/expenses',
        })
        sent++
      } catch { /* subscription verlopen */ }
    }
  }

  return NextResponse.json({ sent })
}
