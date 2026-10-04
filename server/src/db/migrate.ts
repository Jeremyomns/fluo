// npm run db:migrate : crée ou met à jour les tables de Fluo dans Supabase.
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { config } from '../config';
import { closeDb, db } from './client';

try {
  console.log('\n  Mise à jour de la base de données…');
  // Le journal des migrations est rangé dans le schéma « drizzle », jamais exposé lui non plus.
  await migrate(db, { migrationsFolder: config.migrationsDir });
  console.log('  ✔ Base de données à jour.\n');
} catch (e) {
  console.error('\n  ✖ Échec de la mise à jour de la base :', (e as Error).message, '\n');
  process.exitCode = 1;
} finally {
  await closeDb();
}
