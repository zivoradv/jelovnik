import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, DATE_RE, errorMessage, requireAdmin } from '@/lib/api'
import { addDays, formatDateLong, fromISODate } from '@/lib/date'
import { assignWeek, getTemplate, getWeekAssignment, listWeekAssignments, weekStartOf } from '@/services/menu.service'
import { notifyAll } from '@/services/notifications.service'

/** ?weekStart=YYYY-MM-DD → dodela za tu nedelju; bez parametra → sve dodele. */
export async function GET(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const ws = req.nextUrl.searchParams.get('weekStart')
    if (ws) {
        if (!DATE_RE.test(ws)) return badRequest('Neispravan weekStart.')
        const assignment = await getWeekAssignment(weekStartOf(ws))
        return NextResponse.json({ assignment })
    }
    const weeks = await listWeekAssignments()
    return NextResponse.json({ weeks })
}

/** { weekStart, templateId | null } */
export async function PUT(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    try {
        const body = await req.json()
        const ws = String(body.weekStart || '')
        if (!DATE_RE.test(ws)) return badRequest('Nedostaje weekStart.')
        const weekStart = weekStartOf(ws)
        const templateId =
            body.templateId === null || body.templateId === undefined || body.templateId === '' ? null : Number(body.templateId)

        if (templateId !== null) {
            const t = await getTemplate(templateId)
            if (!t) return badRequest('Šema nije pronađena.')
        }

        const { previousTemplateId } = await assignWeek(weekStart, templateId)

        if (previousTemplateId !== templateId) {
            const mon = fromISODate(weekStart)
            const label = `${formatDateLong(mon)} – ${formatDateLong(addDays(mon, 4))}`
            if (templateId === null) {
                await notifyAll({
                    type: 'raspored',
                    title: `Raspored za nedelju ${label} je uklonjen`,
                    body: 'Kuvana jela za tu nedelju trenutno nisu u ponudi. Suvi obroci su i dalje dostupni.',
                    link: '/',
                })
            } else {
                const t = await getTemplate(templateId)
                await notifyAll({
                    type: 'raspored',
                    title:
                        previousTemplateId === null
                            ? `Objavljen je raspored za nedelju ${label}`
                            : `Izmenjen je raspored za nedelju ${label}`,
                    body: `Šema: „${t?.name ?? ''}”. Pogledaj meni i naruči na vreme.`,
                    link: '/',
                })
            }
        }

        const assignment = await getWeekAssignment(weekStart)
        return NextResponse.json({ assignment })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri dodeli šeme.'))
    }
}
