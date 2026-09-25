import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { z } from 'zod';
import { accessKey, isAuthorized, requireAccessKey } from './access';
import { config, isLanMode } from './config';
import { dbPath, runMigrations } from './db/client';
import { seedIfEmpty } from './db/seed';
import { HttpError } from './http';
import { keepMacAwake, lanAddresses, printQr } from './network';
import { backupRoutes } from './routes/backup';
import { categoriesRoutes } from './routes/categories';
import { goalsRoutes } from './routes/goals';
import { habitsRoutes } from './routes/habits';
import { notesRoutes } from './routes/notes';
import { shoppingRoutes } from './routes/shopping';
import { tasksRoutes } from './routes/tasks';

runMigrations();
seedIfEmpty();

const app = new Hono();
const lan = isLanMode();
const key = lan ? accessKey() : '';

// Sur le réseau, tout est protégé par la clé (sauf pour l'ordinateur lui-même).
if (lan) app.use('*', requireAccessKey(key));

// ---------- API ----------
app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/tasks', tasksRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/shopping', shoppingRoutes);
app.route('/api/notes', notesRoutes);
app.route('/api/habits', habitsRoutes);
app.route('/api/goals', goalsRoutes);
app.route('/api', backupRoutes); // /api/export et /api/import
app.all('/api/*', (c) => c.json({ error: 'Route inconnue' }, 404));

// ---------- Installation sur l'écran d'accueil ----------
// Sur iPhone, l'appli installée ne partage pas les cookies de Safari : l'adresse de départ
// transporte donc la clé, pour que l'appli soit reconnue dès son premier lancement.
app.get('/manifest.webmanifest', (c) => {
  const startUrl = lan && isAuthorized(c, key) ? `/?cle=${key}` : '/';
  return c.json(
    {
      name: 'Fluo',
      short_name: 'Fluo',
      description: "L'organisation perso du quotidien",
      lang: 'fr',
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      background_color: '#eef0eb',
      theme_color: '#eef0eb',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    200,
    { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' },
  );
});

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  if (err instanceof z.ZodError) return c.json({ error: 'Données invalides', issues: err.issues }, 400);
  if (err instanceof SyntaxError) return c.json({ error: 'JSON invalide' }, 400);
  console.error(err);
  return c.json({ error: 'Erreur serveur' }, 500);
});

// ---------- Frontend compilé (npm start / npm run reseau) ----------
// En dev, c'est Vite (port 5173) qui sert le front et relaie /api vers ici.
const hasWeb = existsSync(path.join(config.webDist, 'index.html'));
if (hasWeb) {
  const indexHtml = readFileSync(path.join(config.webDist, 'index.html'), 'utf8');
  app.use('/*', serveStatic({ root: config.webDist }));
  app.get('*', (c) => c.html(indexHtml)); // repli SPA
}

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, ({ port }) => {
  console.log(`\n  ✔ Fluo · données : ${dbPath}`);
  if (!hasWeb) {
    console.log(`  ✔ API prête sur http://localhost:${port} (interface servie par Vite : http://localhost:5173)\n`);
    return;
  }
  console.log(`  ✔ Sur cet ordinateur : http://localhost:${port}`);
  if (!lan) {
    console.log(`  (pour ton téléphone : lance plutôt « npm run reseau »)\n`);
    return;
  }
  const [ip, ...others] = lanAddresses();
  if (!ip) {
    console.log("\n  ⚠ Aucun réseau détecté : l'ordinateur est-il connecté au Wi-Fi ?\n");
    return;
  }
  const url = `http://${ip}:${port}/?cle=${key}`;
  console.log('\n  📱 Sur ton téléphone (même Wi-Fi) : scanne ce QR code avec l’appareil photo\n');
  printQr(url);
  console.log(`    ou tape : ${url}`);
  if (others.length) console.log(`    (autres adresses possibles : ${others.join(', ')})`);
  if (keepMacAwake()) console.log('\n  ☕ Ton Mac ne se mettra pas en veille tant que Fluo tourne (écran ouvert).');
  console.log('  🔒 Fluo reste protégé : seuls les appareils qui ont scanné le QR code y ont accès.');
  console.log('     Arrêter : Ctrl + C\n');
});
