import type { Category } from '@fluo/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { useCategories, useCategoryMutations } from '../api/categories';
import { categoryFilterStore } from '../lib/uiState';
import s from './CategoryManager.module.css';
import { Sheet } from './Sheet';

const PALETTE = ['#B7791F', '#3B6FB6', '#2E8A6B', '#8A4FBF', '#C2410C', '#BE185D', '#0E7490', '#687082'];

export function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const { create } = useCategoryMutations();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name, emoji, color: PALETTE[categories.length % PALETTE.length] });
    setName('');
    setEmoji('');
  };

  return (
    <Sheet title="Catégories" onClose={onClose}>
      <ul className={s.list}>
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </ul>

      <form className={s.add} onSubmit={add}>
        <input className={s.emoji} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🙂" maxLength={8} aria-label="Emoji" />
        <input className={s.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie" maxLength={40} aria-label="Nom de la catégorie" />
        <button type="submit" className={s.addBtn} disabled={!name.trim()}>
          Ajouter
        </button>
      </form>
      <p className={s.help}>Supprimer une catégorie ne supprime pas ses tâches : elles passent « sans catégorie ».</p>
    </Sheet>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const { update, remove } = useCategoryMutations();
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);
  const [color, setColor] = useState(category.color);
  const [confirming, setConfirming] = useState(false);

  const save = () => {
    const patch: Partial<Category> = {};
    if (name.trim() && name.trim() !== category.name) patch.name = name.trim();
    if (emoji.trim() !== category.emoji) patch.emoji = emoji.trim();
    if (Object.keys(patch).length) update.mutate({ id: category.id, patch });
  };

  // Le sélecteur de couleur émet en continu : on enregistre après une courte pause.
  useEffect(() => {
    if (color === category.color) return;
    const id = window.setTimeout(() => update.mutate({ id: category.id, patch: { color } }), 400);
    return () => window.clearTimeout(id);
  }, [color]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le bouton « Confirmer » redevient « Supprimer » après 3 s.
  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(id);
  }, [confirming]);

  const onDelete = () => {
    if (!confirming) return setConfirming(true);
    if (categoryFilterStore.get() === category.id) categoryFilterStore.set(null);
    remove.mutate(category.id);
  };

  return (
    <li className={s.row}>
      <input
        type="color"
        className={s.color}
        value={color}
        onChange={(e) => setColor(e.target.value)}
        aria-label={`Couleur de ${category.name}`}
      />
      <input className={s.emoji} value={emoji} onChange={(e) => setEmoji(e.target.value)} onBlur={save} maxLength={8} aria-label={`Emoji de ${category.name}`} />
      <input
        className={s.name}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        maxLength={40}
        aria-label="Nom"
      />
      <button type="button" className={`${s.delete} ${confirming ? s.confirm : ''}`} onClick={onDelete}>
        {confirming ? 'Confirmer' : 'Supprimer'}
      </button>
    </li>
  );
}
