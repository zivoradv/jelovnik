import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, errorMessage, requireUser } from '@/lib/api'
import { createPlan, listPlans } from '@/services/beer.service'

export async function GET() {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const data = await listPlans()
    return NextResponse.json(data)
}

/** { date, time?, place?, note? } */
export async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    try {
        const body = await req.json()
        const date = String(body.date || '')
        if (!DATE_RE.test(date)) return badRequest('Nedostaje datum.')
        const plan = await createPlan(auth.user.sub, {
            date,
            time: body.time ? String(body.time) : undefined,
            place: body.place ? String(body.place) : undefined,
            note: body.note ? String(body.note) : undefined,
        })
        return NextResponse.json({ plan })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri pravljenju dogovora.'))
    }
}
