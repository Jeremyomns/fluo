import { noteSaveSchema } from '@fluo/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/client';
import { notes } from '../db/schema';

const MAIN = 'main'; // une seule note pour l'instant ; la table accepte plusieurs notes pour plus tard

export const notesRoutes = new Hono()
  .get('/', async (c) => {
    const [row] = await db.select().from(notes).where(eq(notes.id, MAIN)).limit(1);
    return c.json({ content: row?.content ?? '', updatedAt: row?.updatedAt ?? null });
  })
  .put('/', async (c) => {
    const { content } = noteSaveSchema.parse(await c.req.json());
    const updatedAt = new Date().toISOString();
    await db
      .insert(notes)
      .values({ id: MAIN, content, updatedAt })
      .onConflictDoUpdate({ target: notes.id, set: { content, updatedAt } });
    return c.json({ content, updatedAt });
  });
