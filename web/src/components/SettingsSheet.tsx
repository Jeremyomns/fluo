import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type ChangeEvent, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Sheet } from './Sheet';
import s from './SettingsSheet.module.css';

interface Preview {
  fileName: string;
  exportedAt: string;
  counts: Record<string, number>;
  payload: unknown;
}

const LABELS: Record<string, [string, string]> = {
  tasks: ['tâche', 'tâches'],
  habits: ['habitude', 'habitudes'],
  weeklyGoals: ['objectif', 'objectifs'],
  shoppingItems: ['article de courses', 'articles de courses'],
  categories: ['catégorie', 'catégories'],
};
const summary = (counts: Record<string, number>) =>
  Object.entries(LABELS)
    .map(([k, [one, many]]) => `${counts[k] ?? 0} ${(counts[k] ?? 0) > 1 ? many : one}`)
    .join(', ');

/** Sauvegarde (export JSON) et restauration (import) de toutes les données. */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-choisir le même fichier
    setError(null);
    setPreview(null);
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.app !== 'fluo' || !payload.data) throw new Error();
      setPreview({ fileName: file.name, exportedAt: payload.exportedAt, counts: payload.counts ?? {}, payload });
    } catch {
      setError("Ce fichier n'est pas une sauvegarde Fluo.");
    }
  };

  const restore = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await api('/import', { method: 'POST', json: preview.payload });
      await qc.invalidateQueries(); // tout recharger
      toast.show({ message: 'Sauvegarde restaurée' });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Sauvegarde et réglages" onClose={onClose}>
      <section className={s.block}>
        <h3 className={s.h}>Exporter mes données</h3>
        <p className={s.p}>
          Un fichier JSON avec tout ce que contient Fluo : tâches, récurrences, courses, notes, habitudes et objectifs. Garde-le en lieu sûr (cloud, disque externe).
        </p>
        <a className={s.primary} href="/api/export" download>
          Télécharger la sauvegarde
        </a>
      </section>

      <section className={s.block}>
        <h3 className={s.h}>Restaurer une sauvegarde</h3>
        <p className={s.p}>Remplace toutes les données actuelles par celles du fichier. Une copie de la base actuelle est conservée sur le serveur au cas où.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={pick} hidden />
        {!preview && (
          <button type="button" className={s.secondary} onClick={() => fileRef.current?.click()}>
            Choisir un fichier…
          </button>
        )}
        {preview && (
          <div className={s.preview}>
            <p className={s.p}>
              <strong>{preview.fileName}</strong>
              {preview.exportedAt && <> · du {format(parseISO(preview.exportedAt), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</>}
              <br />
              {summary(preview.counts)}
            </p>
            <p className={s.warn}>Tes données actuelles seront remplacées.</p>
            <div className={s.row}>
              <button type="button" className={s.danger} onClick={restore} disabled={busy}>
                {busy ? 'Restauration…' : 'Remplacer mes données'}
              </button>
              <button type="button" className={s.secondary} onClick={() => setPreview(null)} disabled={busy}>
                Annuler
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </section>
    </Sheet>
  );
}
