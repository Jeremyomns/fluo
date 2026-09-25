import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '@fluo/shared';
import { useCategoryMap } from '../api/categories';
import { useTaskActions } from '../api/taskActions';
import { isTemp, useReorderTasks } from '../api/tasks';
import { TaskItem } from './TaskItem';
import s from './TaskList.module.css';

interface Props {
  tasks: Task[];
  today: string;
  /** Glisser-déposer autorisé (groupes triés manuellement uniquement). */
  sortable?: boolean;
  /** Afficher l'échéance sur chaque ligne (inutile quand le groupe est déjà un jour). */
  showDate?: boolean;
}

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const a11y = {
  screenReaderInstructions: {
    draggable:
      'Pour déplacer la tâche, appuie sur Espace, utilise les flèches haut et bas, puis Espace pour déposer ou Échap pour annuler.',
  },
  announcements: {
    onDragStart: () => 'Tâche saisie.',
    onDragOver: ({ over }: { over: unknown }) => (over ? 'Nouvelle position.' : 'Hors de la liste.'),
    onDragEnd: ({ over }: { over: unknown }) => (over ? 'Tâche déposée.' : 'Déplacement annulé.'),
    onDragCancel: () => 'Déplacement annulé.',
  },
};

export function TaskList({ tasks, today, sortable = true, showDate = true }: Props) {
  const categories = useCategoryMap();
  const reorder = useReorderTasks();
  const actions = useTaskActions(today);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), // un simple clic reste un clic
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }), // appui long
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = tasks.map((t) => t.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    reorder.mutate(next.filter((id) => !id.startsWith('tmp-')));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={onDragEnd} accessibility={a11y}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={s.list}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              today={today}
              category={task.categoryId ? categories.get(task.categoryId) : undefined}
              draggable={sortable && !isTemp(task)}
              showDate={showDate}
              onToggle={(completed) => actions.toggle(task, completed)}
              onPostpone={() => actions.postpone(task)}
              onFocus={() => actions.toggleFocus(task)}
              onDelete={() => actions.remove(task)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
