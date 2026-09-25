import type { RecurrenceRule } from '@fluo/shared';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
