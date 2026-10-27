import { and, asc, eq } from 'drizzle-orm'
import { birthdayPayments, db, users } from '@/drizzle'
import type { BirthdayPerson } from '@/lib/birthdays'
import { BIRTHDAY_CONTRIBUTION } from '@/lib/constants'
import { validateBirthday } from './users.service'

export interface BirthdayOverview {
    users: BirthdayPerson[]
    /** Uplate za datu godinu: [slavljenik, uplatilac]. */
    paid: [number, number][]
    amount: number
}

export async function getBirthdayOverview(year: number): Promise<BirthdayOverview> {
    const [list, rows] = await Promise.all([
        db
            .select({
                id: users.id,
                username: users.username,
                firstName: users.firstName,
                lastName: users.lastName,
                birthday: users.birthday,
                birthdayFund: users.birthdayFund,
            })
            .from(users)
            .orderBy(asc(users.lastName), asc(users.firstName)),
        db
            .select({ celebrantId: birthdayPayments.celebrantId, payerId: birthdayPayments.payerId })
            .from(birthdayPayments)
            .where(eq(birthdayPayments.year, year)),
    ])
    return { users: list, paid: rows.map((r) => [r.celebrantId, r.payerId]), amount: BIRTHDAY_CONTRIBUTION }
}

export async function setBirthdayFund(userId: number, fund: boolean): Promise<void> {
    await db.update(users).set({ birthdayFund: fund }).where(eq(users.id, userId))
}

export async function setUserBirthday(userId: number, birthday: string | null): Promise<void> {
    await db
        .update(users)
        .set({ birthday: validateBirthday(birthday) })
        .where(eq(users.id, userId))
}

export async function setBirthdayPaid(celebrantId: number, payerId: number, year: number, paid: boolean): Promise<void> {
    if (celebrantId === payerId) throw new Error('Slavljenik ne daje pare sam sebi.')
    if (paid) {
        await db.insert(birthdayPayments).values({ celebrantId, payerId, year, amount: BIRTHDAY_CONTRIBUTION }).onConflictDoNothing()
    } else {
        await db
            .delete(birthdayPayments)
            .where(
                and(eq(birthdayPayments.celebrantId, celebrantId), eq(birthdayPayments.payerId, payerId), eq(birthdayPayments.year, year)),
            )
    }
}
