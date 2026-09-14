export interface NamedUser {
    username: string
    firstName?: string | null
    lastName?: string | null
}

/** „Ime Prezime”, a ako nisu uneti – korisničko ime. */
export function fullName(u: NamedUser): string {
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
    return name || u.username
}

/** Inicijali za avatar. */
export function initials(u: NamedUser): string {
    const f = (u.firstName ?? '').trim()[0]
    const l = (u.lastName ?? '').trim()[0]
    if (f && l) return `${f}${l}`.toUpperCase()
    return (f || u.username[0] || '?').toUpperCase()
}

export const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/
