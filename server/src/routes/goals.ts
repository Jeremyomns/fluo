import { randomUUID } from 'node:crypto';
import { goalCarrySchema, goalCreateSchema, goalUpdateSchema, isoDate, weekStartISO } from '@fluo/shared';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type Db, db, type Tx } from '../db/client';
import { weeklyGoals } from '../db/schema';

const notFound = { error: 'Objectif introuvable' };
async function nextPosition(q: Db | Tx, weekStart: string) {
  const [{ max }] = await q
    .select({ max: sql<number>`coalesce(max(${weeklyGoals.position}), 0)` })
    .from(weeklyGoals)
    .where(eq(weeklyGoals.weekStart, weekStart));
  return Number(max) + 1;
}

export const goalsRoutes = new Hono()
  // ?week=YYYY-MM-DD (n'importe quel jour de la semaine)
  .get('/', async (c) => {
    const week = weekStartISO(isoDate.parse(c.req.query('week')));
    return c.json(
      await db.select().from(weeklyGoals).where(eq(weeklyGoals.weekStart, week)).orderBy(asc(weeklyGoals.position)),
    );
  })
  .post('/', async (c) => {
    const data = goalCreateSchema.parse(await c.req.json());
    const [row] = await db
      .insert(weeklyGoals)
      .values({ id: randomUUID(), ...data, position: await nextPosition(db, data.weekStart), createdAt: new Date().toISOString() })
      .returning();
    return c.json(row, 201);
  })
  .patch('/:id', async (c) => {
    const patch = goalUpdateSchema.parse(await c.req.json());
    const [row] = await db.update(weeklyGoals).set(patch).where(eq(weeklyGoals.id, c.req.param('id'))).returning();
    return row ? c.json(row) : c.json(notFound, 404);
  })
  .delete('/:id', async (c) => {
    const gone = await db.delete(weeklyGoals).where(eq(weeklyGoals.id, c.req.param('id'))).returning({ id: weeklyGoals.id });
    return gone.length ? c.body(null, 204) : c.json(notFound, 404);
  })
  /** Reporte des objectifs non terminés dans la semaine donnée (sans doublon si déjà reportés). */
  .post('/carry', async (c) => {
    const { ids, weekStart } = goalCarrySchema.parse(await c.req.json());
    const week = weekStartISO(weekStart);
    const created = await db.transaction(async (tx) => {
      const carried = await tx
        .select({ from: weeklyGoals.carriedFrom })
        .from(weeklyGoals)
        .where(and(eq(weeklyGoals.weekStart, week), isNotNull(weeklyGoals.carriedFrom)));
      const already = new Set(carried.map((r) => r.from));
      const sources = await tx
        .select()
        .from(weeklyGoals)
        .where(inArray(weeklyGoals.id, ids))
        .orderBy(asc(weeklyGoals.position));
      let pos = await nextPosition(tx, week);
      const out = [];
      for (const g of sources.filter((g) => !g.done && !already.has(g.id) && g.weekStart < week)) {
        const [row] = await tx
          .insert(weeklyGoals)
          .values({ id: randomUUID(), weekStart: week, title: g.title, position: pos++, carriedFrom: g.id, createdAt: new Date().toISOString() })
          .returning();
        out.push(row);
      }
      return out;
    });
    return c.json(created, 201);
  });
