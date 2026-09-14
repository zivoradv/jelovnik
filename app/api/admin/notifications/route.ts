import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { notifyAll } from '@/services/notifications.service'
import { sendDebtReminders } from '@/services/reminders.service'

/**
 * { action: 'debt-reminders' }              – podsetnik svima koji duguju
 * { action: 'broadcast', title, body? }     – ručna poruka svim korisnicima
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    try {
        const body = await req.json()
        if (body.action === 'debt-reminders') {
            const res = await sendDebtReminders()
            return NextResponse.json({ ok: true, ...res })
        }
        if (body.action === 'broadcast') {
            const title = String(body.title || '').trim()
            if (!title) return badRequest('Naslov poruke je obavezan.')
            const sent = await notifyAll({
                type: 'info',
                title,
                body: String(body.body || '').trim(),
                link: body.link ? String(body.link) : null,
            })
            return NextResponse.json({ ok: true, notified: sent })
        }
        return badRequest('Nepoznata akcija.')
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri slanju obaveštenja.'))
    }
}
