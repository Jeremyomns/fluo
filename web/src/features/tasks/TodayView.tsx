import { isDoneOn, isOverdue, type Task } from '@fluo/shared';
import { useState } from 'react';
import { QuickAdd } from '../../components/QuickAdd';
import { TaskList } from '../../components/TaskList';
import { useStore } from '../../lib/store';
import { categoryFilterStore } from '../../lib/uiState';
import { type LoadStatus, ViewBody } from './ViewBody';
import s from './views.module.css';

interface Props {
  tasks: Task[]; // déjà filtrées par catégorie et triées par position
  today: string;
  status: LoadStatus;
}

export function TodayView({ tasks, today, status }: Props) {
  const [showDone, setShowDone] = useState(false);
  const filtered = useStore(categoryFilterStore) !== null;

  const overdue = tasks
    .filter((t) => isOverdue(t, today))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)); // les plus anciennes d'abord
  const planned = tasks.filter((t) => !t.completedAt && t.dueDate === today);
  const done = tasks
    .filter((t) => isDoneOn(t, today))
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  const total = overdue.length + planned.length + done.length;

  return (
    <>
      {total > 0 && (
        <div className={s.progressRow}>
          <div className={s.progress} aria-hidden="true">
            <div className={s.progressFill} style={{ width: `${(done.length / total) * 100}%` }} />
          </div>
          <span className={s.count}>
            {done.length} sur {total} {done.length > 1 ? 'faites' : 'faite'}
          </span>
        </div>
      )}

      <QuickAdd today={today} defaultDueDate={today} placeholder="Ajouter une tâche pour aujourd'hui" />

      <ViewBody
        status={status}
        empty={
          total === 0
            ? filtered
              ? { title: 'Rien dans cette catégorie aujourd’hui.' }
              : { title: "Rien de prévu aujourd'hui.", text: 'Écris une tâche dans le champ ci-dessus, puis appuie sur Entrée.' }
            : null
        }
      >
        {overdue.length > 0 && (
          <>
            <h2 className={`${s.groupTitle} ${s.danger}`}>En retard</h2>
            <TaskList tasks={overdue} today={today} sortable={false} />
          </>
        )}

        {planned.length > 0 ? (
          <>
            {overdue.length > 0 && <h2 className={s.groupTitle}>Prévu aujourd'hui</h2>}
            <TaskList tasks={planned} today={today} />
          </>
        ) : (
          overdue.length === 0 && (
            <div className={s.state}>
              <p className={s.stateTitle}>Tout est fait pour aujourd'hui.</p>
            </div>
          )
        )}

        {done.length > 0 && (
          <div className={s.doneBlock}>
            <button type="button" className={s.doneToggle} aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
              <svg className={s.chevron} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {done.length} {done.length > 1 ? 'terminées' : 'terminée'} aujourd'hui
            </button>
            {showDone && <TaskList tasks={done} today={today} sortable={false} />}
          </div>
        )}
      </ViewBody>
    </>
  );
}
