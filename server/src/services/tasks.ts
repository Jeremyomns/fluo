import { randomUUID } from 'node:crypto';
import {
  alignDueDate,
  FOCUS_MAX,
  isVisibleIn,
  nextAfterCompletion,
  type RecurrenceRule,
  type Task,
  type TaskCreateInput,
  type TaskUpdateInput,
  type TaskView,
  taskCreateSchema,
  toLocalISO,
} from '@fluo/shared';
import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db/client';
import { recurrences, tasks } from '../db/schema';
import { HttpError } from '../http';

type Row = typeof tasks.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const today = () => toLocalISO(new Date(), config.timezone);
const now = () => new Date().toISOString();

function rulesById(): Map<string, RecurrenceRule> {
  return new Map(db.select().from(recurrences).all().map((r) => [r.id, r.rule]));
}
const toTask = (r: Row, rules: Map<string, RecurrenceRule>): Task => ({
  ...r,
  priority: r.priority as Task['priority'],
  recurrence: (r.recurrenceId && rules.get(r.recurrenceId)) || null,
});
const getRow = (tx: Tx | typeof db, id: string) => tx.select().from(tasks).where(eq(tasks.id, id)).get();

// ---------- Récurrences ----------

/** Crée l'occurrence suivante en reprenant titre, notes, catégorie et priorité de `from`. */
function spawnNext(tx: Tx, from: Row, rule: RecurrenceRule) {
  tx.insert(tasks)
    .values({
      id: randomUUID(),
      title: from.title,
      notes: from.notes,
      categoryId: from.categoryId,
      priority: from.priority,
      dueDate: nextAfterCompletion(rule, from.dueDate, today()),
      position: from.position, // même place dans la liste
      recurrenceId: from.recurrenceId,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();
}

/** Filet de sécurité : chaque récurrence doit avoir exactement une occurrence ouverte. */
function ensureRecurringInstances() {
  db.transaction((tx) => {
    for (const r of tx.select().from(recurrences).all()) {
      const open = tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.recurrenceId, r.id), isNull(tasks.completedAt)))
        .get();
      if (open) continue;
      const last = tx.select().from(tasks).where(eq(tasks.recurrenceId, r.id)).orderBy(desc(tasks.completedAt)).get();
      if (last) spawnNext(tx, last, r.rule);
      else tx.delete(recurrences).where(eq(recurrences.id, r.id)).run(); // plus aucune tâche : règle orpheline
    }
  });
}

function stopRecurrence(tx: Tx, recurrenceId: string) {
  tx.update(tasks).set({ recurrenceId: null }).where(eq(tasks.recurrenceId, recurrenceId)).run();
  tx.delete(recurrences).where(eq(recurrences.id, recurrenceId)).run();
}

// ---------- Focus du jour ----------

/** Nombre de tâches ouvertes épinglées aujourd'hui (les tâches faites ne prennent plus de place). */
function openFocusCount(tx: Tx, excludeId?: string) {
  const conds = [eq(tasks.focusDate, today()), isNull(tasks.completedAt)];
  if (excludeId) conds.push(ne(tasks.id, excludeId));
  return tx.select({ n: count() }).from(tasks).where(and(...conds)).get()!.n;
}
const focusFullError = () => new HttpError(409, `Le focus est limité à ${FOCUS_MAX} tâches. Retires-en une d'abord.`);

// ---------- CRUD ----------

