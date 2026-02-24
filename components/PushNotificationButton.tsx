'use client'

import { useState, useEffect } from 'react'

export function PushNotificationButton() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') setStatus('denied')
    else if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setStatus('subscribed')
        })
      })
    }
  }, [])

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      setStatus('subscribed')
    } catch { setStatus('denied') }
    finally { setLoading(false) }
  }

  async function unsubscribe() {
    setLoading(true)
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
    setStatus('idle')
    setLoading(false)
  }

  if (status === 'unsupported') return null

  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">🔔 Contract-meldingen</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {status === 'subscribed' ? 'Je ontvangt meldingen als contracten aflopen.' :
           status === 'denied'     ? 'Meldingen geblokkeerd in browserinstellingen.' :
           'Ontvang een melding als een contract binnenkort afloopt.'}
        </p>
      </div>
      {status === 'subscribed' ? (
        <button onClick={unsubscribe} disabled={loading} className="btn-secondary text-xs">
          Uitschakelen
        </button>
      ) : (
        <button onClick={subscribe} disabled={loading || status === 'denied'} className="btn-primary text-xs">
          {loading ? 'Even wachten…' : 'Inschakelen'}
        </button>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
