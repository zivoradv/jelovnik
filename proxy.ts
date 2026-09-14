import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { COOKIE_NAME } from '@/lib/constants'

const PUBLIC_PATHS = ['/login', '/register']
const PUBLIC_API = ['/api/auth/login', '/api/auth/register', '/api/cron']

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl

    const isApi = pathname.startsWith('/api')
    const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
    const isPublicApi = PUBLIC_API.some((p) => pathname.startsWith(p))

    const token = req.cookies.get(COOKIE_NAME)?.value
    const payload = token ? await verifyToken(token) : null

    if (isPublicPage) {
        if (payload) {
            return NextResponse.redirect(new URL('/', req.url))
        }
        return NextResponse.next()
    }
    if (isPublicApi) {
        return NextResponse.next()
    }

    if (!payload) {
        if (isApi) {
            return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })
        }
        const url = new URL('/login', req.url)
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
    }

    const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
    if (isAdminArea && payload.role !== 'admin') {
        if (isApi) {
            return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
