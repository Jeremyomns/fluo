import {
  alignDueDate,
  isVisibleIn,
  type RecurrenceRule,
  type Task,
  type TaskCreateInput,
  type TaskUpdateInput,
  type TaskView,
  todayISO,
} from '@fluo/shared';
import { type QueryClient, type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { createStore } from '../lib/store';
import { toast } from '../lib/toast';
import { currentAccessToken } from '../lib/auth';
import { api } from './client';

const TASKS = ['tasks'] as const;
const UNDO_MS = 5000;

export const isTemp = (t: Task) => t.id.startsWith('tmp-');

export function useTasks(view: TaskView) {
  return useQuery({ queryKey: [...TASKS, view], queryFn: () => api<Task[]>(`/tasks?view=${view}`) });
}

/** L'interface charge toutes les tâches une fois et répartit les vues localement (compteurs gratuits). */
export const useAllTasks = () => useTasks('all');

/** Ordre d'affichage : position manuelle, puis date de création. */
export const byPosition = (a: Task, b: Task) => a.position - b.position || a.createdAt.localeCompare(b.createdAt);

// ---------- Aides pour les mises à jour optimistes ----------
type Snapshot = [QueryKey, Task[] | undefined][];

async function snapshot(qc: QueryClient): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: TASKS }); // évite qu'un refetch en cours écrase l'état optimiste
  return qc.getQueriesData<Task[]>({ queryKey: TASKS });
}
const restore = (qc: QueryClient, snap?: Snapshot) => snap?.forEach(([k, d]) => qc.setQueryData(k, d));

/** Place la tâche dans chaque liste en cache selon les règles de vues partagées avec le serveur. */
function upsertEverywhere(qc: QueryClient, task: Task) {
  const today = todayISO();
  for (const [key, list] of qc.getQueriesData<Task[]>({ queryKey: TASKS })) {
    if (!list) continue;
    const visible = isVisibleIn(task, key[1] as TaskView, today);
    const i = list.findIndex((t) => t.id === task.id);
    if (!visible) qc.setQueryData(key, list.filter((t) => t.id !== task.id));
    else if (i === -1) qc.setQueryData(key, [...list, task]);
    else qc.setQueryData(key, list.map((t, j) => (j === i ? task : t)));
  }
}

function findCached(qc: QueryClient, id: string): Task | undefined {
  for (const [, list] of qc.getQueriesData<Task[]>({ queryKey: TASKS })) {
    const t = list?.find((x) => x.id === id);
    if (t) return t;
  }
}

// ---------- Mutations ----------
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => api<Task>('/tasks', { method: 'POST', json: input }),
    onMutate: async (input) => {
      const snap = await snapshot(qc);
      const now = new Date().toISOString();
      upsertEverywhere(qc, {
        // crypto.randomUUID n'existe pas en HTTP non local (téléphone) : id temporaire maison.
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: input.title.trim(),
        notes: input.notes ?? null,
        categoryId: input.categoryId ?? null,
        priority: input.priority ?? 2,
        dueDate: input.recurrence
          ? alignDueDate(input.recurrence, input.dueDate ?? null, todayISO())
          : (input.dueDate ?? null),
        position: Number.MAX_SAFE_INTEGER,
        focusDate: input.focus ? todayISO() : null,
        recurrenceId: input.recurrence ? 'tmp' : null,
        recurrence: input.recurrence ?? null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdateInput }) =>
      api<Task>(`/tasks/${id}`, { method: 'PATCH', json: patch }),
    onMutate: async ({ id, patch }) => {
      const snap = await snapshot(qc);
      const task = findCached(qc, id);
      if (task) {
        const { completed, focus, ...fields } = patch;
        const now = new Date().toISOString();
        const next: Task = { ...task, ...fields, updatedAt: now };
        if (completed !== undefined) next.completedAt = completed ? now : null;
        if (focus !== undefined) next.focusDate = focus ? todayISO() : null;
        upsertEverywhere(qc, next);
      }
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS }),
  });
}

