import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api'
import { getUserBalance } from '@/services/orders.service'

/** Korisnik vidi svoj dug; uplate označava isključivo admin (/api/admin/payments). */
export async function GET() {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const balance = await getUserBalance(auth.user.sub)
    return NextResponse.json({
        rows: balance?.rows ?? [],
        unpaidTotal: balance?.unpaidTotal ?? 0,
        paidTotal: balance?.paidTotal ?? 0,
        unpaidCount: balance?.unpaidCount ?? 0,
    })
}
