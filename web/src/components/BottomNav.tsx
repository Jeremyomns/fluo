import type { ReactNode } from 'react';
import { useShoppingItems } from '../api/shopping';
import { useStore } from '../lib/store';
import { type SectionKey, sectionStore } from '../lib/uiState';
import s from './BottomNav.module.css';

const ICONS: Record<SectionKey, ReactNode> = {
  tasks: <path d="M4 12.5l4.5 4.5L20 5.5M4 20h16" />,
  habits: <path d="M12 3c.8 3.3 5 5.3 5 10a5 5 0 0 1-10 0c0-2.6 1.5-4 2.6-5.3.3 1.6 1 2.6 2.1 3.1.6-2.9-.1-5.3.3-7.8z" />,
  shopping: (
    <>
      <path d="M3.5 5h2.2l2 10.5h10.6l2-7.5H7" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </>
  ),
  notes: <path d="M6 3.5h9l4 4v13H6zM14.5 3.5V8H19M9 12h7M9 16h5" />,
};
const LABELS: Record<SectionKey, string> = { tasks: 'Tâches', habits: 'Habitudes', shopping: 'Courses', notes: 'Notes' };

/** Barre d'onglets du bas (mobile et tablette). */
export function BottomNav() {
  const section = useStore(sectionStore);
  const { data: items = [] } = useShoppingItems();
  const toBuy = items.filter((i) => !i.checked).length;

  return (
    <nav className={s.nav} aria-label="Sections">
      {(Object.keys(LABELS) as SectionKey[]).map((key) => (
        <button key={key} type="button" className={s.item} aria-current={section === key ? 'page' : undefined} onClick={() => sectionStore.set(key)}>
          <span className={s.iconWrap}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[key]}
            </svg>
            {key === 'shopping' && toBuy > 0 && <span className={s.badge}>{toBuy}</span>}
          </span>
          {LABELS[key]}
        </button>
      ))}
    </nav>
  );
}
