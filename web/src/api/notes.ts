import type { Note } from '@fluo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

const KEY = ['notes'] as const;

export const useNote = () => useQuery({ queryKey: KEY, queryFn: () => api<Note>('/notes') });

export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api<Note>('/notes', { method: 'PUT', json: { content } }),
    meta: { silent: true },
    onSuccess: (note) => qc.setQueryData(KEY, note),
  });
}

/** Envoi de secours à la fermeture de l'onglet (la requête survit au déchargement de la page). */
export function saveNoteOnExit(content: string) {
  fetch('/api/notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    keepalive: true,
  });
}
