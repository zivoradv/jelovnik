import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireUser } from '@/lib/api'
import { rsvp } from '@/services/beer.service'

/** { planId, status: 'da' | 'ne' } */
export async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    try {
        const body = await req.json()
        const planId = Number(body.planId)
        if (!planId) return badRequest('Nedostaje planId.')
        const status = body.status === 'ne' ? 'ne' : 'da'
        const plan = await rsvp(planId, auth.user.sub, status)
        return NextResponse.json({ plan })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri čuvanju.'))
    }
}
