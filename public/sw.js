// Service Worker — BudgetApp PWA
// Minimale implementatie: cache-first voor statische assets, network-first voor API

const CACHE_NAME = 'budget-app-v1'
const STATIC_ASSETS = ['/', '/dashboard', '/incomes', '/expenses', '/insights']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Negeer Supabase API-calls
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request)
    })
  )
})
