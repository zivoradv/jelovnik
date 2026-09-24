import { and, asc, desc, eq, gt, gte, inArray, lte, sql } from 'drizzle-orm'
import { type Credit, credits, db, meals, type Order, orders, payments, users } from '@/drizzle'
import { isWorkday } from '@/lib/constants'
import { formatDateLong, fromISODate, toISODate, workdaysOfWeek } from '@/lib/date'
import { deadlineLabel, isOrderingOpen } from '@/lib/deadline'
import { allocateSubsidy, dayCostFromSnapshot, rsd, unitPrice } from '@/lib/pricing'
import { notifyAdmins, notifyUsers } from './notifications.service'
import { getPricingSettings } from './settings.service'

export interface OrderItemInput {
    mealId?: number | null
    note?: string | null
    quantity?: number | null
}

export async function getUserOrdersForDate(userId: number, dateStr: string): Promise<Order[]> {
    return db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.date, dateStr)))
}

export interface WeekOrderItem {
    mealId: number
    name: string
    quantity: number
    withSoup: boolean
    note: string | null
}

export interface WeekOrderDay {
    date: string
    items: WeekOrderItem[]
    /** Koliko korisnik plaća za taj dan (iz zamrznutih cena). */
    toPay: number
}

/** Porudžbine korisnika za svih 5 radnih dana nedelje u kojoj je `anyDayIso` – za pregled „šta sam naručio”. */
export async function getUserOrdersForWeek(userId: number, anyDayIso: string): Promise<WeekOrderDay[]> {
    const days = workdaysOfWeek(fromISODate(anyDayIso)).map(toISODate)
    const rows = await db
        .select({
            date: orders.date,
            mealId: orders.mealId,
            name: meals.name,
            quantity: orders.quantity,
            withSoup: orders.withSoup,
            note: orders.note,
            unitPrice: orders.unitPrice,
            subsidy: orders.subsidy,
        })
        .from(orders)
        .leftJoin(meals, eq(orders.mealId, meals.id))
        .where(and(eq(orders.userId, userId), gte(orders.date, days[0]), lte(orders.date, days[4])))
        .orderBy(asc(orders.date), asc(meals.name))

    const byDate = new Map<string, typeof rows>()
    for (const r of rows) {
        const list = byDate.get(r.date) ?? []
        list.push(r)
        byDate.set(r.date, list)
    }

    return days.map((date) => {
        const list = byDate.get(date) ?? []
        return {
            date,
            items: list.map((r) => ({
                mealId: r.mealId,
                name: r.name ?? 'Obrisano jelo',
                quantity: r.quantity,
                withSoup: r.withSoup,
                note: r.note,
            })),
            toPay: dayCostFromSnapshot(list).toPay,
        }
    })
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
    const merged = new Map<number, { note: string | null; quantity: number }>()
    for (const it of items) {
        const mealId = it.mealId ?? null
        if (mealId === null) continue
        const meal = mealById.get(mealId)
        if (!meal?.active) continue
        const qty = Math.min(99, Math.max(1, Math.round(Number(it.quantity) || 1)))
        const prev = merged.get(mealId)
        merged.set(mealId, {
            // napomena ide samo uz kuvano jelo; suvi obrok i dodaci se poručuju „takvi kakvi su”
            note: meal.category === 'kuvano' ? prev?.note || it.note?.trim() || null : null,
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
    const units = entries.map(([mealId]) =>
        Math.round(unitPrice({ price: Number(mealById.get(mealId)?.price) || 0, withSoup: false }, pricing)),
    )
    // dodaci (čorba) se plaćaju celi – popust firme sme da padne samo na obrok
    const subsidized = entries.map(([mealId]) => mealById.get(mealId)?.category !== 'dodatak')
    const subsidies = allocateSubsidy(units, pricing, subsidized)

    const values = entries.map(([mealId, it], i) => ({
        userId,
        date: dateStr,
        mealId,
        note: it.note,
        withSoup: false,
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

async function userLabel(userId: number): Promise<string> {
    const [u] = await db
        .select({ firstName: users.firstName, lastName: users.lastName, username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    return u ? `${u.firstName} ${u.lastName}`.trim() || u.username : `korisnik #${userId}`
}

/**
 * Posle svake izmene porudžbine dovodimo novac u red:
 *  – ako je za taj dan uplaćeno više nego što sada košta, višak ide u pretplatu (ne ostaje „preplaćen” dan),
 *  – ako korisnik ima pretplatu, ona odmah pokriva dugove (najstariji prvi) – zato i postoji.
 * Korisnik i administratori dobijaju obaveštenje o svakoj takvoj promeni.
 */
async function afterOrderChange(userId: number, dateStr: string, newTotal: number): Promise<void> {
    const [payment] = await db
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.userId, userId), eq(payments.date, dateStr)))
        .limit(1)
    const paid = payment?.amount ?? 0
    const dateLabel = formatDateLong(fromISODate(dateStr))

    const swept = paid > newTotal ? await sweepDay(userId, dateStr, newTotal, paid) : 0
    const creditBefore = await getCredit(userId)
    const used = creditBefore > 0 ? await applyCreditToDebts(userId) : { applied: 0, days: 0, left: creditBefore }
    const stillOwes = paid > 0 && newTotal > paid ? newTotal - paid - used.applied : 0

    if (swept === 0 && used.applied === 0 && stillOwes <= 0) return

    const who = await userLabel(userId)
    const userLines: string[] = []
    const adminLines: string[] = []

    if (swept > 0) {
        userLines.push(
            `Za ${dateLabel} je uplaćeno ${rsd(paid)}, a dan sada košta ${rsd(newTotal)} – ${rsd(swept)} je prebačeno u pretplatu.`,
        )
        adminLines.push(`${dateLabel}: uplaćeno ${rsd(paid)}, nova cena ${rsd(newTotal)} – ${rsd(swept)} prebačeno u pretplatu.`)
    }
    if (used.applied > 0) {
        const d = used.days === 1 ? 'dan' : 'dana'
        userLines.push(`Iz pretplate je plaćeno ${rsd(used.applied)} (${used.days} ${d}). Ostatak pretplate: ${rsd(used.left)}.`)
        adminLines.push(`Pretplata je pokrila ${rsd(used.applied)} duga (${used.days} ${d}); ostatak ${rsd(used.left)}.`)
    }
    if (stillOwes > 0) {
        userLines.push(`Za ${dateLabel} ostaje doplata od ${rsd(stillOwes)}.`)
        adminLines.push(`${dateLabel}: korisnik duguje još ${rsd(stillOwes)}.`)
    }

    await Promise.all([
        notifyUsers([userId], {
            type: swept > 0 || used.applied > 0 ? 'uplata' : 'dug',
            title: stillOwes > 0 ? `Promenjena porudžbina za plaćen dan (${dateLabel})` : `Stanje ažurirano (${dateLabel})`,
            body: userLines.join(' '),
            link: '/dug',
        }),
        notifyAdmins({
            type: 'dug',
            title: `${who}: izmena porudžbine za plaćen dan ${dateLabel}`,
            body: adminLines.join(' '),
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

export interface MealOrderer {
    mealId: number
    userId: number
    username: string
    firstName: string
    lastName: string
    quantity: number
    withSoup: boolean
}

/**
 * Ko je šta naručio za dati dan – bez napomena, jer su one dogovor sa kuvaricom.
 * Broj porcija je ionako javan (prikazuje se uz svako jelo), ovo mu samo daje imena.
 */
export async function getOrderersForDate(dateStr: string): Promise<MealOrderer[]> {
    return db
        .select({
            mealId: orders.mealId,
            userId: orders.userId,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            quantity: orders.quantity,
            withSoup: orders.withSoup,
        })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.date, dateStr))
        .orderBy(asc(users.firstName), asc(users.lastName), asc(users.username))
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
    /** null kad je jelo u međuvremenu obrisano (leftJoin). */
    isPosno: boolean | null
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
            isPosno: meals.isPosno,
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
            category: meals.category,
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
        const subs = allocateSubsidy(
            units,
            pricing,
            list.map((r) => r.category !== 'dodatak'),
        )
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
    /** Zbir preplata po danima (uplata veća od cene tog dana) – prebacuje se u pretplatu. */
    overpaidTotal: number
    /** Zbir svih evidentiranih uplata. */
    paidTotal: number
    /** Broj dana sa dugom. */
    unpaidCount: number
    /** Neiskorišćena pretplata (kredit) – novac koji čeka buduće obroke. */
    credit: number
    /** unpaidTotal − credit − overpaidTotal: neto stanje (>0 duguje, <0 ima višak kod nas). */
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

    const creditByUser = await creditTotals(userId)

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
        const credit = creditByUser.get(u.id) ?? 0
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
            credit,
            balance: unpaidTotal - overpaidTotal - credit,
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

// ───────────────────────────── pretplata (kredit) ─────────────────────────────

/** Trenutno stanje pretplate po korisniku (zbir stavki iz `credits`). */
async function creditTotals(userId: number | null): Promise<Map<number, number>> {
    const rows = await db
        .select({ userId: credits.userId, total: sql<number>`COALESCE(SUM(${credits.amount}), 0)::int` })
        .from(credits)
        .where(userId === null ? undefined : eq(credits.userId, userId))
        .groupBy(credits.userId)
    return new Map(rows.map((r) => [r.userId, r.total]))
}

export async function getCredit(userId: number): Promise<number> {
    const map = await creditTotals(userId)
    return map.get(userId) ?? 0
}

/** Poslednje stavke pretplate – „odakle je došlo i gde je otišlo”. */
export async function getCreditLog(userId: number, limit = 40): Promise<Credit[]> {
    return db.select().from(credits).where(eq(credits.userId, userId)).orderBy(desc(credits.createdAt), desc(credits.id)).limit(limit)
}

async function addCredit(userId: number, amount: number, reason: string, dateStr?: string | null): Promise<void> {
    if (amount === 0) return
    await db.insert(credits).values({ userId, amount: Math.round(amount), reason, date: dateStr ?? null })
}

async function upsertPayment(userId: number, dateStr: string, amount: number): Promise<void> {
    if (amount <= 0) {
        await db.delete(payments).where(and(eq(payments.userId, userId), eq(payments.date, dateStr)))
        return
    }
    await db
        .insert(payments)
        .values({ userId, date: dateStr, amount, paidAt: new Date() })
        .onConflictDoUpdate({ target: [payments.userId, payments.date], set: { amount, paidAt: new Date() } })
}

/**
 * Dan za koji je uplaćeno više nego što (sada) košta: uplata se spušta na tačnu cenu dana,
 * a višak se prebacuje u pretplatu. Vraća prebačeni iznos.
 */
async function sweepDay(userId: number, dateStr: string, total: number, paid: number): Promise<number> {
    const excess = paid - total
    if (excess <= 0) return 0
    await upsertPayment(userId, dateStr, Math.max(0, total))
    await addCredit(userId, excess, 'preplata za dan', dateStr)
    return excess
}

/** Prebacuje sve preplaćene dane korisnika u pretplatu. Vraća ukupno prebačen iznos. */
export async function sweepOverpaidToCredit(userId: number): Promise<number> {
    const balance = await getUserBalance(userId)
    if (!balance) return 0
    let moved = 0
    for (const r of balance.rows) {
        if (r.remaining < 0) moved += await sweepDay(userId, r.date, r.total, r.paid)
    }
    return moved
}

export interface CreditApplied {
    /** Koliko je pretplate potrošeno na dugove. */
    applied: number
    /** Na koliko dana. */
    days: number
    /** Koliko pretplate ostaje posle prebijanja. */
    left: number
}

/**
 * Troši pretplatu na neplaćene dane, počev od najstarijeg.
 * Ako pretplata ne pokrije ceo dan, taj dan ostaje „delimično” plaćen.
 */
export async function applyCreditToDebts(userId: number): Promise<CreditApplied> {
    let credit = await getCredit(userId)
    if (credit <= 0) return { applied: 0, days: 0, left: Math.min(0, credit) }

    const balance = await getUserBalance(userId)
    if (!balance) return { applied: 0, days: 0, left: credit }

    const owed = balance.rows.filter((r) => r.remaining > 0).sort((a, b) => (a.date < b.date ? -1 : 1))
    let applied = 0
    let days = 0
    for (const r of owed) {
        if (credit <= 0) break
        const take = Math.min(credit, r.remaining)
        await upsertPayment(userId, r.date, r.paid + take)
        await addCredit(userId, -take, 'iskorišćeno za dug', r.date)
        credit -= take
        applied += take
        days += 1
    }
    return { applied, days, left: credit }
}

export interface PaymentResult {
    /** Koliko je novca primljeno. */
    amount: number
    /** Koliko je od toga otišlo na dugove. */
    applied: number
    /** Na koliko dana. */
    days: number
    /** Koliko ostaje kao pretplata za buduće obroke. */
    left: number
    /** Koliko je usput prebačeno iz ranije preplaćenih dana. */
    swept: number
}

/**
 * Evidentira uplatu proizvoljnog iznosa: novac prvo ide u pretplatu, pa se odatle
 * prebija sa najstarijim dugovima. Ono što pretekne ostaje kao pretplata.
 */
export async function recordPayment(userId: number, amount: number): Promise<PaymentResult> {
    const amt = Math.round(Number(amount))
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Iznos uplate mora biti veći od nule.')

    const swept = await sweepOverpaidToCredit(userId)
    await addCredit(userId, amt, 'uplata')
    const res = await applyCreditToDebts(userId)
    return { amount: amt, applied: res.applied, days: res.days, left: res.left, swept }
}

/** Isplata pretplate nazad korisniku (gotovina/prenos) – skida se sa stanja. */
export async function refundCredit(userId: number, amount: number): Promise<number> {
    const amt = Math.round(Number(amount))
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Iznos isplate mora biti veći od nule.')
    const credit = await getCredit(userId)
    if (amt > credit) throw new Error(`Pretplata je ${rsd(credit)} – ne možeš isplatiti ${rsd(amt)}.`)
    await addCredit(userId, -amt, 'isplaćeno korisniku')
    return amt
}

/** Trenutna cena dana (ono što korisnik plaća) iz zamrznutih stavki. */
async function dayTotal(userId: number, dateStr: string): Promise<number> {
    const rows = await db
        .select({ quantity: orders.quantity, unitPrice: orders.unitPrice, subsidy: orders.subsidy })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.date, dateStr)))
    return dayCostFromSnapshot(rows).toPay
}

/** Koliko je pretplate (neto) utrošeno baš na taj dan – da bi poništavanje dana vratilo novac. */
async function creditUsedForDay(userId: number, dateStr: string): Promise<number> {
    const [row] = await db
        .select({ total: sql<number>`COALESCE(SUM(${credits.amount}), 0)::int` })
        .from(credits)
        .where(and(eq(credits.userId, userId), eq(credits.date, dateStr)))
    return Math.max(0, -(row?.total ?? 0))
}

/**
 * Evidentira uplatu za jedan dan: `paid = true` upisuje tačno trenutnu cenu dana kao plaćeno,
 * `paid = false` vraća dan na neplaćeno. Ako je dan bio pokriven iz pretplate,
 * poništavanje vraća taj novac u pretplatu (da nigde ne nestane). Vraća upisani iznos.
 */
export async function setPaid(userId: number, dateStr: string, paid: boolean): Promise<number> {
    if (!paid) {
        const fromCredit = await creditUsedForDay(userId, dateStr)
        await db.delete(payments).where(and(eq(payments.userId, userId), eq(payments.date, dateStr)))
        if (fromCredit > 0) await addCredit(userId, fromCredit, 'vraćeno iz poništenog dana', dateStr)
        return 0
    }
    const amount = await dayTotal(userId, dateStr)
    await upsertPayment(userId, dateStr, amount)
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

/** Ima li korisnik neizmiren račun (dug, preplata ili pretplata) – koristi se pre brisanja naloga. */
export async function userHasOpenBalance(userId: number): Promise<{ unpaid: number; overpaid: number; credit: number }> {
    const b = await getUserBalance(userId)
    return { unpaid: b?.unpaidTotal ?? 0, overpaid: b?.overpaidTotal ?? 0, credit: b?.credit ?? 0 }
}
