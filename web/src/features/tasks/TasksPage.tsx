import { isOverdue, viewOfDate } from '@fluo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { byPosition, pendingDeletes, useAllTasks } from '../../api/tasks';
import { CategoryFilter } from '../../components/CategoryFilter';
import { CategoryManager } from '../../components/CategoryManager';
import { FocusStrip } from '../../components/FocusStrip';
import { ViewTabs } from '../../components/ViewTabs';
import { useToday } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { categoryFilterStore, type ViewKey, viewStore } from '../../lib/uiState';
import { LaterView } from './LaterView';
import { TodayView } from './TodayView';
import { useTaskKeyboard } from './useTaskKeyboard';
import { WeekView } from './WeekView';

export function TasksPage() {
  const today = useToday();
  const qc = useQueryClient();
  const view = useStore(viewStore);
  const filter = useStore(categoryFilterStore);
  const deleting = useStore(pendingDeletes);
  const { data, isPending, isError, refetch } = useAllTasks();
  const [managing, setManaging] = useState(false);
  useTaskKeyboard(today);

  // Changement de jour : les tâches de demain deviennent celles d'aujourd'hui.
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
  }, [today, qc]);

  const tasks = useMemo(
    () =>
      (data ?? [])
        .filter((t) => !deleting.has(t.id) && (filter === null || t.categoryId === filter))
        .sort(byPosition),
    [data, deleting, filter],
  );

  // Le focus ignore le filtre de catégorie : c'est la priorité de la journée entière.
  const allSorted = useMemo(
    () => (data ?? []).filter((t) => !deleting.has(t.id)).sort(byPosition),
    [data, deleting],
  );

  const counts: Record<ViewKey, number> = { today: 0, week: 0, later: 0 };
  let overdue = 0;
  for (const t of tasks) {
    if (t.completedAt) continue;
    counts[viewOfDate(t.dueDate, today)]++;
    if (isOverdue(t, today)) overdue++;
  }

  // Onglet du navigateur : « (3) Fluo » s'il reste des tâches pour aujourd'hui
  const todayLeft = allSorted.filter((t) => !t.completedAt && viewOfDate(t.dueDate, today) === 'today').length;
  useEffect(() => {
    document.title = todayLeft > 0 ? `(${todayLeft}) Fluo` : 'Fluo';
  }, [todayLeft]);

  const status = { isPending, isError, retry: () => void refetch() };
  const props = { tasks, today, status };

  return (
    <>
      {!isPending && !isError && <FocusStrip tasks={allSorted} today={today} />}
      <ViewTabs counts={counts} overdue={overdue} />
      <CategoryFilter onManage={() => setManaging(true)} />
      {view === 'today' && <TodayView {...props} />}
      {view === 'week' && <WeekView {...props} />}
      {view === 'later' && <LaterView {...props} />}
      {managing && <CategoryManager onClose={() => setManaging(false)} />}
    </>
  );
}
