import { randomUUID } from 'node:crypto';
import { shoppingAddSchema, shoppingClearSchema, shoppingKey, shoppingUpdateSchema } from '@fluo/shared';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/client';
import { shoppingHistory, shoppingItems } from '../db/schema';

const now = () => new Date().toISOString();
const notFound = { error: 'Article introuvable' };

/** Ajoute l'article à l'historique (ou incrémente son compteur) pour les suggestions. */
async function remember(label: string, key: string) {
  await db
    .insert(shoppingHistory)
    .values({ key, label, useCount: 1, lastUsed: now() })
    .onConflictDoUpdate({
      target: shoppingHistory.key,
      set: { label, useCount: sql`${shoppingHistory.useCount} + 1`, lastUsed: now() },
    });
}

export const shoppingRoutes = new Hono()
  // À acheter d'abord (ordre d'ajout), puis « dans le panier » (derniers cochés en haut).
  .get('/', async (c) =>
    c.json(
      await db
        .select()
        .from(shoppingItems)
        .orderBy(asc(shoppingItems.checked), asc(shoppingItems.position), desc(shoppingItems.checkedAt)),
    ),
  )
  .post('/', async (c) => {
    const parsed = shoppingAddSchema.parse(await c.req.json());
    const name = parsed.name.charAt(0).toUpperCase() + parsed.name.slice(1); // « lait » → « Lait »
    const key = shoppingKey(name);
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(shoppingItems).where(eq(shoppingItems.key, key)).limit(1);
      // Déjà à acheter : pas de doublon.
      if (existing && !existing.checked) return { item: existing, duplicate: true };
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${shoppingItems.position}), 0)` })
        .from(shoppingItems);
      const position = Number(max) + 1;
      // Déjà dans le panier : on le remet dans la liste.
      if (existing) {
        const [item] = await tx
          .update(shoppingItems)
          .set({ checked: false, checkedAt: null, position, name })
          .where(eq(shoppingItems.id, existing.id))
          .returning();
        return { item, duplicate: false };
      }
      const [item] = await tx
        .insert(shoppingItems)
        .values({ id: randomUUID(), name, key, position, createdAt: now() })
        .returning();
      return { item, duplicate: false };
    });
    if (!result.duplicate) await remember(name, key);
    return c.json(result, result.duplicate ? 200 : 201);
  })
  .patch('/:id', async (c) => {
    const patch = shoppingUpdateSchema.parse(await c.req.json());
    const values: Partial<typeof shoppingItems.$inferSelect> = { ...patch };
    if (patch.name) values.key = shoppingKey(patch.name);
    if (patch.checked !== undefined) values.checkedAt = patch.checked ? now() : null;
    const [item] = await db.update(shoppingItems).set(values).where(eq(shoppingItems.id, c.req.param('id'))).returning();
    return item ? c.json(item) : c.json(notFound, 404);
  })
  .delete('/:id', async (c) => {
    const gone = await db
      .delete(shoppingItems)
      .where(eq(shoppingItems.id, c.req.param('id')))
      .returning({ id: shoppingItems.id });
    return gone.length ? c.body(null, 204) : c.json(notFound, 404);
  })
  // « Vider le panier » : ids explicites, pour ne pas effacer un article coché entre-temps sur un autre appareil.
  .post('/clear', async (c) => {
    const { ids } = shoppingClearSchema.parse(await c.req.json());
    await db.delete(shoppingItems).where(inArray(shoppingItems.id, ids));
    return c.body(null, 204);
  })
  .get('/history', async (c) =>
    c.json(await db.select().from(shoppingHistory).orderBy(desc(shoppingHistory.useCount), desc(shoppingHistory.lastUsed))),
  )
  // Oublier une suggestion (faute de frappe, article qu'on n'achète plus)
  .delete('/history/:key', async (c) => {
    await db.delete(shoppingHistory).where(eq(shoppingHistory.key, c.req.param('key')));
    return c.body(null, 204);
  });
