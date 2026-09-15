import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { deleteMeal, updateMeal } from '@/services/meals.service'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const id = Number((await params).id)
    try {
        const body = await req.json()
        const patch: Record<string, unknown> = {}

        if (body.name !== undefined) patch.name = String(body.name).trim()
        if (body.description !== undefined) patch.description = String(body.description)
        if (body.note !== undefined) patch.note = String(body.note)
        if (body.price !== undefined) {
            const price = Number(body.price)
            if (!Number.isFinite(price) || price < 0) return badRequest('Cena mora biti broj (0 ili više).')
            patch.price = String(Math.round(price))
        }
        if (body.category !== undefined) patch.category = body.category === 'suvo' ? 'suvo' : 'kuvano'
        if (body.isPosno !== undefined) patch.isPosno = Boolean(body.isPosno)
        if (body.active !== undefined) patch.active = Boolean(body.active)

        const meal = await updateMeal(id, patch)
        if (!meal) return NextResponse.json({ error: 'Jelo nije pronađeno.' }, { status: 404 })
        return NextResponse.json({ meal })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri izmeni jela.'))
    }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    try {
        await deleteMeal(Number((await params).id))
        return NextResponse.json({ ok: true })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri brisanju jela.'))
    }
}
