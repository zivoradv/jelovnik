import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { signToken, type TokenPayload, verifyToken } from './auth'
import { COOKIE_NAME, TOKEN_MAX_AGE } from './constants'

export async function getCurrentUser(): Promise<TokenPayload | null> {
    const token = (await cookies()).get(COOKIE_NAME)?.value
    if (!token) return null
    return verifyToken(token)
}

export async function setAuthCookie(res: NextResponse, payload: TokenPayload) {
    const token = await signToken(payload)
    res.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: TOKEN_MAX_AGE,
    })
}

export function clearAuthCookie(res: NextResponse) {
    res.cookies.set({
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        path: '/',
        maxAge: 0,
    })
}

export function unauthorized() {
    return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })
}

export function forbidden() {
    return NextResponse.json({ error: 'Nemate dozvolu za ovu radnju.' }, { status: 403 })
}
