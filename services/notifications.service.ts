import { and, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm'
import { db, type Notification, notifications, users } from '@/drizzle'

export type NotificationType = Notification['type']

/** Obaveštenja starija od ovoliko dana se brišu (cron) i ne prikazuju. */
export const NOTIFICATION_MAX_AGE_DAYS = 30

export interface NotificationInput {
    type: NotificationType
    title: string
    body?: string
    link?: string | null
}

function maxAgeCutoff(): Date {
    return new Date(Date.now() - NOTIFICATION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
}

export async function notifyUsers(userIds: number[], input: NotificationInput): Promise<number> {
    const ids = [...new Set(userIds)]
    if (ids.length === 0) return 0
    await db.insert(notifications).values(
        ids.map((userId) => ({
            userId,
            type: input.type,
            title: input.title,
            body: input.body ?? '',
            link: input.link ?? null,
        })),
    )
    return ids.length
}

export async function notifyAll(input: NotificationInput): Promise<number> {
    const rows = await db.select({ id: users.id }).from(users)
    return notifyUsers(
        rows.map((r) => r.id),
        input,
    )
}

export async function notifyAdmins(input: NotificationInput): Promise<number> {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))
    return notifyUsers(
        rows.map((r) => r.id),
        input,
    )
}

export async function listForUser(userId: number, limit = 30): Promise<Notification[]> {
    return db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), gte(notifications.createdAt, maxAgeCutoff())))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(limit)
}

export async function unreadCount(userId: number): Promise<number> {
    const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), gte(notifications.createdAt, maxAgeCutoff())))
    return rows[0]?.count ?? 0
}

export async function markRead(userId: number, ids?: number[]): Promise<void> {
    const base = and(eq(notifications.userId, userId), isNull(notifications.readAt))
    const where = ids && ids.length > 0 ? and(base, inArray(notifications.id, ids)) : base
    await db.update(notifications).set({ readAt: new Date() }).where(where)
}

/** Briše obaveštenja starija od NOTIFICATION_MAX_AGE_DAYS. Vraća broj obrisanih. */
export async function purgeOldNotifications(): Promise<number> {
    const deleted = await db.delete(notifications).where(lt(notifications.createdAt, maxAgeCutoff())).returning({ id: notifications.id })
    return deleted.length
}
