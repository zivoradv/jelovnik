import { config } from 'dotenv'
import { db, meals, menuTemplateItems, menuTemplates, settings, users, weekMenus } from '../drizzle'
import type { MealCategory } from '../lib/constants'
import { startOfWeek, toISODate } from '../lib/date'
import { hashPassword } from '../lib/password'
import { DEFAULT_PRICING, subsidyLabel } from '../lib/pricing'

config({ quiet: true })

type SeedMeal = {
    name: string
    description?: string
    note?: string
    price: string
    category: MealCategory
    isPosno?: boolean
    /** dan u početnoj šemi (1–5); samo za kuvana jela */
    day?: number
}

const KUVANA: SeedMeal[] = [
    { name: 'Pljeskavica i pire krompir', price: '500', day: 1, category: 'kuvano' },
    { name: 'Grašak sa junetinom', price: '500', day: 1, category: 'kuvano' },
    { name: 'Ćufte i makarone', price: '500', day: 2, category: 'kuvano' },
    { name: 'Pilav', price: '500', day: 2, category: 'kuvano' },
    { name: 'Sataraš', price: '400', day: 2, category: 'kuvano', isPosno: true },
    { name: 'Sataraš i roštiljska kobasica', price: '500', day: 3, category: 'kuvano' },
    { name: 'Boranija sa svinjetinom', price: '500', day: 3, category: 'kuvano' },
    { name: 'Lovačka šnicla i pire krompir', price: '500', day: 4, category: 'kuvano' },
    { name: 'Pasta piletina sa 4 vrste sira', price: '500', day: 4, category: 'kuvano' },
    { name: 'Sarma', price: '500', day: 5, category: 'kuvano' },
    { name: 'Špagete bolonjez', price: '500', day: 5, category: 'kuvano' },
    { name: 'Sarma (posno)', price: '400', day: 5, category: 'kuvano', isPosno: true },
]

const DODACI: SeedMeal[] = [{ name: 'Čorba', description: 'Dodatak – uzmi koliko hoćeš', price: '100', category: 'dodatak' }]

const SUVA: SeedMeal[] = [
    { name: 'Jaja na oko i viršle', price: '400', category: 'suvo' },
    { name: 'Kajgana', price: '400', category: 'suvo' },
    { name: 'Kačamak', price: '400', category: 'suvo' },
    {
        name: 'Sendvič kulen',
        description: 'pavlaka, kečap, majonez, kiseli krastavčići, kuvano jaje',
        price: '400',
        category: 'suvo',
    },
    {
        name: 'Sendvič pršuta',
        description: 'kajmak, kečap, kuvano jaje',
        price: '400',
        category: 'suvo',
    },
    {
        name: 'Sendvič čajna',
        description: 'pavlaka, kečap, majonez, kuvano jaje',
        price: '400',
        category: 'suvo',
    },
    {
        name: 'Sendvič šunka',
        description: 'pavlaka, kečap, majonez',
        price: '400',
        category: 'suvo',
    },
    {
        name: 'Sendvič hrskava piletina',
        description: 'pavlaka, kečap, majonez, kupus',
        price: '400',
        category: 'suvo',
    },
    { name: 'Sendvič tunjevina', price: '400', category: 'suvo' },
    {
        name: 'Sarajevski ćevapi u lepinji',
        description: 'kajmak, kupus salata',
        price: '400',
        category: 'suvo',
    },
    { name: 'Kroasan prazan 2/1 + jogurt', price: '400', category: 'suvo' },
    { name: 'Kroasan šunka sir 2/1 + jogurt', price: '400', category: 'suvo' },
    { name: 'Gibanica', price: '400', category: 'suvo' },
]

async function main() {
    console.log('▶ Pokretanje seed-a…')

    const existing = await db.select().from(users).limit(1)
    if (existing.length === 0) {
        const username = process.env.SEED_ADMIN_USERNAME || 'admin'
        const password = process.env.SEED_ADMIN_PASSWORD || 'admin123'
        const hash = await hashPassword(password)
        await db.insert(users).values({ username, password: hash, firstName: 'Admin', lastName: 'Kuhinja', role: 'admin' })
        console.log(`✔ Kreiran administrator: ${username} / ${password}`)
        console.log('  (Obavezno promenite lozinku posle prve prijave – stranica Profil.)')
    } else {
        console.log('• Korisnici već postoje — preskačem kreiranje admina.')
    }

    const existingMeals = await db.select().from(meals).limit(1)
    if (existingMeals.length === 0) {
        const all = [...KUVANA, ...DODACI, ...SUVA]
        const inserted = await db
            .insert(meals)
            .values(
                all.map((m) => ({
                    name: m.name,
                    description: m.description ?? '',
                    note: m.note ?? '',
                    price: m.price,
                    category: m.category,
                    isPosno: m.isPosno ?? false,
                })),
            )
            .returning({ id: meals.id, name: meals.name })
        console.log(`✔ Uneto ${inserted.length} jela iz menija.`)

        // Početna šema iz starog rasporeda po danima, dodeljena tekućoj nedelji.
        const idByName = new Map(inserted.map((m) => [m.name, m.id]))
        const [template] = await db.insert(menuTemplates).values({ name: 'Osnovna šema' }).returning()
        const items = KUVANA.filter((m) => m.day).map((m) => ({
            templateId: template.id,
            day: m.day as number,
            mealId: idByName.get(m.name) as number,
        }))
        await db.insert(menuTemplateItems).values(items)
        const weekStart = toISODate(startOfWeek(new Date()))
        await db.insert(weekMenus).values({ weekStart, templateId: template.id }).onConflictDoNothing()
        console.log(`✔ Napravljena šema „${template.name}” (${items.length} stavki) i dodeljena nedelji od ${weekStart}.`)
    } else {
        console.log('• Jela već postoje — preskačem unos menija i šeme.')
    }

    await db
        .insert(settings)
        .values([
            { key: 'subsidy_mode', value: DEFAULT_PRICING.subsidyMode },
            { key: 'subsidy_percent', value: String(DEFAULT_PRICING.subsidyPercent) },
            { key: 'subsidy_amount', value: String(DEFAULT_PRICING.subsidyAmount) },
            { key: 'soup_price', value: String(DEFAULT_PRICING.soupPrice) },
        ])
        .onConflictDoNothing()
    console.log(
        `✔ Podešavanja: firma pokriva ${subsidyLabel(DEFAULT_PRICING)}, čorba ${DEFAULT_PRICING.soupPrice} RSD (ako nisu već postavljena).`,
    )

    console.log('✅ Gotovo.')
    process.exit(0)
}

main().catch((err) => {
    console.error('❌ Greška u seed-u:', err)
    process.exit(1)
})
