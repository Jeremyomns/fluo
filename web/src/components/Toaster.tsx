import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { toast, toastStore } from '../lib/toast';
import s from './Toaster.module.css';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/** Confirmations discrètes en bas d'écran, avec action facultative (« Annuler »). */
export function Toaster() {
  const toasts = useStore(toastStore);
  const ref = useRef<HTMLDivElement>(null);

  // En « popover », la zone passe dans la couche supérieure du navigateur :
  // les toasts restent visibles même au-dessus d'un panneau ouvert.
  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsPopover) return;
    if (el.matches(':popover-open')) el.hidePopover(); // ré-afficher = repasser au premier plan
    if (toasts.length) el.showPopover();
  }, [toasts]);

  return (
    <div ref={ref} className={s.region} role="status" aria-live="polite" popover={supportsPopover ? 'manual' : undefined}>
      {toasts.map((t) => (
        <div key={t.id} className={`${s.toast} ${t.tone === 'error' ? s.error : ''}`}>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className={s.action}
              onClick={() => {
                t.action!.onClick();
                toast.dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
