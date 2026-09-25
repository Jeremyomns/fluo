import { z } from 'zod';
import { addDaysISO, weekStartISO, weekdayISO } from './dates';

// ---------- Habitudes ----------
const weekdays = z.array(z.int().min(0).max(6)).min(1).max(7); // 0 = dimanche … 6 = samedi

export const habitCreateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est vide').max(60),
  emoji: z.string().trim().max(8).default(''),
  days: weekdays.default([0, 1, 2, 3, 4, 5, 6]),
});
export type HabitCreateInput = z.input<typeof habitCreateSchema>;
// Schéma distinct (pas de .partial() du précédent : Zod 4 réappliquerait les valeurs par défaut)
export const habitUpdateSchema = z
  .object({ name: z.string().trim().min(1).max(60), emoji: z.string().trim().max(8), days: weekdays })
  .partial()
  .strict();
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  days: number[]; // jours prévus
  position: number;
  createdAt: string;
  logs: string[]; // dates (YYYY-MM-DD) où l'habitude a été faite
}

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];

/**
 * Série en cours : nombre de jours prévus consécutifs où l'habitude a été faite.
 * Aujourd'hui ne casse pas la série tant qu'il n'est pas terminé ; les jours non prévus sont ignorés.
 * Un jour fait en bonus (non prévu) compte aussi.
 */
export function currentStreak(habit: Pick<Habit, 'days' | 'logs' | 'createdAt'>, today: string): number {
  const done = new Set(habit.logs);
  const start = habit.createdAt.slice(0, 10);
  let streak = 0;
  let d = done.has(today) ? today : addDaysISO(today, -1); // aujourd'hui compte seulement s'il est fait
  for (let i = 0; i < 1000 && d >= start; i++, d = addDaysISO(d, -1)) {
    const scheduled = habit.days.includes(weekdayISO(d));
    if (done.has(d)) streak++;
    else if (scheduled) break;
  }
  return streak;
}

/** Bilan d'une semaine : jours faits / jours prévus (sans compter ceux d'avant la création). */
export function weekProgress(habit: Pick<Habit, 'days' | 'logs'> & { createdAt?: string }, weekStart: string, today: string) {
  const start = habit.createdAt?.slice(0, 10) ?? '';
  let scheduled = 0;
  let done = 0;
  for (let k = 0; k < 7; k++) {
    const d = addDaysISO(weekStart, k);
    if (d < start) continue;
    const planned = habit.days.includes(weekdayISO(d));
    if (planned) scheduled++;
    if (habit.logs.includes(d) && d <= today) done++;
  }
  return { done, scheduled };
}

// ---------- Objectifs de la semaine ----------
export const goalCreateSchema = z.object({
  title: z.string().trim().min(1, "L'objectif est vide").max(200),
  weekStart: z.iso.date().refine((d) => weekStartISO(d) === d, 'La semaine doit commencer un lundi'),
});
export const goalUpdateSchema = z
  .object({ title: z.string().trim().min(1).max(200), done: z.boolean() })
  .partial()
  .strict();
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
export const goalCarrySchema = z.object({
  ids: z.array(z.string()).min(1),
  weekStart: z.iso.date(),
});

export interface Goal {
  id: string;
  weekStart: string;
  title: string;
  done: boolean;
  position: number;
  carriedFrom: string | null; // objectif de la semaine précédente reporté ici
  createdAt: string;
}
