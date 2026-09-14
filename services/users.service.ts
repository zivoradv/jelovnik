import { asc, eq, sql } from 'drizzle-orm'
import { db, type User, users } from '@/drizzle'
import { hashPassword, verifyPassword } from '@/lib/password'
import { USERNAME_RE } from '@/lib/users'

export type PublicUser = Pick<User, 'id' | 'username' | 'firstName' | 'lastName' | 'role' | 'createdAt'>

function toPublic(u: User): PublicUser {
    return { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, role: u.role, createdAt: u.createdAt }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1)
    return rows[0]
}

export async function getUserById(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return rows[0]
}

export async function getPublicUserById(id: number): Promise<PublicUser | undefined> {
    const u = await getUserById(id)
    return u ? toPublic(u) : undefined
}

export async function countUsers(): Promise<number> {
    const rows = await db.select({ count: sql<number>`count(*)::int` }).from(users)
    return rows[0]?.count ?? 0
}

export interface RegisterInput {
    username: string
    password: string
    firstName: string
    lastName: string
}

function validateName(value: string, label: string): string {
    const v = value.trim()
    if (!v) throw new Error(`${label} je obavezno.`)
    if (v.length > 60) throw new Error(`${label} je predugačko.`)
    return v
}

function validateUsername(value: string): string {
    const v = value.trim()
    if (!USERNAME_RE.test(v)) {
        throw new Error('Korisničko ime može imati 3–30 znakova: slova, brojeve, tačku, crticu i donju crtu.')
    }
    return v
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
    const username = validateUsername(input.username)
    const firstName = validateName(input.firstName, 'Ime')
    const lastName = validateName(input.lastName, 'Prezime')

    const existing = await getUserByUsername(username)
    if (existing) {
        throw new Error('Korisničko ime je već zauzeto.')
    }

    const total = await countUsers()
    const role = total === 0 ? 'admin' : 'user'
    const hash = await hashPassword(input.password)

    const [created] = await db.insert(users).values({ username, password: hash, firstName, lastName, role }).returning()

    return toPublic(created)
}

export async function authenticate(username: string, password: string): Promise<PublicUser | null> {
    const user = await getUserByUsername(username)
    if (!user) return null
    const ok = await verifyPassword(password, user.password)
    if (!ok) return null
    return toPublic(user)
}

export async function listUsers(): Promise<PublicUser[]> {
    const rows = await db.select().from(users).orderBy(asc(users.lastName), asc(users.firstName), asc(users.username))
    return rows.map(toPublic)
}

export async function setUserRole(id: number, role: 'admin' | 'user'): Promise<PublicUser | undefined> {
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning()
    return updated ? toPublic(updated) : undefined
}

export async function deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
}

export interface ProfilePatch {
    username?: string
    firstName?: string
    lastName?: string
}

export async function updateProfile(id: number, patch: ProfilePatch): Promise<PublicUser> {
    const set: Partial<User> = {}
    if (patch.username !== undefined) {
        const username = validateUsername(patch.username)
        const existing = await getUserByUsername(username)
        if (existing && existing.id !== id) throw new Error('Korisničko ime je već zauzeto.')
        set.username = username
    }
    if (patch.firstName !== undefined) set.firstName = validateName(patch.firstName, 'Ime')
    if (patch.lastName !== undefined) set.lastName = validateName(patch.lastName, 'Prezime')

    if (Object.keys(set).length === 0) {
        const u = await getUserById(id)
        if (!u) throw new Error('Korisnik nije pronađen.')
        return toPublic(u)
    }
    const [updated] = await db.update(users).set(set).where(eq(users.id, id)).returning()
    if (!updated) throw new Error('Korisnik nije pronađen.')
    return toPublic(updated)
}

export async function changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    const u = await getUserById(id)
    if (!u) throw new Error('Korisnik nije pronađen.')
    const ok = await verifyPassword(currentPassword, u.password)
    if (!ok) throw new Error('Trenutna lozinka nije ispravna.')
    if (newPassword.length < 4) throw new Error('Nova lozinka mora imati najmanje 4 karaktera.')
    const hash = await hashPassword(newPassword)
    await db.update(users).set({ password: hash }).where(eq(users.id, id))
}
