// Service Worker — BudgetApp PWA v2
const CACHE_NAME = 'budget-app-v2'
const STATIC = ['/', '/dashboard', '/incomes', '/expenses', '/transactions', '/insights', '/household']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co')) return
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)))
})

// ── Push notificaties ─────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'BudgetApp', body: 'Je hebt een nieuwe melding.' }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = e.notification.data?.url || '/dashboard'
      const existing = clientList.find(c => c.url.includes(url))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
