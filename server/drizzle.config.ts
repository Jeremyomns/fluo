import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` : crée une migration SQL dans ./drizzle après modification du schéma.
// `npm run db:migrate`  : applique les migrations sur la base Supabase (DATABASE_URL du fichier .env).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['fluo'],
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
