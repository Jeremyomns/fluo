import { createStore } from './store';

// État d'interface partagé entre composants éloignés (pas besoin d'un gestionnaire d'état complet).
export type ViewKey = 'today' | 'week' | 'later';

export const VIEW_LABELS: Record<ViewKey, string> = {
  today: "Aujourd'hui",
  week: 'Semaine',
  later: 'Plus tard',
};

export const viewStore = createStore<ViewKey>('today');
export const categoryFilterStore = createStore<string | null>(null);
/** Tâche ouverte dans le panneau de détail. */
export const openTaskStore = createStore<string | null>(null);

/** Section affichée sur mobile (barre d'onglets du bas). */
export type SectionKey = 'tasks' | 'habits' | 'shopping' | 'notes';
export const sectionStore = createStore<SectionKey>('tasks');

/** Demande de focus sur le champ d'ajout des courses (raccourci C). */
export const focusShoppingStore = createStore(false);

/** Panneaux ouverts depuis le pied de page ou un raccourci. */
export const settingsOpenStore = createStore(false);
export const helpOpenStore = createStore(false);
