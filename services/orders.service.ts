import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { db, orders, users, meals, Order } from '@/drizzle';
import { fromISODate } from '@/lib/date';
import { isWorkday } from '@/lib/constants';

export interface OrderItemInput {
  mealId?: number | null;
  customText?: string | null;
  note?: string | null;
}

// Sve stavke koje je korisnik izabrao za dati datum.
export async function getUserOrdersForDate(userId: number, dateStr: string): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.date, dateStr)));
}

// Sačuvaj izbor korisnika za dati datum (zameni sve prethodne stavke).
export async function saveUserOrders(
  userId: number,
  dateStr: string,
  items: OrderItemInput[],
): Promise<Order[]> {
  if (!isWorkday(fromISODate(dateStr))) {
    throw new Error('Poručivanje je moguće samo za radne dane (ponedeljak–petak).');
  }

  const cleaned = items
    .map((it) => ({
      mealId: it.mealId ?? null,
      customText: it.customText?.trim() || null,
      note: it.note?.trim() || null,
    }))
    // preskoči prazne redove (bez jela i bez sopstvenog teksta)
    .filter((it) => it.mealId !== null || it.customText !== null);

  const del = db
    .delete(orders)
    .where(and(eq(orders.userId, userId), eq(orders.date, dateStr)));

  if (cleaned.length === 0) {
    await del;
    return [];
  }

  const values = cleaned.map((it) => ({
    userId,
    date: dateStr,
    mealId: it.mealId,
    customText: it.customText,
    note: it.note,
  }));

  const ins = db.insert(orders).values(values).returning();

  // neon-http ne podržava interaktivne transakcije, ali podržava batch (atomično).
  const res = await db.batch([del, ins]);
  return res[1] as Order[];
}

// Broj glasova po jelu za dati datum (vidljivo svima).
export async function getCountsForDate(
  dateStr: string,
): Promise<{ mealId: number; count: number }[]> {
  const rows = await db
    .select({
      mealId: orders.mealId,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.date, dateStr), isNotNull(orders.mealId)))
    .groupBy(orders.mealId);

  return rows
    .filter((r) => r.mealId !== null)
    .map((r) => ({ mealId: r.mealId as number, count: r.count }));
}

// Detaljan pregled za administratore: ko je šta poručio za dati datum.
export interface OrderDetailRow {
  orderId: number;
  userId: number;
  username: string;
  mealId: number | null;
  mealName: string | null;
  category: string | null;
  price: string | null;
  customText: string | null;
  note: string | null;
}

export async function getOrdersDetailForDate(dateStr: string): Promise<OrderDetailRow[]> {
  return db
    .select({
      orderId: orders.id,
      userId: orders.userId,
      username: users.username,
      mealId: orders.mealId,
      mealName: meals.name,
      category: meals.category,
      price: meals.price,
      customText: orders.customText,
      note: orders.note,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(meals, eq(orders.mealId, meals.id))
    .where(eq(orders.date, dateStr))
    .orderBy(asc(meals.name), asc(users.username));
}
