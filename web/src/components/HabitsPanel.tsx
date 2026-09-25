import { addDaysISO, currentStreak, EVERY_DAY, type Habit, weekdayISO, weekProgress, weekStartISO } from '@fluo/shared';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useHabitMutations, useHabits } from '../api/habits';
import { useToday } from '../lib/dates';
import { HabitEditor } from './HabitEditor';
import s from './HabitsPanel.module.css';

const LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const STARTERS = [
  { emoji: '💧', name: "Boire 2 L d'eau" },
  { emoji: '📖', name: 'Lire 20 min' },
  { emoji: '🏃', name: 'Bouger 30 min' },
  { emoji: '🧘', name: 'Méditer 10 min' },
];

export function HabitsPanel() {
  const today = useToday();
  const currentWeek = weekStartISO(today);
  const [week, setWeek] = useState(currentWeek);
  const { data: habits = [], isPending, isError } = useHabits();
  const { create, toggle } = useHabitMutations();
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);

  // Passage à une nouvelle semaine (appli restée ouverte) : on suit.
  useEffect(() => setWeek(currentWeek), [currentWeek]);

  const days = Array.from({ length: 7 }, (_, k) => addDaysISO(week, k));
  const isCurrent = week === currentWeek;
  const label = isCurrent ? 'Cette semaine' : `Semaine du ${format(parseISO(week), 'd MMM', { locale: fr })}`;

  return (
    <section aria-labelledby="habits-title">
      <div className={s.head}>
        <h2 id="habits-title" className={s.title}>
          Habitudes
        </h2>
        <div className={s.weekNav}>
          <button type="button" className={s.navBtn} onClick={() => setWeek(addDaysISO(week, -7))} aria-label="Semaine précédente">
            ‹
          </button>
          <span className={s.weekLabel}>{label}</span>
          <button type="button" className={s.navBtn} onClick={() => setWeek(addDaysISO(week, 7))} disabled={isCurrent} aria-label="Semaine suivante">
            ›
          </button>
        </div>
      </div>

      {isPending ? null : isError ? (
        <p className={s.empty}>Habitudes indisponibles : le serveur ne répond pas.</p>
      ) : habits.length === 0 ? (
        <div className={s.starter}>
          <p>Coche chaque jour ce que tu veux ancrer dans ta routine. Pour commencer :</p>
          <div className={s.starterChips}>
            {STARTERS.map((h) => (
              <button key={h.name} type="button" className={s.chip} onClick={() => create.mutate({ ...h, days: EVERY_DAY })}>
                {h.emoji} {h.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className={s.letters} aria-hidden="true">
            {days.map((d, k) => (
              <span key={d} className={d === today ? s.todayLetter : undefined}>
                {LETTERS[k]}
              </span>
            ))}
          </div>
          <ul className={s.list}>
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                days={days}
                week={week}
                today={today}
                onEdit={() => setEditing(h)}
                onToggle={(date, done) => toggle.mutate({ id: h.id, date, done })}
              />
            ))}
          </ul>
        </>
      )}

      <button type="button" className={s.add} onClick={() => setEditing('new')}>
        + Nouvelle habitude
      </button>

      {editing && <HabitEditor habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

interface RowProps {
  habit: Habit;
  days: string[];
  week: string;
  today: string;
  onEdit: () => void;
  onToggle: (date: string, done: boolean) => void;
}

function HabitRow({ habit, days, week, today, onEdit, onToggle }: RowProps) {
  const done = new Set(habit.logs);
  const streak = currentStreak(habit, today);
  const { done: nDone, scheduled } = weekProgress(habit, week, today);
  const created = habit.createdAt.slice(0, 10);

  return (
    <li className={s.habit}>
      <div className={s.habitHead}>
        <button type="button" className={s.name} onClick={onEdit} title="Modifier l'habitude">
          {habit.emoji && <span aria-hidden="true">{habit.emoji} </span>}
          {habit.name}
        </button>
        {streak >= 2 ? (
          <span className={s.streak} title={`Série en cours : ${streak} jours`}>
            🔥 {streak}
          </span>
        ) : (
          <span className={s.progress}>
            {nDone}/{scheduled}
          </span>
        )}
      </div>
      <div className={s.cells}>
        {days.map((d) => {
          const isDone = done.has(d);
          const planned = habit.days.includes(weekdayISO(d));
          const future = d > today;
          const before = d < created;
          const dayName = format(parseISO(d), 'EEEE d MMMM', { locale: fr });
          return (
            <button
              key={d}
              type="button"
              className={[s.cell, isDone && s.cellDone, !planned && s.cellOff, d === today && s.cellToday].filter(Boolean).join(' ')}
              onClick={() => onToggle(d, !isDone)}
              disabled={future || before}
              aria-pressed={isDone}
              aria-label={`${habit.name}, ${dayName}${planned ? '' : ' (non prévu)'}`}
            >
              {isDone && (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </li>
  );
}
