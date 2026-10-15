import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/drizzle'
import { badRequest, requireUser } from '@/lib/api'
import { deleteSubscription, saveSubscription } from '@/services/push.service'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export async function GET() {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const rows = await db.select({ reminderTime: users.reminderTime }).from(users).where(eq(users.id, auth.user.sub))
    return NextResponse.json({ reminderTime: rows[0]?.reminderTime ?? null })
}

/** { subscription?: PushSubscriptionJSON, reminderTime?: 'HH:MM' | null } */
export async function PUT(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const sub = body.subscription
    if (sub !== undefined) {
        if (typeof sub?.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
            return badRequest('Neispravna pretplata.')
        }
        await saveSubscription(auth.user.sub, {
            endpoint: sub.endpoint,
            keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) },
        })
    }
    if (body.reminderTime !== undefined) {
        if (body.reminderTime !== null && !TIME_RE.test(body.reminderTime)) return badRequest('Neispravno vreme.')
        await db.update(users).set({ reminderTime: body.reminderTime }).where(eq(users.id, auth.user.sub))
    }
    return NextResponse.json({ ok: true })
}

/** { endpoint } – odjava ovog uređaja. */
export async function DELETE(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    if (typeof body.endpoint !== 'string') return badRequest('Nedostaje endpoint.')
    await deleteSubscription(auth.user.sub, body.endpoint)
    return NextResponse.json({ ok: true })
}
