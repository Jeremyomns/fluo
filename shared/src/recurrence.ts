import { z } from 'zod';
import { addDaysISO, addMonthsISO, diffDaysISO, makeISO, weekdayISO, weekStartISO } from './dates';

// Règles de répétition. Une tâche récurrente n'a qu'UNE occurrence ouverte à la fois :
// quand on la coche (ou la passe), la suivante est créée à partir de la règle.

const int = (min: number, max: number) => z.int().min(min).max(max);

export const recurrenceRuleSchema = z.discriminatedUnion('freq', [
  z.object({ freq: z.literal('daily'), interval: int(1, 365) }),
  z.object({
    freq: z.literal('weekly'),
    interval: int(1, 52),
    weekdays: z.array(int(0, 6)).min(1).max(7), // 0 = dimanche … 6 = samedi
  }),
  z.object({ freq: z.literal('monthly'), interval: int(1, 24), monthDay: int(1, 31) }),
  z.object({ freq: z.literal('yearly'), interval: int(1, 10), month: int(1, 12), monthDay: int(1, 31) }),
]);
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Le 31 d'un mois de 30 jours devient le 30 (et le 29/30/31 février, le dernier jour). */
const clampDate = (y: number, m: number, d: number) => makeISO(y, m, Math.min(d, daysInMonth(y, m)))!;
const ymd = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const mondayOf = weekStartISO;

/** Première date strictement après `after` qui respecte la règle. */
export function nextOccurrence(rule: RecurrenceRule, after: string): string {
  const [y, m] = ymd(after);
  switch (rule.freq) {
    case 'daily':
      return addDaysISO(after, rule.interval);
    case 'weekly': {
      // Semaines comptées depuis celle de `after` : « toutes les 2 semaines » saute une semaine sur deux.
      const anchor = mondayOf(after);
      for (let k = 1; k <= 7 * rule.interval + 7; k++) {
        const d = addDaysISO(after, k);
        const weeks = diffDaysISO(anchor, mondayOf(d)) / 7;
        if (rule.weekdays.includes(weekdayISO(d)) && weeks % rule.interval === 0) return d;
      }
      throw new Error('Règle hebdomadaire invalide');
    }
    case 'monthly': {
      const sameMonth = clampDate(y, m, rule.monthDay);
      if (sameMonth > after) return sameMonth;
      const [ny, nm] = ymd(addMonthsISO(`${after.slice(0, 7)}-01`, rule.interval));
      return clampDate(ny, nm, rule.monthDay);
    }
    case 'yearly': {
      const sameYear = clampDate(y, rule.month, rule.monthDay);
      return sameYear > after ? sameYear : clampDate(y + rule.interval, rule.month, rule.monthDay);
    }
  }
}

/** Première date à partir de `from` inclus (pour « tous les N jours », c'est `from` lui-même). */
export const firstOccurrence = (rule: RecurrenceRule, from: string) =>
  rule.freq === 'daily' ? from : nextOccurrence(rule, addDaysISO(from, -1));

/**
 * Date de l'occurrence suivante quand on coche (ou passe) celle prévue le `dueDate`.
 * En retard : on repart d'aujourd'hui, les occurrences manquées ne s'empilent pas.
 */
export function nextAfterCompletion(rule: RecurrenceRule, dueDate: string | null, today: string): string {
  return nextOccurrence(rule, dueDate && dueDate > today ? dueDate : today);
}

export function matchesRule(rule: RecurrenceRule, date: string): boolean {
  const [y, m] = ymd(date);
  switch (rule.freq) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.weekdays.includes(weekdayISO(date));
    case 'monthly':
      return date === clampDate(y, m, rule.monthDay);
    case 'yearly':
      return date === clampDate(y, rule.month, rule.monthDay);
  }
}

/** Garde l'échéance si elle colle à la règle, sinon prend la prochaine date valide. */
export const alignDueDate = (rule: RecurrenceRule, dueDate: string | null, today: string) =>
  dueDate && matchesRule(rule, dueDate) ? dueDate : firstOccurrence(rule, dueDate && dueDate > today ? dueDate : today);

/** Règle par défaut pour une fréquence, calée sur une date de référence. */
export function defaultRule(freq: RecurrenceRule['freq'], ref: string): RecurrenceRule {
  const [, m, d] = ymd(ref);
  switch (freq) {
    case 'daily':
      return { freq, interval: 1 };
    case 'weekly':
      return { freq, interval: 1, weekdays: [weekdayISO(ref)] };
    case 'monthly':
      return { freq, interval: 1, monthDay: d };
    case 'yearly':
      return { freq, interval: 1, month: m, monthDay: d };
  }
}

// ---------- Description en français ----------
export const WEEKDAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const joinFr = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`;
const dayNum = (d: number) => (d === 1 ? '1er' : String(d));
/** Lundi en premier, dimanche en dernier. */
export const sortWeekdays = (days: number[]) => [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));

export function describeRule(rule: RecurrenceRule): string {
  const n = rule.interval;
  switch (rule.freq) {
    case 'daily':
      return n === 1 ? 'Chaque jour' : `Tous les ${n} jours`;
    case 'weekly': {
      const days = sortWeekdays(rule.weekdays);
      const key = days.join(',');
      if (n === 1 && key === '1,2,3,4,5') return 'Chaque jour de semaine';
      if (n === 1 && key === '6,0') return 'Chaque week-end';
      if (n === 1 && days.length === 7) return 'Chaque jour';
      const list = joinFr(days.map((d) => WEEKDAY_NAMES[d]));
      return n === 1 ? `Chaque ${list}` : `Toutes les ${n} semaines, le ${list}`;
    }
    case 'monthly':
      return n === 1 ? `Chaque mois le ${dayNum(rule.monthDay)}` : `Tous les ${n} mois le ${dayNum(rule.monthDay)}`;
    case 'yearly': {
      const date = `${dayNum(rule.monthDay)} ${MONTH_NAMES[rule.month - 1]}`;
      return n === 1 ? `Chaque année le ${date}` : `Tous les ${n} ans le ${date}`;
    }
  }
}
