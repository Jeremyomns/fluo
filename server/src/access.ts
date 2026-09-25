import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { config } from './config';

// Clé d'accès pour les autres appareils (téléphone). Générée une fois, gardée dans data/.
// Pour révoquer tous les appareils : supprimer data/cle-acces.txt et relancer.
const KEY_FILE = path.join(config.dataDir, 'cle-acces.txt');
const COOKIE = 'fluo_cle';
const ONE_YEAR = 400 * 24 * 3600; // durée max acceptée par les navigateurs

export function accessKey(): string {
  if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, 'utf8').trim();
  const key = randomBytes(18).toString('base64url');
  writeFileSync(KEY_FILE, `${key}\n`, { mode: 0o600 });
  return key;
}

const same = (a: string | undefined, b: string) =>
  !!a && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const isLocal = (c: Context) => {
  const addr = getConnInfo(c).remote.address ?? '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);
};

/** Vrai si la requête est autorisée (depuis l'ordinateur, ou avec la clé). */
export const isAuthorized = (c: Context, key: string) =>
  (config.trustLocalhost && isLocal(c)) || same(getCookie(c, COOKIE), key) || same(c.req.query('cle'), key);

/**
 * Protège tout Fluo (API, pages, fichiers) pour les appareils du réseau.
 * `?cle=…` dans l'adresse (QR code) dépose un cookie : l'appareil est ensuite reconnu.
 */
export function requireAccessKey(key: string): MiddlewareHandler {
  return async (c, next) => {
    if (same(c.req.query('cle'), key)) {
      setCookie(c, COOKIE, key, { httpOnly: true, sameSite: 'Lax', maxAge: ONE_YEAR, path: '/' });
      return next();
    }
    if (isAuthorized(c, key)) return next();
    if (c.req.path.startsWith('/api/'))
      return c.json({ error: "Accès refusé : scanne à nouveau le QR code affiché sur ton ordinateur." }, 401);
    return c.html(LOCKED_PAGE, 401);
  };
}

const LOCKED_PAGE = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fluo · accès protégé</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#eef0eb;color:#1c2230;
       font:17px/1.5 system-ui,-apple-system,sans-serif;padding:24px;box-sizing:border-box}
  main{max-width:26rem}
  h1{margin:0 0 .5rem;font-size:1.6rem}
  mark{background:linear-gradient(transparent 45%,#ff9f3a 45%,#ff9f3a 90%,transparent 90%);color:inherit;padding:0 .15em}
  code{background:#fff;padding:.1em .4em;border-radius:6px}
  @media (prefers-color-scheme:dark){body{background:#15181d;color:#e6e8ec}code{background:#1d2128}}
</style></head>
<body><main>
  <h1>🔒 <mark>Fluo</mark> est protégé</h1>
  <p>Pour ouvrir Fluo sur cet appareil, lance <code>npm run reseau</code> sur ton ordinateur,
  puis scanne le QR code affiché dans le terminal avec l'appareil photo.</p>
</main></body></html>`;
