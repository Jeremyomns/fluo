import { describeRule, FOCUS_MAX, parseQuickAdd, viewOfDate } from '@fluo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useMemo, useRef, useState } from 'react';
import { useCategories, useCategoryMap } from '../api/categories';
import { openFocusCount, useCreateTask } from '../api/tasks';
import { dueLabel, shortDate } from '../lib/dates';
import { useShortcut } from '../lib/shortcuts';
import { useStore } from '../lib/store';
import { toast } from '../lib/toast';
import { categoryFilterStore, VIEW_LABELS, viewStore } from '../lib/uiState';
import s from './QuickAdd.module.css';

interface Props {
  today: string;
  /** Échéance si aucune date n'est tapée (null = sans date). */
  defaultDueDate: string | null;
  placeholder: string;
}

const PRIORITY_LABELS = { 1: 'Priorité haute', 2: 'Priorité normale', 3: 'Priorité basse' } as const;

export function QuickAdd({ today, defaultDueDate, placeholder }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreateTask();
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const categoryMap = useCategoryMap();
  const view = useStore(viewStore);
  const filter = useStore(categoryFilterStore);

  useShortcut('n', () => inputRef.current?.focus());

  const parsed = useMemo(() => parseQuickAdd(value, today, categories), [value, today, categories]);
  const parsedCategory = parsed.categoryId ? categoryMap.get(parsed.categoryId) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.title) return;
    const dueDate = parsed.dueDate ?? defaultDueDate;
    const categoryId = parsed.categoryId ?? filter; // un filtre actif sert de catégorie par défaut
    let focus = parsed.focus;
    if (focus && openFocusCount(qc) >= FOCUS_MAX) {
      focus = false;
      toast.show({ message: `Focus complet (${FOCUS_MAX} tâches) : ajoutée sans épingle.`, tone: 'error' });
    }
    create.mutate({ title: parsed.title, dueDate, priority: parsed.priority, categoryId, recurrence: parsed.recurrence, focus });
    setValue(''); // le champ reste actif pour enchaîner les ajouts

    // Si la tâche atterrit hors de ce qui est affiché, on le dit et on propose d'y aller.
    const target = viewOfDate(dueDate, today);
    const hiddenByFilter = filter !== null && categoryId !== filter;
    if (target !== view || hiddenByFilter) {
      const when = dueDate ? ` (${dueLabel(dueDate, today)})` : '';
      toast.show({
        message: `Ajoutée dans ${VIEW_LABELS[target]}${when}`,
        action: {
          label: 'Voir',
          onClick: () => {
            viewStore.set(target);
            if (hiddenByFilter) categoryFilterStore.set(null);
          },
        },
      });
    }
  };

  const chips: string[] = [];
  if (parsed.focus) chips.push('★ Focus du jour');
  if (parsed.recurrence) chips.push(`↻ ${describeRule(parsed.recurrence)}`);
  if (parsed.dueDate) chips.push(`📅 ${shortDate(parsed.dueDate)} · ${dueLabel(parsed.dueDate, today)}`);
  if (parsed.priority) chips.push(PRIORITY_LABELS[parsed.priority]);
  if (parsedCategory) chips.push(`${parsedCategory.emoji} ${parsedCategory.name}`);

  return (
    <div className={s.wrap}>
      <form className={s.form} onSubmit={submit}>
        <svg className={s.plus} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          className={s.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          placeholder={placeholder}
          aria-label="Nouvelle tâche"
          aria-describedby="quickadd-hint"
          autoComplete="off"
          enterKeyHint="enter"
          maxLength={500}
        />
        <kbd className={s.kbd} aria-hidden="true">
          {focused ? (value.trim() ? 'Entrée' : 'Échap') : 'N'}
        </kbd>
      </form>
      <div id="quickadd-hint" className={s.hint} aria-live="polite">
        {chips.length > 0 ? (
          chips.map((c) => (
            <span key={c} className={s.chip}>
              {c}
            </span>
          ))
        ) : focused && !value ? (
          <span className={s.help}>
            Astuce : « demain », « lundi », « 12/10 », « chaque mardi », <b>!haute</b>, <b>#maison</b>, <b>*</b> pour le focus
          </span>
        ) : null}
      </div>
    </div>
  );
}
