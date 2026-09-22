import { relations } from 'drizzle-orm'
import { boolean, date, index, integer, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['admin', 'user'])

export const categoryEnum = pgEnum('category', ['kuvano', 'suvo'])

export const notificationTypeEnum = pgEnum('notification_type', ['raspored', 'jelo', 'dug', 'uplata', 'info', 'pivo'])

export const rsvpEnum = pgEnum('rsvp', ['da', 'ne'])

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    firstName: text('first_name').notNull().default(''),
    lastName: text('last_name').notNull().default(''),
    role: roleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const meals = pgTable('meals', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').default(''),
    note: text('note').default(''),
    price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
    category: categoryEnum('category').notNull().default('kuvano'),
    isPosno: boolean('is_posno').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/** Šema = imenovani skup kuvanih jela po danima (Pon–Pet) koji se može ponovo koristiti. */
export const menuTemplates = pgTable('menu_templates', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const menuTemplateItems = pgTable(
    'menu_template_items',
    {
        id: serial('id').primaryKey(),
        templateId: integer('template_id')
            .notNull()
            .references(() => menuTemplates.id, { onDelete: 'cascade' }),
        day: integer('day').notNull(),
        mealId: integer('meal_id')
            .notNull()
            .references(() => meals.id, { onDelete: 'cascade' }),
    },
    (t) => [uniqueIndex('menu_template_items_uidx').on(t.templateId, t.day, t.mealId)],
)

/** Koja šema važi za koju nedelju (weekStart = ponedeljak). */
export const weekMenus = pgTable('week_menus', {
    id: serial('id').primaryKey(),
    weekStart: date('week_start').notNull().unique(),
    templateId: integer('template_id')
        .notNull()
        .references(() => menuTemplates.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orders = pgTable(
    'orders',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        // restrict: jelo sa porudžbinama se ne može obrisati (istorija dugova bi nestala) – samo deaktivirati
        mealId: integer('meal_id')
            .notNull()
            .references(() => meals.id, { onDelete: 'restrict' }),
        quantity: integer('quantity').notNull().default(1),
        date: date('date').notNull(),
        note: text('note'),
        withSoup: boolean('with_soup').notNull().default(false),
        /**
         * Cena jedne porcije (jelo + čorba) u trenutku naručivanja, RSD.
         * Dug se računa iz ovoga, pa kasnija promena cene jela ne menja već zaključene račune.
         */
        unitPrice: integer('unit_price').notNull().default(0),
        /** Deo koji pokriva firma – upisuje se na jednu (najskuplju) porciju dana, ostale imaju 0. */
        subsidy: integer('subsidy').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('orders_user_date_idx').on(t.userId, t.date), index('orders_date_idx').on(t.date)],
)

export const payments = pgTable(
    'payments',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        date: date('date').notNull(),
        /** Koliko je korisnik stvarno platio za taj dan (RSD); poredi se sa trenutnom cenom dana. */
        amount: integer('amount').notNull().default(0),
        paidAt: timestamp('paid_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [uniqueIndex('payments_user_date_uidx').on(t.userId, t.date)],
)

export const notifications = pgTable(
    'notifications',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: notificationTypeEnum('type').notNull().default('info'),
        title: text('title').notNull(),
        body: text('body').notNull().default(''),
        link: text('link'),
        readAt: timestamp('read_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('notifications_user_idx').on(t.userId, t.readAt)],
)

/** Dogovor za pivo: datum, vreme, mesto. */
export const beerPlans = pgTable(
    'beer_plans',
    {
        id: serial('id').primaryKey(),
        date: date('date').notNull(),
        time: text('time').notNull().default('17:00'),
        place: text('place').notNull().default(''),
        note: text('note').notNull().default(''),
        createdBy: integer('created_by')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('beer_plans_date_idx').on(t.date)],
)

/** Ko ide / ne ide na koje pivo. */
export const beerRsvps = pgTable(
    'beer_rsvps',
    {
        id: serial('id').primaryKey(),
        planId: integer('plan_id')
            .notNull()
            .references(() => beerPlans.id, { onDelete: 'cascade' }),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        status: rsvpEnum('status').notNull().default('da'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [uniqueIndex('beer_rsvps_plan_user_uidx').on(t.planId, t.userId)],
)

/**
 * Pretplata (kredit) korisnika – knjiga stavki.
 * Pozitivan iznos je uplata koja još nije potrošena, negativan je potrošnja
 * (prebijanje duga za neki dan) ili isplata novca nazad korisniku.
 * Trenutno stanje pretplate je zbir svih stavki.
 */
export const credits = pgTable(
    'credits',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        amount: integer('amount').notNull(),
        reason: text('reason').notNull().default(''),
        /** Dan na koji je pretplata utrošena (kod potrošnje), inače prazno. */
        date: date('date'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('credits_user_idx').on(t.userId)],
)

/** Globalna podešavanja (deo koji pokriva firma, cena čorbe...). */
export const settings = pgTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
    notifications: many(notifications),
}))

export const mealsRelations = relations(meals, ({ many }) => ({
    orders: many(orders),
    templateItems: many(menuTemplateItems),
}))

export const menuTemplatesRelations = relations(menuTemplates, ({ many }) => ({
    items: many(menuTemplateItems),
    weeks: many(weekMenus),
}))

export const menuTemplateItemsRelations = relations(menuTemplateItems, ({ one }) => ({
    template: one(menuTemplates, { fields: [menuTemplateItems.templateId], references: [menuTemplates.id] }),
    meal: one(meals, { fields: [menuTemplateItems.mealId], references: [meals.id] }),
}))

export const weekMenusRelations = relations(weekMenus, ({ one }) => ({
    template: one(menuTemplates, { fields: [weekMenus.templateId], references: [menuTemplates.id] }),
}))

export const ordersRelations = relations(orders, ({ one }) => ({
    user: one(users, { fields: [orders.userId], references: [users.id] }),
    meal: one(meals, { fields: [orders.mealId], references: [meals.id] }),
}))

export const beerPlansRelations = relations(beerPlans, ({ one, many }) => ({
    creator: one(users, { fields: [beerPlans.createdBy], references: [users.id] }),
    rsvps: many(beerRsvps),
}))

export const beerRsvpsRelations = relations(beerRsvps, ({ one }) => ({
    plan: one(beerPlans, { fields: [beerRsvps.planId], references: [beerPlans.id] }),
    user: one(users, { fields: [beerRsvps.userId], references: [users.id] }),
}))

export const creditsRelations = relations(credits, ({ one }) => ({
    user: one(users, { fields: [credits.userId], references: [users.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, { fields: [notifications.userId], references: [users.id] }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Meal = typeof meals.$inferSelect
export type NewMeal = typeof meals.$inferInsert
export type MenuTemplate = typeof menuTemplates.$inferSelect
export type MenuTemplateItem = typeof menuTemplateItems.$inferSelect
export type WeekMenu = typeof weekMenus.$inferSelect
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type Credit = typeof credits.$inferSelect
export type NewCredit = typeof credits.$inferInsert
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type BeerPlan = typeof beerPlans.$inferSelect
export type BeerRsvp = typeof beerRsvps.$inferSelect
