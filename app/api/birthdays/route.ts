import { type NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api'
import { getBirthdayOverview } from '@/services/birthdays.service'

/** Rođendani svih + uplate za `?year=`. Admin vidi sve uplate, korisnik samo svoje. */
export async function GET(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const year = Number(req.nextUrl.searchParams.get('year')) || new Date().getFullYear()
    const data = await getBirthdayOverview(year)
    if (auth.user.role !== 'admin') data.paid = data.paid.filter(([, payerId]) => payerId === auth.user.sub)
    return NextResponse.json(data)
}
