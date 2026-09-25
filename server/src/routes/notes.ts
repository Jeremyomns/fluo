import { noteSaveSchema } from '@fluo/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/client';
import { notes } from '../db/schema';

const MAIN = 'main'; // une seule note en V1 ; la table accepte plusieurs notes pour plus tard

export const notesRoutes = new Hono()
  .get('/', (c) => {
    const row = db.select().from(notes).where(eq(notes.id, MAIN)).get();
    return c.json({ content: row?.content ?? '', updatedAt: row?.updatedAt ?? null });
  })
  .put('/', async (c) => {
    const { content } = noteSaveSchema.parse(await c.req.json());
    const updatedAt = new Date().toISOString();
    db.insert(notes)
      .values({ id: MAIN, content, updatedAt })
      .onConflictDoUpdate({ target: notes.id, set: { content, updatedAt } })
      .run();
    return c.json({ content, updatedAt });
  });