export function listTasks(view: TaskView): Task[] {
  ensureRecurringInstances();
  // Tâches ouvertes + terminées récemment (le filtre « aujourd'hui » exact se fait en JS, fuseau oblige).
  const cutoff = new Date(Date.now() - 48 * 3600_000).toISOString();
  const rows = db
    .select()
    .from(tasks)
    .where(or(isNull(tasks.completedAt), gte(tasks.completedAt, cutoff)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
    .all();
  const rules = rulesById();
  const d = today();
  return rows.map((r) => toTask(r, rules)).filter((t) => isVisibleIn(t, view, d, config.timezone));
}

export function createTask(input: TaskCreateInput): Task {
  const data = taskCreateSchema.parse(input);
  const row = db.transaction((tx) => {
    let recurrenceId: string | null = null;
    let dueDate = data.dueDate ?? null;
    if (data.recurrence) {
      recurrenceId = randomUUID();
      tx.insert(recurrences).values({ id: recurrenceId, rule: data.recurrence, createdAt: now() }).run();
      dueDate = alignDueDate(data.recurrence, dueDate, today());
    }
    if (data.focus && openFocusCount(tx) >= FOCUS_MAX) throw focusFullError();
    const { max } = tx.select({ max: sql<number>`coalesce(max(${tasks.position}), 0)` }).from(tasks).get()!;
    return tx
      .insert(tasks)
      .values({
        id: randomUUID(),
        title: data.title,
        notes: data.notes ?? null,
        categoryId: data.categoryId ?? null,
        priority: data.priority,
        dueDate,
        position: max + 1, // ajoutée en bas de liste
        focusDate: data.focus ? today() : null,
        recurrenceId,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
      .get();
  });
  return toTask(row, rulesById());
}

export function updateTask(id: string, patch: TaskUpdateInput): Task | undefined {
  const row = db.transaction((tx) => {
    const cur = getRow(tx, id);
    if (!cur) return undefined;
    const { completed, focus, ...fields } = patch;
    const values: Partial<Row> = { ...fields, updatedAt: now() };

    if (focus !== undefined) {
      if (focus && !cur.completedAt && cur.focusDate !== today() && openFocusCount(tx, id) >= FOCUS_MAX)
        throw focusFullError();
      values.focusDate = focus ? today() : null;
    }
    if (completed !== undefined) values.completedAt = completed ? now() : null;

    const updated = tx.update(tasks).set(values).where(eq(tasks.id, id)).returning().get();

    if (cur.recurrenceId) {
      const rule = tx.select().from(recurrences).where(eq(recurrences.id, cur.recurrenceId)).get()?.rule;
      if (rule && completed === true && !cur.completedAt) spawnNext(tx, updated, rule);
      // Décocher : on supprime l'occurrence suivante créée entre-temps (une seule ouverte à la fois).
      if (completed === false && cur.completedAt)
        tx.delete(tasks)
          .where(and(eq(tasks.recurrenceId, cur.recurrenceId), isNull(tasks.completedAt), ne(tasks.id, id)))
          .run();
    }
    return updated;
  });
  return row && toTask(row, rulesById());
}

/** Définit (ou retire avec `null`) la répétition d'une tâche. */
export function setRecurrence(id: string, rule: RecurrenceRule | null): Task | undefined {
  const row = db.transaction((tx) => {
    const cur = getRow(tx, id);
    if (!cur) return undefined;
    if (!rule) {
      if (cur.recurrenceId) stopRecurrence(tx, cur.recurrenceId);
      return getRow(tx, id);
    }
    let recurrenceId = cur.recurrenceId;
    if (recurrenceId) tx.update(recurrences).set({ rule }).where(eq(recurrences.id, recurrenceId)).run();
    else {
      recurrenceId = randomUUID();
      tx.insert(recurrences).values({ id: recurrenceId, rule, createdAt: now() }).run();
    }
    const dueDate = cur.completedAt ? cur.dueDate : alignDueDate(rule, cur.dueDate, today());
    return tx.update(tasks).set({ recurrenceId, dueDate, updatedAt: now() }).where(eq(tasks.id, id)).returning().get();
  });
  return row && toTask(row, rulesById());
}

/**
 * Supprime une tâche. Pour une tâche récurrente :
 * - par défaut on « passe » cette occurrence (la suivante est créée) ;
 * - avec `series`, la répétition s'arrête (l'historique est conservé).
 */
export function deleteTask(id: string, series = false): boolean {
  return db.transaction((tx) => {
    const cur = getRow(tx, id);
    if (!cur) return false;
    tx.delete(tasks).where(eq(tasks.id, id)).run();
    if (cur.recurrenceId) {
      const rule = tx.select().from(recurrences).where(eq(recurrences.id, cur.recurrenceId)).get()?.rule;
      if (series) stopRecurrence(tx, cur.recurrenceId);
      else if (rule && !cur.completedAt) spawnNext(tx, cur, rule);
    }
    return true;
  });
}

/**
 * Réordonne un groupe de tâches (ex. « Prévu aujourd'hui ») : on redistribue entre elles
 * les positions qu'elles occupaient déjà, sans toucher aux tâches des autres vues.
 */
export function reorderTasks(ids: string[]) {
  db.transaction((tx) => {
    const rows = tx.select({ position: tasks.position }).from(tasks).where(inArray(tasks.id, ids)).all();
    const slots = rows.map((r) => r.position).sort((a, b) => a - b);
    if (slots.length !== ids.length) throw new HttpError(400, 'Tâche inconnue dans le réordonnancement');
    ids.forEach((id, i) => tx.update(tasks).set({ position: slots[i] }).where(eq(tasks.id, id)).run());
  });
}
