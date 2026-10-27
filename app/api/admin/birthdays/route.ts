import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { setBirthdayFund, setBirthdayPaid, setUserBirthday } from '@/services/birthdays.service'

/**
 * { userId, fund }                            – da li korisnik učestvuje u skupljanju za rođendane
 * { userId, birthday }                         – upiši/obriši datum rođenja korisniku
 * { celebrantId, payerId, year, paid }         – označi da je neko dao (ili nije) pare za rođendan
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    try {
        const body = await req.json()
        if (body.userId !== undefined) {
            const userId = Number(body.userId)
            if (!userId) return badRequest('Nedostaje userId.')
            if (body.fund !== undefined) {
                await setBirthdayFund(userId, Boolean(body.fund))
                return NextResponse.json({ ok: true })
            }
            await setUserBirthday(userId, body.birthday ? String(body.birthday) : null)
            return NextResponse.json({ ok: true })
        }
        const celebrantId = Number(body.celebrantId)
        const payerId = Number(body.payerId)
        const year = Number(body.year)
        if (!celebrantId || !payerId || !Number.isInteger(year)) return badRequest('Neispravni podaci.')
        await setBirthdayPaid(celebrantId, payerId, year, Boolean(body.paid))
        return NextResponse.json({ ok: true })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri čuvanju.'))
    }
}
