import type { MiddlewareHandler } from 'hono';
import { createRemoteJWKSet, decodeProtectedHeader, type JWTPayload, jwtVerify } from 'jose';
import { config, requireSetting } from './config';

// Chaque appel à l'API doit présenter le jeton de connexion Supabase de l'utilisateur
// (en-tête « Authorization: Bearer … »), émis pour une adresse e-mail autorisée.

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
const keySet = (base: string) =>
  (jwks ??= createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`), { cacheMaxAge: 10 * 60_000 }));

/** Anciens projets Supabase (clé HS256 secrète) : on demande à Supabase de valider le jeton. */
const remoteCache = new Map<string, { email?: string; until: number }>();
async function verifyRemotely(base: string, token: string): Promise<string | undefined> {
  const cached = remoteCache.get(token);
  if (cached && cached.until > Date.now()) return cached.email;
  const apikey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  const res = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey } });
  if (!res.ok) return undefined;
  const email = ((await res.json()) as { email?: string }).email;
  remoteCache.set(token, { email, until: Date.now() + 60_000 });
  return email;
}

async function emailFromToken(token: string): Promise<string | undefined> {
  const base = requireSetting(config.supabaseUrl, 'SUPABASE_URL');
  try {
    if (decodeProtectedHeader(token).alg === 'HS256') return await verifyRemotely(base, token);
    const { payload } = await jwtVerify(token, keySet(base), {
      issuer: `${base}/auth/v1`,
      audience: 'authenticated',
    });
    return (payload as JWTPayload & { email?: string }).email;
  } catch {
    return undefined; // jeton expiré, falsifié ou illisible
  }
}

const unauthorized = { error: 'Session expirée : reconnecte-toi.' };

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    if (config.authDisabled) return next(); // tests en local uniquement
    const allowed = requireSetting(config.allowedEmails, 'ALLOWED_EMAILS');
    const token = c.req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return c.json(unauthorized, 401);
    const email = (await emailFromToken(token))?.toLowerCase();
    if (!email) return c.json(unauthorized, 401);
    if (!allowed.includes(email)) return c.json({ error: "Cette adresse n'est pas autorisée à utiliser Fluo." }, 403);
    return next();
  };
}
