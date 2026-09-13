import { type NextRequest, NextResponse } from 'next/server'
import { getOrdersDetailForDate } from '@/services/orders.service'

export async function GET(req: NextRequest) {
    const date = req.nextUrl.searchParams.get('date')
    if (!date) {
        return NextResponse.json({ error: 'Nedostaje parametar "date".' }, { status: 400 })
    }
    const rows = await getOrdersDetailForDate(date)
    return NextResponse.json({ rows })
}
