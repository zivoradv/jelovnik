import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Enums ---------------------------------------------------------------

// Uloga korisnika
export const roleEnum = pgEnum('role', ['admin', 'user']);

// Kategorija jela: kuvano (dnevni obrok) ili suvo (sendviči i sl.)
export const categoryEnum = pgEnum('category', ['kuvano', 'suvo']);

// --- Tabele --------------------------------------------------------------

// Korisnici
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // bcrypt hash
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Jela
// - day: 1 = Ponedeljak ... 5 = Petak. NULL znači "dostupno svakog radnog dana"
//   (koristi se za suvi obrok koji nije vezan za određeni dan).
// - note: pomoćni tekst za administratore (npr. "sadrži gluten", "za poneti",
//   "ima ograničenu količinu"...). Vidljiv i korisnicima kao dodatna napomena.
export const meals = pgTable(
  'meals',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').default(''), // sastojci i sl.
    note: text('note').default(''), // POMOĆNI TEKST (helper) za admine
    price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
    day: integer('day'), // 1..5 ili NULL
    category: categoryEnum('category').notNull().default('kuvano'),
    isPosno: boolean('is_posno').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    dayIdx: index('meals_day_idx').on(t.day),
  }),
);

// Porudžbine / glasovi
// Svaki red je jedna stavka koju je korisnik izabrao za određeni datum.
// - mealId != NULL  -> izabrano jelo iz menija (note = dodatak/napomena uz jelo)
// - mealId == NULL  -> sopstvena porudžbina (customText = šta korisnik želi)
export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mealId: integer('meal_id').references(() => meals.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1), // broj porcija istog jela
    date: date('date').notNull(), // datum za koji se poručuje (radni dan)
    customText: text('custom_text'), // sopstvena porudžbina
    note: text('note'), // dodatak / napomena uz izabrano jelo
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userDateIdx: index('orders_user_date_idx').on(t.userId, t.date),
    dateIdx: index('orders_date_idx').on(t.date),
  }),
);

// --- Relacije (za relaciona query-ja) ------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const mealsRelations = relations(meals, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  meal: one(meals, { fields: [orders.mealId], references: [meals.id] }),
}));

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(), // datum na koji se plaćanje odnosi
    paid: boolean('paid').notNull().default(false),
    paidAt: timestamp('paid_at'), // kada je označeno kao plaćeno
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    // najviše jedan red po korisniku i datumu
    userDateUidx: uniqueIndex('payments_user_date_uidx').on(t.userId, t.date),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;