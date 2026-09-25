import { createStore } from './store';

export interface ToastItem {
  id: number;
  message: string;
  tone?: 'default' | 'error';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export const toastStore = createStore<ToastItem[]>([]);
let seq = 0;

export const toast = {
  show(t: Omit<ToastItem, 'id'>) {
    const id = ++seq;
    toastStore.set((list) => [...list.slice(-2), { ...t, id }]); // 3 toasts max à l'écran
    window.setTimeout(() => toast.dismiss(id), t.duration ?? 3500);
    return id;
  },
  dismiss(id: number) {
    toastStore.set((list) => list.filter((t) => t.id !== id));
  },
};
