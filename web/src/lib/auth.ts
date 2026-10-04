import { createClient, type Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

// Connexion par e-mail (lien magique ou code à 6 chiffres), gérée par Supabase Auth.
// La session est gardée sur l'appareil et renouvelée automatiquement.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Tests en local uniquement (jamais dans la version en ligne). */
export const authDisabled = import.meta.env.DEV && import.meta.env.VITE_FLUO_AUTH === 'off';
export const authConfigured = !!url && !!key;

export const supabase = authConfigured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// ---------- Session observable ----------
type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; session: Session };
let state: AuthState = authDisabled ? { status: 'signedOut' } : { status: 'loading' };
const subs = new Set<() => void>();
const setState = (next: AuthState) => {
  state = next;
  subs.forEach((f) => f());
};

supabase?.auth.onAuthStateChange((_event, session) => {
  setState(session ? { status: 'signedIn', session } : { status: 'signedOut' });
});
if (!supabase && !authDisabled) setState({ status: 'signedOut' });

export const useAuth = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => state,
  );

/** Jeton d'accès à jour (Supabase le renouvelle s'il expire bientôt). */
export async function accessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/**
 * Le serveur a refusé le jeton (401). Avant de déconnecter, on tente de renouveler la session :
 * au réveil du téléphone, le jeton (valable 1 h) est souvent périmé et le réseau pas encore revenu.
 * Renvoie le nouveau jeton, ou undefined si la session est vraiment perdue.
 */
export async function recoverSession(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.auth.refreshSession();
  if (data.session) return data.session.access_token;
  // Problème de réseau passager : on garde la session, on réessaiera plus tard.
  const transient = !error || error.name === 'AuthRetryableFetchError' || (error.status ?? 0) === 0 || (error.status ?? 0) >= 500;
  if (!transient) await signOut();
  return undefined;
}

/** Version immédiate, pour les envois de dernière seconde à la fermeture de la page. */
export const currentAccessToken = () => (state.status === 'signedIn' ? state.session.access_token : undefined);

/** Déconnecte cet appareil seulement (les autres restent connectés). */
export async function signOut() {
  await supabase?.auth.signOut({ scope: 'local' });
  setState({ status: 'signedOut' });
}
