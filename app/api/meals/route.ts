import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { createMeal, listMeals } from '@/services/meals.service'

export async function GET() {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const meals = await listMeals()
    return NextResponse.json({ meals })
}

export async function POST(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    try {
        const body = await req.json()
        if (!body.name || !String(body.name).trim()) return badRequest('Naziv jela je obavezan.')
        const category = body.category === 'suvo' ? 'suvo' : 'kuvano'

        const meal = await createMeal({
            name: String(body.name).trim(),
            description: body.description ? String(body.description) : '',
            note: body.note ? String(body.note) : '',
            price: String(Math.max(0, Math.round(Number(body.price)) || 0)),
            category,
            isPosno: Boolean(body.isPosno),
            active: body.active === undefined ? true : Boolean(body.active),
        })
        return NextResponse.json({ meal })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri kreiranju jela.'))
    }
}
