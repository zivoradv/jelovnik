import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db, type Notification, notifications, users } from '@/drizzle'

export type NotificationType = Notification['type']

export interface NotificationInput {
    type: NotificationType
    title: string
    body?: string
    link?: string | null
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

export async function listForUser(userId: number, limit = 30): Promise<Notification[]> {
    return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(limit)
}

export async function unreadCount(userId: number): Promise<number> {
    const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    return rows[0]?.count ?? 0
}

export async function markRead(userId: number, ids?: number[]): Promise<void> {
    const base = and(eq(notifications.userId, userId), isNull(notifications.readAt))
    const where = ids && ids.length > 0 ? and(base, inArray(notifications.id, ids)) : base
    await db.update(notifications).set({ readAt: new Date() }).where(where)
}
