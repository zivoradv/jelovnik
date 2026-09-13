import { asc, eq, sql } from 'drizzle-orm'
import { db, type User, users } from '@/drizzle'
import { hashPassword, verifyPassword } from '@/lib/password'

export type PublicUser = Pick<User, 'id' | 'username' | 'role' | 'createdAt'>

function toPublic(u: User): PublicUser {
    return { id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1)
    return rows[0]
}

export async function getUserById(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return rows[0]
}

export async function countUsers(): Promise<number> {
    const rows = await db.select({ count: sql<number>`count(*)::int` }).from(users)
    return rows[0]?.count ?? 0
}

export async function registerUser(username: string, password: string): Promise<PublicUser> {
    const existing = await getUserByUsername(username)
    if (existing) {
        throw new Error('Korisničko ime je već zauzeto.')
    }

    const total = await countUsers()
    const role = total === 0 ? 'admin' : 'user'
    const hash = await hashPassword(password)

    const [created] = await db.insert(users).values({ username, password: hash, role }).returning()

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
    const rows = await db.select().from(users).orderBy(asc(users.username))
    return rows.map(toPublic)
}

export async function setUserRole(id: number, role: 'admin' | 'user'): Promise<PublicUser | undefined> {
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning()
    return updated ? toPublic(updated) : undefined
}

export async function deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
}