/** Ajoute, modifie ou retire (`null`) la répétition d'une tâche. */
export function useSetRecurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: RecurrenceRule | null }) =>
      api<Task>(`/tasks/${id}/recurrence`, { method: 'PUT', json: { rule } }),
    onMutate: async ({ id, rule }) => {
      const snap = await snapshot(qc);
      const task = findCached(qc, id);
      if (task) {
        const dueDate = rule && !task.completedAt ? alignDueDate(rule, task.dueDate, todayISO()) : task.dueDate;
        upsertEverywhere(qc, { ...task, recurrence: rule, recurrenceId: rule ? (task.recurrenceId ?? 'tmp') : null, dueDate });
      }
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS }),
  });
}

/** Tâches ouvertes épinglées aujourd'hui (d'après le cache). */
export function openFocusCount(qc: QueryClient, exceptId?: string) {
  const today = todayISO();
  const all = qc.getQueryData<Task[]>([...TASKS, 'all']) ?? [];
  return all.filter((t) => t.focusDate === today && !t.completedAt && t.id !== exceptId).length;
}

/** Réordonne un groupe : les tâches s'échangent les positions qu'elles occupaient (même logique que le serveur). */
export function useReorderTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api('/tasks/reorder', { method: 'POST', json: { ids } }),
    onMutate: async (ids) => {
      const snap = await snapshot(qc);
      for (const [key, list] of snap) {
        if (!list) continue;
        const slots = list.filter((t) => ids.includes(t.id)).map((t) => t.position).sort((a, b) => a - b);
        if (slots.length !== ids.length) continue;
        const pos = new Map(ids.map((id, i) => [id, slots[i]]));
        qc.setQueryData(key, list.map((t) => (pos.has(t.id) ? { ...t, position: pos.get(t.id)! } : t)));
      }
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS }),
  });
}

// ---------- Suppression avec « Annuler » ----------
// La tâche disparaît tout de suite mais n'est réellement supprimée qu'après 5 s.
export const pendingDeletes = createStore<ReadonlySet<string>>(new Set());
const timers = new Map<string, { timer: number; series: boolean }>();
const deleteUrl = (id: string, series: boolean) => `/tasks/${id}${series ? '?series=1' : ''}`;

const unmarkPending = (id: string) =>
  pendingDeletes.set((s) => {
    const next = new Set(s);
    next.delete(id);
    return next;
  });

// Fermeture de l'onglet pendant le délai : on envoie quand même les suppressions.
window.addEventListener('pagehide', () => {
  for (const [id, { timer, series }] of timers) {
    window.clearTimeout(timer);
    fetch(`/api${deleteUrl(id, series)}`, {
      method: 'DELETE',
      keepalive: true,
      headers: { Authorization: `Bearer ${currentAccessToken() ?? ''}` },
    });
  }
  timers.clear();
});

/**
 * Supprime avec « Annuler ». Pour une tâche récurrente : sans `series`, on passe cette
 * occurrence (la suivante apparaît) ; avec `series`, la répétition s'arrête.
 */
export function useDeleteTask() {
  const qc = useQueryClient();
  return useCallback(
    (task: Task, { series = false }: { series?: boolean } = {}) => {
      pendingDeletes.set((s) => new Set(s).add(task.id));

      const timer = window.setTimeout(async () => {
        timers.delete(task.id);
        qc.setQueriesData<Task[]>({ queryKey: TASKS }, (list) => list?.filter((t) => t.id !== task.id));
        unmarkPending(task.id);
        try {
          await api(deleteUrl(task.id, series), { method: 'DELETE' });
        } catch (e) {
          toast.show({ message: (e as Error).message, tone: 'error' });
        }
        qc.invalidateQueries({ queryKey: TASKS });
      }, UNDO_MS);
      timers.set(task.id, { timer, series });

      const short = task.title.length > 32 ? `${task.title.slice(0, 30)}…` : task.title;
      const message = !task.recurrence
        ? `« ${short} » supprimée`
        : series
          ? `Série « ${short} » supprimée`
          : 'Occurrence passée, la suivante reste prévue';
      toast.show({
        message,
        duration: UNDO_MS,
        action: {
          label: 'Annuler',
          onClick: () => {
            window.clearTimeout(timer);
            timers.delete(task.id);
            unmarkPending(task.id);
          },
        },
      });
    },
    [qc],
  );
}
