import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Category, describeRule, type Task } from '@fluo/shared';
import type { KeyboardEventHandler } from 'react';
import { isTemp } from '../api/tasks';
import { dueLabel } from '../lib/dates';
import { useCheck } from '../lib/useCheck';
import { useSwipe } from '../lib/useSwipe';
import { openTaskStore } from '../lib/uiState';
import s from './TaskItem.module.css';

interface Props {
  task: Task;
  today: string;
  category?: Category;
  draggable: boolean;
  showDate: boolean;
  onToggle: (completed: boolean) => void;
  onPostpone: () => void;
  onFocus: () => void;
  onDelete: () => void;
}

export function TaskItem({ task, today, category, draggable, showDate, onToggle, onPostpone, onFocus, onDelete }: Props) {
  const done = !!task.completedAt;
  const temp = isTemp(task);
  const overdue = !done && !!task.dueDate && task.dueDate < today;
  const canPostpone = !done && !temp && !!task.dueDate && task.dueDate <= today;
  const focused = task.focusDate === today;
  const { checking, handleCheck } = useCheck(done, onToggle);
  // Mobile : glisser à droite = fait, à gauche = demain (si la tâche est pour aujourd'hui ou en retard)
  const swipe = useSwipe({
    onRight: !done && !temp ? () => onToggle(true) : undefined,
    onLeft: canPostpone ? onPostpone : undefined,
  });

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable || temp || done,
  });
  // Souris/tactile : toute la ligne se déplace (appui long sur mobile). Clavier : uniquement via la poignée.
  const { onKeyDown: dragKeyDown, ...pointerListeners } = listeners ?? {};

  const cls = [
    s.item,
    overdue && s.overdue,
    done && s.done,
    checking && s.checking,
    temp && s.temp,
    isDragging && s.dragging,
    task.priority === 1 && s.high,
    task.priority === 3 && s.low,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      ref={setNodeRef}
      data-task-id={task.id}
      className={cls}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...(draggable ? pointerListeners : {})}
    >
      {draggable && !temp && !done && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={s.grip}
          {...attributes}
          onKeyDown={dragKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined}
          aria-label={`Déplacer « ${task.title} »`}
        >
          <svg viewBox="0 0 12 20" width="10" height="16" aria-hidden="true">
            {[4, 10, 16].map((y) => (
              <g key={y}>
                <circle cx="3" cy={y} r="1.5" />
                <circle cx="9" cy={y} r="1.5" />
              </g>
            ))}
          </svg>
        </button>
      )}

      {swipe.dx !== 0 && (
        <div className={`${s.swipeBg} ${swipe.dx > 0 ? s.swipeDone : s.swipeLater}`} aria-hidden="true">
          <span>✓ Fait</span>
          <span>Demain +1</span>
        </div>
      )}

      <div
        className={s.content}
        style={swipe.dx ? { transform: `translateX(${swipe.dx}px)`, transition: swipe.dragging ? 'none' : undefined } : undefined}
        {...swipe.handlers}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={done || checking}
          aria-label={`Marquer « ${task.title} » comme ${done ? 'à faire' : 'faite'}`}
          className={s.check}
          onClick={handleCheck}
          disabled={temp}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <circle className={s.ring} cx="12" cy="12" r="10" />
            <path className={s.tick} d="M7.5 12.5l3 3 6-6.5" />
          </svg>
        </button>

        {/* Titre + infos = une seule zone cliquable qui ouvre le détail */}
        <button type="button" className={s.title} onClick={() => openTaskStore.set(task.id)} disabled={temp} data-task-title>
          <span className={s.titleMain}>
            {task.priority === 1 && (
              <span className={s.prio} aria-label="Priorité haute">
                !{' '}
              </span>
            )}
            <span className={s.titleText}>{task.title}</span>
            {task.recurrence && (
              <svg className={s.icon} viewBox="0 0 24 24" width="14" height="14" role="img" aria-label={describeRule(task.recurrence)}>
                <title>{describeRule(task.recurrence)}</title>
                <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {task.notes && (
              <svg className={s.icon} viewBox="0 0 24 24" width="14" height="14" role="img" aria-label="Contient des notes">
                <path d="M5 7h14M5 12h14M5 17h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </span>

          {category && (
            <span className={s.cat} title={category.name}>
              <span aria-hidden="true">{category.emoji}</span>
              <span className={s.catName}>{category.name}</span>
            </span>
          )}

          {showDate && task.dueDate && task.dueDate !== today && (
            <span className={`${s.meta} ${overdue ? s.late : ''}`}>{dueLabel(task.dueDate, today)}</span>
          )}

          {!temp && (
            <svg className={s.chevron} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {!done && !temp && (
          <button
            type="button"
            className={`${s.action} ${s.star} ${focused ? s.starOn : ''}`}
            onClick={onFocus}
            aria-pressed={focused}
            aria-label={focused ? `Retirer « ${task.title} » du focus` : `Mettre « ${task.title} » dans le focus du jour`}
            title={focused ? 'Retirer du focus' : 'Focus du jour'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {canPostpone && (
          <button type="button" className={s.action} onClick={onPostpone} aria-label={`Reporter « ${task.title} » à demain`} title="Reporter à demain">
            <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
              {/* calendrier « +1 » : bien distinct de la flèche › qui ouvre le détail */}
              <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <text x="12" y="18.2" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fontFamily="system-ui, sans-serif">
                +1
              </text>
            </svg>
          </button>
        )}

        <button
          type="button"
          className={`${s.action} ${s.delete}`}
          onClick={onDelete}
          disabled={temp}
          aria-label={task.recurrence ? `Passer cette occurrence de « ${task.title} »` : `Supprimer « ${task.title} »`}
          title={task.recurrence ? 'Passer cette occurrence' : 'Supprimer'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </li>
  );
}
