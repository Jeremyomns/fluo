import { type ShoppingItem, shoppingKey } from '@fluo/shared';
import { type FormEvent, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useShoppingHistory, useShoppingItems, useShoppingMutations } from '../api/shopping';
import { useStore } from '../lib/store';
import { focusShoppingStore } from '../lib/uiState';
import s from './ShoppingList.module.css';

export function ShoppingList() {
  const { data: items = [], isPending, isError, refetch } = useShoppingItems();
  const { data: history = [] } = useShoppingHistory();
  const { add, update, remove, clearChecked, forget } = useShoppingMutations();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const wantFocus = useStore(focusShoppingStore);

  // Raccourci C : focus sur le champ d'ajout
  useEffect(() => {
    if (!wantFocus) return;
    inputRef.current?.focus();
    focusShoppingStore.set(false);
  }, [wantFocus]);

  const toBuy = items.filter((i) => !i.checked);
  const inCart = items.filter((i) => i.checked);
  const inList = useMemo(() => new Set(toBuy.map((i) => i.key)), [toBuy]);

  // Suggestions : articles déjà achetés contenant la saisie, ceux qui commencent par elle d'abord.
  const q = shoppingKey(value);
  const suggestions = q
    ? history
        .filter((h) => !inList.has(h.key) && h.key.includes(q))
        .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)))
        .slice(0, 6)
    : [];
  // Habituels : achetés au moins 2 fois et absents de la liste (ni à acheter, ni déjà dans le panier)
  const allKeys = new Set(items.map((i) => i.key));
  const frequent = history.filter((h) => !allKeys.has(h.key) && h.useCount >= 2).slice(0, 8);
  const open = focused && suggestions.length > 0;

  const addItem = (name: string) => {
    if (!name.trim()) return;
    add.mutate(name.trim());
    setValue('');
    setActive(-1);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    addItem(active >= 0 && suggestions[active] ? suggestions[active].label : value);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Escape') {
      if (value) setValue('');
      else e.currentTarget.blur();
      setActive(-1);
    }
  };

  const toggle = (item: ShoppingItem) => {
    if (item.id.startsWith('tmp-')) return;
    update.mutate({ id: item.id, patch: { checked: !item.checked } });
  };

  return (
    <section aria-labelledby="shopping-title">
      <div className={s.head}>
        <h2 id="shopping-title" className={s.title}>
          Courses
        </h2>
        {toBuy.length > 0 && <span className={s.count}>{toBuy.length} à acheter</span>}
      </div>

      <form className={s.form} onSubmit={submit}>
        <input
          ref={inputRef}
          className={s.input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)} // laisse le temps de cliquer une suggestion
          onKeyDown={onKeyDown}
          placeholder="Ajouter un article"
          aria-label="Ajouter un article"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="enter"
          maxLength={120}
        />
        {open && (
          <ul id={listboxId} role="listbox" className={s.suggestions}>
            {suggestions.map((h, i) => (
              <li key={h.key} className={s.suggestion}>
                <button
                  type="button"
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={s.suggestionPick}
                  onMouseDown={(e) => e.preventDefault()} // garde le focus dans le champ
                  onClick={() => addItem(h.label)}
                >
                  {h.label}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className={s.forget}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => forget.mutate(h.key)}
                  aria-label={`Ne plus proposer « ${h.label} »`}
                  title="Ne plus proposer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {!value && frequent.length > 0 && (
        <div className={s.frequent} role="group" aria-label="Articles habituels">
          {frequent.map((h) => (
            <button key={h.key} type="button" className={s.freqChip} onClick={() => addItem(h.label)}>
              + {h.label}
            </button>
          ))}
        </div>
      )}

      {isPending ? null : isError ? (
        <p className={s.empty}>
          Liste indisponible.{' '}
          <button type="button" className={s.link} onClick={() => refetch()}>
            Réessayer
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className={s.empty}>Ta liste est vide. Les articles que tu ajoutes seront ensuite proposés automatiquement.</p>
      ) : (
        <>
          {toBuy.length > 0 ? (
            <ul className={s.list}>
              {toBuy.map((item) => (
                <Row key={item.id} item={item} onToggle={() => toggle(item)} onRemove={() => remove.mutate(item.id)} />
              ))}
            </ul>
          ) : (
            <p className={s.empty}>Tout est dans le panier.</p>
          )}

          {inCart.length > 0 && (
            <>
              <div className={s.cartHead}>
                <h3 className={s.cartTitle}>Dans le panier ({inCart.length})</h3>
                <button type="button" className={s.clear} onClick={() => clearChecked(inCart)}>
                  Vider le panier
                </button>
              </div>
              <ul className={`${s.list} ${s.cart}`}>
                {inCart.map((item) => (
                  <Row key={item.id} item={item} onToggle={() => toggle(item)} onRemove={() => remove.mutate(item.id)} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function Row({ item, onToggle, onRemove }: { item: ShoppingItem; onToggle: () => void; onRemove: () => void }) {
  // Toute la ligne coche : pratique d'une main au supermarché.
  return (
    <li className={`${s.row} ${item.checked ? s.checked : ''}`}>
      <button type="button" className={s.toggle} onClick={onToggle} role="checkbox" aria-checked={item.checked}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle className={s.ring} cx="12" cy="12" r="9.5" />
          <path className={s.tick} d="M7.8 12.4l2.8 2.8 5.6-6" />
        </svg>
        <span className={s.name}>{item.name}</span>
      </button>
      <button type="button" className={s.remove} onClick={onRemove} aria-label={`Retirer « ${item.name} »`} title="Retirer">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
