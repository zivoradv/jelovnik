import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, requireUser } from '@/lib/api'
import { getMenuForDate } from '@/services/menu.service'
import { getPricingSettings } from '@/services/settings.service'

export async function GET(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const date = req.nextUrl.searchParams.get('date')
    if (!date || !DATE_RE.test(date)) return badRequest('Nedostaje parametar "date" (YYYY-MM-DD).')

    const [menu, pricing] = await Promise.all([getMenuForDate(date), getPricingSettings()])
    return NextResponse.json({ ...menu, pricing })
}
