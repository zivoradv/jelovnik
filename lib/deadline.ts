import { addDays, formatDateLong, fromISODate, toISODate } from './date'

/** Rok za naručivanje: dan ranije do ovog sata (Europe/Belgrade). */
export const ORDER_DEADLINE_HOUR = 17
export const TIME_ZONE = 'Europe/Belgrade'

/** Pomeraj beogradske zone u minutima u datom trenutku (npr. 120 leti, 60 zimi). */
function belgradeOffsetMinutes(at: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(at)
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
    return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Trenutak u kome ističe rok za naručivanje za dati dan (YYYY-MM-DD): prethodni dan u 17:00 po Beogradu. */
export function orderDeadline(dateStr: string): Date {
    const d = fromISODate(dateStr)
    const prev = addDays(d, -1)
    // prvo pretpostavimo UTC, pa korigujemo za stvarni pomeraj zone u tom trenutku
    const guess = new Date(Date.UTC(prev.getFullYear(), prev.getMonth(), prev.getDate(), ORDER_DEADLINE_HOUR, 0, 0))
    const offset = belgradeOffsetMinutes(guess)
    return new Date(guess.getTime() - offset * 60_000)
}

export function isOrderingOpen(dateStr: string, now = new Date()): boolean {
    return now.getTime() < orderDeadline(dateStr).getTime()
}

/** Tekst roka za prikaz: „ponedeljak, 14.09.2026. do 17:00”. */
export function deadlineLabel(dateStr: string): string {
    const prev = addDays(fromISODate(dateStr), -1)
    const dayName = new Intl.DateTimeFormat('sr-Latn-RS', { weekday: 'long', timeZone: TIME_ZONE }).format(prev)
    return `${dayName}, ${formatDateLong(prev)} do ${ORDER_DEADLINE_HOUR}:00`
}

/** Prvi radni dan za koji se još može naručiti (za podrazumevani izbor na početnoj). */
export function firstOrderableWorkday(now = new Date()): Date {
    let d = new Date(now)
    d.setHours(0, 0, 0, 0)
    for (let i = 0; i < 10; i++) {
        d = addDays(d, 1)
        const dow = d.getDay()
        if (dow === 0 || dow === 6) continue
        if (isOrderingOpen(toISODate(d), now)) return d
    }
    return addDays(d, 1)
}
