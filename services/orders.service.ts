import { and, asc, eq, gt, gte, inArray, sql } from 'drizzle-orm'
import { db, meals, type Order, orders, payments, users } from '@/drizzle'
import { isWorkday } from '@/lib/constants'
import { formatDateLong, fromISODate, toISODate } from '@/lib/date'
import { deadlineLabel, isOrderingOpen } from '@/lib/deadline'
import { allocateSubsidy, dayCostFromSnapshot, rsd, unitPrice } from '@/lib/pricing'
import { notifyAdmins, notifyUsers } from './notifications.service'
import { getPricingSettings } from './settings.service'

export interface OrderItemInput {
    mealId?: number | null
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

/**
 * Čuva porudžbinu za jedan dan (briše staru i upisuje novu).
 * Cena porcije i deo firme se zamrzavaju u trenutku upisa, pa kasnije promene cena ne diraju već upisane dane.
 */
export async function saveUserOrders(userId: number, dateStr: string, items: OrderItemInput[]): Promise<Order[]> {
    if (!isWorkday(fromISODate(dateStr))) {
        throw new Error('Poručivanje je moguće samo za radne dane (ponedeljak–petak).')
    }
    if (!isOrderingOpen(dateStr)) {
        throw new Error(`Rok za naručivanje je istekao (${deadlineLabel(dateStr)}). Naručuje se najkasnije dan ranije do 17h.`)
    }

    const mealIds = [...new Set(items.map((it) => it.mealId).filter((id): id is number => typeof id === 'number' && id > 0))]
    const mealRows =
        mealIds.length > 0
            ? await db
                  .select({ id: meals.id, category: meals.category, price: meals.price, active: meals.active })
                  .from(meals)
                  .where(inArray(meals.id, mealIds))
            : []
    const mealById = new Map(mealRows.map((m) => [m.id, m]))

    // isto jelo dva puta u zahtevu → spoji količine (da ne bi popust dva puta „video” istu porciju)
    const merged = new Map<number, { note: string | null; withSoup: boolean; quantity: number }>()
    for (const it of items) {
        const mealId = it.mealId ?? null
        if (mealId === null) continue
        const meal = mealById.get(mealId)
        if (!meal?.active) continue
        const isSuvo = meal.category === 'suvo'
        const qty = Math.min(99, Math.max(1, Math.round(Number(it.quantity) || 1)))
        const prev = merged.get(mealId)
        merged.set(mealId, {
            // suvi obrok nema napomenu, ali može da ima čorbu; kuvano ima napomenu, čorba je uključena
            note: isSuvo ? null : prev?.note || it.note?.trim() || null,
            withSoup: isSuvo ? Boolean(prev?.withSoup || it.withSoup) : false,
            quantity: Math.min(99, (prev?.quantity ?? 0) + qty),
        })
    }

    const del = db.delete(orders).where(and(eq(orders.userId, userId), eq(orders.date, dateStr)))

    if (merged.size === 0) {
        await del
        await afterOrderChange(userId, dateStr, 0)
        return []
    }

    const pricing = await getPricingSettings()
    const entries = [...merged.entries()]
    const units = entries.map(([mealId, it]) =>
        Math.round(unitPrice({ price: Number(mealById.get(mealId)?.price) || 0, withSoup: it.withSoup }, pricing)),
    )
    const subsidies = allocateSubsidy(units, pricing)

    const values = entries.map(([mealId, it], i) => ({
        userId,
        date: dateStr,
        mealId,
        note: it.note,
        withSoup: it.withSoup,
        quantity: it.quantity,
        unitPrice: units[i],
        subsidy: subsidies[i],
    }))

    const ins = db.insert(orders).values(values).returning()
    const res = await db.batch([del, ins])
    const saved = res[1] as Order[]

    await afterOrderChange(userId, dateStr, dayCostFromSnapshot(saved).toPay)
    return saved
}

/**
 * Ako je dan već (delimično) plaćen, a korisnik je promenio porudžbinu tako da se cena razlikuje od uplate,
 * obaveštavamo i korisnika i administratore – da ne ostane „plaćeno” sa pogrešnim iznosom.
 */
async function afterOrderChange(userId: number, dateStr: string, newTotal: number): Promise<void> {
    const [payment] = await db
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.userId, userId), eq(payments.date, dateStr)))
        .limit(1)
    if (!payment || payment.amount <= 0 || payment.amount === newTotal) return

    const diff = newTotal - payment.amount
    const dateLabel = formatDateLong(fromISODate(dateStr))
    const [u] = await db
        .select({ firstName: users.firstName, lastName: users.lastName, username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    const who = u ? `${u.firstName} ${u.lastName}`.trim() || u.username : `korisnik #${userId}`

    await Promise.all([
        notifyUsers([userId], {
            type: 'dug',
            title: `Promenjena porudžbina za već plaćen dan (${dateLabel})`,
            body:
                diff > 0
                    ? `Plaćeno je ${rsd(payment.amount)}, a nova cena je ${rsd(newTotal)}. Razlika od ${rsd(diff)} je dodata na dug.`
                    : `Plaćeno je ${rsd(payment.amount)}, a nova cena je ${rsd(newTotal)}. Preplata od ${rsd(-diff)} se vodi kao tvoj kredit.`,
            link: '/dug',
        }),
        notifyAdmins({
            type: 'dug',
            title: `${who}: izmena porudžbine za plaćen dan ${dateLabel}`,
            body:
                diff > 0
                    ? `Uplaćeno ${rsd(payment.amount)}, nova cena ${rsd(newTotal)} – korisnik duguje još ${rsd(diff)}.`
                    : `Uplaćeno ${rsd(payment.amount)}, nova cena ${rsd(newTotal)} – preplata ${rsd(-diff)}.`,
            link: '/admin?tab=dugovi',
        }),
    ])
}

export async function getCountsForDate(dateStr: string): Promise<{ mealId: number; count: number }[]> {
    const rows = await db
        .select({
            mealId: orders.mealId,
            count: sql<number>`COALESCE(SUM(${orders.quantity}), 0)::int`,
        })
        .from(orders)
        .where(eq(orders.date, dateStr))
        .groupBy(orders.mealId)

    return rows.map((r) => ({ mealId: r.mealId, count: r.count }))
}

export interface OrderDetailRow {
    orderId: number
    userId: number
    username: string
    firstName: string
    lastName: string
    mealId: number
    mealName: string | null
    category: string | null
    /** Zamrznuta cena porcije (jelo + čorba). */
    unitPrice: number
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
            unitPrice: orders.unitPrice,
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

export async function mealHasOrders(mealId: number): Promise<boolean> {
    const rows = await db.select({ id: orders.id }).from(orders).where(eq(orders.mealId, mealId)).limit(1)
    return rows.length > 0
}

/**
 * Nova cena jela ili novi popust važe za dane koji tek dolaze (strogo posle današnjeg).
 * Prošli i današnji dani ostaju kako su obračunati – to je zaključen račun.
 * Vraća broj izmenjenih stavki.
 */
export async function repriceFutureOrders(): Promise<number> {
    const today = toISODate(new Date())
    const pricing = await getPricingSettings()
    const rows = await db
        .select({
            id: orders.id,
            userId: orders.userId,
            date: orders.date,
            withSoup: orders.withSoup,
            unitPrice: orders.unitPrice,
            subsidy: orders.subsidy,
            price: meals.price,
        })
        .from(orders)
        .innerJoin(meals, eq(orders.mealId, meals.id))
        .where(gt(orders.date, today))

    const perDay = new Map<string, typeof rows>()
    for (const r of rows) {
        const key = `${r.userId}|${r.date}`
        const list = perDay.get(key) ?? []
        list.push(r)
        perDay.set(key, list)
    }

    const changes: { id: number; unitPrice: number; subsidy: number }[] = []
    for (const list of perDay.values()) {
        const units = list.map((r) => Math.round(unitPrice({ price: Number(r.price) || 0, withSoup: r.withSoup }, pricing)))
        const subs = allocateSubsidy(units, pricing)
        list.forEach((r, i) => {
            if (r.unitPrice !== units[i] || r.subsidy !== subs[i]) changes.push({ id: r.id, unitPrice: units[i], subsidy: subs[i] })
        })
    }

    for (let i = 0; i < changes.length; i += 50) {
        const chunk = changes.slice(i, i + 50)
        await Promise.all(
            chunk.map((c) => db.update(orders).set({ unitPrice: c.unitPrice, subsidy: c.subsidy }).where(eq(orders.id, c.id))),
        )
    }
    return changes.length
}

export type DebtStatus = 'placeno' | 'neplaceno' | 'delimicno' | 'preplaceno' | 'nista'

export interface DebtRow {
    date: string
    /** Puna cena svih porcija tog dana. */
    full: number
    /** Deo koji pokriva firma. */
    subsidy: number
    /** Ono što korisnik treba da plati za taj dan (trenutna cena). */
    total: number
    /** Koliko je evidentirano kao plaćeno. */
    paid: number
    /** total − paid: >0 duguje, <0 preplatio. */
    remaining: number
    status: DebtStatus
    mealCount: number
    paidAt: string | null
}

export interface UserBalance {
    userId: number
    username: string
    firstName: string
    lastName: string
    rows: DebtRow[]
    /** Zbir svih pozitivnih ostataka (koliko duguje). */
    unpaidTotal: number
    /** Zbir svih preplata (koliko mu se duguje / kredit). */
    overpaidTotal: number
    /** Zbir svih evidentiranih uplata. */
    paidTotal: number
    /** Broj dana sa dugom. */
    unpaidCount: number
    /** unpaidTotal − overpaidTotal: neto stanje. */
    balance: number
}

function statusOf(total: number, paid: number): DebtStatus {
    if (total <= 0 && paid <= 0) return 'nista'
    if (paid === total) return 'placeno'
    if (paid <= 0) return 'neplaceno'
    if (paid < total) return 'delimicno'
    return 'preplaceno'
}

async function computeBalances(userId: number | null): Promise<Map<number, UserBalance>> {
    const orderWhere = userId === null ? undefined : eq(orders.userId, userId)
    const paymentWhere = userId === null ? undefined : eq(payments.userId, userId)

    const [orderRows, paymentRows, userRows] = await Promise.all([
        db
            .select({
                userId: orders.userId,
                date: orders.date,
                quantity: orders.quantity,
                unitPrice: orders.unitPrice,
                subsidy: orders.subsidy,
            })
            .from(orders)
            .where(orderWhere),
        db.select().from(payments).where(paymentWhere),
        db
            .select({ id: users.id, username: users.username, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(userId === null ? undefined : eq(users.id, userId))
            .orderBy(asc(users.lastName), asc(users.firstName), asc(users.username)),
    ])

    type Bucket = { items: { unitPrice: number; quantity: number; subsidy: number }[]; mealCount: number }
    const buckets = new Map<number, Map<string, Bucket>>()
    const bucketFor = (uid: number, date: string): Bucket => {
        let perUser = buckets.get(uid)
        if (!perUser) {
            perUser = new Map()
            buckets.set(uid, perUser)
        }
        let b = perUser.get(date)
        if (!b) {
            b = { items: [], mealCount: 0 }
            perUser.set(date, b)
        }
        return b
    }
    for (const r of orderRows) {
        const b = bucketFor(r.userId, r.date)
        b.mealCount += r.quantity
        b.items.push({ unitPrice: r.unitPrice, quantity: r.quantity, subsidy: r.subsidy })
    }

    // dan sa uplatom, a bez porudžbine (korisnik obrisao porudžbinu posle uplate) mora da se vidi kao preplata
    const paidMap = new Map<string, { amount: number; paidAt: Date | null }>()
    for (const p of paymentRows) {
        paidMap.set(`${p.userId}|${p.date}`, { amount: p.amount, paidAt: p.paidAt })
        if (p.amount > 0) bucketFor(p.userId, p.date)
    }

    const result = new Map<number, UserBalance>()
    for (const u of userRows) {
        const perUser = buckets.get(u.id) ?? new Map<string, Bucket>()
        const rows: DebtRow[] = [...perUser.entries()]
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([date, b]) => {
                const cost = dayCostFromSnapshot(b.items)
                const p = paidMap.get(`${u.id}|${date}`)
                const paid = p?.amount ?? 0
                return {
                    date,
                    full: cost.full,
                    subsidy: cost.subsidy,
                    total: cost.toPay,
                    paid,
                    remaining: cost.toPay - paid,
                    status: statusOf(cost.toPay, paid),
                    mealCount: b.mealCount,
                    paidAt: p?.paidAt ? p.paidAt.toISOString() : null,
                }
            })
        let unpaidTotal = 0
        let overpaidTotal = 0
        let paidTotal = 0
        let unpaidCount = 0
        for (const r of rows) {
            paidTotal += r.paid
            if (r.remaining > 0) {
                unpaidTotal += r.remaining
                unpaidCount += 1
            } else if (r.remaining < 0) {
                overpaidTotal += -r.remaining
            }
        }
        result.set(u.id, {
            userId: u.id,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            rows,
            unpaidTotal,
            overpaidTotal,
            paidTotal,
            unpaidCount,
            balance: unpaidTotal - overpaidTotal,
        })
    }
    return result
}

export async function getUserBalance(userId: number): Promise<UserBalance | null> {
    const map = await computeBalances(userId)
    return map.get(userId) ?? null
}

export async function getAllBalances(): Promise<UserBalance[]> {
    const map = await computeBalances(null)
    return [...map.values()]
}

/** Trenutna cena dana (ono što korisnik plaća) iz zamrznutih stavki. */
async function dayTotal(userId: number, dateStr: string): Promise<number> {
    const rows = await db
        .select({ quantity: orders.quantity, unitPrice: orders.unitPrice, subsidy: orders.subsidy })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.date, dateStr)))
    return dayCostFromSnapshot(rows).toPay
}

