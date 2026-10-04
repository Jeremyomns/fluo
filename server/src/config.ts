import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_TIMEZONE } from '@fluo/shared';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = (name: string) => process.env[name]?.trim() || undefined;

// Réglages lus dans les variables d'environnement (fichier .env en local, réglages du projet sur Vercel).
export const config = {
  port: Number(env('PORT') ?? 3000),
  timezone: env('APP_TZ') ?? APP_TIMEZONE,
  /** Adresse de la base Supabase (« Transaction pooler », port 6543). */
  databaseUrl: env('DATABASE_URL'),
  /** Adresse du projet Supabase, ex. https://abcdefgh.supabase.co */
  supabaseUrl: (env('SUPABASE_URL') ?? env('VITE_SUPABASE_URL'))?.replace(/\/+$/, ''),
  /** Adresse(s) e-mail autorisée(s) à utiliser Fluo, séparées par des virgules. */
  allowedEmails: (env('ALLOWED_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  /** Uniquement pour les tests en local : désactive la connexion. Ignoré sur Vercel. */
  authDisabled: env('FLUO_AUTH') === 'off' && !env('VERCEL'),
  webDist: path.join(root, 'web', 'dist'),
  migrationsDir: path.join(root, 'server', 'drizzle'),
};

/** Arrête tout avec un message clair si un réglage indispensable manque. */
export function requireSetting<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))
    throw new Error(`Réglage manquant : ${name}. Vérifie ton fichier .env (ou les variables d'environnement sur Vercel).`);
  return value;
}
