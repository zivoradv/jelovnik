import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, requireAdmin } from '@/lib/api'
import { getOrdersDetailForDate } from '@/services/orders.service'

export async function GET(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const date = req.nextUrl.searchParams.get('date')
    if (!date || !DATE_RE.test(date)) return badRequest('Nedostaje parametar "date" (YYYY-MM-DD).')
    const rows = await getOrdersDetailForDate(date)
    return NextResponse.json({ rows })
}
