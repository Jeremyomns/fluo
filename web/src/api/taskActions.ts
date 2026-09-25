import { addDaysISO, diffDaysISO, FOCUS_MAX, nextAfterCompletion, type Task } from '@fluo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { shortDate } from '../lib/dates';
import { toast } from '../lib/toast';
import { openFocusCount, useDeleteTask, useUpdateTask } from './tasks';

/** Actions courantes sur une tâche, avec leurs confirmations (liste, focus, panneau). */
export function useTaskActions(today: string) {
  const qc = useQueryClient();
  const update = useUpdateTask();
  const remove = useDeleteTask();

  const toggle = (task: Task, completed: boolean) => {
    update.mutate({ id: task.id, patch: { completed } });
    if (completed && task.recurrence) {
      const next = nextAfterCompletion(task.recurrence, task.dueDate, today);
      toast.show({ message: `↻ Prochaine fois : ${diffDaysISO(today, next) === 1 ? 'demain' : shortDate(next)}` });
    }
  };

  const postpone = (task: Task) => {
    update.mutate({ id: task.id, patch: { dueDate: addDaysISO(today, 1) } });
    toast.show({
      message: 'Reportée à demain',
      action: { label: 'Annuler', onClick: () => update.mutate({ id: task.id, patch: { dueDate: task.dueDate } }) },
    });
  };

  /** Épingle / désépingle du focus du jour, en respectant la limite. */
  const toggleFocus = (task: Task) => {
    const focused = task.focusDate === today;
    if (!focused && !task.completedAt && openFocusCount(qc, task.id) >= FOCUS_MAX) {
      toast.show({ message: `Le focus est limité à ${FOCUS_MAX} tâches. Retires-en une d'abord.`, tone: 'error' });
      return;
    }
    update.mutate({ id: task.id, patch: { focus: !focused } });
  };

  return { toggle, postpone, toggleFocus, remove, update };
}
