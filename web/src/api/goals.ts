import type { Goal, GoalUpdateInput } from '@fluo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

const key = (week: string) => ['goals', week] as const;

export const useGoals = (weekStart: string) =>
  useQuery({ queryKey: key(weekStart), queryFn: () => api<Goal[]>(`/goals?week=${weekStart}`) });

export function useGoalMutations(weekStart: string) {
  const qc = useQueryClient();
  const k = key(weekStart);
  const settle = () => qc.invalidateQueries({ queryKey: ['goals'] });
  const optimistic = async (fn: (list: Goal[]) => Goal[]) => {
    await qc.cancelQueries({ queryKey: k });
    const snap = qc.getQueryData<Goal[]>(k);
    qc.setQueryData<Goal[]>(k, (l) => (l ? fn(l) : l));
    return { snap };
  };
  const rollback = (_e: unknown, _v: unknown, ctx?: { snap?: Goal[] }) => qc.setQueryData(k, ctx?.snap);

  return {
    create: useMutation({
      mutationFn: (title: string) => api<Goal>('/goals', { method: 'POST', json: { title, weekStart } }),
      onMutate: (title) =>
        optimistic((l) => [
          ...l,
          { id: `tmp-${Date.now()}`, weekStart, title, done: false, position: Number.MAX_SAFE_INTEGER, carriedFrom: null, createdAt: '' },
        ]),
      onError: rollback,
      onSettled: settle,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: GoalUpdateInput }) =>
        api<Goal>(`/goals/${id}`, { method: 'PATCH', json: patch }),
      onMutate: ({ id, patch }) => optimistic((l) => l.map((g) => (g.id === id ? { ...g, ...patch } : g))),
      onError: rollback,
      onSettled: settle,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/goals/${id}`, { method: 'DELETE' }),
      onMutate: (id) => optimistic((l) => l.filter((g) => g.id !== id)),
      onError: rollback,
      onSettled: settle,
    }),
    carry: useMutation({
      mutationFn: (ids: string[]) => api<Goal[]>('/goals/carry', { method: 'POST', json: { ids, weekStart } }),
      onSettled: settle,
    }),
  };
}
