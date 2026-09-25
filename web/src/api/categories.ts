import type { Category, CategoryCreateInput, CategoryUpdateInput } from '@fluo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './client';

const KEY = ['categories'] as const;

export const useCategories = () =>
  useQuery({ queryKey: KEY, queryFn: () => api<Category[]>('/categories'), staleTime: 60_000 });

export function useCategoryMap() {
  const { data } = useCategories();
  return useMemo(() => new Map((data ?? []).map((c) => [c.id, c])), [data]);
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  return {
    create: useMutation({
      mutationFn: (input: CategoryCreateInput) => api<Category>('/categories', { method: 'POST', json: input }),
      onSettled: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: CategoryUpdateInput }) =>
        api<Category>(`/categories/${id}`, { method: 'PATCH', json: patch }),
      onSettled: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/categories/${id}`, { method: 'DELETE' }),
      // les tâches concernées passent « sans catégorie » : on les recharge aussi
      onSettled: () => Promise.all([refresh(), qc.invalidateQueries({ queryKey: ['tasks'] })]),
    }),
  };
}
