import { Hono } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from './auth';
import { db } from './db/client';
import { appStatus, tasks } from './db/schema';
import { HttpError } from './http';
import { backupRoutes } from './routes/backup';
import { categoriesRoutes } from './routes/categories';
import { goalsRoutes } from './routes/goals';
import { habitsRoutes } from './routes/habits';
import { notesRoutes } from './routes/notes';
import { shoppingRoutes } from './routes/shopping';
import { tasksRoutes } from './routes/tasks';

/** L'API de Fluo, identique en local et sur Vercel. */
export const app = new Hono().basePath('/api');

app.get('/health', (c) => c.json({ ok: true }));

/**
 * Appelé chaque jour par Vercel (tâche planifiée « crons ») : une petite lecture en base suffit
 * à montrer à Supabase que le projet est utilisé, et évite sa mise en veille après 7 jours.
 * Vercel s'identifie avec « Authorization: Bearer <CRON_SECRET> ».
 */
app.get('/keepalive', async (c) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return c.json({ error: 'CRON_SECRET non configuré' }, 503);
  const given = Buffer.from(c.req.header('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return c.json({ error: 'Accès refusé' }, 401);
  const [{ n }] = await db.select({ n: count() }).from(tasks);
  const at = new Date().toISOString();
  // On note l'heure du passage : Fluo l'affiche dans ses réglages, pour vérifier que le réveil tourne.
  try {
    await db
      .insert(appStatus)
      .values({ key: 'keepalive', value: at, updatedAt: at })
      .onConflictDoUpdate({ target: appStatus.key, set: { value: at, updatedAt: at } });
  } catch (e) {
    console.warn('[keepalive] trace non enregistrée (migration 0001 à appliquer ?)', (e as Error).message);
  }
  console.log(`[keepalive] base active (${n} tâches)`);
  return c.json({ ok: true, at });
});

// Tout le reste exige une connexion.
app.use('*', requireAuth());
app.route('/tasks', tasksRoutes);
app.route('/categories', categoriesRoutes);
app.route('/shopping', shoppingRoutes);
app.route('/notes', notesRoutes);
app.route('/habits', habitsRoutes);
app.route('/goals', goalsRoutes);
/** Dernier passage du réveil quotidien (affiché dans les réglages). */
app.get('/status', async (c) => {
  const rows = await db.select().from(appStatus).where(eq(appStatus.key, 'keepalive')).catch(() => []);
  return c.json({ lastKeepalive: rows[0]?.value ?? null });
});
app.route('/', backupRoutes); // /api/export et /api/import
app.all('*', (c) => c.json({ error: 'Route inconnue' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  if (err instanceof z.ZodError) return c.json({ error: 'Données invalides', issues: err.issues }, 400);
  if (err instanceof SyntaxError) return c.json({ error: 'JSON invalide' }, 400);
  console.error(err);
  const msg = err.message.startsWith('Réglage manquant') ? err.message : 'Erreur serveur';
  return c.json({ error: msg }, 500);
});
