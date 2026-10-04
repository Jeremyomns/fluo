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
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { config } from '../config';
import { type Db, db, type Tx } from '../db/client';
import { recurrences, tasks } from '../db/schema';
import { HttpError } from '../http';

type Row = typeof tasks.$inferSelect;

const today = () => toLocalISO(new Date(), config.timezone);
const now = () => new Date().toISOString();

async function rulesById(q: Db | Tx = db): Promise<Map<string, RecurrenceRule>> {
  const rows = await q.select().from(recurrences);
  return new Map(rows.map((r) => [r.id, r.rule]));
}
const toTask = (r: Row, rules: Map<string, RecurrenceRule>): Task => ({
  ...r,
  priority: r.priority as Task['priority'],
  recurrence: (r.recurrenceId && rules.get(r.recurrenceId)) || null,
});
const getRow = async (q: Db | Tx, id: string) => (await q.select().from(tasks).where(eq(tasks.id, id)).limit(1))[0];
const getRule = async (q: Tx, id: string) =>
  (await q.select().from(recurrences).where(eq(recurrences.id, id)).limit(1))[0]?.rule;

// ---------- Récurrences ----------

/** Crée l'occurrence suivante en reprenant titre, notes, catégorie et priorité de `from`. */
async function spawnNext(tx: Tx, from: Row, rule: RecurrenceRule) {
  await tx.insert(tasks).values({
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
  });
}

/** Filet de sécurité : chaque récurrence doit avoir exactement une occurrence ouverte. */
async function ensureRecurringInstances() {
  // Deux requêtes suffisent dans le cas normal (tout est en ordre) : rien à écrire.
  const [rules, open] = await Promise.all([
    db.select().from(recurrences),
    db
      .selectDistinct({ id: tasks.recurrenceId })
      .from(tasks)
      .where(and(isNotNull(tasks.recurrenceId), isNull(tasks.completedAt))),
  ]);
  const withOpen = new Set(open.map((o) => o.id));
  const missing = rules.filter((r) => !withOpen.has(r.id));
  if (!missing.length) return;

  await db.transaction(async (tx) => {
    for (const r of missing) {
      const [last] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.recurrenceId, r.id))
        .orderBy(desc(tasks.completedAt))
        .limit(1);
      if (last) await spawnNext(tx, last, r.rule);
      else await tx.delete(recurrences).where(eq(recurrences.id, r.id)); // plus aucune tâche : règle orpheline
    }
  });
}

async function stopRecurrence(tx: Tx, recurrenceId: string) {
  await tx.update(tasks).set({ recurrenceId: null }).where(eq(tasks.recurrenceId, recurrenceId));
  await tx.delete(recurrences).where(eq(recurrences.id, recurrenceId));
}

// ---------- Focus du jour ----------

/** Nombre de tâches ouvertes épinglées aujourd'hui (les tâches faites ne prennent plus de place). */
async function openFocusCount(tx: Tx, excludeId?: string) {
  const conds = [eq(tasks.focusDate, today()), isNull(tasks.completedAt)];
  if (excludeId) conds.push(ne(tasks.id, excludeId));
  const [{ n }] = await tx.select({ n: count() }).from(tasks).where(and(...conds));
  return Number(n);
}
const focusFullError = () => new HttpError(409, `Le focus est limité à ${FOCUS_MAX} tâches. Retires-en une d'abord.`);

// ---------- CRUD ----------

