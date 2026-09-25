import { addDaysISO, type Task, viewOfDate } from '@fluo/shared';
import { QuickAdd } from '../../components/QuickAdd';
import { TaskList } from '../../components/TaskList';
import { dayHeading } from '../../lib/dates';
import { type LoadStatus, ViewBody } from './ViewBody';
import s from './views.module.css';

interface Props {
  tasks: Task[];
  today: string;
  status: LoadStatus;
}

/** Les 7 prochains jours, groupés par jour. */
export function WeekView({ tasks, today, status }: Props) {
  const upcoming = tasks.filter((t) => !t.completedAt && viewOfDate(t.dueDate, today) === 'week');
  const days = [...new Set(upcoming.map((t) => t.dueDate!))].sort();

  return (
    <>
      <QuickAdd today={today} defaultDueDate={addDaysISO(today, 1)} placeholder="Ajouter pour demain, ou tape « samedi », « 30/09 »…" />
      <ViewBody
        status={status}
        empty={upcoming.length ? null : { title: 'Rien de prévu ces 7 prochains jours.', text: 'Les tâches ajoutées ici sont prévues pour demain par défaut.' }}
      >
        {days.map((day) => (
          <section key={day} aria-label={dayHeading(day, today)}>
            <h2 className={s.groupTitle}>{dayHeading(day, today)}</h2>
            <TaskList tasks={upcoming.filter((t) => t.dueDate === day)} today={today} showDate={false} />
          </section>
        ))}
      </ViewBody>
    </>
  );
}
