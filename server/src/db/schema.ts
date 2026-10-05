import type { RecurrenceRule } from '@fluo/shared';
import { boolean, doublePrecision, index, integer, jsonb, pgSchema, primaryKey, text } from 'drizzle-orm/pg-core';

// Toutes les tables vivent dans le schéma « fluo », jamais exposé par l'API publique de Supabase.
// RLS activée sans règle : personne ne peut les lire via la clé publique. Seul le serveur de Fluo,
// connecté directement à la base, y a accès.
export const fluo = pgSchema('fluo');

// Les dates restent du texte ISO (YYYY-MM-DD ou horodatage) : même format qu'avant la migration.

export const categories = fluo
  .table('categories', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    emoji: text('emoji').notNull().default(''),
    color: text('color').notNull().default('#687082'),
    position: doublePrecision('position').notNull().default(0),
  })
  .enableRLS();

export const tasks = fluo
  .table(
    'tasks',
    {
      id: text('id').primaryKey(),
      title: text('title').notNull(),
      notes: text('notes'),
      categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
      priority: integer('priority').notNull().default(2), // 1 haute, 2 normale, 3 basse
      dueDate: text('due_date'), // YYYY-MM-DD
      position: doublePrecision('position').notNull().default(0),
      focusDate: text('focus_date'), // en focus si = aujourd'hui
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
  )
  .enableRLS();

/** Une règle de répétition. Titre, catégorie… sont repris de la dernière occurrence. */
export const recurrences = fluo
  .table('recurrences', {
    id: text('id').primaryKey(),
    rule: jsonb('rule').$type<RecurrenceRule>().notNull(),
    createdAt: text('created_at').notNull(),
  })
  .enableRLS();

// ---------- Courses ----------
export const shoppingItems = fluo
  .table(
    'shopping_items',
    {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      key: text('key').notNull(), // nom normalisé pour éviter les doublons
      checked: boolean('checked').notNull().default(false),
      position: doublePrecision('position').notNull().default(0),
      createdAt: text('created_at').notNull(),
      checkedAt: text('checked_at'),
    },
    (t) => [index('shopping_key_idx').on(t.key)],
  )
  .enableRLS();

/** Articles déjà achetés : alimente l'auto-complétion et les « habituels ». */
export const shoppingHistory = fluo
  .table('shopping_history', {
    key: text('key').primaryKey(),
    label: text('label').notNull(),
    useCount: integer('use_count').notNull().default(1),
    lastUsed: text('last_used').notNull(),
  })
  .enableRLS();

// ---------- Notes ----------
export const notes = fluo
  .table('notes', {
    id: text('id').primaryKey(), // "main" : une seule note pour l'instant
    content: text('content').notNull().default(''),
    updatedAt: text('updated_at').notNull(),
  })
  .enableRLS();

// ---------- Habitudes ----------
export const habits = fluo
  .table('habits', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    emoji: text('emoji').notNull().default(''),
    days: jsonb('days').$type<number[]>().notNull(), // jours prévus, 0 = dimanche
    position: doublePrecision('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
  })
  .enableRLS();

/** Une ligne = l'habitude a été faite ce jour-là. */
export const habitLogs = fluo
  .table(
    'habit_logs',
    {
      habitId: text('habit_id')
        .notNull()
        .references(() => habits.id, { onDelete: 'cascade' }),
      date: text('date').notNull(), // YYYY-MM-DD
    },
    (t) => [primaryKey({ columns: [t.habitId, t.date] })],
  )
  .enableRLS();

// ---------- Objectifs de la semaine ----------
export const weeklyGoals = fluo
  .table(
    'weekly_goals',
    {
      id: text('id').primaryKey(),
      weekStart: text('week_start').notNull(), // lundi de la semaine
      title: text('title').notNull(),
      done: boolean('done').notNull().default(false),
      position: doublePrecision('position').notNull().default(0),
      carriedFrom: text('carried_from'),
      createdAt: text('created_at').notNull(),
    },
    (t) => [index('goals_week_idx').on(t.weekStart)],
  )
  .enableRLS();

// ---------- État technique ----------
/** Petites informations de fonctionnement (ex. dernier passage du réveil quotidien). */
export const appStatus = fluo
  .table('app_status', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').notNull(),
  })
  .enableRLS();
