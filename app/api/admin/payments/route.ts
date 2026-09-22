import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, errorMessage, requireAdmin } from '@/lib/api'
import { formatDateLong, fromISODate } from '@/lib/date'
import { rsd } from '@/lib/pricing'
import { notifyUsers } from '@/services/notifications.service'
import {
    applyCreditToDebts,
    getAllBalances,
    getCreditLog,
    getUserBalance,
    recordPayment,
    refundCredit,
    setAllPaid,
    setPaid,
    sweepOverpaidToCredit,
} from '@/services/orders.service'

/** Bez parametara – stanje svih korisnika; sa `?userId=` – istorija pretplate tog korisnika. */
export async function GET(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const userId = Number(req.nextUrl.searchParams.get('userId') || 0)
    if (userId) {
        const [balance, log] = await Promise.all([getUserBalance(userId), getCreditLog(userId)])
        return NextResponse.json({ credit: balance?.credit ?? 0, log })
    }

    const balances = await getAllBalances()
    return NextResponse.json({ balances })
}

function dayLabel(n: number): string {
    return n === 1 ? 'dan' : 'dana'
}

/**
 * { userId, date, paid: true }        – upiši trenutnu cenu dana kao plaćeno („izravnaj”)
 * { userId, date, paid: false }       – vrati dan na neplaćeno
 * { userId, all: true }               – označi sve dane sa dugom kao plaćene
 * { userId, action: 'uplata', amount } – evidentiraj uplatu iznosa; višak ostaje kao pretplata
 * { userId, action: 'pretplata-primeni' } – potroši pretplatu na dugove
 * { userId, action: 'pretplata-isplata', amount } – isplati pretplatu nazad korisniku
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    try {
        const body = await req.json()
        const userId = Number(body.userId)
        if (!userId) return badRequest('Nedostaje userId.')
        const action = String(body.action || '')

        if (action === 'uplata') {
            const res = await recordPayment(userId, Number(body.amount))
            const parts: string[] = []
            if (res.applied > 0) parts.push(`${rsd(res.applied)} je pokrilo ${res.days} ${dayLabel(res.days)}.`)
            if (res.swept > 0) parts.push(`Ranija preplata od ${rsd(res.swept)} je prebačena u pretplatu.`)
            parts.push(res.left > 0 ? `Pretplata za naredne obroke: ${rsd(res.left)}.` : 'Dug je izmiren.')
            await notifyUsers([userId], {
                type: 'uplata',
                title: `Evidentirana uplata ${rsd(res.amount)}`,
                body: parts.join(' '),
                link: '/dug',
            })
            return NextResponse.json({ ok: true, ...res })
        }

        if (action === 'pretplata-primeni') {
            const swept = await sweepOverpaidToCredit(userId)
            const res = await applyCreditToDebts(userId)
            if (res.applied > 0) {
                await notifyUsers([userId], {
                    type: 'uplata',
                    title: `Iz pretplate plaćeno ${rsd(res.applied)}`,
                    body: `Pokriveno je ${res.days} ${dayLabel(res.days)}. Ostatak pretplate: ${rsd(res.left)}.`,
                    link: '/dug',
                })
            }
            return NextResponse.json({ ok: true, swept, ...res })
        }

        if (action === 'pretplata-isplata') {
            const amount = await refundCredit(userId, Number(body.amount))
            await notifyUsers([userId], {
                type: 'uplata',
                title: `Isplaćena pretplata ${rsd(amount)}`,
                body: 'Novac je vraćen, pretplata je umanjena za taj iznos.',
                link: '/dug',
            })
            return NextResponse.json({ ok: true, amount })
        }

        if (body.all === true) {
            const res = await setAllPaid(userId)
            if (res.days > 0) {
                await notifyUsers([userId], {
                    type: 'uplata',
                    title: `Evidentirana uplata ${rsd(res.amount)}`,
                    body: `Označeno je ${res.days} ${dayLabel(res.days)} kao plaćeno. Dug je izmiren.`,
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
