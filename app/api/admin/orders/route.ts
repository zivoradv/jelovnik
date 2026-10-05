import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, requireAdmin } from '@/lib/api'
import { adminDeleteDayOrders, getOrdersDetailForDate } from '@/services/orders.service'

export async function GET(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const date = req.nextUrl.searchParams.get('date')
    if (!date || !DATE_RE.test(date)) return badRequest('Nedostaje parametar "date" (YYYY-MM-DD).')
    const rows = await getOrdersDetailForDate(date)
    return NextResponse.json({ rows })
}

export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const date = req.nextUrl.searchParams.get('date')
    const userId = Number(req.nextUrl.searchParams.get('userId'))
    if (!date || !DATE_RE.test(date)) return badRequest('Nedostaje parametar "date" (YYYY-MM-DD).')
    if (!Number.isInteger(userId) || userId <= 0) return badRequest('Nedostaje parametar "userId".')
    const notify = req.nextUrl.searchParams.get('notify') !== '0'
    const deleted = await adminDeleteDayOrders(userId, date, notify)
    return NextResponse.json({ deleted })
}
