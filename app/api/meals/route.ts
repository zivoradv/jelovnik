import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, forbidden } from '@/lib/session';
import { listMeals, getMenuForDay, createMeal } from '@/services/meals.service';

// GET /api/meals?day=1  -> aktivan meni za taj radni dan (svi prijavljeni)
// GET /api/meals        -> sva jela (samo admin)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });

  const dayParam = req.nextUrl.searchParams.get('day');
  if (dayParam !== null) {
    const day = Number(dayParam);
    const meals = await getMenuForDay(day);
    return NextResponse.json({ meals });
  }

  if (user.role !== 'admin') return forbidden();
  const meals = await listMeals();
  return NextResponse.json({ meals });
}

// POST /api/meals -> kreiraj jelo (samo admin)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  if (user.role !== 'admin') return forbidden();

  try {
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'Naziv jela je obavezan.' }, { status: 400 });
    }
    const category = body.category === 'suvo' ? 'suvo' : 'kuvano';
    const day =
      body.day === null || body.day === undefined || body.day === ''
        ? null
        : Number(body.day);

    const meal = await createMeal({
      name: String(body.name).trim(),
      description: body.description ? String(body.description) : '',
      note: body.note ? String(body.note) : '',
      price: body.price !== undefined && body.price !== '' ? String(body.price) : '0',
      day,
      category,
      isPosno: Boolean(body.isPosno),
      active: body.active === undefined ? true : Boolean(body.active),
    });
    return NextResponse.json({ meal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri kreiranju jela.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
