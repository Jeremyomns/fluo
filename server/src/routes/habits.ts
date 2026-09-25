import { randomUUID } from 'node:crypto';
import { addDaysISO, type Habit, habitCreateSchema, habitUpdateSchema, isoDate, toLocalISO } from '@fluo/shared';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { config } from '../config';
import { db } from '../db/client';
import { habitLogs, habits } from '../db/schema';

const notFound = { error: 'Habitude introuvable' };

/** Habitudes avec leurs jours faits (assez loin pour calculer les séries). */
function listHabits(): Habit[] {
  const since = addDaysISO(toLocalISO(new Date(), config.timezone), -400);
  const logs = db.select().from(habitLogs).where(gte(habitLogs.date, since)).all();
  const byHabit = new Map<string, string[]>();
  for (const l of logs) byHabit.set(l.habitId, [...(byHabit.get(l.habitId) ?? []), l.date]);
  return db
    .select()
    .from(habits)
    .orderBy(asc(habits.position), asc(habits.createdAt))
    .all()
    .map((h) => ({ ...h, logs: (byHabit.get(h.id) ?? []).sort() }));
}
const getHabit = (id: string) => listHabits().find((h) => h.id === id);

export const habitsRoutes = new Hono()
  .get('/', (c) => c.json(listHabits()))
  .post('/', async (c) => {
    const data = habitCreateSchema.parse(await c.req.json());
    const { max } = db.select({ max: sql<number>`coalesce(max(${habits.position}), 0)` }).from(habits).get()!;
    const id = randomUUID();
    db.insert(habits)
      .values({ id, ...data, days: [...new Set(data.days)].sort(), position: max + 1, createdAt: new Date().toISOString() })
      .run();
    return c.json(getHabit(id), 201);
  })
  .patch('/:id', async (c) => {
    const patch = habitUpdateSchema.parse(await c.req.json());
    if (patch.days) patch.days = [...new Set(patch.days)].sort();
    const { changes } = db.update(habits).set(patch).where(eq(habits.id, c.req.param('id'))).run();
    return changes ? c.json(getHabit(c.req.param('id'))) : c.json(notFound, 404);
  })
  .delete('/:id', (c) => {
    const { changes } = db.delete(habits).where(eq(habits.id, c.req.param('id'))).run(); // journal supprimé en cascade
    return changes ? c.body(null, 204) : c.json(notFound, 404);
  })
  // Marquer / démarquer un jour (idempotent)
  .put('/:id/logs/:date', (c) => {
    const date = isoDate.parse(c.req.param('date'));
    const id = c.req.param('id');
    if (!db.select({ id: habits.id }).from(habits).where(eq(habits.id, id)).get()) return c.json(notFound, 404);
    db.insert(habitLogs).values({ habitId: id, date }).onConflictDoNothing().run();
    return c.body(null, 204);
  })
  .delete('/:id/logs/:date', (c) => {
    const date = isoDate.parse(c.req.param('date'));
    db.delete(habitLogs).where(and(eq(habitLogs.habitId, c.req.param('id')), eq(habitLogs.date, date))).run();
    return c.body(null, 204);
  });
