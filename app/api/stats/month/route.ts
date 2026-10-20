import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, requireUser } from '@/lib/api'
import { MONTH_RE } from '@/lib/date'
import { getMonthlyStats } from '@/services/stats.service'

/** Mesečna statistika (tabela, jelo meseca, virtuoz) – vidljiva svim prijavljenim korisnicima. */
export async function GET(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const month = req.nextUrl.searchParams.get('month')
    if (!month || !MONTH_RE.test(month)) return badRequest('Nedostaje parametar "month" (YYYY-MM).')
    const stats = await getMonthlyStats(month)
    return NextResponse.json({ stats })
}
