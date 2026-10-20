export function toISODate(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function fromISODate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
}

export function startOfWeek(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    date.setHours(0, 0, 0, 0)
    return date
}

export function workdaysOfWeek(d: Date): Date[] {
    const monday = startOfWeek(d)
    return Array.from({ length: 5 }, (_, i) => {
        const day = new Date(monday)
        day.setDate(monday.getDate() + i)
        return day
    })
}

export function addDays(d: Date, days: number): Date {
    const date = new Date(d)
    date.setDate(date.getDate() + days)
    return date
}

export function formatDateShort(d: Date): string {
    const days = ['ned', 'pon', 'uto', 'sre', 'čet', 'pet', 'sub']
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${days[d.getDay()]}, ${dd}.${mm}.`
}

export function formatDateLong(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}.${d.getFullYear()}.`
}

export const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar']

export const MONTH_RE = /^\d{4}-\d{2}$/

/** Tekući mesec kao YYYY-MM. */
export function currentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number)
    return `${MONTHS[m - 1]} ${y}.`
}

/** [prvi dan meseca, prvi dan sledećeg meseca) kao ISO datumi. */
export function monthRange(ym: string): [string, string] {
    const [y, m] = ym.split('-').map(Number)
    return [toISODate(new Date(y, m - 1, 1)), toISODate(new Date(y, m, 1))]
}

/** Rođendan (YYYY-MM-DD) u datoj godini; 29. februar u neprestupnoj godini pada 28. februara. */
export function birthdayInYear(birthday: string, year: number): Date {
    const [, m, d] = birthday.split('-').map(Number)
    const date = new Date(year, m - 1, d)
    return date.getMonth() === m - 1 ? date : new Date(year, m - 1, d - 1)
}

/** Sledeći rođendan od `from` (danas se računa) i broj dana do njega. */
export function nextBirthday(birthday: string, from: Date): { date: Date; days: number } {
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    let date = birthdayInYear(birthday, today.getFullYear())
    if (date < today) date = birthdayInYear(birthday, today.getFullYear() + 1)
    return { date, days: Math.round((date.getTime() - today.getTime()) / 86_400_000) }
}

/** „12. novembar” */
export function formatDayMonth(d: Date): string {
    return `${d.getDate()}. ${MONTHS[d.getMonth()]}`
}
