import { asc, eq } from 'drizzle-orm'
import { db, type Meal, meals, type NewMeal } from '@/drizzle'
import { formatDateLong, fromISODate } from '@/lib/date'
import { notifyUsers } from './notifications.service'
import { usersWithUpcomingOrdersOfMeal } from './orders.service'

export async function listMeals(): Promise<Meal[]> {
    return db.select().from(meals).orderBy(asc(meals.category), asc(meals.name))
}

export async function getMealById(id: number): Promise<Meal | undefined> {
    const rows = await db.select().from(meals).where(eq(meals.id, id)).limit(1)
    return rows[0]
}

export async function createMeal(data: NewMeal): Promise<Meal> {
    const [created] = await db.insert(meals).values(data).returning()
    return created
}

function datesText(dates: string[]): string {
    return dates.map((d) => formatDateLong(fromISODate(d))).join(', ')
}

/** Izmena jela; korisnici koji su ga već naručili za naredne dane dobijaju obaveštenje. */
export async function updateMeal(id: number, data: Partial<NewMeal>): Promise<Meal | undefined> {
    const before = await getMealById(id)
    if (!before) return undefined

    const [updated] = await db
        .update(meals)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(meals.id, id))
        .returning()
    if (!updated) return undefined

    const relevantChange =
        before.name !== updated.name ||
        Number(before.price) !== Number(updated.price) ||
        before.active !== updated.active ||
        (before.description ?? '') !== (updated.description ?? '')

    if (relevantChange) {
        const affected = await usersWithUpcomingOrdersOfMeal(id)
        const deactivated = before.active && !updated.active
        for (const a of affected) {
            await notifyUsers([a.userId], {
                type: 'jelo',
                title: deactivated ? `Jelo „${before.name}” je privremeno uklonjeno iz ponude` : `Jelo „${before.name}” je izmenjeno`,
                body: deactivated
                    ? `Naručio/la si ga za: ${datesText(a.dates)}. Proveri porudžbinu i izaberi nešto drugo ako treba.`
                    : `Sada je „${updated.name}” po ceni ${Number(updated.price).toLocaleString('sr-RS')} RSD. Tvoja porudžbina za ${datesText(a.dates)} ostaje.`,
                link: '/',
            })
        }
    }

    return updated
}

/** Brisanje jela; porudžbine se brišu kaskadno, pa korisnike obaveštavamo pre brisanja. */
export async function deleteMeal(id: number): Promise<void> {
    const meal = await getMealById(id)
    if (!meal) return
    const affected = await usersWithUpcomingOrdersOfMeal(id)
    for (const a of affected) {
        await notifyUsers([a.userId], {
            type: 'jelo',
            title: `Jelo „${meal.name}” je uklonjeno iz ponude`,
            body: `Tvoja porudžbina tog jela za ${datesText(a.dates)} je obrisana. Izaberi nešto drugo.`,
            link: '/',
        })
    }
    await db.delete(meals).where(eq(meals.id, id))
}
