import { randomUUID } from 'node:crypto';
import { categoryCreateSchema, categoryUpdateSchema } from '@fluo/shared';
import { asc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/client';
import { categories } from '../db/schema';

export const categoriesRoutes = new Hono()
  .get('/', (c) => c.json(db.select().from(categories).orderBy(asc(categories.position)).all()))
  .post('/', async (c) => {
    const data = categoryCreateSchema.parse(await c.req.json());
    const { max } = db
      .select({ max: sql<number>`coalesce(max(${categories.position}), -1)` })
      .from(categories)
      .get()!;
    const row = db
      .insert(categories)
      .values({ id: randomUUID(), position: max + 1, ...data })
      .returning()
      .get();
    return c.json(row, 201);
  })
  .patch('/:id', async (c) => {
    const patch = categoryUpdateSchema.parse(await c.req.json());
    const row = db.update(categories).set(patch).where(eq(categories.id, c.req.param('id'))).returning().get();
    return row ? c.json(row) : c.json({ error: 'Catégorie introuvable' }, 404);
  })
  // Les tâches de la catégorie supprimée passent en « sans catégorie » (ON DELETE SET NULL).
  .delete('/:id', (c) => {
    const { changes } = db.delete(categories).where(eq(categories.id, c.req.param('id'))).run();
    return changes ? c.body(null, 204) : c.json({ error: 'Catégorie introuvable' }, 404);
  });
