import { type NextRequest, NextResponse } from 'next/server'
import { sendDebtReminders } from '@/services/reminders.service'

/**
 * Automatski podsetnik za dugove. Vercel Cron ga zove po rasporedu iz vercel.json
 * i šalje `Authorization: Bearer ${CRON_SECRET}`; isti header može da pošalje i bilo koji drugi scheduler.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET
    if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET nije podešen.' }, { status: 500 })
    }
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 401 })
    }
    const res = await sendDebtReminders()
    return NextResponse.json({ ok: true, ...res })
}
