import { NextResponse } from 'next/server'
import type { TokenPayload } from './auth'
import { forbidden, getCurrentUser, unauthorized } from './session'

type Guard = { user: TokenPayload; error?: undefined } | { user?: undefined; error: NextResponse }

export async function requireUser(): Promise<Guard> {
    const user = await getCurrentUser()
    if (!user) return { error: unauthorized() }
    return { user }
}

export async function requireAdmin(): Promise<Guard> {
    const user = await getCurrentUser()
    if (!user) return { error: unauthorized() }
    if (user.role !== 'admin') return { error: forbidden() }
    return { user }
}

export function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 })
}

export function errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
