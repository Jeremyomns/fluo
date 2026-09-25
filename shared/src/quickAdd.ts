import { addDaysISO, addMonthsISO, makeISO, nextWeekdayISO, weekdayISO } from './dates';
import { firstOccurrence, type RecurrenceRule } from './recurrence';
import type { Priority } from './schemas';

// Saisie rapide : "Vétérinaire lundi !haute #maison"
//   → { title: "Vétérinaire", dueDate: <lundi prochain>, priority: 1, categoryId: <Maison> }
// Seule la première date trouvée est interprétée ; le reste du texte forme le titre.

export interface QuickAddResult {
  title: string;
  dueDate?: string; // absent = pas de date tapée (la vue choisit la valeur par défaut)
  priority?: Priority;
  categoryId?: string;
  recurrence?: RecurrenceRule; // l'échéance est alors la première occurrence
  focus?: boolean;
}

/** Minuscules, sans accents, apostrophes droites. */
export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’`]/g, "'");

/** Clé de comparaison d'un article de courses : « Œufs  » et « oeufs » sont le même article. */
export const shoppingKey = (name: string) =>
  normalize(name).replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/\s+/g, ' ').trim();

// Noms complets uniquement : "sam", "jeu", "mer" sont trop souvent des mots ordinaires.
const WEEKDAYS: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};
const MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5,
  juin: 6, juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, sep: 9, octobre: 10, oct: 10,
  novembre: 11, nov: 11, decembre: 12, dec: 12,
};
const PRIORITY_TOKENS: Record<string, Priority> = {
  '!!': 1, '!h': 1, '!haute': 1, '!1': 1, '!urgent': 1,
  '!n': 2, '!normale': 2, '!2': 2,
  '!b': 3, '!basse': 3, '!3': 3,
};
// Mots qui précèdent souvent une date et n'ont pas de sens seuls dans le titre.
const DATE_LEAD_WORDS = new Set(['pour', 'avant', 'le', 'ce', 'des', "d'ici", 'jusqu\'a']);

/** Date au prochain passage de jour/mois (si déjà passée cette année → l'an prochain). */
function upcoming(day: number, month: number, today: string, year?: number): string | null {
  const y = Number(today.slice(0, 4));
  if (year !== undefined) return makeISO(year < 100 ? 2000 + year : year, month, day);
  const thisYear = makeISO(y, month, day);
  if (thisYear && thisYear >= today) return thisYear;
  return makeISO(y + 1, month, day);
}

/** Essaie de lire une date à partir du token i. Renvoie la date et le nombre de tokens consommés. */
function matchDate(t: string[], i: number, today: string): { date: string; used: number } | null {
  const [a, b, c] = [t[i], t[i + 1], t[i + 2]];

  if (a === "aujourd'hui" || a === 'aujourdhui' || a === 'auj') return { date: today, used: 1 };
  if (a === 'demain') return { date: addDaysISO(today, 1), used: 1 };
  if (a === 'apres-demain') return { date: addDaysISO(today, 2), used: 1 };
  if (a === 'apres' && b === 'demain') return { date: addDaysISO(today, 2), used: 2 };

  if (a in WEEKDAYS) {
    const date = nextWeekdayISO(today, WEEKDAYS[a]);
    return { date, used: b === 'prochain' ? 2 : 1 };
  }

  if (a === 'semaine' && b === 'prochaine') return { date: nextWeekdayISO(today, 1), used: 2 };
  if (a === 'week-end' || a === 'weekend') {
    const date = weekdayISO(today) === 6 ? today : nextWeekdayISO(today, 6);
    return { date, used: 1 };
  }

  if (a === 'dans' && b && /^\d{1,3}$/.test(b) && c) {
    const n = Number(b);
    if (/^(j|jour|jours)$/.test(c)) return { date: addDaysISO(today, n), used: 3 };
    if (/^(semaine|semaines|sem)$/.test(c)) return { date: addDaysISO(today, 7 * n), used: 3 };
    if (c === 'mois') return { date: addMonthsISO(today, n), used: 3 };
  }

  // 25/10, 25-10, 25.10, 25/10/2026
  const num = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/.exec(a ?? '');
  if (num) {
    const date = upcoming(Number(num[1]), Number(num[2]), today, num[3] ? Number(num[3]) : undefined);
    return date ? { date, used: 1 } : null;
  }

  // 12 octobre [2026]
  if (a && /^\d{1,2}$/.test(a) && b && b in MONTHS) {
    const year = c && /^\d{4}$/.test(c) ? Number(c) : undefined;
    const date = upcoming(Number(a), MONTHS[b], today, year);
    return date ? { date, used: year ? 3 : 2 } : null;
  }

  return null;
}

/** Récurrences : « chaque mardi », « tous les lundis et jeudis », « tous les mois le 5 », « tous les 3 jours »… */
function matchRecurrence(t: string[], i: number, today: string): { rule: RecurrenceRule; used: number } | null {
  const bare = (k: number) => (t[k] ?? '').replace(/[,;.]+$/, '');
  const weekday = (k: number) => {
    const w = bare(k);
    return WEEKDAYS[w] ?? WEEKDAYS[w.replace(/s$/, '')]; // « mardis » → mardi
  };

  let j: number; // position après « chaque » / « tous les » / « toutes les »
  if (bare(i) === 'chaque') j = i + 1;
  else if ((bare(i) === 'tous' || bare(i) === 'toutes') && bare(i + 1) === 'les') j = i + 2;
  else return null;

  let interval = 1;
  if (/^\d{1,3}$/.test(bare(j)) && j > i + 1) {
    interval = Math.max(1, Number(bare(j)));
    j++;
  }
  const unit = bare(j);
  const [, , d] = today.split('-').map(Number);

  if (unit === 'jour' && bare(j + 1) === 'de' && bare(j + 2) === 'semaine')
    return { rule: { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }, used: j + 3 - i };
  if (unit === 'jour' || unit === 'jours') return { rule: { freq: 'daily', interval }, used: j + 1 - i };
  if (unit === 'semaine' || unit === 'semaines')
    return { rule: { freq: 'weekly', interval, weekdays: [weekdayISO(today)] }, used: j + 1 - i };
  if (unit === 'week-end' || unit === 'week-ends' || unit === 'weekend' || unit === 'weekends')
    return { rule: { freq: 'weekly', interval, weekdays: [6, 0] }, used: j + 1 - i };
  if (unit === 'mois') {
    // « tous les mois le 5 »
    if (bare(j + 1) === 'le' && /^\d{1,2}$/.test(bare(j + 2)) && Number(bare(j + 2)) >= 1 && Number(bare(j + 2)) <= 31)
      return { rule: { freq: 'monthly', interval, monthDay: Number(bare(j + 2)) }, used: j + 3 - i };
    return { rule: { freq: 'monthly', interval, monthDay: d }, used: j + 1 - i };
  }
  if (unit === 'annee' || unit === 'annees' || unit === 'an' || unit === 'ans') {
    const [, m] = today.split('-').map(Number);
    return { rule: { freq: 'yearly', interval, month: m, monthDay: d }, used: j + 1 - i };
  }
  if (weekday(j) !== undefined) {
    // « chaque mardi et vendredi », « tous les lundis, mercredis et vendredis »
    const days = [weekday(j)!];
    let k = j + 1;
    while (true) {
      if (bare(k) === 'et' && weekday(k + 1) !== undefined) {
        days.push(weekday(k + 1)!);
        k += 2;
      } else if (weekday(k) !== undefined && /,$/.test(t[k - 1] ?? '')) {
        days.push(weekday(k)!);
        k += 1;
      } else break;
    }
    return { rule: { freq: 'weekly', interval, weekdays: days }, used: k - i };
  }
  return null;
}

/** "le 12" : jour du mois, uniquement après "le" pour ne pas confondre avec "3 pommes". */
function matchDayOfMonth(t: string[], i: number, today: string): { date: string; used: number } | null {
  if (t[i] !== 'le' || !/^\d{1,2}$/.test(t[i + 1] ?? '') || (t[i + 2] ?? '') in MONTHS) return null;
  const day = Number(t[i + 1]);
  let candidate = today.slice(0, 8) + String(day).padStart(2, '0');
  let date = makeISO(Number(candidate.slice(0, 4)), Number(candidate.slice(5, 7)), day);
  if (!date || date < today) {
    candidate = addMonthsISO(today.slice(0, 8) + '01', 1);
    date = makeISO(Number(candidate.slice(0, 4)), Number(candidate.slice(5, 7)), day);
  }
  return date ? { date, used: 2 } : null;
}

export function parseQuickAdd(
  input: string,
  today: string,
  categories: { id: string; name: string }[] = [],
): QuickAddResult {
  const raw = input.trim().split(/\s+/).filter(Boolean);
  const norm = raw.map(normalize);
  const keep: boolean[] = raw.map(() => true);
  const result: QuickAddResult = { title: '' };

  for (let i = 0; i < raw.length; i++) {
    const tok = norm[i];

    if (tok === '*' || tok === '!focus') {
      result.focus = true;
      keep[i] = false;
      continue;
    }

    if (!result.recurrence) {
      const r = matchRecurrence(norm, i, today);
      if (r) {
        result.recurrence = r.rule;
        for (let k = i; k < i + r.used; k++) keep[k] = false;
        i += r.used - 1;
        continue;
      }
    }

    if (tok in PRIORITY_TOKENS) {
      result.priority = PRIORITY_TOKENS[tok];
      keep[i] = false;
      continue;
    }

    if (tok.startsWith('#') && tok.length > 1) {
      const tag = tok.slice(1).replace(/[^a-z0-9]/g, '');
      const cat = categories.find((c) => normalize(c.name).replace(/[^a-z0-9]/g, '').startsWith(tag));
      if (cat) {
        result.categoryId = cat.id;
        keep[i] = false;
      }
      continue;
    }

    if (result.dueDate === undefined) {
      const m = matchDayOfMonth(norm, i, today) ?? matchDate(norm, i, today);
      if (m) {
        result.dueDate = m.date;
        for (let k = i; k < i + m.used; k++) keep[k] = false;
        if (i > 0 && keep[i - 1] && DATE_LEAD_WORDS.has(norm[i - 1])) keep[i - 1] = false;
        i += m.used - 1;
      }
    }
  }

  // Une date tapée avec une récurrence sert de point de départ (« chaque lundi à partir du 12/10 »).
  if (result.recurrence) result.dueDate = firstOccurrence(result.recurrence, result.dueDate ?? today);

  result.title = raw.filter((_, i) => keep[i]).join(' ');
  return result;
}
