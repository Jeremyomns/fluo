import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './styles/global.css';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LoginScreen } from './components/LoginScreen';
import { authDisabled, useAuth } from './lib/auth';
import { toast } from './lib/toast';

const queryClient = new QueryClient({
  defaultOptions: {
    // refetchOnWindowFocus : revenir sur l'onglet (ou le téléphone) resynchronise les données.
    queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: true },
  },
  // Toute action qui échoue affiche un message ; l'état optimiste est annulé dans chaque hook.
  mutationCache: new MutationCache({
    // meta.silent : l'erreur est déjà affichée autrement (ex. statut d'enregistrement des notes)
    onError: (err, _v, _c, mutation) => {
      if (!mutation.meta?.silent) toast.show({ message: err.message, tone: 'error' });
    },
  }),
});

/** Affiche Fluo une fois connecté, sinon l'écran de connexion. */
function AuthGate() {
  const auth = useAuth();
  if (authDisabled) return <App />;
  if (auth.status === 'loading') return null; // session en cours de lecture : un instant
  if (auth.status === 'signedOut') {
    queryClient.clear(); // rien ne reste en mémoire après une déconnexion
    return <LoginScreen />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  </StrictMode>,
);
