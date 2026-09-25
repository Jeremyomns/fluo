import { defaultRule, describeRule, nextAfterCompletion, type RecurrenceRule, sortWeekdays, type Task } from '@fluo/shared';
import { type KeyboardEvent, useState } from 'react';
import { useSetRecurrence } from '../api/tasks';
import { shortDate } from '../lib/dates';
import s from './RecurrenceEditor.module.css';

const FREQS: { value: RecurrenceRule['freq'] | null; label: string }[] = [
  { value: null, label: 'Jamais' },
  { value: 'daily', label: 'Chaque jour' },
  { value: 'weekly', label: 'Chaque semaine' },
  { value: 'monthly', label: 'Chaque mois' },
  { value: 'yearly', label: 'Chaque année' },
];
const UNIT: Record<RecurrenceRule['freq'], [string, string]> = {
  daily: ['jour', 'jours'],
  weekly: ['semaine', 'semaines'],
  monthly: ['mois', 'mois'],
  yearly: ['an', 'ans'],
};
// Lundi en premier
const DAYS = [
  { d: 1, label: 'L', name: 'lundi' },
  { d: 2, label: 'M', name: 'mardi' },
  { d: 3, label: 'M', name: 'mercredi' },
  { d: 4, label: 'J', name: 'jeudi' },
  { d: 5, label: 'V', name: 'vendredi' },
  { d: 6, label: 'S', name: 'samedi' },
  { d: 0, label: 'D', name: 'dimanche' },
];

export function RecurrenceEditor({ task, today }: { task: Task; today: string }) {
  const setRecurrence = useSetRecurrence();
  const rule = task.recurrence;
  // Champs numériques : brouillon local, enregistré à la sortie du champ.
  const [intervalDraft, setIntervalDraft] = useState(String(rule?.interval ?? 1));
  const [dayDraft, setDayDraft] = useState(String(rule?.freq === 'monthly' ? rule.monthDay : ''));

  const commit = (next: RecurrenceRule | null) => setRecurrence.mutate({ id: task.id, rule: next });

  const pickFreq = (freq: RecurrenceRule['freq'] | null) => {
    if (freq === (rule?.freq ?? null)) return;
    const next = freq ? defaultRule(freq, task.dueDate ?? today) : null;
    setIntervalDraft('1');
    if (next?.freq === 'monthly') setDayDraft(String(next.monthDay));
    commit(next);
  };

  const commitInterval = () => {
    if (!rule) return;
    const n = Math.min(Math.max(parseInt(intervalDraft, 10) || 1, 1), 52);
    setIntervalDraft(String(n));
    if (n !== rule.interval) commit({ ...rule, interval: n });
  };

  const commitMonthDay = () => {
    if (rule?.freq !== 'monthly') return;
    const d = Math.min(Math.max(parseInt(dayDraft, 10) || rule.monthDay, 1), 31);
    setDayDraft(String(d));
    if (d !== rule.monthDay) commit({ ...rule, monthDay: d });
  };

  const toggleDay = (d: number) => {
    if (rule?.freq !== 'weekly') return;
    const has = rule.weekdays.includes(d);
    if (has && rule.weekdays.length === 1) return; // au moins un jour
    commit({ ...rule, weekdays: sortWeekdays(has ? rule.weekdays.filter((x) => x !== d) : [...rule.weekdays, d]) });
  };

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur();
  const next = rule && !task.completedAt ? nextAfterCompletion(rule, task.dueDate, today) : null;

  return (
    <fieldset className={s.field}>
      <legend>Répétition</legend>
      <div className={s.options}>
        {FREQS.map((f) => (
          <button key={f.label} type="button" className={s.option} aria-pressed={(rule?.freq ?? null) === f.value} onClick={() => pickFreq(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {rule && (
        <div className={s.details}>
          <label className={s.inline}>
            Tous les
            <input
              className={s.num}
              type="number"
              inputMode="numeric"
              min={1}
              max={52}
              value={intervalDraft}
              onChange={(e) => setIntervalDraft(e.target.value)}
              onBlur={commitInterval}
              onKeyDown={onEnter}
              aria-label="Intervalle"
            />
            {UNIT[rule.freq][Number(intervalDraft) > 1 ? 1 : 0]}
          </label>

          {rule.freq === 'weekly' && (
            <div className={s.days} role="group" aria-label="Jours de la semaine">
              {DAYS.map(({ d, label, name }) => (
                <button key={d} type="button" className={s.day} aria-pressed={rule.weekdays.includes(d)} aria-label={name} onClick={() => toggleDay(d)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {rule.freq === 'monthly' && (
            <label className={s.inline}>
              le
              <input
                className={s.num}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dayDraft}
                onChange={(e) => setDayDraft(e.target.value)}
                onBlur={commitMonthDay}
                onKeyDown={onEnter}
                aria-label="Jour du mois"
              />
              du mois
            </label>
          )}

          <p className={s.summary}>
            ↻ {describeRule(rule)}
            {next && <> · ensuite le {shortDate(next)}</>}
          </p>
          <p className={s.help}>Quand tu coches cette tâche, la suivante apparaît automatiquement.</p>
        </div>
      )}
    </fieldset>
  );
}
