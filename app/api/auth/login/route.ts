import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/services/users.service';
import { setAuthCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Unesite korisničko ime i lozinku.' },
        { status: 400 },
      );
    }

    const user = await authenticate(String(username).trim(), String(password));
    if (!user) {
      return NextResponse.json(
        { error: 'Pogrešno korisničko ime ili lozinka.' },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ user });
    await setAuthCookie(res, { sub: user.id, username: user.username, role: user.role });
    return res;
  } catch {
    return NextResponse.json({ error: 'Greška pri prijavi.' }, { status: 500 });
  }
}
