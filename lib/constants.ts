export const WEEKDAYS = [
    { value: 1, short: 'Pon', label: 'Ponedeljak' },
    { value: 2, short: 'Uto', label: 'Utorak' },
    { value: 3, short: 'Sre', label: 'Sreda' },
    { value: 4, short: 'Čet', label: 'Četvrtak' },
    { value: 5, short: 'Pet', label: 'Petak' },
] as const

export const DAY_LABELS: Record<number, string> = {
    1: 'Ponedeljak',
    2: 'Utorak',
    3: 'Sreda',
    4: 'Četvrtak',
    5: 'Petak',
    6: 'Subota',
    0: 'Nedelja',
}

export const CATEGORIES = [
    { value: 'kuvano', label: 'Kuvano jelo' },
    { value: 'suvo', label: 'Suvi obrok' },
] as const

/** Podrazumevane cene pri unosu novog jela (RSD). */
export const DEFAULT_PRICES = {
    kuvano: 500,
    suvo: 400,
    posno: 400,
} as const

export const COOKIE_NAME = 'token'
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 30

export function isWorkday(date: Date): boolean {
    const d = date.getDay()
    return d >= 1 && d <= 5
}
