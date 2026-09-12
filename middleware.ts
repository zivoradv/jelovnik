import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/constants';

// Rute koje su dostupne bez prijave.
const PUBLIC_PATHS = ['/login', '/register'];
const PUBLIC_API = ['/api/auth/login', '/api/auth/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith('/api');
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isPublicApi = PUBLIC_API.some((p) => pathname.startsWith(p));

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  // Javne rute – ako je već prijavljen, sa login/register ga vodimo na početnu.
  if (isPublicPage) {
    if (payload) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }
  if (isPublicApi) {
    return NextResponse.next();
  }

  // Sve ostalo zahteva validan token.
  if (!payload) {
    if (isApi) {
      return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
    }
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Admin rute zahtevaju admin ulogu.
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isAdminArea && payload.role !== 'admin') {
    if (isApi) {
      return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

// Ne pokreći middleware na statičkim fajlovima.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
