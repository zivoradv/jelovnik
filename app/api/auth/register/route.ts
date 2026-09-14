import { type NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/session'
import { registerUser } from '@/services/users.service'

export async function POST(req: NextRequest) {
    try {
        const { username, password, firstName, lastName } = await req.json()

        if (!username || !password) {
            return NextResponse.json({ error: 'Unesite korisničko ime i lozinku.' }, { status: 400 })
        }
        if (!firstName || !lastName) {
            return NextResponse.json({ error: 'Unesite ime i prezime.' }, { status: 400 })
        }
        if (String(password).length < 4) {
            return NextResponse.json({ error: 'Lozinka mora imati najmanje 4 karaktera.' }, { status: 400 })
        }

        const user = await registerUser({
            username: String(username),
            password: String(password),
            firstName: String(firstName),
            lastName: String(lastName),
        })

        const res = NextResponse.json({ user })
        await setAuthCookie(req, res, { sub: user.id, username: user.username, role: user.role })
        return res
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Greška pri registraciji.'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
