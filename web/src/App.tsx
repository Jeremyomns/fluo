import s from './App.module.css';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { GoalsPanel } from './components/GoalsPanel';
import { HabitsPanel } from './components/HabitsPanel';
import { Header } from './components/Header';
import { NotesPanel } from './components/NotesPanel';
import { Ribbon } from './components/Ribbon';
import { ShoppingList } from './components/ShoppingList';
import { TaskDetail } from './components/TaskDetail';
import { Toaster } from './components/Toaster';
import { TasksPage } from './features/tasks/TasksPage';
import { useShortcut } from './lib/shortcuts';
import { useStore } from './lib/store';
import { focusShoppingStore, sectionStore } from './lib/uiState';
import { useMediaQuery, WIDE } from './lib/useMediaQuery';

export function App() {
  const wide = useMediaQuery(WIDE);
  const section = useStore(sectionStore);

  // C : aller aux courses et écrire directement un article
  useShortcut('c', () => {
    if (!wide) sectionStore.set('shopping');
    focusShoppingStore.set(true);
  });

  return (
    <div className={s.shell}>
      <Ribbon />
      <Header />
      {wide ? (
        // Ordinateur : tâches à gauche, courses et notes toujours visibles à droite
        <div className={s.columns}>
          <main>
            <TasksPage />
          </main>
          <aside className={s.aside} aria-label="Semaine, courses et notes">
            <GoalsPanel />
            <HabitsPanel />
            <ShoppingList />
            <NotesPanel />
          </aside>
        </div>
      ) : (
        // Mobile / tablette : une section à la fois, onglets en bas
        <>
          <main>
            {section === 'tasks' && <TasksPage />}
            {section === 'habits' && (
              <div className={s.stack}>
                <GoalsPanel />
                <HabitsPanel />
              </div>
            )}
            {section === 'shopping' && <ShoppingList />}
            {section === 'notes' && <NotesPanel fill />}
          </main>
          <BottomNav />
        </>
      )}
      <Footer />
      <TaskDetail />
      <Toaster />
    </div>
  );
}
