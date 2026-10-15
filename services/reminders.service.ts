import { and, eq, isNotNull, isNull, lt, lte, notExists, or } from 'drizzle-orm'
import { db, orders, users } from '@/drizzle'
import { formatDateShort, toISODate } from '@/lib/date'
import { deadlineLabel, firstOrderableWorkday, orderDeadline, TIME_ZONE } from '@/lib/deadline'
import { rsd } from '@/lib/pricing'
import { notifyUsers } from './notifications.service'
import { applyCreditToDebts, getAllBalances } from './orders.service'

function daysLabel(n: number): string {
    return n === 1 ? '1 dan' : `${n} dana`
}

/** Svakom korisniku sa neplaćenim dugom šalje obaveštenje sa iznosom – pošto se pretplata prvo prebije. */
export async function sendDebtReminders(): Promise<{ notified: number; total: number }> {
    const initial = await getAllBalances()
    // ko ima pretplatu, prvo njome plaća – tek ono što ostane je dug vredan podsetnika
    for (const b of initial) {
        if (b.credit > 0 && b.unpaidTotal > 0) await applyCreditToDebts(b.userId)
    }
    const balances = initial.some((b) => b.credit > 0 && b.unpaidTotal > 0) ? await getAllBalances() : initial
    const debtors = balances.filter((b) => b.unpaidTotal > 0)
    for (const b of debtors) {
        await notifyUsers([b.userId], {
            type: 'dug',
            title: `Podsetnik: dug ${rsd(b.unpaidTotal)}`,
            body: `Neplaćeno je ${daysLabel(b.unpaidCount)}. Kada platiš, admin će označiti uplatu.`,
            link: '/dug',
        })
    }
    return { notified: debtors.length, total: debtors.reduce((a, b) => a + b.unpaidTotal, 0) }
}

/**
 * Podsetnik za naručivanje u vreme koje je korisnik izabrao. Poziva se često (npr. na 5 min);
 * šalje se samo na dan kad ističe rok za sledeći radni dan, i samo onima koji za taj dan još nisu naručili.
 */
export async function sendOrderReminders(now = new Date()): Promise<{ notified: number }> {
    const target = firstOrderableWorkday(now)
    const targetIso = toISODate(target)
    if (orderDeadline(targetIso).getTime() - now.getTime() > 24 * 60 * 60 * 1000) return { notified: 0 }

    const [today, hhmm] = new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE, dateStyle: 'short', timeStyle: 'short' })
        .format(now)
        .split(' ')
    // označavanje i izbor u jednom upitu – dva preklopljena poziva crona ne šalju duplo
    const due = await db
        .update(users)
        .set({ remindedOn: today })
        .where(
            and(
                isNotNull(users.reminderTime),
                lte(users.reminderTime, hhmm),
                or(isNull(users.remindedOn), lt(users.remindedOn, today)),
                notExists(
                    db
                        .select({ id: orders.id })
                        .from(orders)
                        .where(and(eq(orders.userId, users.id), eq(orders.date, targetIso))),
                ),
            ),
        )
        .returning({ id: users.id })
    await notifyUsers(
        due.map((u) => u.id),
        {
            type: 'info',
            title: 'Ne zaboravi da naručiš! 🍽️',
            body: `Još nemaš porudžbinu za ${formatDateShort(target)}. Rok: ${deadlineLabel(targetIso)}.`,
            link: '/',
        },
    )
    return { notified: due.length }
}
