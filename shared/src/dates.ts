// Dates « calendaires » au format YYYY-MM-DD, calculées dans le fuseau de l'app.
export const APP_TIMEZONE = 'Europe/Paris';

const fmtCache = new Map<string, Intl.DateTimeFormat>();

export function toLocalISO(date: Date, tz = APP_TIMEZONE): string {
  let fmt = fmtCache.get(tz);
  if (!fmt) {
    // en-CA formate nativement en YYYY-MM-DD
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    fmtCache.set(tz, fmt);
  }
  return fmt.format(date);
}

export const todayISO = (tz = APP_TIMEZONE) => toLocalISO(new Date(), tz);

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours de `from` à `to` (positif si `to` est après). */
export function diffDaysISO(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Jour de la semaine : 0 = dimanche … 6 = samedi. */
export const weekdayISO = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Prochain jour `weekday` strictement après `from` (lundi tapé un lundi = lundi suivant). */
export function nextWeekdayISO(from: string, weekday: number): string {
  const diff = (weekday - weekdayISO(from) + 7) % 7 || 7;
  return addDaysISO(from, diff);
}

/** Ajoute des mois en restant sur le dernier jour si besoin (31 janv. + 1 mois = 28/29 févr.). */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Construit une date valide ou renvoie null (ex. 31/02). */
export function makeISO(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}