/**
 * Evidentira uplatu za jedan dan: `paid = true` upisuje tačno trenutnu cenu dana kao plaćeno,
 * `paid = false` vraća dan na neplaćeno. Vraća upisani iznos.
 */
export async function setPaid(userId: number, dateStr: string, paid: boolean): Promise<number> {
    const amount = paid ? await dayTotal(userId, dateStr) : 0
    if (!paid) {
        await db.delete(payments).where(and(eq(payments.userId, userId), eq(payments.date, dateStr)))
        return 0
    }
    await db
        .insert(payments)
        .values({ userId, date: dateStr, amount, paidAt: new Date() })
        .onConflictDoUpdate({
            target: [payments.userId, payments.date],
            set: { amount, paidAt: new Date() },
        })
    return amount
}

/** Označi sve dane sa dugom kao plaćene (upisuje trenutnu cenu). Vraća broj dana i ukupan naplaćen iznos. */
export async function setAllPaid(userId: number): Promise<{ days: number; amount: number }> {
    const balance = await getUserBalance(userId)
    if (!balance) return { days: 0, amount: 0 }
    const owed = balance.rows.filter((r) => r.remaining > 0)
    for (const r of owed) await setPaid(userId, r.date, true)
    return { days: owed.length, amount: owed.reduce((a, r) => a + r.remaining, 0) }
}

/** Ima li korisnik neizmiren račun (dug ili preplata) – koristi se pre brisanja naloga. */
export async function userHasOpenBalance(userId: number): Promise<{ unpaid: number; overpaid: number }> {
    const b = await getUserBalance(userId)
    return { unpaid: b?.unpaidTotal ?? 0, overpaid: b?.overpaidTotal ?? 0 }
}
