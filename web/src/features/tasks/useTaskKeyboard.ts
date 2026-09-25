import type { Task } from '@fluo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTaskActions } from '../../api/taskActions';

const isTyping = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Lignes de tâches visibles, dans l'ordre de l'écran (focus du jour exclu). */
const rows = () =>
  [...document.querySelectorAll<HTMLElement>('main [data-task-id]')].filter((r) => r.offsetParent !== null && !r.dataset.taskId?.startsWith('tmp-'));
const focusRow = (row: Element | undefined) => row?.querySelector<HTMLElement>('[data-task-title]')?.focus();

/**
 * Raccourcis de la liste de tâches :
 * J / K pour se déplacer, puis X (ou Espace) cocher, F focus, D demain, Suppr supprimer.
 * Entrée ouvre le détail (comportement normal du bouton titre).
 */
export function useTaskKeyboard(today: string) {
  const qc = useQueryClient();
  const actions = useTaskActions(today);
  const ref = useRef(actions);
  ref.current = actions;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(document.activeElement)) return;
      if (document.querySelector('dialog[open]')) return; // un panneau est ouvert
      const key = e.key.toLowerCase();
      const list = rows();
      const current = document.activeElement?.closest<HTMLElement>('[data-task-id]') ?? null;
      const index = current ? list.indexOf(current) : -1;

      if (key === 'j' || key === 'k') {
        if (!list.length) return;
        e.preventDefault();
        const next = index === -1 ? (key === 'j' ? 0 : list.length - 1) : index + (key === 'j' ? 1 : -1);
        focusRow(list[Math.max(0, Math.min(list.length - 1, next))]);
        return;
      }
      if (!current) return;
      const task = qc.getQueryData<Task[]>(['tasks', 'all'])?.find((t) => t.id === current.dataset.taskId);
      if (!task) return;

      // Après une action qui fait disparaître la ligne, on garde le fil sur la voisine.
      const neighbourId = (list[index + 1] ?? list[index - 1])?.dataset.taskId;
      const keepFocus = (delay: number) =>
        window.setTimeout(() => {
          if (document.activeElement && document.activeElement !== document.body) return;
          focusRow(document.querySelector(`main [data-task-id="${neighbourId}"]`) ?? undefined);
        }, delay);

      const a = ref.current;
      if (key === 'x' || key === ' ') {
        e.preventDefault();
        a.toggle(task, !task.completedAt);
        keepFocus(80);
      } else if (key === 'f') {
        e.preventDefault();
        a.toggleFocus(task);
      } else if (key === 'd' && !task.completedAt && task.dueDate && task.dueDate <= today) {
        e.preventDefault();
        a.postpone(task);
        keepFocus(80);
      } else if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        a.remove(task);
        keepFocus(80);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qc, today]);
}
