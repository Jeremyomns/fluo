import type { ReactNode } from 'react';
import s from './views.module.css';

export interface LoadStatus {
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

interface Props {
  status: LoadStatus;
  /** Message affiché quand la vue est vide (null = la vue a du contenu). */
  empty: { title: string; text?: string } | null;
  children: ReactNode;
}

/** Gère chargement, erreur et état vide pour toutes les vues. */
export function ViewBody({ status, empty, children }: Props) {
  if (status.isPending)
    return (
      <div className={s.skeleton} aria-label="Chargement">
        <span />
        <span />
        <span />
      </div>
    );
  if (status.isError)
    return (
      <div className={s.state}>
        <p className={s.stateTitle}>Le serveur ne répond pas.</p>
        <p>Vérifie que le dashboard tourne dans ton terminal, puis réessaie.</p>
        <button type="button" className={s.retry} onClick={status.retry}>
          Réessayer
        </button>
      </div>
    );
  if (empty)
    return (
      <div className={s.state}>
        <p className={s.stateTitle}>{empty.title}</p>
        {empty.text && <p>{empty.text}</p>}
      </div>
    );
  return <>{children}</>;
}
