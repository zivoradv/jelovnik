import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { getPricingSettings, updatePricingSettings } from '@/services/settings.service'

export async function GET() {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const pricing = await getPricingSettings()
    return NextResponse.json({ pricing })
}

/** { subsidyMode?, subsidyPercent?, subsidyAmount?, soupPrice? } */
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    try {
        const body = await req.json()
        const pricing = await updatePricingSettings({
            subsidyMode: body.subsidyMode !== undefined ? (body.subsidyMode === 'amount' ? 'amount' : 'percent') : undefined,
            subsidyPercent: body.subsidyPercent !== undefined ? Number(body.subsidyPercent) : undefined,
            subsidyAmount: body.subsidyAmount !== undefined ? Number(body.subsidyAmount) : undefined,
            soupPrice: body.soupPrice !== undefined ? Number(body.soupPrice) : undefined,
        })
        return NextResponse.json({ pricing })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri čuvanju podešavanja.'))
    }
}
