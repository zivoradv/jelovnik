import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { NextResponse as Res } from 'next/server'
import { signToken, type TokenPayload, verifyToken } from './auth'
import { COOKIE_NAME, TOKEN_MAX_AGE } from './constants'

export async function getCurrentUser(): Promise<TokenPayload | null> {
    const token = (await cookies()).get(COOKIE_NAME)?.value
    if (!token) return null
    return verifyToken(token)
}

/**
 * `Secure` samo kad je zahtev zaista stigao preko HTTPS-a (Vercel šalje x-forwarded-proto).
 * Ako bismo ga vezali za NODE_ENV, browser bi odbio kolačić na http://192.168.x.x (LAN, telefon)
 * i login bi „uspeo” bez sesije.
 */
function isSecureRequest(req: NextRequest): boolean {
    const forwarded = req.headers.get('x-forwarded-proto')
    if (forwarded) return forwarded.split(',')[0].trim() === 'https'
    return req.nextUrl.protocol === 'https:'
}

export async function setAuthCookie(req: NextRequest, res: NextResponse, payload: TokenPayload) {
    const token = await signToken(payload)
    res.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        secure: isSecureRequest(req),
        path: '/',
        maxAge: TOKEN_MAX_AGE,
    })
}

export function clearAuthCookie(res: NextResponse) {
    res.cookies.set({
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    })
}

export function unauthorized() {
    return Res.json({ error: 'Niste prijavljeni.' }, { status: 401 })
}

export function forbidden() {
    return Res.json({ error: 'Nemate dozvolu za ovu radnju.' }, { status: 403 })
}
