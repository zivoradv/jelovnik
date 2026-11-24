import { type NextRequest, NextResponse } from 'next/server'
import { sendOrderReminders } from '@/services/reminders.service'

/**
 * Podsetnik za naručivanje. Treba ga zvati nedelja–četvrtak u 11:00 po Beogradu
 * (REMINDER_TIME u lib/deadline) – spoljni scheduler (npr. cron-job.org) sa headerom `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET
    if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET nije podešen.' }, { status: 500 })
    }
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 401 })
    }
    return NextResponse.json({ ok: true, ...(await sendOrderReminders()) })
}
