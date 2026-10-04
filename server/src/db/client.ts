import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config, requireSetting } from '../config';
import * as schema from './schema';

// Une connexion légère par instance : sur Vercel, chaque fonction est courte et passe par le
// « pooler » de Supabase, qui mutualise les connexions. `prepare: false` est exigé par ce pooler.
const client = postgres(requireSetting(config.databaseUrl, 'DATABASE_URL'), {
  prepare: false,
  max: Number(process.env.DB_POOL_SIZE ?? 3), // connexions simultanées par instance
  idle_timeout: 20,
  connect_timeout: 15,
  onnotice: () => {}, // messages d'information de Postgres : inutiles ici
});

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export const closeDb = () => client.end();
