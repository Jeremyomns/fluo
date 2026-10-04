import { toLocalISO } from '@fluo/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { config } from '../config';
import { db } from '../db/client';
import * as t from '../db/schema';
import { HttpError } from '../http';

// Sauvegarde complète au format JSON (même format qu'avant la migration : les anciennes
// sauvegardes se restaurent telles quelles). L'ordre compte : parents avant enfants à l'import,
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
const BOOLEAN_COLUMNS: Partial<Record<TableName, string[]>> = { shoppingItems: ['checked'], weeklyGoals: ['done'] };

const FORMAT_VERSION = 1;

const row = z.record(z.string(), z.unknown());
const importSchema = z.object({
  app: z.literal('fluo', { error: "Ce fichier n'est pas une sauvegarde Fluo" }),
  version: z.literal(FORMAT_VERSION, { error: 'Version de sauvegarde non prise en charge' }),
  // Tables absentes = vides (sauvegarde plus ancienne qu'une fonctionnalité)
  data: z.object(
    Object.fromEntries(NAMES.map((n) => [n, z.array(row).default([])])) as Record<
      TableName,
      z.ZodDefault<z.ZodArray<typeof row>>
    >,
  ),
});

const counts = (data: Record<TableName, unknown[]>) => Object.fromEntries(NAMES.map((n) => [n, data[n].length]));

/** Ancien format SQLite : 0/1 au lieu de false/true. */
function normalize(name: TableName, rows: Record<string, unknown>[]) {
  const cols = BOOLEAN_COLUMNS[name];
  if (!cols) return rows;
  return rows.map((r) => {
    const out = { ...r };
    for (const col of cols) if (typeof out[col] === 'number') out[col] = out[col] === 1;
    return out;
  });
}

export const backupRoutes = new Hono()
  .get('/export', async (c) => {
    const lists = await Promise.all(NAMES.map((n) => db.select().from(TABLES[n])));
    const data = Object.fromEntries(NAMES.map((n, i) => [n, lists[i]])) as Record<TableName, unknown[]>;
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
    try {
      await db.transaction(async (tx) => {
        for (const n of [...NAMES].reverse()) await tx.delete(TABLES[n]);
        for (const n of NAMES) {
          const rows = normalize(n, data[n]);
          for (let i = 0; i < rows.length; i += 200) {
            // Lignes contrôlées par Postgres (colonnes obligatoires, clés étrangères) : au moindre
            // problème, toute la transaction est annulée.
            // biome-ignore lint/suspicious/noExplicitAny: tables hétérogènes
            await tx.insert(TABLES[n]).values(rows.slice(i, i + 200) as any);
          }
        }
      });
    } catch (e) {
      console.error(e);
      throw new HttpError(400, 'Fichier de sauvegarde incomplet ou abîmé : rien n’a été modifié.');
    }
    return c.json({ ok: true, counts: counts(data) });
  });
