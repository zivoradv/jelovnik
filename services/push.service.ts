import { and, eq, inArray } from 'drizzle-orm'
import webpush from 'web-push'
import { db, pushSubscriptions } from '@/drizzle'

export interface PushPayload {
    title: string
    body?: string
    link?: string | null
}

export interface PushSubscriptionInput {
    endpoint: string
    keys: { p256dh: string; auth: string }
}

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const enabled = Boolean(publicKey && privateKey)
if (enabled) webpush.setVapidDetails('mailto:admin@brezna-obrok.app', publicKey as string, privateKey as string)

export async function saveSubscription(userId: number, sub: PushSubscriptionInput): Promise<void> {
    const values = { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }
    // isti uređaj može da se prijavi pod drugim nalogom – endpoint prelazi na novog korisnika
    await db.insert(pushSubscriptions).values(values).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values })
}

export async function deleteSubscription(userId: number, endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
}

/** Šalje push na sve uređaje datih korisnika; istekle pretplate (404/410) briše. Bez VAPID ključeva ne radi ništa. */
export async function pushToUsers(userIds: number[], payload: PushPayload): Promise<void> {
    if (!enabled || userIds.length === 0) return
    const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds))
    const body = JSON.stringify(payload)
    const dead: string[] = []
    await Promise.allSettled(
        subs.map((s) =>
            webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body).catch((err) => {
                if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint)
            }),
        ),
    )
    if (dead.length > 0) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, dead))
}
