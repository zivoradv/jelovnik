import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireUser } from '@/lib/api'
import { deletePlan } from '@/services/beer.service'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    try {
        await deletePlan(Number((await params).id), auth.user.sub, auth.user.role === 'admin')
        return NextResponse.json({ ok: true })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri brisanju.'))
    }
}
