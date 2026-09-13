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
