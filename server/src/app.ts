import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from './auth';
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

// Tout le reste exige une connexion.
app.use('*', requireAuth());
app.route('/tasks', tasksRoutes);
app.route('/categories', categoriesRoutes);
app.route('/shopping', shoppingRoutes);
app.route('/notes', notesRoutes);
app.route('/habits', habitsRoutes);
app.route('/goals', goalsRoutes);
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
