import { useSyncExternalStore } from 'react';

/** Mini-store observable (évite une librairie d'état pour quelques valeurs globales). */
export function createStore<T>(initial: T) {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => void subs.delete(f);
    },
  };
}
export type Store<T> = ReturnType<typeof createStore<T>>;

export const useStore = <T,>(store: Store<T>) => useSyncExternalStore(store.subscribe, store.get, store.get);
