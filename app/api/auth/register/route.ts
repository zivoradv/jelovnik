import { type NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/session'
import { registerUser } from '@/services/users.service'

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json()

        if (!username || !password) {
            return NextResponse.json({ error: 'Unesite korisničko ime i lozinku.' }, { status: 400 })
        }
        if (String(password).length < 4) {
            return NextResponse.json({ error: 'Lozinka mora imati najmanje 4 karaktera.' }, { status: 400 })
        }

        const user = await registerUser(String(username).trim(), String(password))

        const res = NextResponse.json({ user })
        await setAuthCookie(res, { sub: user.id, username: user.username, role: user.role })
        return res
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Greška pri registraciji.'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
