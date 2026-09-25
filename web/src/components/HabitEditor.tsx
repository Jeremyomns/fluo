import { EVERY_DAY, type Habit, WEEKDAYS_ONLY } from '@fluo/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { useHabitMutations } from '../api/habits';
import s from './HabitEditor.module.css';
import { Sheet } from './Sheet';

const DAYS = [
  { d: 1, label: 'L', name: 'lundi' },
  { d: 2, label: 'M', name: 'mardi' },
  { d: 3, label: 'M', name: 'mercredi' },
  { d: 4, label: 'J', name: 'jeudi' },
  { d: 5, label: 'V', name: 'vendredi' },
  { d: 6, label: 'S', name: 'samedi' },
  { d: 0, label: 'D', name: 'dimanche' },
];
const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Création ou modification d'une habitude (nom, emoji, jours prévus). */
export function HabitEditor({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const { create, update, remove } = useHabitMutations();
  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '');
  const [days, setDays] = useState<number[]>(habit?.days ?? EVERY_DAY);
  const [confirming, setConfirming] = useState(false);
  const formId = 'habit-form';

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(id);
  }, [confirming]);

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? (cur.length > 1 ? cur.filter((x) => x !== d) : cur) : [...cur, d]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (habit) update.mutate({ id: habit.id, patch: { name: name.trim(), emoji: emoji.trim(), days } });
    else create.mutate({ name: name.trim(), emoji: emoji.trim(), days });
    onClose();
  };

  return (
    <Sheet
      title={habit ? "Modifier l'habitude" : 'Nouvelle habitude'}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form={formId} className={s.primary} disabled={!name.trim()}>
            {habit ? 'Enregistrer' : 'Créer'}
          </button>
          {habit && (
            <button
              type="button"
              className={`${s.danger} ${confirming ? s.confirm : ''}`}
              onClick={() => {
                if (!confirming) return setConfirming(true);
                remove.mutate(habit.id);
                onClose();
              }}
            >
              {confirming ? 'Confirmer' : 'Supprimer'}
            </button>
          )}
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <div className={s.nameRow}>
          <input className={s.emoji} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🙂" maxLength={8} aria-label="Emoji" />
          <input
            className={s.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Lire 20 min"
            maxLength={60}
            aria-label="Nom de l'habitude"
            autoFocus={!habit}
          />
        </div>

        <fieldset className={s.field}>
          <legend>Jours prévus</legend>
          <div className={s.presets}>
            <button type="button" className={s.preset} aria-pressed={sameDays(days, EVERY_DAY)} onClick={() => setDays(EVERY_DAY)}>
              Tous les jours
            </button>
            <button type="button" className={s.preset} aria-pressed={sameDays(days, WEEKDAYS_ONLY)} onClick={() => setDays(WEEKDAYS_ONLY)}>
              En semaine
            </button>
          </div>
          <div className={s.days}>
            {DAYS.map(({ d, label, name: dayName }) => (
              <button key={d} type="button" className={s.day} aria-pressed={days.includes(d)} aria-label={dayName} onClick={() => toggleDay(d)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <p className={s.help}>
          Les jours non prévus ne cassent pas ta série. Tu peux quand même les cocher : ils comptent en bonus.
          {habit && ' Supprimer une habitude efface aussi son historique.'}
        </p>
      </form>
    </Sheet>
  );
}
