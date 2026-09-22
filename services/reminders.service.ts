import { rsd } from '@/lib/pricing'
import { notifyUsers } from './notifications.service'
import { applyCreditToDebts, getAllBalances } from './orders.service'

function daysLabel(n: number): string {
    return n === 1 ? '1 dan' : `${n} dana`
}

/** Svakom korisniku sa neplaćenim dugom šalje obaveštenje sa iznosom – pošto se pretplata prvo prebije. */
export async function sendDebtReminders(): Promise<{ notified: number; total: number }> {
    const initial = await getAllBalances()
    // ko ima pretplatu, prvo njome plaća – tek ono što ostane je dug vredan podsetnika
    for (const b of initial) {
        if (b.credit > 0 && b.unpaidTotal > 0) await applyCreditToDebts(b.userId)
    }
    const balances = initial.some((b) => b.credit > 0 && b.unpaidTotal > 0) ? await getAllBalances() : initial
    const debtors = balances.filter((b) => b.unpaidTotal > 0)
    for (const b of debtors) {
        await notifyUsers([b.userId], {
            type: 'dug',
            title: `Podsetnik: dug ${rsd(b.unpaidTotal)}`,
            body: `Neplaćeno je ${daysLabel(b.unpaidCount)}. Kada platiš, admin će označiti uplatu.`,
            link: '/dug',
        })
    }
    return { notified: debtors.length, total: debtors.reduce((a, b) => a + b.unpaidTotal, 0) }
}
