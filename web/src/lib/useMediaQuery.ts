import { useSyncExternalStore } from 'react';

/** Suit une media query CSS (ex. largeur d'écran) et re-rend quand elle change. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => matchMedia(query).matches,
  );
}

/** Ordinateur : tâches + colonne latérale. En dessous : onglets en bas d'écran. */
export const WIDE = '(min-width: 1024px)';
