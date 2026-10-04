// Point d'entrée sur Vercel : l'API de Fluo comme une fonction serveur (Node.js).
// Ce fichier est regroupé (« bundle ») avec toutes ses dépendances par scripts/build-vercel.mjs.
import { getRequestListener } from '@hono/node-server';
import { app } from './app';

const listener = getRequestListener(app.fetch);

export default function handler(req: Parameters<typeof listener>[0], res: Parameters<typeof listener>[1]) {
  // La règle de routage envoie /api/xxx vers cette fonction en « /api?__p=xxx » : on rétablit le chemin.
  const url = new URL(req.url ?? '/', 'http://localhost');
  const p = url.searchParams.get('__p');
  if (p !== null && url.pathname === '/api') {
    url.searchParams.delete('__p');
    req.url = `/api/${p}${url.search}`;
  }
  return listener(req, res);
}
