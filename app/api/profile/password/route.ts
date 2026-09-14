import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireUser } from '@/lib/api'
import { changePassword } from '@/services/users.service'

/** { currentPassword, newPassword } */
export async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    try {
        const { currentPassword, newPassword } = await req.json()
        if (!currentPassword || !newPassword) return badRequest('Unesite trenutnu i novu lozinku.')
        await changePassword(auth.user.sub, String(currentPassword), String(newPassword))
        return NextResponse.json({ ok: true })
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri promeni lozinke.'))
    }
}
