import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { saveNoteOnExit, useNote, useSaveNote } from '../api/notes';
import s from './NotesPanel.module.css';

type Status = 'saved' | 'dirty' | 'saving' | 'error';
const LABELS: Record<Status, string> = {
  saved: 'Enregistré',
  dirty: 'Modifications en cours…',
  saving: 'Enregistrement…',
  error: 'Échec de l’enregistrement, nouvel essai à la prochaine frappe',
};
const SAVE_DELAY_MS = 700;

/** Bloc-notes libre, enregistré automatiquement pendant la frappe. */
export function NotesPanel({ fill = false }: { fill?: boolean }) {
  const { data, isError } = useNote();
  const save = useSaveNote();
  const [text, setText] = useState<string | null>(null); // null tant que la note n'est pas chargée
  const [status, setStatus] = useState<Status>('saved');
  const latest = useRef<string | null>(null);
  const dirty = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  latest.current = text;

  // Contenu serveur (premier chargement, ou modifié depuis un autre appareil) tant qu'on n'écrit pas.
  useEffect(() => {
    if (data && !dirty.current) setText(data.content);
  }, [data]);

  // Enregistrement après une pause de frappe
  useEffect(() => {
    if (!dirty.current || text === null) return;
    const id = window.setTimeout(() => {
      const sent = text;
      setStatus('saving');
      save.mutate(sent, {
        onSuccess: () => {
          if (latest.current === sent) {
            dirty.current = false;
            setStatus('saved');
          }
        },
        onError: () => setStatus('error'),
      });
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Onglet fermé ou section quittée avant l'enregistrement : envoi de secours.
  useEffect(() => {
    const flush = () => dirty.current && latest.current !== null && saveNoteOnExit(latest.current);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  // Hauteur automatique : la zone grandit avec le texte
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  return (
    <section className={fill ? s.fill : undefined} aria-labelledby="notes-title">
      <div className={s.head}>
        <h2 id="notes-title" className={s.title}>
          Notes
        </h2>
        {text !== null && (
          <span className={`${s.status} ${status === 'error' ? s.error : ''}`} role="status">
            {status === 'saved' && (
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {LABELS[status]}
          </span>
        )}
      </div>
      {isError && text === null ? (
        <p className={s.unavailable}>Notes indisponibles : le serveur ne répond pas.</p>
      ) : (
        <textarea
          ref={areaRef}
          className={s.area}
          value={text ?? ''}
          disabled={text === null}
          onChange={(e) => {
            dirty.current = true;
            setStatus('dirty');
            setText(e.target.value);
          }}
          placeholder="Idées, numéros utiles, codes, choses à ne pas oublier…"
          aria-label="Notes"
          spellCheck
        />
      )}
    </section>
  );
}
