import { db, settings } from '@/drizzle'
import { DEFAULT_PRICING, type PricingSettings } from '@/lib/pricing'

const KEYS = {
    subsidyMode: 'subsidy_mode',
    subsidyPercent: 'subsidy_percent',
    subsidyAmount: 'subsidy_amount',
    soupPrice: 'soup_price',
} as const

export async function getPricingSettings(): Promise<PricingSettings> {
    const rows = await db.select().from(settings)
    const map = new Map(rows.map((r) => [r.key, r.value]))
    const num = (key: string, fallback: number) => {
        const v = Number(map.get(key))
        return Number.isFinite(v) ? v : fallback
    }
    return {
        subsidyMode: map.get(KEYS.subsidyMode) === 'amount' ? 'amount' : 'percent',
        subsidyPercent: num(KEYS.subsidyPercent, DEFAULT_PRICING.subsidyPercent),
        subsidyAmount: num(KEYS.subsidyAmount, DEFAULT_PRICING.subsidyAmount),
        soupPrice: num(KEYS.soupPrice, DEFAULT_PRICING.soupPrice),
    }
}

export async function updatePricingSettings(patch: Partial<PricingSettings>): Promise<PricingSettings> {
    const entries: { key: string; value: string }[] = []
    if (patch.subsidyMode !== undefined) {
        entries.push({ key: KEYS.subsidyMode, value: patch.subsidyMode === 'amount' ? 'amount' : 'percent' })
    }
    if (patch.subsidyPercent !== undefined) {
        const v = Math.min(100, Math.max(0, Math.round(Number(patch.subsidyPercent) || 0)))
        entries.push({ key: KEYS.subsidyPercent, value: String(v) })
    }
    if (patch.subsidyAmount !== undefined) {
        const v = Math.max(0, Math.round(Number(patch.subsidyAmount) || 0))
        entries.push({ key: KEYS.subsidyAmount, value: String(v) })
    }
    if (patch.soupPrice !== undefined) {
        const v = Math.max(0, Math.round(Number(patch.soupPrice) || 0))
        entries.push({ key: KEYS.soupPrice, value: String(v) })
    }
    for (const e of entries) {
        await db
            .insert(settings)
            .values({ key: e.key, value: e.value })
            .onConflictDoUpdate({ target: settings.key, set: { value: e.value, updatedAt: new Date() } })
    }
    return getPricingSettings()
}
