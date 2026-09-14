import { rsd } from '@/lib/pricing'
import { notifyUsers } from './notifications.service'
import { getAllBalances } from './orders.service'

function daysLabel(n: number): string {
    return n === 1 ? '1 dan' : `${n} dana`
}

/** Svakom korisniku sa neplaćenim dugom šalje obaveštenje sa iznosom. */
export async function sendDebtReminders(): Promise<{ notified: number; total: number }> {
    const balances = await getAllBalances()
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
