import { Sheet } from './Sheet';
import s from './ShortcutsHelp.module.css';

const GROUPS: { title: string; keys: [string[], string][] }[] = [
  {
    title: 'Partout',
    keys: [
      [['N'], 'Nouvelle tâche'],
      [['C'], 'Ajouter un article de courses'],
      [['1', '2', '3'], "Aujourd'hui / Semaine / Plus tard"],
      [['T'], 'Mode clair / sombre'],
      [['?'], 'Cette aide'],
    ],
  },
  {
    title: 'Dans la liste des tâches',
    keys: [
      [['J', 'K'], 'Tâche suivante / précédente'],
      [['X'], 'Cocher / décocher'],
      [['Entrée'], 'Ouvrir le détail'],
      [['F'], 'Focus du jour'],
      [['D'], 'Reporter à demain'],
      [['Suppr'], 'Supprimer (ou passer une occurrence)'],
    ],
  },
  {
    title: 'Panneau de détail',
    keys: [
      [['F'], 'Focus du jour'],
      [['Échap'], 'Fermer'],
    ],
  },
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Raccourcis clavier" onClose={onClose}>
      {GROUPS.map((g) => (
        <section key={g.title} className={s.group}>
          <h3 className={s.h}>{g.title}</h3>
          <dl className={s.list}>
            {g.keys.map(([keys, label]) => (
              <div key={label} className={s.item}>
                <dt>
                  {keys.map((k) => (
                    <kbd key={k} className={s.kbd}>
                      {k}
                    </kbd>
                  ))}
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className={s.tip}>Sur téléphone : glisse une tâche vers la droite pour la cocher, vers la gauche pour la reporter à demain.</p>
    </Sheet>
  );
}
