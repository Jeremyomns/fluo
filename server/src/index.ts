// Lancement en local : `npm run dev` (avec Vite) ou `npm start` (interface compilée).
// Sur Vercel, c'est `vercel.ts` qui sert l'API.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { app as api } from './app';
import { config } from './config';

const app = new Hono();
app.route('/', api);

// Interface compilée (npm start). En dev, c'est Vite (port 5173) qui la sert et relaie /api ici.
const hasWeb = existsSync(path.join(config.webDist, 'index.html'));
if (hasWeb) {
  const indexHtml = readFileSync(path.join(config.webDist, 'index.html'), 'utf8');
  app.use('/*', serveStatic({ root: config.webDist }));
  app.get('*', (c) => c.html(indexHtml)); // repli SPA
}

serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, ({ port }) => {
  console.log(`\n  ✔ Fluo · API prête sur http://localhost:${port} (base Supabase)`);
  console.log(hasWeb ? `  ✔ Fluo : http://localhost:${port}\n` : '  (interface servie par Vite : http://localhost:5173)\n');
  if (config.authDisabled) console.log('  ⚠ Connexion désactivée (FLUO_AUTH=off) : à n’utiliser que pour des tests.\n');
});
