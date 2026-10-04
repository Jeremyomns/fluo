import { randomUUID } from 'node:crypto';
import { db } from './client';
import { categories } from './schema';

const DEFAULT_CATEGORIES = [
  { name: 'Maison', emoji: '🏠', color: '#B7791F' },
  { name: 'Administratif', emoji: '📄', color: '#3B6FB6' },
  { name: 'Courses', emoji: '🛒', color: '#2E8A6B' },
  { name: 'Projets perso', emoji: '💡', color: '#8A4FBF' },
  { name: 'Santé & sport', emoji: '💪', color: '#C2410C' },
];

/** Crée les catégories par défaut si la base n'en a aucune (tout premier usage). */
export async function seedIfEmpty() {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length) return;
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c, i) => ({ id: randomUUID(), position: i, ...c })))
    .onConflictDoNothing();
}
