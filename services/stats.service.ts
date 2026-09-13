import { and, desc, eq, gte, isNotNull, isNull, lt, sql } from 'drizzle-orm'
import { db, meals, orders, users } from '@/drizzle'
import type { UserStats } from '@/lib/badges'
import { addDays, fromISODate, toISODate } from '@/lib/date'

function belgradeHour(d: Date): number {
    return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/Belgrade' }).format(d))
}

function workdayStreak(dates: string[]): number {
    const set = new Set(dates)
    if (set.size === 0) return 0
    let cursor = fromISODate([...set].sort().at(-1) as string)
    let streak = 0
    while (set.has(toISODate(cursor))) {
        streak += 1
        cursor = addDays(cursor, -1)
        while (cursor.getDay() === 0 || cursor.getDay() === 6) cursor = addDays(cursor, -1)
    }
    return streak
}

export async function getUserStats(userId: number): Promise<UserStats> {
    const rows = await db
        .select({
            date: orders.date,
            quantity: orders.quantity,
            mealId: orders.mealId,
            mealName: meals.name,
            isPosno: meals.isPosno,
            createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(meals, eq(orders.mealId, meals.id))
        .where(eq(orders.userId, userId))

    const perDay = new Map<string, number>()
    const perMeal = new Map<string, number>()
    let portions = 0
    let customCount = 0
    let posnoCount = 0
    let earlyBird = false
    let nightOwl = false

    for (const r of rows) {
        portions += r.quantity
        perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.quantity)
        if (r.mealId === null) customCount += r.quantity
        else if (r.mealName) perMeal.set(r.mealName, (perMeal.get(r.mealName) ?? 0) + r.quantity)
        if (r.isPosno) posnoCount += r.quantity
        const h = belgradeHour(r.createdAt)
        if (h < 8) earlyBird = true
        if (h >= 22) nightOwl = true
    }

    const favorite = [...perMeal.entries()].sort((a, b) => b[1] - a[1])[0]

    return {
        days: perDay.size,
        portions,
        customCount,
        posnoCount,
        maxPortionsInDay: Math.max(0, ...perDay.values()),
        streak: workdayStreak([...perDay.keys()]),
        favorite: favorite ? { name: favorite[0], count: favorite[1] } : null,
        earlyBird,
        nightOwl,
    }
}

export interface LeaderboardRow {
    userId: number
    username: string
    portions: number
    days: number
    customCount: number
}

export interface MonthlyStats {
    leaderboard: LeaderboardRow[]
    topMeal: { name: string; portions: number } | null
    improviser: { username: string; count: number } | null
}

function monthRange(yearMonth: string): [string, string] {
    const [y, m] = yearMonth.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)
    return [toISODate(start), toISODate(end)]
}

export async function getMonthlyStats(yearMonth: string): Promise<MonthlyStats> {
    const [start, end] = monthRange(yearMonth)
    const inMonth = and(gte(orders.date, start), lt(orders.date, end))

    const [leaderboard, topMeals, improvisers] = await Promise.all([
        db
            .select({
                userId: orders.userId,
                username: users.username,
                portions: sql<number>`COALESCE(SUM(${orders.quantity}), 0)::int`,
                days: sql<number>`COUNT(DISTINCT ${orders.date})::int`,
                customCount: sql<number>`COALESCE(SUM(${orders.quantity}) FILTER (WHERE ${orders.mealId} IS NULL), 0)::int`,
            })
            .from(orders)
            .innerJoin(users, eq(orders.userId, users.id))
            .where(inMonth)
            .groupBy(orders.userId, users.username)
            .orderBy(desc(sql`SUM(${orders.quantity})`), users.username)
            .limit(10),
        db
            .select({ name: meals.name, portions: sql<number>`SUM(${orders.quantity})::int` })
            .from(orders)
            .innerJoin(meals, eq(orders.mealId, meals.id))
            .where(and(inMonth, isNotNull(orders.mealId)))
            .groupBy(meals.name)
            .orderBy(desc(sql`SUM(${orders.quantity})`))
            .limit(1),
        db
            .select({ username: users.username, count: sql<number>`SUM(${orders.quantity})::int` })
            .from(orders)
            .innerJoin(users, eq(orders.userId, users.id))
            .where(and(inMonth, isNull(orders.mealId)))
            .groupBy(users.username)
            .orderBy(desc(sql`SUM(${orders.quantity})`))
            .limit(1),
    ])

    return {
        leaderboard,
        topMeal: topMeals[0] ?? null,
        improviser: improvisers[0] ?? null,
    }
}
