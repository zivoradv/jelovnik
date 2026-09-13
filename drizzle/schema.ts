import { relations } from 'drizzle-orm'
import { boolean, date, index, integer, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['admin', 'user'])

export const categoryEnum = pgEnum('category', ['kuvano', 'suvo'])

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    role: roleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const meals = pgTable(
    'meals',
    {
        id: serial('id').primaryKey(),
        name: text('name').notNull(),
        description: text('description').default(''),
        note: text('note').default(''),
        price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
        day: integer('day'),
        category: categoryEnum('category').notNull().default('kuvano'),
        isPosno: boolean('is_posno').notNull().default(false),
        active: boolean('active').notNull().default(true),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('meals_day_idx').on(t.day)],
)

export const orders = pgTable(
    'orders',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        mealId: integer('meal_id').references(() => meals.id, { onDelete: 'cascade' }),
        quantity: integer('quantity').notNull().default(1),
        date: date('date').notNull(),
        customText: text('custom_text'),
        note: text('note'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('orders_user_date_idx').on(t.userId, t.date), index('orders_date_idx').on(t.date)],
)

export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
}))

export const mealsRelations = relations(meals, ({ many }) => ({
    orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one }) => ({
    user: one(users, { fields: [orders.userId], references: [users.id] }),
    meal: one(meals, { fields: [orders.mealId], references: [meals.id] }),
}))

export const payments = pgTable(
    'payments',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        date: date('date').notNull(),
        paid: boolean('paid').notNull().default(false),
        paidAt: timestamp('paid_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [uniqueIndex('payments_user_date_uidx').on(t.userId, t.date)],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Meal = typeof meals.$inferSelect
export type NewMeal = typeof meals.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
