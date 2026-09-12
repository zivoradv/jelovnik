import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { db, meals, Meal, NewMeal } from '@/drizzle';

export async function listMeals(): Promise<Meal[]> {
  return db.select().from(meals).orderBy(asc(meals.category), asc(meals.day), asc(meals.name));
}

// Jela dostupna za određeni radni dan:
//  - kuvana jela vezana za taj dan (day = dayOfWeek)
//  - suvi obrok i sva jela bez određenog dana (day IS NULL)
// Vraćaju se samo aktivna jela.
export async function getMenuForDay(dayOfWeek: number): Promise<Meal[]> {
  return db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.active, true),
        or(eq(meals.day, dayOfWeek), isNull(meals.day)),
      ),
    )
    .orderBy(asc(meals.category), asc(meals.name));
}

export async function getMealById(id: number): Promise<Meal | undefined> {
  const rows = await db.select().from(meals).where(eq(meals.id, id)).limit(1);
  return rows[0];
}

export async function createMeal(data: NewMeal): Promise<Meal> {
  const [created] = await db.insert(meals).values(data).returning();
  return created;
}

export async function updateMeal(id: number, data: Partial<NewMeal>): Promise<Meal | undefined> {
  const [updated] = await db
    .update(meals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(meals.id, id))
    .returning();
  return updated;
}

export async function deleteMeal(id: number): Promise<void> {
  await db.delete(meals).where(eq(meals.id, id));
}
