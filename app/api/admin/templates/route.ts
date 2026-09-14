import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { createTemplate, listTemplates } from '@/services/menu.service'

export async function GET() {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const templates = await listTemplates()
    return NextResponse.json({ templates })
}

/** { name, days: { 1: [mealId, ...], 2: [...], ... } } */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    try {
        const body = await req.json()
        const name = String(body.name || '').trim()
        if (!name) return badRequest('Naziv šeme je obavezan.')
        const template = await createTemplate(name, body.days ?? {})
        return NextResponse.json({ template })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri kreiranju šeme.'))
    }
}
