import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireUser } from '@/lib/api'
import { quickAnswer } from '@/services/beer.service'

/** Odgovor iz kafanskog popup-a: { answer: 'da' | 'ne' } */
export async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    try {
        const body = await req.json().catch(() => ({}))
        const answer = body.answer === 'da' ? 'da' : 'ne'
        const res = await quickAnswer(auth.user.sub, answer)
        return NextResponse.json(res)
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška.'))
    }
}
