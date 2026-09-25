import { type ReactNode, useEffect, useId, useRef } from 'react';
import s from './Sheet.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Panneau modal : tiroir à droite sur ordinateur, feuille du bas sur mobile.
 * Basé sur <dialog> : focus piégé, Échap et fond gérés par le navigateur.
 */
export function Sheet({ title, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    // Focus sur « Fermer » plutôt que sur un champ : évite d'ouvrir le clavier sur mobile.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && close()} // clic sur le fond
    >
      <div className={s.inner}>
        <header className={s.head}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <button type="button" className={s.close} onClick={close} aria-label="Fermer" data-autofocus>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className={s.body}>{children}</div>
        {footer && <footer className={s.foot}>{footer}</footer>}
      </div>
    </dialog>
  );
}
