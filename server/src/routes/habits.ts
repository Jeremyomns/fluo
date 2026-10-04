import { randomUUID } from 'node:crypto';
import { addDaysISO, type Habit, habitCreateSchema, habitUpdateSchema, isoDate, toLocalISO } from '@fluo/shared';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { config } from '../config';
import { db } from '../db/client';
import { habitLogs, habits } from '../db/schema';

const notFound = { error: 'Habitude introuvable' };
const sortDays = (days: number[]) => [...new Set(days)].sort((a, b) => a - b);

/** Habitudes avec leurs jours faits (assez loin pour calculer les séries). */
async function listHabits(): Promise<Habit[]> {
  const since = addDaysISO(toLocalISO(new Date(), config.timezone), -400);
  const [logs, rows] = await Promise.all([
    db.select().from(habitLogs).where(gte(habitLogs.date, since)),
    db.select().from(habits).orderBy(asc(habits.position), asc(habits.createdAt)),
  ]);
  const byHabit = new Map<string, string[]>();
  for (const l of logs) byHabit.set(l.habitId, [...(byHabit.get(l.habitId) ?? []), l.date]);
  return rows.map((h) => ({ ...h, logs: (byHabit.get(h.id) ?? []).sort() }));
}
const getHabit = async (id: string) => (await listHabits()).find((h) => h.id === id);

export const habitsRoutes = new Hono()
  .get('/', async (c) => c.json(await listHabits()))
  .post('/', async (c) => {
    const data = habitCreateSchema.parse(await c.req.json());
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${habits.position}), 0)` }).from(habits);
    const id = randomUUID();
    await db
      .insert(habits)
      .values({ id, ...data, days: sortDays(data.days), position: Number(max) + 1, createdAt: new Date().toISOString() });
    return c.json(await getHabit(id), 201);
  })
  .patch('/:id', async (c) => {
    const patch = habitUpdateSchema.parse(await c.req.json());
    if (patch.days) patch.days = sortDays(patch.days);
    const done = await db.update(habits).set(patch).where(eq(habits.id, c.req.param('id'))).returning({ id: habits.id });
    return done.length ? c.json(await getHabit(c.req.param('id'))) : c.json(notFound, 404);
  })
  .delete('/:id', async (c) => {
    // le journal de l'habitude est supprimé en cascade
    const gone = await db.delete(habits).where(eq(habits.id, c.req.param('id'))).returning({ id: habits.id });
    return gone.length ? c.body(null, 204) : c.json(notFound, 404);
  })
  // Marquer / démarquer un jour (idempotent)
  .put('/:id/logs/:date', async (c) => {
    const date = isoDate.parse(c.req.param('date'));
    const id = c.req.param('id');
    const [exists] = await db.select({ id: habits.id }).from(habits).where(eq(habits.id, id)).limit(1);
    if (!exists) return c.json(notFound, 404);
    await db.insert(habitLogs).values({ habitId: id, date }).onConflictDoNothing();
    return c.body(null, 204);
  })
  .delete('/:id/logs/:date', async (c) => {
    const date = isoDate.parse(c.req.param('date'));
    await db.delete(habitLogs).where(and(eq(habitLogs.habitId, c.req.param('id')), eq(habitLogs.date, date)));
    return c.body(null, 204);
  });
