import { addDaysISO, APP_TIMEZONE, toLocalISO } from './dates';
import type { Task, TaskView } from './schemas';

// Règles des vues, partagées pour que le front puisse faire des mises à jour optimistes cohérentes.
export const WEEK_SPAN_DAYS = 7;

export function viewOfDate(dueDate: string | null, today: string): Exclude<TaskView, 'all'> {
  if (!dueDate) return 'later';
  if (dueDate <= today) return 'today'; // inclut les tâches en retard
  if (dueDate <= addDaysISO(today, WEEK_SPAN_DAYS)) return 'week';
  return 'later';
}

export function isDoneOn(task: Pick<Task, 'completedAt'>, day: string, tz = APP_TIMEZONE): boolean {
  return !!task.completedAt && toLocalISO(new Date(task.completedAt), tz) === day;
}

/** Une vue affiche les tâches ouvertes + celles terminées aujourd'hui. */
export function isVisibleIn(task: Task, view: TaskView, today: string, tz = APP_TIMEZONE): boolean {
  if (task.completedAt && !isDoneOn(task, today, tz)) return false;
  return view === 'all' || viewOfDate(task.dueDate, today) === view;
}

export const isOverdue = (task: Task, today: string) =>
  !task.completedAt && !!task.dueDate && task.dueDate < today;
