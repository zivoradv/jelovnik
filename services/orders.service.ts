import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db, meals, type Order, orders, payments, users } from '@/drizzle'
import { isWorkday } from '@/lib/constants'
import { fromISODate } from '@/lib/date'

export interface OrderItemInput {
    mealId?: number | null
    customText?: string | null
    note?: string | null
    quantity?: number | null
}

export async function getUserOrdersForDate(userId: number, dateStr: string): Promise<Order[]> {
    return db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.date, dateStr)))
}

export async function saveUserOrders(userId: number, dateStr: string, items: OrderItemInput[]): Promise<Order[]> {
    if (!isWorkday(fromISODate(dateStr))) {
        throw new Error('Poručivanje je moguće samo za radne dane (ponedeljak–petak).')
    }

    const cleaned = items
        .map((it) => ({
            mealId: it.mealId ?? null,
            customText: it.customText?.trim() || null,
            note: it.note?.trim() || null,
            quantity: Math.min(99, Math.max(1, Math.round(Number(it.quantity) || 1))),
        }))
        .filter((it) => it.mealId !== null || it.customText !== null)

    const del = db.delete(orders).where(and(eq(orders.userId, userId), eq(orders.date, dateStr)))

    if (cleaned.length === 0) {
        await del
        return []
    }

    const values = cleaned.map((it) => ({
        userId,
        date: dateStr,
        mealId: it.mealId,
        customText: it.customText,
        note: it.note,
        quantity: it.quantity,
    }))

    const ins = db.insert(orders).values(values).returning()

    const res = await db.batch([del, ins])
    return res[1] as Order[]
}

export async function getCountsForDate(dateStr: string): Promise<{ mealId: number; count: number }[]> {
    const rows = await db
        .select({
            mealId: orders.mealId,
            count: sql<number>`COALESCE(SUM(${orders.quantity}), 0)::int`,
        })
        .from(orders)
        .where(and(eq(orders.date, dateStr), isNotNull(orders.mealId)))
        .groupBy(orders.mealId)

    return rows.filter((r) => r.mealId !== null).map((r) => ({ mealId: r.mealId as number, count: r.count }))
}

export interface OrderDetailRow {
    orderId: number
    userId: number
    username: string
    mealId: number | null
    mealName: string | null
    category: string | null
    price: string | null
    customText: string | null
    note: string | null
    quantity: number
}

export async function getOrdersDetailForDate(dateStr: string): Promise<OrderDetailRow[]> {
    return db
        .select({
            orderId: orders.id,
            userId: orders.userId,
            username: users.username,
            mealId: orders.mealId,
            mealName: meals.name,
            category: meals.category,
            price: meals.price,
            customText: orders.customText,
            note: orders.note,
            quantity: orders.quantity,
        })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .leftJoin(meals, eq(orders.mealId, meals.id))
        .where(eq(orders.date, dateStr))
        .orderBy(asc(meals.name), asc(users.username))
}

export interface DebtRow {
    date: string
    total: number
    mealCount: number
    customCount: number
    paid: boolean
}

export async function getUserBalance(userId: number): Promise<DebtRow[]> {
    const rows = await db
        .select({
            date: orders.date,
            total: sql<number>`COALESCE(SUM(${meals.price} * ${orders.quantity}), 0)::float`,
            mealCount: sql<number>`COALESCE(SUM(${orders.quantity}) FILTER (WHERE ${orders.mealId} IS NOT NULL), 0)::int`,
            customCount: sql<number>`COALESCE(SUM(${orders.quantity}) FILTER (WHERE ${orders.mealId} IS NULL), 0)::int`,
            paid: sql<boolean>`COALESCE(BOOL_OR(${payments.paid}), false)`,
        })
        .from(orders)
        .leftJoin(meals, eq(orders.mealId, meals.id))
        .leftJoin(payments, and(eq(payments.userId, orders.userId), eq(payments.date, orders.date)))
        .where(eq(orders.userId, userId))
        .groupBy(orders.date)
        .orderBy(desc(orders.date))

    return rows.map((r) => ({
        date: r.date,
        total: Number(r.total) || 0,
        mealCount: r.mealCount,
        customCount: r.customCount,
        paid: r.paid,
    }))
}

export async function setPaid(userId: number, dateStr: string, paid: boolean): Promise<void> {
    await db
        .insert(payments)
        .values({ userId, date: dateStr, paid, paidAt: paid ? new Date() : null })
        .onConflictDoUpdate({
            target: [payments.userId, payments.date],
            set: { paid, paidAt: paid ? new Date() : null },
        })
}
