import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@budgetapp.nl',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushSubscriptionData {
  endpoint: string
  p256dh: string
  auth_key: string
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; url?: string }
) {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
    },
    JSON.stringify(payload)
  )
}
