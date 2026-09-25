import type { ShoppingHistoryEntry, ShoppingItem, ShoppingUpdateInput } from '@fluo/shared';
import { shoppingKey } from '@fluo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from '../lib/toast';
import { api } from './client';

const ITEMS = ['shopping'] as const;
const HISTORY = ['shopping-history'] as const;
const UNDO_MS = 5000;

export const useShoppingItems = () => useQuery({ queryKey: ITEMS, queryFn: () => api<ShoppingItem[]>('/shopping') });
export const useShoppingHistory = () =>
  useQuery({ queryKey: HISTORY, queryFn: () => api<ShoppingHistoryEntry[]>('/shopping/history'), staleTime: 60_000 });

type Snap = ShoppingItem[] | undefined;

export function useShoppingMutations() {
  const qc = useQueryClient();
  const begin = async () => {
    await qc.cancelQueries({ queryKey: ITEMS });
    return qc.getQueryData<ShoppingItem[]>(ITEMS);
  };
  const set = (fn: (list: ShoppingItem[]) => ShoppingItem[]) =>
    qc.setQueryData<ShoppingItem[]>(ITEMS, (list) => (list ? fn(list) : list));
  const rollback = (_e: unknown, _v: unknown, ctx?: { snap: Snap }) => qc.setQueryData(ITEMS, ctx?.snap);
  const settle = () => qc.invalidateQueries({ queryKey: ITEMS });

  const add = useMutation({
    mutationFn: (name: string) =>
      api<{ item: ShoppingItem; duplicate: boolean }>('/shopping', { method: 'POST', json: { name } }),
    onMutate: async (name) => {
      const snap = await begin();
      const key = shoppingKey(name);
      const existing = snap?.find((i) => i.key === key);
      if (existing && !existing.checked) {
        toast.show({ message: `« ${existing.name} » est déjà dans la liste` });
        return { snap };
      }
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      set((list) => [
        ...list.filter((i) => i.key !== key),
        { id: `tmp-${Date.now()}`, name: label, key, checked: false, position: Number.MAX_SAFE_INTEGER, createdAt: '', checkedAt: null },
      ]);
      return { snap };
    },
    onError: rollback,
    onSettled: () => Promise.all([settle(), qc.invalidateQueries({ queryKey: HISTORY })]),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ShoppingUpdateInput }) =>
      api<ShoppingItem>(`/shopping/${id}`, { method: 'PATCH', json: patch }),
    onMutate: async ({ id, patch }) => {
      const snap = await begin();
      set((list) =>
        list.map((i) =>
          i.id === id
            ? { ...i, ...patch, checkedAt: patch.checked === undefined ? i.checkedAt : patch.checked ? new Date().toISOString() : null }
            : i,
        ),
      );
      return { snap };
    },
    onError: rollback,
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/shopping/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      const snap = await begin();
      set((list) => list.filter((i) => i.id !== id));
      return { snap };
    },
    onError: rollback,
    onSettled: settle,
  });

  /** Vide le panier (articles cochés) avec 5 s pour annuler. */
  const clearChecked = useCallback(
    (items: ShoppingItem[]) => {
      const ids = items.map((i) => i.id).filter((id) => !id.startsWith('tmp-'));
      if (!ids.length) return;
      const snap = qc.getQueryData<ShoppingItem[]>(ITEMS);
      set((list) => list.filter((i) => !ids.includes(i.id)));
      const timer = window.setTimeout(async () => {
        try {
          await api('/shopping/clear', { method: 'POST', json: { ids } });
        } catch (e) {
          toast.show({ message: (e as Error).message, tone: 'error' });
        }
        settle();
      }, UNDO_MS);
      toast.show({
        message: `${ids.length} ${ids.length > 1 ? 'articles retirés' : 'article retiré'} du panier`,
        duration: UNDO_MS,
        action: {
          label: 'Annuler',
          onClick: () => {
            window.clearTimeout(timer);
            qc.setQueryData(ITEMS, snap);
          },
        },
      });
    },
    [qc], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const forget = useMutation({
    mutationFn: (key: string) => api(`/shopping/history/${encodeURIComponent(key)}`, { method: 'DELETE' }),
    onMutate: async (key) => {
      qc.setQueryData<ShoppingHistoryEntry[]>(HISTORY, (h) => h?.filter((e) => e.key !== key));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: HISTORY }),
  });

  return { add, update, remove, clearChecked, forget };
}
