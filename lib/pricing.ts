/**
 * Obračun cene za jedan dan.
 *
 * Firma pokriva deo cene JEDNE porcije dnevno (bilo kuvane bilo suve) – ili procenat
 * (`subsidyMode: 'percent'`) ili fiksan iznos u dinarima (`subsidyMode: 'amount'`).
 * Ako korisnik naruči više porcija, popust ide na najskuplju, a ostale se plaćaju 100%.
 * Čorba uz suvi obrok ulazi u cenu porcije, pa se i ona subvencioniše (400 + 100 → 250).
 * Sopstvene porudžbine nemaju cenu i ne ulaze u obračun.
 */

export type SubsidyMode = 'percent' | 'amount'

export interface PricingSettings {
    subsidyMode: SubsidyMode
    /** važi kad je subsidyMode === 'percent' */
    subsidyPercent: number
    /** važi kad je subsidyMode === 'amount' (RSD) */
    subsidyAmount: number
    soupPrice: number
}

export const DEFAULT_PRICING: PricingSettings = {
    subsidyMode: 'percent',
    subsidyPercent: 50,
    subsidyAmount: 250,
    soupPrice: 100,
}

export interface CostItem {
    price: number
    quantity: number
    withSoup: boolean
}

export interface DayCost {
    /** Puna cena svih porcija. */
    full: number
    /** Deo koji pokriva firma. */
    subsidy: number
    /** Ono što korisnik plaća. */
    toPay: number
}

export function unitPrice(item: { price: number; withSoup: boolean }, s: PricingSettings): number {
    const p = Number(item.price) || 0
    return p + (item.withSoup ? s.soupPrice : 0)
}

/** Koliko firma pokriva od jedne porcije date cene. */
export function subsidyFor(unit: number, s: PricingSettings): number {
    if (unit <= 0) return 0
    if (s.subsidyMode === 'amount') return Math.min(unit, Math.max(0, Math.round(s.subsidyAmount)))
    return Math.round((unit * s.subsidyPercent) / 100)
}

export function computeDayCost(items: CostItem[], s: PricingSettings): DayCost {
    const units: number[] = []
    for (const it of items) {
        const u = unitPrice(it, s)
        if (u <= 0) continue
        const q = Math.max(0, Math.round(Number(it.quantity) || 0))
        for (let i = 0; i < q; i++) units.push(u)
    }
    units.sort((a, b) => b - a)
    const full = units.reduce((a, b) => a + b, 0)
    const subsidy = units.length > 0 ? subsidyFor(units[0], s) : 0
    return { full, subsidy, toPay: full - subsidy }
}

/**
 * Raspoređuje popust firme po stavkama: ceo iznos ide na stavku sa najskupljom porcijom,
 * ostale dobijaju 0. Vraća niz istog redosleda kao `units`. Koristi se pri upisu porudžbine
 * da bi se popust „zamrznuo” uz cenu.
 */
export function allocateSubsidy(units: number[], s: PricingSettings): number[] {
    const out = units.map(() => 0)
    let best = -1
    for (let i = 0; i < units.length; i++) {
        if (units[i] > 0 && (best === -1 || units[i] > units[best])) best = i
    }
    if (best >= 0) out[best] = subsidyFor(units[best], s)
    return out
}

export interface SnapshotItem {
    unitPrice: number
    quantity: number
    subsidy: number
}

/** Obračun dana iz cena zamrznutih u bazi (orders.unit_price / orders.subsidy). */
export function dayCostFromSnapshot(items: SnapshotItem[]): DayCost {
    let full = 0
    let subsidy = 0
    for (const it of items) {
        full += (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)
        subsidy += Number(it.subsidy) || 0
    }
    subsidy = Math.min(full, subsidy)
    return { full, subsidy, toPay: full - subsidy }
}

/** Kratak opis popusta za prikaz („50%” ili „250 RSD”). */
export function subsidyLabel(s: PricingSettings): string {
    return s.subsidyMode === 'amount' ? rsd(s.subsidyAmount) : `${s.subsidyPercent}%`
}

export function rsd(n: number): string {
    return `${Math.round(n).toLocaleString('sr-RS')} RSD`
}
