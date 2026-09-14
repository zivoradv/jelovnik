import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { addDays, formatDateLong, fromISODate, startOfWeek, toISODate } from '@/lib/date'
import { deleteTemplate, updateTemplate, weeksUsingTemplate } from '@/services/menu.service'
import { notifyAll } from '@/services/notifications.service'

type Ctx = { params: Promise<{ id: string }> }

function weekLabel(weekStart: string): string {
    const mon = fromISODate(weekStart)
    return `${formatDateLong(mon)} – ${formatDateLong(addDays(mon, 4))}`
}

/** Nedelje (tekuća i buduće) u kojima se šema koristi – korisnike treba obavestiti o izmeni. */
async function upcomingWeeks(templateId: number): Promise<string[]> {
    const current = toISODate(startOfWeek(new Date()))
    const weeks = await weeksUsingTemplate(templateId)
    return weeks.filter((w) => w >= current).sort()
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const id = Number((await params).id)
    try {
        const body = await req.json()
        const patch: { name?: string; days?: Record<number, number[]> } = {}
        if (body.name !== undefined) {
            const name = String(body.name).trim()
            if (!name) return badRequest('Naziv šeme je obavezan.')
            patch.name = name
        }
        if (body.days !== undefined) patch.days = body.days

        const template = await updateTemplate(id, patch)
        if (!template) return NextResponse.json({ error: 'Šema nije pronađena.' }, { status: 404 })

        if (patch.days !== undefined) {
            const weeks = await upcomingWeeks(id)
            if (weeks.length > 0) {
                await notifyAll({
                    type: 'raspored',
                    title: 'Raspored jela je izmenjen',
                    body: `Šema „${template.name}” je promenjena. Važi za: ${weeks.map(weekLabel).join('; ')}. Proveri da li ti porudžbina i dalje odgovara.`,
                    link: '/',
                })
            }
        }
        return NextResponse.json({ template })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri izmeni šeme.'))
    }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const id = Number((await params).id)
    const weeks = await upcomingWeeks(id)
    if (weeks.length > 0) {
        return badRequest(`Šema je dodeljena nedelji ${weeks.map(weekLabel).join('; ')}. Prvo dodeli drugu šemu tim nedeljama.`)
    }
    await deleteTemplate(id)
    return NextResponse.json({ ok: true })
}
