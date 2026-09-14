import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireUser } from '@/lib/api'
import { listForUser, markRead, unreadCount } from '@/services/notifications.service'

export async function GET() {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const [items, unread] = await Promise.all([listForUser(auth.user.sub), unreadCount(auth.user.sub)])
    return NextResponse.json({ notifications: items, unread })
}

/** { ids?: number[] } – označi kao pročitano (bez ids: sve). */
export async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    try {
        const body = await req.json().catch(() => ({}))
        const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((n: number) => Number.isInteger(n)) : undefined
        await markRead(auth.user.sub, ids)
        const unread = await unreadCount(auth.user.sub)
        return NextResponse.json({ ok: true, unread })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška.'))
    }
}
