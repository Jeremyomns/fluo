import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { toLocalISO } from '@fluo/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { config } from '../config';
import { db, sqlite } from '../db/client';
import * as t from '../db/schema';
import { HttpError } from '../http';

// Sauvegarde complète au format JSON. L'ordre compte : parents avant enfants à l'import,
// l'inverse à l'effacement (clés étrangères).
const TABLES = {
  categories: t.categories,
  recurrences: t.recurrences,
  tasks: t.tasks,
  shoppingItems: t.shoppingItems,
  shoppingHistory: t.shoppingHistory,
  notes: t.notes,
  habits: t.habits,
  habitLogs: t.habitLogs,
  weeklyGoals: t.weeklyGoals,
} as const;
type TableName = keyof typeof TABLES;
const NAMES = Object.keys(TABLES) as TableName[];

const FORMAT_VERSION = 1;
const BACKUP_DIR = path.join(config.dataDir, 'sauvegardes');
const KEEP_BACKUPS = 10;

const row = z.record(z.string(), z.unknown());
const importSchema = z.object({
  app: z.literal('fluo', { error: "Ce fichier n'est pas une sauvegarde Fluo" }),
  version: z.literal(FORMAT_VERSION, { error: 'Version de sauvegarde non prise en charge' }),
  // Tables absentes = vides (sauvegarde plus ancienne qu'une fonctionnalité)
  data: z.object(Object.fromEntries(NAMES.map((n) => [n, z.array(row).default([])])) as Record<TableName, z.ZodDefault<z.ZodArray<typeof row>>>),
});

const counts = (data: Record<TableName, unknown[]>) => Object.fromEntries(NAMES.map((n) => [n, data[n].length]));

/** Copie de la base avant un import, en gardant les 10 plus récentes. */
async function backupDatabase(): Promise<string> {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `avant-import-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  await sqlite.backup(file);
  const old = readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort().reverse().slice(KEEP_BACKUPS);
  for (const f of old) unlinkSync(path.join(BACKUP_DIR, f));
  return file;
}

export const backupRoutes = new Hono()
  .get('/export', (c) => {
    const data = Object.fromEntries(NAMES.map((n) => [n, db.select().from(TABLES[n]).all()])) as Record<TableName, unknown[]>;
    const today = toLocalISO(new Date(), config.timezone);
    return c.json(
      { app: 'fluo', version: FORMAT_VERSION, exportedAt: new Date().toISOString(), counts: counts(data), data },
      200,
      { 'Content-Disposition': `attachment; filename="fluo-sauvegarde-${today}.json"`, 'Cache-Control': 'no-store' },
    );
  })
  .post('/import', async (c) => {
    const parsed = importSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Fichier de sauvegarde invalide');
    const { data } = parsed.data;
    const backup = await backupDatabase();
    try {
      db.transaction((tx) => {
        for (const n of [...NAMES].reverse()) tx.delete(TABLES[n]).run();
        for (const n of NAMES) {
          const rows = data[n];
          for (let i = 0; i < rows.length; i += 200) {
            // biome-ignore lint: lignes validées par SQLite (contraintes NOT NULL, clés étrangères)
            tx.insert(TABLES[n]).values(rows.slice(i, i + 200) as any).run();
          }
        }
      });
    } catch (e) {
      console.error(e);
      // La transaction est annulée : les données actuelles sont intactes.
      throw new HttpError(400, 'Fichier de sauvegarde incomplet ou abîmé : rien n’a été modifié.');
    }
    return c.json({ ok: true, counts: counts(data), backup: path.basename(backup) });
  });
