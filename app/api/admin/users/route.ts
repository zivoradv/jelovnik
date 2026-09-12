import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { listUsers, setUserRole, deleteUser } from '@/services/users.service';

// Admin pristup je proveren u middleware-u (/api/admin/*).

export async function GET() {
  const usersList = await listUsers();
  return NextResponse.json({ users: usersList });
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, role } = await req.json();
    if (!id || (role !== 'admin' && role !== 'user')) {
      return NextResponse.json({ error: 'Neispravni podaci.' }, { status: 400 });
    }
    const updated = await setUserRole(Number(id), role);
    if (!updated) return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: 'Greška pri izmeni uloge.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Nedostaje id.' }, { status: 400 });
  if (me && me.sub === id) {
    return NextResponse.json({ error: 'Ne možete obrisati sopstveni nalog.' }, { status: 400 });
  }
  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
