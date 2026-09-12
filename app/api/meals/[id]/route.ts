import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, forbidden } from '@/lib/session';
import { updateMeal, deleteMeal } from '@/services/meals.service';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 }) };
  if (user.role !== 'admin') return { error: forbidden() };
  return { user };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const id = Number(params.id);
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.description !== undefined) patch.description = String(body.description);
    if (body.note !== undefined) patch.note = String(body.note);
    if (body.price !== undefined) patch.price = String(body.price);
    if (body.category !== undefined) patch.category = body.category === 'suvo' ? 'suvo' : 'kuvano';
    if (body.day !== undefined)
      patch.day = body.day === null || body.day === '' ? null : Number(body.day);
    if (body.isPosno !== undefined) patch.isPosno = Boolean(body.isPosno);
    if (body.active !== undefined) patch.active = Boolean(body.active);

    const meal = await updateMeal(id, patch);
    if (!meal) return NextResponse.json({ error: 'Jelo nije pronađeno.' }, { status: 404 });
    return NextResponse.json({ meal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri izmeni jela.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const id = Number(params.id);
  await deleteMeal(id);
  return NextResponse.json({ ok: true });
}
