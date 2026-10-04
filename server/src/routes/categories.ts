import { randomUUID } from 'node:crypto';
import { categoryCreateSchema, categoryUpdateSchema } from '@fluo/shared';
import { asc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/client';
import { categories } from '../db/schema';
import { seedIfEmpty } from '../db/seed';

const notFound = { error: 'Catégorie introuvable' };

export const categoriesRoutes = new Hono()
  .get('/', async (c) => {
    await seedIfEmpty(); // catégories par défaut au tout premier usage
    return c.json(await db.select().from(categories).orderBy(asc(categories.position)));
  })
  .post('/', async (c) => {
    const data = categoryCreateSchema.parse(await c.req.json());
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${categories.position}), -1)` })
      .from(categories);
    const [row] = await db
      .insert(categories)
      .values({ id: randomUUID(), position: Number(max) + 1, ...data })
      .returning();
    return c.json(row, 201);
  })
  .patch('/:id', async (c) => {
    const patch = categoryUpdateSchema.parse(await c.req.json());
    const [row] = await db.update(categories).set(patch).where(eq(categories.id, c.req.param('id'))).returning();
    return row ? c.json(row) : c.json(notFound, 404);
  })
  // Les tâches de la catégorie supprimée passent en « sans catégorie » (ON DELETE SET NULL).
  .delete('/:id', async (c) => {
    const gone = await db.delete(categories).where(eq(categories.id, c.req.param('id'))).returning({ id: categories.id });
    return gone.length ? c.body(null, 204) : c.json(notFound, 404);
  });
