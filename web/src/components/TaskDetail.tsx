import { addDaysISO, nextWeekdayISO, type Priority, type Task, type TaskUpdateInput } from '@fluo/shared';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { useCategories } from '../api/categories';
import { useTaskActions } from '../api/taskActions';
import { useAllTasks } from '../api/tasks';
import { useToday } from '../lib/dates';
import { useShortcut } from '../lib/shortcuts';
import { useStore } from '../lib/store';
import { openTaskStore } from '../lib/uiState';
import { RecurrenceEditor } from './RecurrenceEditor';
import { Sheet } from './Sheet';
import s from './TaskDetail.module.css';

/** Ouvre le détail de la tâche sélectionnée (clic sur un titre). */
export function TaskDetail() {
  const id = useStore(openTaskStore);
  const { data } = useAllTasks();
  const task = id ? data?.find((t) => t.id === id) : undefined;

  // Tâche supprimée entre-temps : on referme.
  useEffect(() => {
    if (id && data && !task) openTaskStore.set(null);
  }, [id, data, task]);

  return task ? <TaskDetailSheet key={task.id} task={task} /> : null;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 1, label: 'Haute' },
  { value: 2, label: 'Normale' },
  { value: 3, label: 'Basse' },
];

function TaskDetailSheet({ task }: { task: Task }) {
  const today = useToday();
  const { update, remove, toggle, toggleFocus } = useTaskActions(today);
  const { data: categories = [] } = useCategories();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const done = !!task.completedAt;
  const focused = task.focusDate === today;
  useShortcut('f', () => !done && toggleFocus(task));

  const patch = (p: TaskUpdateInput) => update.mutate({ id: task.id, patch: p });

  // Enregistre titre et notes s'ils ont changé (à la sortie du champ, en pause de frappe, à la fermeture).
  const flushRef = useRef(() => {});
  flushRef.current = () => {
    const p: TaskUpdateInput = {};
    const t = title.trim();
    if (t && t !== task.title) p.title = t;
    if (notes !== (task.notes ?? '')) p.notes = notes || null;
    if (Object.keys(p).length) patch(p);
  };
  const flush = () => flushRef.current();

  useEffect(() => {
    const id = window.setTimeout(flush, 800);
    return () => window.clearTimeout(id);
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const tomorrow = addDaysISO(today, 1);
  const monday = nextWeekdayISO(today, 1);
  const dueOptions = [
    { label: "Aujourd'hui", value: today },
    { label: 'Demain', value: tomorrow },
    ...(monday !== tomorrow ? [{ label: 'Lundi', value: monday }] : []),
    { label: 'Sans date', value: null },
  ];

  const close = () => {
    flush();
    openTaskStore.set(null);
  };

  return (
    <Sheet
      title="Modifier la tâche"
      onClose={close}
      footer={
        <>
          <button type="button" className={s.primary} onClick={() => toggle(task, !done)}>
            {done ? 'Remettre à faire' : 'Marquer comme faite'}
          </button>
          <button
            type="button"
            className={s.danger}
            onClick={() => {
              openTaskStore.set(null);
              remove(task, { series: true }); // depuis le détail, on supprime toute la série
            }}
          >
            {task.recurrence ? 'Supprimer la série' : 'Supprimer'}
          </button>
        </>
      }
    >
      <textarea
        className={s.titleInput}
        value={title}
        onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
        onBlur={flush}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
        rows={2}
        maxLength={500}
        aria-label="Titre"
      />

      {!done && (
        <button type="button" className={s.focusBtn} aria-pressed={focused} onClick={() => toggleFocus(task)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          {focused ? 'Dans le focus du jour' : 'Ajouter au focus du jour'}
          <kbd className={s.kbd}>F</kbd>
        </button>
      )}

      <fieldset className={s.field}>
        <legend>Échéance</legend>
        <div className={s.options}>
          {dueOptions.map((o) => (
            <button key={o.label} type="button" className={s.option} aria-pressed={task.dueDate === o.value} onClick={() => patch({ dueDate: o.value })}>
              {o.label}
            </button>
          ))}
          <input
            type="date"
            className={s.date}
            value={task.dueDate ?? ''}
            onChange={(e) => patch({ dueDate: e.target.value || null })}
            aria-label="Choisir une date"
          />
        </div>
      </fieldset>

      <RecurrenceEditor key={JSON.stringify(task.recurrence)} task={task} today={today} />

      <fieldset className={s.field}>
        <legend>Priorité</legend>
        <div className={s.segmented}>
          {PRIORITIES.map((p) => (
            <button key={p.value} type="button" aria-pressed={task.priority === p.value} onClick={() => patch({ priority: p.value })}>
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.field}>
        <legend>Catégorie</legend>
        <div className={s.options}>
          <button type="button" className={s.option} aria-pressed={task.categoryId === null} onClick={() => patch({ categoryId: null })}>
            Aucune
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" className={s.option} aria-pressed={task.categoryId === c.id} onClick={() => patch({ categoryId: c.id })}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      <label className={s.field}>
        <span className={s.legend}>Notes</span>
        <textarea
          className={s.notes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={flush}
          rows={5}
          placeholder="Numéro de dossier, adresse, détails…"
        />
      </label>

      <p className={s.meta}>Créée le {format(parseISO(task.createdAt), 'EEEE d MMMM', { locale: fr })}</p>
    </Sheet>
  );
}
