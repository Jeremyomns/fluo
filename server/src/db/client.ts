import { existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { config } from '../config';
import * as schema from './schema';

mkdirSync(config.dataDir, { recursive: true });

export const dbPath = path.join(config.dataDir, 'fluo.db');

// Renommage du projet : l'ancienne base « dashboard.db » devient « fluo.db » (une seule fois).
const legacyPath = path.join(config.dataDir, 'dashboard.db');
if (!existsSync(dbPath) && existsSync(legacyPath)) {
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(legacyPath + suffix)) renameSync(legacyPath + suffix, dbPath + suffix);
  }
  console.log('  ✔ Base de données renommée : dashboard.db → fluo.db');
}

export const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL'); // lectures/écritures concurrentes sans blocage
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function runMigrations() {
  migrate(db, { migrationsFolder: config.migrationsDir });
}
