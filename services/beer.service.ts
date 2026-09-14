import { and, asc, desc, eq, gte, inArray, lt } from 'drizzle-orm'
import { type BeerPlan, beerPlans, beerRsvps, db, users } from '@/drizzle'
import { formatDateLong, fromISODate, toISODate } from '@/lib/date'
import { fullName } from '@/lib/users'
import { notifyUsers } from './notifications.service'

export interface BeerPerson {
    userId: number
    username: string
    firstName: string
    lastName: string
    status: 'da' | 'ne'
}

export interface BeerPlanView extends BeerPlan {
    creatorName: string
    going: BeerPerson[]
    notGoing: BeerPerson[]
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

async function attachPeople(plans: BeerPlan[]): Promise<BeerPlanView[]> {
    if (plans.length === 0) return []
    const ids = plans.map((p) => p.id)
    const [rsvps, creators] = await Promise.all([
        db
            .select({
                planId: beerRsvps.planId,
                userId: beerRsvps.userId,
                status: beerRsvps.status,
                username: users.username,
                firstName: users.firstName,
                lastName: users.lastName,
            })
            .from(beerRsvps)
            .innerJoin(users, eq(beerRsvps.userId, users.id))
            .where(inArray(beerRsvps.planId, ids))
            .orderBy(asc(beerRsvps.createdAt)),
        db
            .select({ id: users.id, username: users.username, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(
                inArray(
                    users.id,
                    plans.map((p) => p.createdBy),
                ),
            ),
    ])
    const creatorById = new Map(creators.map((c) => [c.id, fullName(c)]))
    return plans.map((p) => {
        const mine = rsvps.filter((r) => r.planId === p.id)
        return {
            ...p,
            creatorName: creatorById.get(p.createdBy) ?? '?',
            going: mine.filter((r) => r.status === 'da'),
            notGoing: mine.filter((r) => r.status === 'ne'),
        }
    })
}

export function planLabel(p: { date: string; time: string; place: string }): string {
    const dayName = new Intl.DateTimeFormat('sr-Latn-RS', { weekday: 'long' }).format(fromISODate(p.date))
    return `${dayName} ${formatDateLong(fromISODate(p.date))} u ${p.time}${p.place ? ` (${p.place})` : ''}`
}

/** Predstojeći (uključujući današnji) i nedavno prošli dogovori. */
export async function listPlans(): Promise<{ upcoming: BeerPlanView[]; past: BeerPlanView[] }> {
    const today = toISODate(new Date())
    const [up, past] = await Promise.all([
        db.select().from(beerPlans).where(gte(beerPlans.date, today)).orderBy(asc(beerPlans.date), asc(beerPlans.time)),
        db.select().from(beerPlans).where(lt(beerPlans.date, today)).orderBy(desc(beerPlans.date), desc(beerPlans.time)).limit(10),
    ])
    const [upcoming, pastViews] = await Promise.all([attachPeople(up), attachPeople(past)])
    return { upcoming, past: pastViews }
}

export async function getPlan(id: number): Promise<BeerPlanView | undefined> {
    const rows = await db.select().from(beerPlans).where(eq(beerPlans.id, id)).limit(1)
    if (rows.length === 0) return undefined
    return (await attachPeople(rows))[0]
}

export async function createPlan(
    userId: number,
    input: { date: string; time?: string; place?: string; note?: string },
): Promise<BeerPlanView> {
    const time = (input.time ?? '17:00').trim()
    if (!TIME_RE.test(time)) throw new Error('Vreme mora biti u formatu HH:MM.')
    if (input.date < toISODate(new Date())) throw new Error('Datum ne može biti u prošlosti.')

    const [created] = await db
        .insert(beerPlans)
        .values({
            date: input.date,
            time,
            place: (input.place ?? '').trim().slice(0, 120),
            note: (input.note ?? '').trim().slice(0, 300),
            createdBy: userId,
        })
        .returning()
    await db.insert(beerRsvps).values({ planId: created.id, userId, status: 'da' })

    const creator = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    const others = (await db.select({ id: users.id }).from(users)).map((u) => u.id).filter((id) => id !== userId)
    await notifyUsers(others, {
        type: 'pivo',
        title: `🍺 ${fullName(creator[0])} predlaže pivo`,
        body: `${planLabel(created)}. Ko ide?`,
        link: '/pivo',
    })

    return (await getPlan(created.id)) as BeerPlanView
}

export async function deletePlan(id: number, userId: number, isAdmin: boolean): Promise<void> {
    const rows = await db.select().from(beerPlans).where(eq(beerPlans.id, id)).limit(1)
    const plan = rows[0]
    if (!plan) return
    if (plan.createdBy !== userId && !isAdmin) throw new Error('Samo onaj ko je predložio (ili admin) može da obriše dogovor.')
    await db.delete(beerPlans).where(eq(beerPlans.id, id))
}

/** Ide / ne ide. Kad neko potvrdi „da”, ostali dobijaju obaveštenje. */
export async function rsvp(planId: number, userId: number, status: 'da' | 'ne'): Promise<BeerPlanView> {
    const plan = await getPlan(planId)
    if (!plan) throw new Error('Dogovor nije pronađen.')

    const before = plan.going.some((g) => g.userId === userId)
    await db
        .insert(beerRsvps)
        .values({ planId, userId, status })
        .onConflictDoUpdate({ target: [beerRsvps.planId, beerRsvps.userId], set: { status, updatedAt: new Date() } })

    if (status === 'da' && !before) {
        const me = await db.select().from(users).where(eq(users.id, userId)).limit(1)
        const others = (await db.select({ id: users.id }).from(users)).map((u) => u.id).filter((id) => id !== userId)
        const count = plan.going.length + 1
        await notifyUsers(others, {
            type: 'pivo',
            title: `🍺 ${fullName(me[0])} ide na pivo`,
            body: `${planLabel(plan)}. Za sada ${count} ${count === 1 ? 'osoba' : count < 5 ? 'osobe' : 'osoba'}.`,
            link: '/pivo',
        })
    }

    return (await getPlan(planId)) as BeerPlanView
}

/**
 * Brzi odgovor iz kafanskog popup-a: „da” → potvrda na najbliži predstojeći dogovor,
 * a ako dogovora nema, pravi se novi za danas u 17:00. „ne” → samo se zabeleži na najbližem.
 */
export async function quickAnswer(userId: number, answer: 'da' | 'ne'): Promise<{ plan: BeerPlanView | null; created: boolean }> {
    const today = toISODate(new Date())
    const next = await db
        .select()
        .from(beerPlans)
        .where(and(gte(beerPlans.date, today)))
        .orderBy(asc(beerPlans.date), asc(beerPlans.time))
        .limit(1)

    if (next.length > 0) {
        const plan = await rsvp(next[0].id, userId, answer)
        return { plan, created: false }
    }
    if (answer === 'ne') return { plan: null, created: false }
    const plan = await createPlan(userId, { date: today, time: '17:00' })
    return { plan, created: true }
}
