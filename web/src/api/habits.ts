import type { Habit, HabitCreateInput, HabitUpdateInput } from '@fluo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

const KEY = ['habits'] as const;

export const useHabits = () => useQuery({ queryKey: KEY, queryFn: () => api<Habit[]>('/habits') });

export function useHabitMutations() {
  const qc = useQueryClient();
  const settle = () => qc.invalidateQueries({ queryKey: KEY });
  const patchCache = (fn: (list: Habit[]) => Habit[]) => qc.setQueryData<Habit[]>(KEY, (l) => (l ? fn(l) : l));

  return {
    create: useMutation({
      mutationFn: (input: HabitCreateInput) => api<Habit>('/habits', { method: 'POST', json: input }),
      onSettled: settle,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: HabitUpdateInput }) =>
        api<Habit>(`/habits/${id}`, { method: 'PATCH', json: patch }),
      onSettled: settle,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/habits/${id}`, { method: 'DELETE' }),
      onMutate: async (id) => {
        await qc.cancelQueries({ queryKey: KEY });
        const snap = qc.getQueryData<Habit[]>(KEY);
        patchCache((l) => l.filter((h) => h.id !== id));
        return { snap };
      },
      onError: (_e, _v, ctx) => qc.setQueryData(KEY, ctx?.snap),
      onSettled: settle,
    }),
    /** Coche / décoche un jour, instantanément à l'écran. */
    toggle: useMutation({
      mutationFn: ({ id, date, done }: { id: string; date: string; done: boolean }) =>
        api(`/habits/${id}/logs/${date}`, { method: done ? 'PUT' : 'DELETE' }),
      onMutate: async ({ id, date, done }) => {
        await qc.cancelQueries({ queryKey: KEY });
        const snap = qc.getQueryData<Habit[]>(KEY);
        patchCache((l) =>
          l.map((h) =>
            h.id !== id ? h : { ...h, logs: done ? [...new Set([...h.logs, date])].sort() : h.logs.filter((d) => d !== date) },
          ),
        );
        return { snap };
      },
      onError: (_e, _v, ctx) => qc.setQueryData(KEY, ctx?.snap),
      onSettled: settle,
    }),
  };
}
