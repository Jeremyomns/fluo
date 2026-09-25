import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { z } from 'zod';
import { config } from './config';
import { dbPath, runMigrations } from './db/client';
import { seedIfEmpty } from './db/seed';
import { HttpError } from './http';
import { categoriesRoutes } from './routes/categories';
import { notesRoutes } from './routes/notes';
import { shoppingRoutes } from './routes/shopping';
import { tasksRoutes } from './routes/tasks';

runMigrations();
seedIfEmpty();

const app = new Hono();

// ---------- API ----------
app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/tasks', tasksRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/shopping', shoppingRoutes);
app.route('/api/notes', notesRoutes);
app.all('/api/*', (c) => c.json({ error: 'Route inconnue' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  if (err instanceof z.ZodError) return c.json({ error: 'Données invalides', issues: err.issues }, 400);
  if (err instanceof SyntaxError) return c.json({ error: 'JSON invalide' }, 400);
  console.error(err);
  return c.json({ error: 'Erreur serveur' }, 500);
});

// ---------- Frontend compilé (npm start) ----------
// En dev, c'est Vite (port 5173) qui sert le front et relaie /api vers ici.
const hasWeb = existsSync(path.join(config.webDist, 'index.html'));
if (hasWeb) {
  const indexHtml = readFileSync(path.join(config.webDist, 'index.html'), 'utf8');
  app.use('/*', serveStatic({ root: config.webDist }));
  app.get('*', (c) => c.html(indexHtml)); // repli SPA
}

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, ({ port }) => {
  const where = config.host === '0.0.0.0' ? 'localhost' : config.host;
  console.log(`\n  ✔ Fluo · API prête sur http://${where}:${port}`);
  console.log(hasWeb ? `  ✔ Fluo : http://${where}:${port}` : '  (interface servie par Vite : http://localhost:5173)');
  console.log(`  ✔ Données : ${dbPath}\n`);
});
