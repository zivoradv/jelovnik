import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getCountsForDate, getUserOrdersForDate, type OrderItemInput, saveUserOrders } from '@/services/orders.service'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })

    const date = req.nextUrl.searchParams.get('date')
    if (!date) {
        return NextResponse.json({ error: 'Nedostaje parametar "date".' }, { status: 400 })
    }

    const [mine, counts] = await Promise.all([getUserOrdersForDate(user.sub, date), getCountsForDate(date)])

    return NextResponse.json({ mine, counts })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })

    try {
        const { date, items } = await req.json()
        if (!date) {
            return NextResponse.json({ error: 'Nedostaje datum.' }, { status: 400 })
        }
        const list: OrderItemInput[] = Array.isArray(items) ? items : []
        const saved = await saveUserOrders(user.sub, date, list)
        return NextResponse.json({ mine: saved })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Greška pri čuvanju porudžbine.'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
