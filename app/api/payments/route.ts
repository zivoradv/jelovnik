import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getUserBalance, setPaid } from '@/services/orders.service'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })

    const rows = await getUserBalance(user.sub)
    return NextResponse.json({ rows })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })

    try {
        const { date, paid } = await req.json()
        if (!date) return NextResponse.json({ error: 'Nedostaje datum.' }, { status: 400 })
        await setPaid(user.sub, date, Boolean(paid))
        return NextResponse.json({ ok: true })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Greška pri čuvanju.'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