export async function listTasks(view: TaskView): Promise<Task[]> {
  await ensureRecurringInstances();
  // Tâches ouvertes + terminées récemment (le filtre « aujourd'hui » exact se fait en JS, fuseau oblige).
  const cutoff = new Date(Date.now() - 48 * 3600_000).toISOString();
  const [rows, rules] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(or(isNull(tasks.completedAt), gte(tasks.completedAt, cutoff)))
      .orderBy(asc(tasks.position), asc(tasks.createdAt)),
    rulesById(),
  ]);
  const d = today();
  return rows.map((r) => toTask(r, rules)).filter((t) => isVisibleIn(t, view, d, config.timezone));
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const data = taskCreateSchema.parse(input);
  const row = await db.transaction(async (tx) => {
    let recurrenceId: string | null = null;
    let dueDate = data.dueDate ?? null;
    if (data.recurrence) {
      recurrenceId = randomUUID();
      await tx.insert(recurrences).values({ id: recurrenceId, rule: data.recurrence, createdAt: now() });
      dueDate = alignDueDate(data.recurrence, dueDate, today());
    }
    if (data.focus && (await openFocusCount(tx)) >= FOCUS_MAX) throw focusFullError();
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${tasks.position}), 0)` }).from(tasks);
    const [created] = await tx
      .insert(tasks)
      .values({
        id: randomUUID(),
        title: data.title,
        notes: data.notes ?? null,
        categoryId: data.categoryId ?? null,
        priority: data.priority,
        dueDate,
        position: Number(max) + 1, // ajoutée en bas de liste
        focusDate: data.focus ? today() : null,
        recurrenceId,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning();
    return created;
  });
  return toTask(row, await rulesById());
}

export async function updateTask(id: string, patch: TaskUpdateInput): Promise<Task | undefined> {
  const row = await db.transaction(async (tx) => {
    const cur = await getRow(tx, id);
    if (!cur) return undefined;
    const { completed, focus, ...fields } = patch;
    const values: Partial<Row> = { ...fields, updatedAt: now() };

    if (focus !== undefined) {
      if (focus && !cur.completedAt && cur.focusDate !== today() && (await openFocusCount(tx, id)) >= FOCUS_MAX)
        throw focusFullError();
      values.focusDate = focus ? today() : null;
    }
    if (completed !== undefined) values.completedAt = completed ? now() : null;

    const [updated] = await tx.update(tasks).set(values).where(eq(tasks.id, id)).returning();

    if (cur.recurrenceId) {
      const rule = await getRule(tx, cur.recurrenceId);
      if (rule && completed === true && !cur.completedAt) await spawnNext(tx, updated, rule);
      // Décocher : on supprime l'occurrence suivante créée entre-temps (une seule ouverte à la fois).
      if (completed === false && cur.completedAt)
        await tx
          .delete(tasks)
          .where(and(eq(tasks.recurrenceId, cur.recurrenceId), isNull(tasks.completedAt), ne(tasks.id, id)));
    }
    return updated;
  });
  return row && toTask(row, await rulesById());
}

/** Définit (ou retire avec `null`) la répétition d'une tâche. */
export async function setRecurrence(id: string, rule: RecurrenceRule | null): Promise<Task | undefined> {
  const row = await db.transaction(async (tx) => {
    const cur = await getRow(tx, id);
    if (!cur) return undefined;
    if (!rule) {
      if (cur.recurrenceId) await stopRecurrence(tx, cur.recurrenceId);
      return getRow(tx, id);
    }
    let recurrenceId = cur.recurrenceId;
    if (recurrenceId) await tx.update(recurrences).set({ rule }).where(eq(recurrences.id, recurrenceId));
    else {
      recurrenceId = randomUUID();
      await tx.insert(recurrences).values({ id: recurrenceId, rule, createdAt: now() });
    }
    const dueDate = cur.completedAt ? cur.dueDate : alignDueDate(rule, cur.dueDate, today());
    const [updated] = await tx
      .update(tasks)
      .set({ recurrenceId, dueDate, updatedAt: now() })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  });
  return row && toTask(row, await rulesById());
}

/**
 * Supprime une tâche. Pour une tâche récurrente :
 * - par défaut on « passe » cette occurrence (la suivante est créée) ;
 * - avec `series`, la répétition s'arrête (l'historique est conservé).
 */
export async function deleteTask(id: string, series = false): Promise<boolean> {
  return db.transaction(async (tx) => {
    const cur = await getRow(tx, id);
    if (!cur) return false;
    await tx.delete(tasks).where(eq(tasks.id, id));
    if (cur.recurrenceId) {
      const rule = await getRule(tx, cur.recurrenceId);
      if (series) await stopRecurrence(tx, cur.recurrenceId);
      else if (rule && !cur.completedAt) await spawnNext(tx, cur, rule);
    }
    return true;
  });
}

/**
 * Réordonne un groupe de tâches (ex. « Prévu aujourd'hui ») : on redistribue entre elles
 * les positions qu'elles occupaient déjà, sans toucher aux tâches des autres vues.
 */
export async function reorderTasks(ids: string[]) {
  await db.transaction(async (tx) => {
    const rows = await tx.select({ position: tasks.position }).from(tasks).where(inArray(tasks.id, ids));
    const slots = rows.map((r) => r.position).sort((a, b) => a - b);
    if (slots.length !== ids.length) throw new HttpError(400, 'Tâche inconnue dans le réordonnancement');
    for (const [i, id] of ids.entries()) await tx.update(tasks).set({ position: slots[i] }).where(eq(tasks.id, id));
  });
}
