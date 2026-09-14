import { and, asc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm'
import { db, meals, type Order, orders, payments, users } from '@/drizzle'
import { isWorkday } from '@/lib/constants'
import { fromISODate, toISODate } from '@/lib/date'
import { deadlineLabel, isOrderingOpen } from '@/lib/deadline'
import { computeDayCost, type PricingSettings } from '@/lib/pricing'
import { getPricingSettings } from './settings.service'

export interface OrderItemInput {
    mealId?: number | null
    customText?: string | null
    note?: string | null
    quantity?: number | null
    withSoup?: boolean | null
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
    if (!isOrderingOpen(dateStr)) {
        throw new Error(`Rok za naručivanje je istekao (${deadlineLabel(dateStr)}). Naručuje se najkasnije dan ranije do 17h.`)
    }

    const mealIds = [...new Set(items.map((it) => it.mealId).filter((id): id is number => typeof id === 'number' && id > 0))]
    const mealRows =
        mealIds.length > 0 ? await db.select({ id: meals.id, category: meals.category }).from(meals).where(inArray(meals.id, mealIds)) : []
    const categoryById = new Map(mealRows.map((m) => [m.id, m.category]))

    const cleaned = items
        .map((it) => {
            const mealId = it.mealId ?? null
            const category = mealId !== null ? categoryById.get(mealId) : undefined
            const isSuvo = category === 'suvo'
            return {
                mealId,
                customText: it.customText?.trim() || null,
                // suvi obrok nema napomenu, ali može da ima čorbu; kuvano ima napomenu, čorba je uključena
                note: isSuvo ? null : it.note?.trim() || null,
                withSoup: isSuvo ? Boolean(it.withSoup) : false,
                quantity: Math.min(99, Math.max(1, Math.round(Number(it.quantity) || 1))),
            }
        })
        .filter((it) => (it.mealId !== null && categoryById.has(it.mealId)) || it.customText !== null)

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
        withSoup: it.withSoup,
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
    firstName: string
    lastName: string
    mealId: number | null
    mealName: string | null
    category: string | null
    price: string | null
    customText: string | null
    note: string | null
    withSoup: boolean
    quantity: number
}

export async function getOrdersDetailForDate(dateStr: string): Promise<OrderDetailRow[]> {
    return db
        .select({
            orderId: orders.id,
            userId: orders.userId,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            mealId: orders.mealId,
            mealName: meals.name,
            category: meals.category,
            price: meals.price,
            customText: orders.customText,
            note: orders.note,
            withSoup: orders.withSoup,
            quantity: orders.quantity,
        })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .leftJoin(meals, eq(orders.mealId, meals.id))
        .where(eq(orders.date, dateStr))
        .orderBy(asc(meals.name), asc(users.username))
}

/** Korisnici koji imaju porudžbinu datog jela za današnji ili neki budući dan. */
export async function usersWithUpcomingOrdersOfMeal(mealId: number): Promise<{ userId: number; dates: string[] }[]> {
    const today = toISODate(new Date())
    const rows = await db
        .select({ userId: orders.userId, date: orders.date })
        .from(orders)
        .where(and(eq(orders.mealId, mealId), gte(orders.date, today)))
    const map = new Map<number, Set<string>>()
    for (const r of rows) {
        let set = map.get(r.userId)
        if (!set) {
            set = new Set()
            map.set(r.userId, set)
        }
        set.add(r.date)
    }
    return [...map.entries()].map(([userId, dates]) => ({ userId, dates: [...dates].sort() }))
}

export interface DebtRow {
    date: string
    /** Puna cena svih porcija tog dana. */
    full: number
    /** Deo koji pokriva firma. */
    subsidy: number
    /** Ono što korisnik plaća. */
    total: number
    mealCount: number
    customCount: number
    paid: boolean
    paidAt: string | null
}

export interface UserBalance {
    userId: number
    username: string
    firstName: string
    lastName: string
    rows: DebtRow[]
    unpaidTotal: number
    paidTotal: number
    unpaidCount: number
}

async function computeBalances(userId: number | null, pricing: PricingSettings): Promise<Map<number, UserBalance>> {
    const orderWhere = userId === null ? undefined : eq(orders.userId, userId)
    const paymentWhere = userId === null ? undefined : eq(payments.userId, userId)

    const [orderRows, paymentRows, userRows] = await Promise.all([
        db
            .select({
                userId: orders.userId,
                date: orders.date,
                quantity: orders.quantity,
                mealId: orders.mealId,
                withSoup: orders.withSoup,
                price: meals.price,
            })
            .from(orders)
            .leftJoin(meals, eq(orders.mealId, meals.id))
            .where(orderWhere),
        db.select().from(payments).where(paymentWhere),
        db
            .select({ id: users.id, username: users.username, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(userId === null ? undefined : eq(users.id, userId))
            .orderBy(asc(users.lastName), asc(users.firstName), asc(users.username)),
    ])

    const paidMap = new Map<string, { paid: boolean; paidAt: Date | null }>()
    for (const p of paymentRows) paidMap.set(`${p.userId}|${p.date}`, { paid: p.paid, paidAt: p.paidAt })

    type Bucket = { items: { price: number; quantity: number; withSoup: boolean }[]; mealCount: number; customCount: number }
    const buckets = new Map<number, Map<string, Bucket>>()
    for (const r of orderRows) {
        let perUser = buckets.get(r.userId)
        if (!perUser) {
            perUser = new Map()
            buckets.set(r.userId, perUser)
        }
        let b = perUser.get(r.date)
        if (!b) {
            b = { items: [], mealCount: 0, customCount: 0 }
            perUser.set(r.date, b)
        }
        if (r.mealId === null) {
            b.customCount += r.quantity
        } else {
            b.mealCount += r.quantity
            b.items.push({ price: Number(r.price) || 0, quantity: r.quantity, withSoup: r.withSoup })
        }
    }

    const result = new Map<number, UserBalance>()
    for (const u of userRows) {
        const perUser = buckets.get(u.id) ?? new Map<string, Bucket>()
        const rows: DebtRow[] = [...perUser.entries()]
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([date, b]) => {
                const cost = computeDayCost(b.items, pricing)
                const p = paidMap.get(`${u.id}|${date}`)
                return {
                    date,
                    full: cost.full,
                    subsidy: cost.subsidy,
                    total: cost.toPay,
                    mealCount: b.mealCount,
                    customCount: b.customCount,
                    paid: p?.paid ?? false,
                    paidAt: p?.paidAt ? p.paidAt.toISOString() : null,
                }
            })
        let unpaidTotal = 0
        let paidTotal = 0
        let unpaidCount = 0
        for (const r of rows) {
            if (r.paid) paidTotal += r.total
            else {
                unpaidTotal += r.total
                if (r.total > 0) unpaidCount += 1
            }
        }
        result.set(u.id, {
            userId: u.id,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            rows,
            unpaidTotal,
            paidTotal,
            unpaidCount,
        })
    }
    return result
}

export async function getUserBalance(userId: number): Promise<UserBalance | null> {
    const pricing = await getPricingSettings()
    const map = await computeBalances(userId, pricing)
    return map.get(userId) ?? null
}

export async function getAllBalances(): Promise<UserBalance[]> {
    const pricing = await getPricingSettings()
    const map = await computeBalances(null, pricing)
    return [...map.values()]
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

/** Označi sve neplaćene dane korisnika kao plaćene. Vraća broj dana i ukupan iznos. */
export async function setAllPaid(userId: number): Promise<{ days: number; amount: number }> {
    const balance = await getUserBalance(userId)
    if (!balance) return { days: 0, amount: 0 }
    const unpaid = balance.rows.filter((r) => !r.paid)
    for (const r of unpaid) await setPaid(userId, r.date, true)
    return { days: unpaid.length, amount: unpaid.reduce((a, r) => a + r.total, 0) }
}
