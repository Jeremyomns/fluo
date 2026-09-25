import { addDaysISO, type Goal, isoWeekNumber, weekStartISO } from '@fluo/shared';
import { type FormEvent, useState } from 'react';
import { useGoalMutations, useGoals } from '../api/goals';
import { useToday } from '../lib/dates';
import s from './GoalsPanel.module.css';

const dismissKey = (week: string) => `fluo:report-ignore:${week}`;

/** Objectifs de la semaine en cours ; ceux de la semaine passée non finis peuvent être reportés. */
export function GoalsPanel() {
  const today = useToday();
  const week = weekStartISO(today);
  const prevWeek = addDaysISO(week, -7);
  const { data: goals = [], isError } = useGoals(week);
  const { data: previous = [] } = useGoals(prevWeek);
  const { create, update, remove, carry } = useGoalMutations(week);
  const [value, setValue] = useState('');
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissKey(week)) === '1';
    } catch {
      return false;
    }
  });

  const carried = new Set(goals.map((g) => g.carriedFrom));
  const leftovers = previous.filter((g) => !g.done && !carried.has(g.id));
  const done = goals.filter((g) => g.done).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    create.mutate(value.trim());
    setValue('');
  };
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(week), '1');
    } catch {
      /* navigation privée */
    }
  };

  return (
    <section aria-labelledby="goals-title">
      <div className={s.head}>
        <h2 id="goals-title" className={s.title}>
          Objectifs
        </h2>
        <span className={s.count}>
          Semaine {isoWeekNumber(today)}
          {goals.length > 0 && ` · ${done} sur ${goals.length}`}
        </span>
      </div>

      {leftovers.length > 0 && !dismissed && (
        <div className={s.carry} role="status">
          <p>
            {leftovers.length === 1
              ? '1 objectif de la semaine dernière n’est pas terminé :'
              : `${leftovers.length} objectifs de la semaine dernière ne sont pas terminés :`}{' '}
            <span className={s.carryList}>{leftovers.map((g) => g.title).join(', ')}</span>
          </p>
          <div className={s.carryActions}>
            <button type="button" className={s.carryBtn} onClick={() => carry.mutate(leftovers.map((g) => g.id))}>
              Les reporter
            </button>
            <button type="button" className={s.ghost} onClick={dismiss}>
              Ignorer
            </button>
          </div>
        </div>
      )}

      {isError ? (
        <p className={s.empty}>Objectifs indisponibles : le serveur ne répond pas.</p>
      ) : (
        <>
          {goals.length > 0 && (
            <ul className={s.list}>
              {goals.map((g) => (
                <GoalRow
                  key={g.id}
                  goal={g}
                  onToggle={() => update.mutate({ id: g.id, patch: { done: !g.done } })}
                  onRemove={() => remove.mutate(g.id)}
                />
              ))}
            </ul>
          )}
          {goals.length > 0 && done === goals.length && <p className={s.win}>Semaine réussie : tous tes objectifs sont atteints.</p>}
          <form onSubmit={submit}>
            <input
              className={s.input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={goals.length ? 'Ajouter un objectif' : 'Fixe-toi 2 ou 3 objectifs pour la semaine'}
              aria-label="Nouvel objectif de la semaine"
              maxLength={200}
              enterKeyHint="enter"
            />
          </form>
        </>
      )}
    </section>
  );
}

function GoalRow({ goal, onToggle, onRemove }: { goal: Goal; onToggle: () => void; onRemove: () => void }) {
  const temp = goal.id.startsWith('tmp-');
  return (
    <li className={`${s.row} ${goal.done ? s.done : ''}`}>
      <button type="button" className={s.toggle} onClick={onToggle} disabled={temp} role="checkbox" aria-checked={goal.done}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <rect className={s.box} x="3" y="3" width="18" height="18" rx="5" />
          <path className={s.tick} d="M7.8 12.4l2.8 2.8 5.6-6" />
        </svg>
        <span className={s.goalTitle}>
          {goal.title}
          {goal.carriedFrom && <span className={s.carriedTag}>reporté</span>}
        </span>
      </button>
      <button type="button" className={s.remove} onClick={onRemove} disabled={temp} aria-label={`Supprimer « ${goal.title} »`} title="Supprimer">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
