import { type Category, FOCUS_MAX, isDoneOn, isOverdue, type Task } from '@fluo/shared';
import { useCategoryMap } from '../api/categories';
import { useTaskActions } from '../api/taskActions';
import { dueLabel } from '../lib/dates';
import { openTaskStore } from '../lib/uiState';
import { useCheck } from '../lib/useCheck';
import s from './FocusStrip.module.css';

interface Props {
  tasks: Task[]; // toutes les tâches, sans filtre de catégorie
  today: string;
}

/** Suggestions quand rien n'est épinglé : retards d'abord, puis priorité, puis ordre manuel. */
function suggestions(tasks: Task[], today: string): Task[] {
  return tasks
    .filter((t) => !t.completedAt && t.dueDate && t.dueDate <= today)
    .sort(
      (a, b) =>
        Number(isOverdue(b, today)) - Number(isOverdue(a, today)) ||
        (isOverdue(a, today) ? a.dueDate!.localeCompare(b.dueDate!) : 0) ||
        a.priority - b.priority ||
        a.position - b.position,
    )
    .slice(0, FOCUS_MAX);
}

export function FocusStrip({ tasks, today }: Props) {
  const categories = useCategoryMap();
  const actions = useTaskActions(today);
  const focused = tasks.filter((t) => t.focusDate === today && (!t.completedAt || isDoneOn(t, today)));
  const open = focused.filter((t) => !t.completedAt);
  const done = focused.filter((t) => t.completedAt);

  if (focused.length === 0) {
    const picks = suggestions(tasks, today);
    if (!picks.length) return null;
    return (
      <section className={s.strip} aria-labelledby="focus-title">
        <div className={s.head}>
          <h2 id="focus-title" className={s.title}>
            Focus du jour
          </h2>
        </div>
        <div className={s.suggest}>
          <p className={s.question}>Qu'est-ce qui compte vraiment aujourd'hui ? Voici ce qui presse le plus :</p>
          <ul className={s.suggestList}>
            {picks.map((t) => (
              <li key={t.id}>
                <span className={s.suggestTitle}>{t.title}</span>
                {t.dueDate && t.dueDate < today && <span className={s.late}>{dueLabel(t.dueDate, today)}</span>}
                <button type="button" className={s.pin} onClick={() => actions.toggleFocus(t)}>
                  Épingler
                </button>
              </li>
            ))}
          </ul>
          {picks.length > 1 && (
            <button type="button" className={s.pinAll} onClick={() => picks.forEach((t) => actions.update.mutate({ id: t.id, patch: { focus: true } }))}>
              Épingler ces {picks.length}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={s.strip} aria-labelledby="focus-title">
      <div className={s.head}>
        <h2 id="focus-title" className={s.title}>
          Focus du jour
        </h2>
        <span className={s.count}>
          {done.length} sur {focused.length} {done.length > 1 ? 'faites' : 'faite'}
        </span>
      </div>

      {open.length === 0 ? (
        <p className={s.cleared}>Focus bouclé pour aujourd'hui. Tu peux épingler autre chose avec l'étoile, ou souffler.</p>
      ) : (
        <ul className={s.cards}>
          {open.map((t) => (
            <FocusCard
              key={t.id}
              task={t}
              today={today}
              category={t.categoryId ? categories.get(t.categoryId) : undefined}
              onToggle={(completed) => actions.toggle(t, completed)}
              onUnpin={() => actions.toggleFocus(t)}
            />
          ))}
          {open.length < FOCUS_MAX && (
            <li className={s.slot}>
              Épingle une autre tâche avec <StarIcon filled={false} />
            </li>
          )}
        </ul>
      )}

      {done.length > 0 && (
        <ul className={s.doneList} aria-label="Focus terminé">
          {done.map((t) => (
            <li key={t.id}>
              <button type="button" className={s.doneItem} onClick={() => actions.toggle(t, false)} title="Remettre à faire">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="var(--accent)" />
                  <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface CardProps {
  task: Task;
  today: string;
  category?: Category;
  onToggle: (completed: boolean) => void;
  onUnpin: () => void;
}

function FocusCard({ task, today, category, onToggle, onUnpin }: CardProps) {
  const done = !!task.completedAt;
  const { checking, handleCheck } = useCheck(done, onToggle);
  const overdue = !done && !!task.dueDate && task.dueDate < today;

  return (
    <li className={`${s.card} ${done || checking ? s.done : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done || checking}
        aria-label={`Marquer « ${task.title} » comme ${done ? 'à faire' : 'faite'}`}
        className={s.check}
        onClick={handleCheck}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <circle className={s.ring} cx="12" cy="12" r="10" />
          <path className={s.tick} d="M7.5 12.5l3 3 6-6.5" />
        </svg>
      </button>
      <button type="button" className={s.body} onClick={() => openTaskStore.set(task.id)}>
        {/* titre sur la carte blanche : le bloc orange porte déjà la couleur signature */}
        <span className={s.titleBlock}>
          <span className={s.hl}>{task.title}</span>
        </span>
        {(category || overdue) && (
          <span className={s.meta}>
            {category && (
              <span>
                {category.emoji} {category.name}
              </span>
            )}
            {overdue && <span className={s.late}>{dueLabel(task.dueDate!, today)}</span>}
          </span>
        )}
      </button>
      <button type="button" className={s.unpin} onClick={onUnpin} aria-label={`Retirer « ${task.title} » du focus`} title="Retirer du focus">
        <StarIcon filled />
      </button>
    </li>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className={filled ? s.starFilled : s.starEmpty} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
