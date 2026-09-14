import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db, type Meal, type MenuTemplate, meals, menuTemplateItems, menuTemplates, weekMenus } from '@/drizzle'
import { fromISODate, startOfWeek, toISODate } from '@/lib/date'

export interface TemplateWithItems extends MenuTemplate {
    /** day (1–5) → id-jevi jela */
    days: Record<number, number[]>
}

export type TemplateDaysInput = Record<number, number[]> | { day: number; mealIds: number[] }[]

function emptyDays(): Record<number, number[]> {
    return { 1: [], 2: [], 3: [], 4: [], 5: [] }
}

function normalizeDays(input: TemplateDaysInput): Record<number, number[]> {
    const out = emptyDays()
    const entries = Array.isArray(input)
        ? input.map((d) => [Number(d.day), d.mealIds] as const)
        : Object.entries(input).map(([d, ids]) => [Number(d), ids] as const)
    for (const [day, ids] of entries) {
        if (day < 1 || day > 5) continue
        out[day] = [...new Set((ids ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    }
    return out
}

async function attachItems(templates: MenuTemplate[]): Promise<TemplateWithItems[]> {
    if (templates.length === 0) return []
    const items = await db
        .select()
        .from(menuTemplateItems)
        .where(
            inArray(
                menuTemplateItems.templateId,
                templates.map((t) => t.id),
            ),
        )
    const byTemplate = new Map<number, Record<number, number[]>>()
    for (const t of templates) byTemplate.set(t.id, emptyDays())
    for (const it of items) {
        const days = byTemplate.get(it.templateId)
        if (!days) continue
        if (!days[it.day]) days[it.day] = []
        days[it.day].push(it.mealId)
    }
    return templates.map((t) => ({ ...t, days: byTemplate.get(t.id) ?? emptyDays() }))
}

export async function listTemplates(): Promise<TemplateWithItems[]> {
    const rows = await db.select().from(menuTemplates).orderBy(asc(menuTemplates.name))
    return attachItems(rows)
}

export async function getTemplate(id: number): Promise<TemplateWithItems | undefined> {
    const rows = await db.select().from(menuTemplates).where(eq(menuTemplates.id, id)).limit(1)
    if (rows.length === 0) return undefined
    return (await attachItems(rows))[0]
}

async function replaceItems(templateId: number, days: Record<number, number[]>) {
    await db.delete(menuTemplateItems).where(eq(menuTemplateItems.templateId, templateId))
    const values = Object.entries(days).flatMap(([day, ids]) => ids.map((mealId) => ({ templateId, day: Number(day), mealId })))
    if (values.length > 0) await db.insert(menuTemplateItems).values(values)
}

export async function createTemplate(name: string, days: TemplateDaysInput): Promise<TemplateWithItems> {
    const [created] = await db.insert(menuTemplates).values({ name: name.trim() }).returning()
    await replaceItems(created.id, normalizeDays(days))
    return (await getTemplate(created.id)) as TemplateWithItems
}

export async function updateTemplate(
    id: number,
    patch: { name?: string; days?: TemplateDaysInput },
): Promise<TemplateWithItems | undefined> {
    const existing = await getTemplate(id)
    if (!existing) return undefined
    if (patch.name !== undefined) {
        await db.update(menuTemplates).set({ name: patch.name.trim(), updatedAt: new Date() }).where(eq(menuTemplates.id, id))
    }
    if (patch.days !== undefined) {
        await replaceItems(id, normalizeDays(patch.days))
        await db.update(menuTemplates).set({ updatedAt: new Date() }).where(eq(menuTemplates.id, id))
    }
    return getTemplate(id)
}

export async function deleteTemplate(id: number): Promise<void> {
    await db.delete(menuTemplates).where(eq(menuTemplates.id, id))
}

/** Nedelje (ponedeljci) u kojima se šema koristi. */
export async function weeksUsingTemplate(id: number): Promise<string[]> {
    const rows = await db
        .select({ weekStart: weekMenus.weekStart })
        .from(weekMenus)
        .where(eq(weekMenus.templateId, id))
        .orderBy(desc(weekMenus.weekStart))
    return rows.map((r) => r.weekStart)
}

export function weekStartOf(dateStr: string): string {
    return toISODate(startOfWeek(fromISODate(dateStr)))
}

export interface WeekAssignment {
    weekStart: string
    template: TemplateWithItems | null
}

export async function getWeekAssignment(weekStart: string): Promise<WeekAssignment> {
    const rows = await db.select().from(weekMenus).where(eq(weekMenus.weekStart, weekStart)).limit(1)
    if (rows.length === 0) return { weekStart, template: null }
    const template = await getTemplate(rows[0].templateId)
    return { weekStart, template: template ?? null }
}

export async function listWeekAssignments(): Promise<{ weekStart: string; templateId: number; templateName: string }[]> {
    return db
        .select({ weekStart: weekMenus.weekStart, templateId: weekMenus.templateId, templateName: menuTemplates.name })
        .from(weekMenus)
        .innerJoin(menuTemplates, eq(weekMenus.templateId, menuTemplates.id))
        .orderBy(desc(weekMenus.weekStart))
}

/** Dodeli šemu nedelji (ili je ukloni ako je templateId null). Vraća prethodnu dodelu. */
export async function assignWeek(weekStart: string, templateId: number | null): Promise<{ previousTemplateId: number | null }> {
    const prev = await db.select().from(weekMenus).where(eq(weekMenus.weekStart, weekStart)).limit(1)
    const previousTemplateId = prev[0]?.templateId ?? null
    if (templateId === null) {
        await db.delete(weekMenus).where(eq(weekMenus.weekStart, weekStart))
        return { previousTemplateId }
    }
    await db
        .insert(weekMenus)
        .values({ weekStart, templateId })
        .onConflictDoUpdate({ target: weekMenus.weekStart, set: { templateId, updatedAt: new Date() } })
    return { previousTemplateId }
}

export interface DayMenu {
    weekStart: string
    templateName: string | null
    meals: Meal[]
}

/** Meni za konkretan datum: kuvana jela iz šeme te nedelje + svi aktivni suvi obroci. */
export async function getMenuForDate(dateStr: string): Promise<DayMenu> {
    const d = fromISODate(dateStr)
    const weekStart = toISODate(startOfWeek(d))
    const dow = d.getDay()

    const [assignment, suva] = await Promise.all([
        getWeekAssignment(weekStart),
        db
            .select()
            .from(meals)
            .where(and(eq(meals.active, true), eq(meals.category, 'suvo')))
            .orderBy(asc(meals.name)),
    ])

    let kuvana: Meal[] = []
    const ids = assignment.template?.days[dow] ?? []
    if (ids.length > 0) {
        kuvana = await db
            .select()
            .from(meals)
            .where(and(eq(meals.active, true), eq(meals.category, 'kuvano'), inArray(meals.id, ids)))
            .orderBy(asc(meals.name))
    }

    return { weekStart, templateName: assignment.template?.name ?? null, meals: [...kuvana, ...suva] }
}
