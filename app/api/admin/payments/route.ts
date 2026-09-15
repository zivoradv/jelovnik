import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, errorMessage, requireAdmin } from '@/lib/api'
import { formatDateLong, fromISODate } from '@/lib/date'
import { rsd } from '@/lib/pricing'
import { notifyUsers } from '@/services/notifications.service'
import { getAllBalances, getUserBalance, setAllPaid, setPaid } from '@/services/orders.service'

export async function GET() {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const balances = await getAllBalances()
    return NextResponse.json({ balances })
}

/**
 * { userId, date, paid: true }  – upiši trenutnu cenu dana kao plaćeno (i kad je delimično/preplaćeno: „izravnaj”)
 * { userId, date, paid: false } – vrati dan na neplaćeno
 * { userId, all: true }         – označi sve dane sa dugom kao plaćene
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    try {
        const body = await req.json()
        const userId = Number(body.userId)
        if (!userId) return badRequest('Nedostaje userId.')

        if (body.all === true) {
            const res = await setAllPaid(userId)
            if (res.days > 0) {
                await notifyUsers([userId], {
                    type: 'uplata',
                    title: `Evidentirana uplata ${rsd(res.amount)}`,
                    body: `Označeno je ${res.days} ${res.days === 1 ? 'dan' : 'dana'} kao plaćeno. Dug je izmiren.`,
                    link: '/dug',
                })
            }
            return NextResponse.json({ ok: true, ...res })
        }

        const date = String(body.date || '')
        if (!DATE_RE.test(date)) return badRequest('Nedostaje datum.')
        const paid = Boolean(body.paid)
        const before = (await getUserBalance(userId))?.rows.find((r) => r.date === date)
        const amount = await setPaid(userId, date, paid)

        const balance = await getUserBalance(userId)
        const dateLabel = formatDateLong(fromISODate(date))
        const remaining = balance && balance.unpaidTotal > 0 ? ` Preostali dug: ${rsd(balance.unpaidTotal)}.` : ' Dug je izmiren.'
        await notifyUsers([userId], {
            type: 'uplata',
            title: paid ? `Evidentirana uplata za ${dateLabel}` : `Dan ${dateLabel} vraćen na neplaćeno`,
            body: paid
                ? `${rsd(amount)} označeno kao plaćeno.${remaining}`
                : `Iznos ${rsd(before?.total ?? 0)} ponovo je na listi za plaćanje.`,
            link: '/dug',
        })
        return NextResponse.json({ ok: true, amount })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri čuvanju.'))
    }
}
