import { type NextRequest, NextResponse } from 'next/server'
import { getMonthlyStats } from '@/services/stats.service'

export async function GET(req: NextRequest) {
    const month = req.nextUrl.searchParams.get('month')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'Nedostaje parametar "month" (YYYY-MM).' }, { status: 400 })
    }
    const stats = await getMonthlyStats(month)
    return NextResponse.json({ stats })
}
