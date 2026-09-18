import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, requireUser } from '@/lib/api'
import { getUserOrdersForWeek } from '@/services/orders.service'

/** ?date=YYYY-MM-DD (bilo koji dan) → porudžbine korisnika za Pon–Pet te nedelje. */
export async function GET(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const date = req.nextUrl.searchParams.get('date')
    if (!date || !DATE_RE.test(date)) return badRequest('Nedostaje parametar "date" (YYYY-MM-DD).')

    const days = await getUserOrdersForWeek(auth.user.sub, date)
    return NextResponse.json({ days })
}
