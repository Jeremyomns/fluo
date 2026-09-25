import type { CSSProperties } from 'react';
import { useCategories } from '../api/categories';
import { useStore } from '../lib/store';
import { categoryFilterStore } from '../lib/uiState';
import s from './CategoryFilter.module.css';

export function CategoryFilter({ onManage }: { onManage: () => void }) {
  const { data: categories = [] } = useCategories();
  const active = useStore(categoryFilterStore);

  return (
    <div className={s.row} role="group" aria-label="Filtrer par catégorie">
      <button type="button" className={s.chip} aria-pressed={active === null} onClick={() => categoryFilterStore.set(null)}>
        Toutes
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={s.chip}
          aria-pressed={active === c.id}
          style={{ '--cat': c.color } as CSSProperties}
          onClick={() => categoryFilterStore.set(active === c.id ? null : c.id)}
        >
          <span aria-hidden="true">{c.emoji}</span> {c.name}
        </button>
      ))}
      <button type="button" className={`${s.chip} ${s.manage}`} onClick={onManage} aria-label="Gérer les catégories" title="Gérer les catégories">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>
    </div>
  );
}
