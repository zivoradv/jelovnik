import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, errorMessage, requireUser } from '@/lib/api'
import { getCountsForDate, getOrderersForDate, getUserOrdersForDate, type OrderItemInput, saveUserOrders } from '@/services/orders.service'

export async function GET(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const date = req.nextUrl.searchParams.get('date')
    if (!date || !DATE_RE.test(date)) return badRequest('Nedostaje parametar "date" (YYYY-MM-DD).')

    const [mine, counts, who] = await Promise.all([
        getUserOrdersForDate(auth.user.sub, date),
        getCountsForDate(date),
        getOrderersForDate(date),
    ])
    return NextResponse.json({ mine, counts, who })
}

/** { date, items: [{ mealId, quantity, note?, withSoup? }] } – zamenjuje celu porudžbinu za taj dan. */
export async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error

    try {
        const { date, items } = await req.json()
        if (!date || !DATE_RE.test(String(date))) return badRequest('Nedostaje datum.')
        const list: OrderItemInput[] = Array.isArray(items) ? items : []
        const saved = await saveUserOrders(auth.user.sub, String(date), list)
        return NextResponse.json({ mine: saved })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri čuvanju porudžbine.'))
    }
}
