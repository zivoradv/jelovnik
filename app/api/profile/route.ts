import { type NextRequest, NextResponse } from 'next/server'
import { badRequest, errorMessage, requireUser } from '@/lib/api'
import { setAuthCookie } from '@/lib/session'
import { getPublicUserById, updateProfile } from '@/services/users.service'

export async function GET() {
    const auth = await requireUser()
    if (auth.error) return auth.error
    const user = await getPublicUserById(auth.user.sub)
    if (!user) return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 })
    return NextResponse.json({ user })
}

/** { firstName?, lastName?, username? } */
export async function PATCH(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error) return auth.error
    try {
        const body = await req.json()
        const user = await updateProfile(auth.user.sub, {
            firstName: body.firstName !== undefined ? String(body.firstName) : undefined,
            lastName: body.lastName !== undefined ? String(body.lastName) : undefined,
            username: body.username !== undefined ? String(body.username) : undefined,
        })
        const res = NextResponse.json({ user })
        // token nosi korisničko ime, pa ga osvežavamo posle izmene
        await setAuthCookie(req, res, { sub: user.id, username: user.username, role: user.role })
        return res
    } catch (err) {
        return badRequest(errorMessage(err, 'Greška pri čuvanju profila.'))
    }
}
