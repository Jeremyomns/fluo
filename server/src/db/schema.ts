import type { RecurrenceRule } from '@fluo/shared';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default(''),
  color: text('color').notNull().default('#687082'),
  position: real('position').notNull().default(0),
});

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    notes: text('notes'),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    priority: integer('priority').notNull().default(2), // 1 haute, 2 normale, 3 basse
    dueDate: text('due_date'), // YYYY-MM-DD
    position: real('position').notNull().default(0), // réel : on peut insérer « entre » deux tâches
    focusDate: text('focus_date'), // en focus si = aujourd'hui
    // Pas de clé étrangère SQL (SQLite ne sait pas en ajouter sans recréer la table) : gérée par le code.
    recurrenceId: text('recurrence_id'),
    completedAt: text('completed_at'), // ISO UTC
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('tasks_due_idx').on(t.dueDate),
    index('tasks_completed_idx').on(t.completedAt),
    index('tasks_recurrence_idx').on(t.recurrenceId),
  ],
);

/** Une règle de répétition. Titre, catégorie… sont repris de la dernière occurrence. */
export const recurrences = sqliteTable('recurrences', {
  id: text('id').primaryKey(),
  rule: text('rule', { mode: 'json' }).$type<RecurrenceRule>().notNull(),
  createdAt: text('created_at').notNull(),
});

// ---------- Courses ----------
export const shoppingItems = sqliteTable(
  'shopping_items',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    key: text('key').notNull(), // nom normalisé (minuscules, sans accents) pour éviter les doublons
    checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
    position: real('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
    checkedAt: text('checked_at'),
  },
  (t) => [index('shopping_key_idx').on(t.key)],
);

/** Articles déjà achetés : alimente l'auto-complétion et les « habituels ». */
export const shoppingHistory = sqliteTable('shopping_history', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
  useCount: integer('use_count').notNull().default(1),
  lastUsed: text('last_used').notNull(),
});

// ---------- Notes ----------
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(), // "main" : une seule note en V1
  content: text('content').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
});

// ---------- Habitudes ----------
export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default(''),
  days: text('days', { mode: 'json' }).$type<number[]>().notNull(), // jours prévus, 0 = dimanche
  position: real('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

/** Une ligne = l'habitude a été faite ce jour-là. */
export const habitLogs = sqliteTable(
  'habit_logs',
  {
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
  },
  (t) => [primaryKey({ columns: [t.habitId, t.date] })],
);

// ---------- Objectifs de la semaine ----------
export const weeklyGoals = sqliteTable(
  'weekly_goals',
  {
    id: text('id').primaryKey(),
    weekStart: text('week_start').notNull(), // lundi de la semaine
    title: text('title').notNull(),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    position: real('position').notNull().default(0),
    carriedFrom: text('carried_from'), // objectif d'une semaine précédente reporté ici
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('goals_week_idx').on(t.weekStart)],
);
