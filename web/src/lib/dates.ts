import { diffDaysISO, todayISO } from '@fluo/shared';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const longDate = (d = new Date()) => cap(format(d, 'EEEE d MMMM', { locale: fr }));

export const greeting = (d = new Date()) => (d.getHours() >= 18 || d.getHours() < 5 ? 'Bonsoir' : 'Bonjour');

/** Libellé court d'échéance : « hier », « il y a 3 jours », « demain », « lundi », « 12 oct. ». */
export function dueLabel(due: string, today: string): string {
  const diff = diffDaysISO(today, due);
  if (diff === 0) return "aujourd'hui";
  if (diff === -1) return 'hier';
  if (diff === 1) return 'demain';
  if (diff < 0) return `il y a ${-diff} jours`;
  if (diff < 7) return format(parseISO(due), 'EEEE', { locale: fr });
  return format(parseISO(due), 'd MMM', { locale: fr });
}

/** Date du jour qui se met à jour toute seule (dashboard laissé ouvert après minuit). */
export function useToday() {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayISO()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return today;
}

/** En-tête de groupe dans la vue Semaine : « Demain », « Dimanche 27 septembre ». */
export function dayHeading(iso: string, today: string): string {
  return diffDaysISO(today, iso) === 1 ? 'Demain' : cap(format(parseISO(iso), 'EEEE d MMMM', { locale: fr }));
}

/** « lun. 28 sept. » */
export const shortDate = (iso: string) => format(parseISO(iso), 'EEE d MMM', { locale: fr });
