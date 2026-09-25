import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` crée une migration SQL dans ./drizzle après modification du schéma.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
