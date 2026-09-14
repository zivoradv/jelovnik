import { NextResponse } from 'next/server'
import { clearAuthCookie, getCurrentUser } from '@/lib/session'
import { getPublicUserById } from '@/services/users.service'

export async function GET() {
    const token = await getCurrentUser()
    if (!token) return NextResponse.json({ user: null }, { status: 200 })

    // Čitamo iz baze da bi ime/prezime i uloga uvek bili sveži (token nosi samo minimum).
    const user = await getPublicUserById(token.sub)
    if (!user) {
        // Token je validan, ali korisnik više ne postoji (npr. posle reseta baze) – brišemo kolačić
        // da proxy ne bi mislio da je neko prijavljen.
        const res = NextResponse.json({ user: null, reason: 'missing' }, { status: 200 })
        clearAuthCookie(res)
        return res
    }

    return NextResponse.json({
        user: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            createdAt: user.createdAt,
        },
    })
}
