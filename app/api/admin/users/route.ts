import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireAdmin } from '@/lib/api'
import { rsd } from '@/lib/pricing'
import { userHasOpenBalance } from '@/services/orders.service'
import { deleteUser, listUsers, setUserRole } from '@/services/users.service'

export async function GET() {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const usersList = await listUsers()
    return NextResponse.json({ users: usersList })
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    try {
        const { id, role } = await req.json()
        if (!id || (role !== 'admin' && role !== 'user')) {
            return badRequest('Neispravni podaci.')
        }
        if (Number(id) === auth.user.sub && role !== 'admin') {
            return badRequest('Ne možeš sebi da oduzmeš administratorska prava.')
        }
        const updated = await setUserRole(Number(id), role)
        if (!updated) return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 })
        return NextResponse.json({ user: updated })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri izmeni uloge.'))
    }
}

/** Brisanje briše i sve porudžbine i uplate korisnika – zato nije dozvoljeno dok račun nije izmiren. */
export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const id = Number(req.nextUrl.searchParams.get('id'))
    if (!id) return badRequest('Nedostaje id.')
    if (auth.user.sub === id) return badRequest('Ne možete obrisati sopstveni nalog.')

    const { unpaid, overpaid, credit } = await userHasOpenBalance(id)
    if (unpaid > 0) return badRequest(`Korisnik duguje ${rsd(unpaid)}. Prvo evidentiraj uplatu, pa obriši nalog.`)
    if (overpaid > 0)
        return badRequest(`Korisnik ima preplatu ${rsd(overpaid)}. Prvo je razreši (vrati novac ili prebij), pa obriši nalog.`)
    if (credit > 0) return badRequest(`Korisnik ima pretplatu ${rsd(credit)}. Prvo je isplati, pa obriši nalog.`)

    await deleteUser(id)
    return NextResponse.json({ ok: true })
}
