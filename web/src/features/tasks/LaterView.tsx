import { type Task, viewOfDate } from '@fluo/shared';
import { QuickAdd } from '../../components/QuickAdd';
import { TaskList } from '../../components/TaskList';
import { type LoadStatus, ViewBody } from './ViewBody';
import s from './views.module.css';

interface Props {
  tasks: Task[];
  today: string;
  status: LoadStatus;
}

/** Au-delà de 7 jours, et tout ce qui n'a pas de date. */
export function LaterView({ tasks, today, status }: Props) {
  const later = tasks.filter((t) => !t.completedAt && viewOfDate(t.dueDate, today) === 'later');
  const scheduled = later.filter((t) => t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const undated = later.filter((t) => !t.dueDate);

  return (
    <>
      <QuickAdd today={today} defaultDueDate={null} placeholder="Ajouter une idée ou une tâche sans date" />
      <ViewBody
        status={status}
        empty={
          later.length
            ? null
            : { title: 'Rien en attente pour plus tard.', text: "Les tâches sans date ou prévues dans plus d'une semaine arrivent ici." }
        }
      >
        {scheduled.length > 0 && (
          <>
            <h2 className={s.groupTitle}>Planifiées</h2>
            <TaskList tasks={scheduled} today={today} sortable={false} />
          </>
        )}
        {undated.length > 0 && (
          <>
            <h2 className={s.groupTitle}>Sans date</h2>
            <TaskList tasks={undated} today={today} />
          </>
        )}
      </ViewBody>
    </>
  );
}
