import { useShortcut } from '../lib/shortcuts';
import { useStore } from '../lib/store';
import { VIEW_LABELS, type ViewKey, viewStore } from '../lib/uiState';
import s from './ViewTabs.module.css';

interface Props {
  counts: Record<ViewKey, number>;
  overdue: number;
}

const ORDER: ViewKey[] = ['today', 'week', 'later'];

export function ViewTabs({ counts, overdue }: Props) {
  const view = useStore(viewStore);
  useShortcut('1', () => viewStore.set('today'));
  useShortcut('2', () => viewStore.set('week'));
  useShortcut('3', () => viewStore.set('later'));

  return (
    <nav className={s.tabs} aria-label="Vues">
      {ORDER.map((key, i) => (
        <button
          key={key}
          type="button"
          className={s.tab}
          aria-current={view === key ? 'page' : undefined}
          onClick={() => viewStore.set(key)}
          title={`${VIEW_LABELS[key]} (${i + 1})`}
        >
          {VIEW_LABELS[key]}
          {counts[key] > 0 && (
            <span className={`${s.count} ${key === 'today' && overdue > 0 ? s.alert : ''}`}>
              {counts[key]}
              {key === 'today' && overdue > 0 && <span className="sr-only"> dont {overdue} en retard</span>}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
