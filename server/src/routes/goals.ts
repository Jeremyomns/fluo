import { randomUUID } from 'node:crypto';
import { goalCarrySchema, goalCreateSchema, goalUpdateSchema, isoDate, weekStartISO } from '@fluo/shared';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/client';
import { weeklyGoals } from '../db/schema';

const notFound = { error: 'Objectif introuvable' };
const nextPosition = (weekStart: string) =>
  db
    .select({ max: sql<number>`coalesce(max(${weeklyGoals.position}), 0)` })
    .from(weeklyGoals)
    .where(eq(weeklyGoals.weekStart, weekStart))
    .get()!.max + 1;

export const goalsRoutes = new Hono()
  // ?week=YYYY-MM-DD (n'importe quel jour de la semaine)
  .get('/', (c) => {
    const week = weekStartISO(isoDate.parse(c.req.query('week')));
    return c.json(
      db.select().from(weeklyGoals).where(eq(weeklyGoals.weekStart, week)).orderBy(asc(weeklyGoals.position)).all(),
    );
  })
  .post('/', async (c) => {
    const data = goalCreateSchema.parse(await c.req.json());
    const row = db
      .insert(weeklyGoals)
      .values({ id: randomUUID(), ...data, position: nextPosition(data.weekStart), createdAt: new Date().toISOString() })
      .returning()
      .get();
    return c.json(row, 201);
  })
  .patch('/:id', async (c) => {
    const patch = goalUpdateSchema.parse(await c.req.json());
    const row = db.update(weeklyGoals).set(patch).where(eq(weeklyGoals.id, c.req.param('id'))).returning().get();
    return row ? c.json(row) : c.json(notFound, 404);
  })
  .delete('/:id', (c) => {
    const { changes } = db.delete(weeklyGoals).where(eq(weeklyGoals.id, c.req.param('id'))).run();
    return changes ? c.body(null, 204) : c.json(notFound, 404);
  })
  /** Reporte des objectifs non terminés dans la semaine donnée (sans doublon si déjà reportés). */
  .post('/carry', async (c) => {
    const { ids, weekStart } = goalCarrySchema.parse(await c.req.json());
    const week = weekStartISO(weekStart);
    const created = db.transaction((tx) => {
      const already = new Set(
        tx
          .select({ from: weeklyGoals.carriedFrom })
          .from(weeklyGoals)
          .where(and(eq(weeklyGoals.weekStart, week), isNotNull(weeklyGoals.carriedFrom)))
          .all()
          .map((r) => r.from),
      );
      const sources = tx.select().from(weeklyGoals).where(inArray(weeklyGoals.id, ids)).orderBy(asc(weeklyGoals.position)).all();
      let pos = nextPosition(week);
      return sources
        .filter((g) => !g.done && !already.has(g.id) && g.weekStart < week)
        .map((g) =>
          tx
            .insert(weeklyGoals)
            .values({ id: randomUUID(), weekStart: week, title: g.title, position: pos++, carriedFrom: g.id, createdAt: new Date().toISOString() })
            .returning()
            .get(),
        );
    });
    return c.json(created, 201);
  });
