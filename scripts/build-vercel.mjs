// Construit Fluo pour Vercel au format « Build Output API » (dossier .vercel/output) :
//   static/          l'interface compilée (Vite)
//   functions/api.func  l'API Hono regroupée en un seul fichier avec toutes ses dépendances
//   config.json      les règles de routage (API, fichiers, repli vers l'appli)
// Regrouper l'API évite les soucis de Vercel avec les paquets TypeScript d'un monorepo.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const OUT = '.vercel/output';
const REGION = process.env.FLUO_REGION || 'cdg1'; // Paris, au plus près de la base Supabase

const step = (msg) => console.log(`\n▸ ${msg}`);

for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'])
  if (!process.env[name]) console.warn(`⚠ Variable ${name} absente : l'écran de connexion ne fonctionnera pas.`);

rmSync(OUT, { recursive: true, force: true });

step("Compilation de l'interface");
execSync('npm run build -w web', { stdio: 'inherit' });
cpSync('web/dist', `${OUT}/static`, { recursive: true });

step("Regroupement de l'API");
const fn = `${OUT}/functions/api.func`;
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: ['server/src/vercel.ts'],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  // certaines dépendances utilisent encore require() : on le fournit dans le module ESM
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
});
writeFileSync(
  `${fn}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      shouldAddSourcemapSupport: true,
      maxDuration: 30,
      regions: [REGION],
    },
    null,
    2,
  ),
);

step('Règles de routage');
writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Les fichiers compilés ont un nom unique : mise en cache longue durée.
        { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
        // Ne jamais mettre la page principale en cache : chaque mise à jour est visible tout de suite.
        { src: '^/(index\\.html)?$', headers: { 'cache-control': 'no-cache' }, continue: true },
        { src: '^/api(?:/(.*))?$', dest: '/api?__p=$1' },
        { handle: 'filesystem' },
        { src: '^/(.*)$', dest: '/index.html' }, // l'appli gère elle-même ses écrans
      ],
    },
    null,
    2,
  ),
);

console.log(`\n✔ Prêt pour Vercel (${OUT}, fonction en région ${REGION}).\n`);
