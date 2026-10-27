import { birthdayInYear } from './date'

/** Koliko dana unapred rođendan ulazi u „za plaćanje”. */
export const DUE_AHEAD_DAYS = 30

/** placeno = dao pare; treba = rođendan je prošao ili je blizu, a nije dao; kasnije = još je daleko. */
export type BirthdayStatus = 'placeno' | 'treba' | 'kasnije'

export interface BirthdayPerson {
    id: number
    username: string
    firstName: string
    lastName: string
    birthday: string | null
    /** false = ne učestvuje u skupljanju (ne daje i ne dobija). */
    birthdayFund: boolean
}

export interface BirthdayEntry extends BirthdayPerson {
    birthday: string
    date: Date
    /** Dana do rođendana (negativno = prošao). */
    days: number
    status: BirthdayStatus
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Ovogodišnji rođendani ostalih sa statusom uplate korisnika `me`.
 * Rođendani pre nego što je korisnik napravio nalog se ne računaju (osim ako je ipak dao).
 * Ko ne učestvuje u skupljanju niti daje niti se za njega daje.
 */
export function myBirthdayEntries(
    people: BirthdayPerson[],
    paid: [number, number][],
    me: { id: number; createdAt?: string },
    now = new Date(),
): BirthdayEntry[] {
    const today = startOfDay(now)
    const year = today.getFullYear()
    const joined = me.createdAt ? startOfDay(new Date(me.createdAt)) : null
    const order: Record<BirthdayStatus, number> = { treba: 0, kasnije: 1, placeno: 2 }
    if (people.find((p) => p.id === me.id)?.birthdayFund === false) return []
    return people
        .filter((p): p is BirthdayPerson & { birthday: string } => !!p.birthday && p.birthdayFund && p.id !== me.id)
        .map((p) => {
            const date = birthdayInYear(p.birthday, year)
            const days = Math.round((date.getTime() - today.getTime()) / 86_400_000)
            const status: BirthdayStatus = paid.some(([c, u]) => c === p.id && u === me.id)
                ? 'placeno'
                : days <= DUE_AHEAD_DAYS
                  ? 'treba'
                  : 'kasnije'
            return { ...p, date, days, status }
        })
        .filter((p) => p.status === 'placeno' || !joined || p.date >= joined)
        .sort((a, b) => order[a.status] - order[b.status] || a.date.getTime() - b.date.getTime())
}

export function whenLabel(days: number): string {
    if (days === 0) return 'danas! 🎂'
    if (days === 1) return 'sutra'
    if (days === -1) return 'juče'
    return days > 0 ? `za ${days} dana` : `pre ${-days} dana`
}
