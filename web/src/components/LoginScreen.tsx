import { type FormEvent, useEffect, useRef, useState } from 'react';
import { authConfigured, supabase } from '../lib/auth';
import s from './LoginScreen.module.css';
import { Ribbon } from './Ribbon';

const EMAIL_KEY = 'fluo:email';
const RESEND_DELAY = 60; // secondes

/** Traduit les erreurs de Supabase Auth en messages clairs. */
function frenchError(err: { message?: string; status?: number; code?: string }): string {
  const m = (err.message ?? '').toLowerCase();
  if (err.status === 429 || m.includes('rate limit') || m.includes('security purposes'))
    return 'Trop de demandes rapprochées : patiente une minute avant de redemander un code.';
  if (m.includes('signups not allowed') || err.code === 'otp_disabled' || m.includes('user not found'))
    return "Cette adresse n'a pas accès à Fluo.";
  if (m.includes('expired') || m.includes('invalid') || err.code === 'otp_expired')
    return 'Code incorrect ou expiré. Vérifie-le, ou demande un nouveau code.';
  if (m.includes('fetch') || m.includes('network')) return 'Connexion impossible. Vérifie ta connexion Internet.';
  return err.message || 'Une erreur est survenue. Réessaie.';
}

const savedEmail = () => {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
};

export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(savedEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!supabase || !email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      // shouldCreateUser: false → impossible de créer un compte depuis Fluo ; seuls les comptes existants reçoivent un code.
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setError(frenchError(error));
    try {
      localStorage.setItem(EMAIL_KEY, address);
    } catch {
      /* navigation privée */
    }
    setEmail(address);
    setCode('');
    setStep('code');
    setWait(RESEND_DELAY);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || busy) return;
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return setError('Le code contient au moins 6 chiffres.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (error) setError(frenchError(error));
    // en cas de succès, la session change et l'application s'affiche toute seule
  };

  return (
    <div className={s.page}>
      <Ribbon />
      <main className={s.wrap}>
        <h1 className={s.brand}>
          Fluo<span className={s.dot}>.</span>
        </h1>
        <p className={s.tagline}>L'organisation perso du quotidien.</p>

        <section className={s.card} aria-labelledby="login-title">
          {!authConfigured ? (
            <>
              <h2 id="login-title" className={s.title}>
                Configuration incomplète
              </h2>
              <p className={s.text}>
                Les réglages Supabase (<code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>) sont
                absents. Ajoute-les dans le fichier <code>.env</code> ou dans les variables d'environnement Vercel.
              </p>
            </>
          ) : step === 'email' ? (
            <form onSubmit={sendCode}>
              <h2 id="login-title" className={s.title}>
                Connexion
              </h2>
              <p className={s.text}>Indique ton adresse : tu vas recevoir un e-mail avec un lien et un code de connexion.</p>
              <label className={s.label} htmlFor="login-email">
                Adresse e-mail
              </label>
              <input
                id="login-email"
                className={s.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.fr"
                required
                autoFocus
              />
              <button type="submit" className={s.primary} disabled={busy || !email.trim()}>
                {busy ? 'Envoi…' : 'Recevoir mon code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <h2 id="login-title" className={s.title}>
                Vérifie tes e-mails
              </h2>
              <p className={s.text}>
                Un e-mail vient de partir à <strong>{email}</strong>. Clique sur son lien, ou tape le code qu'il contient :
              </p>
              <label className={s.label} htmlFor="login-code">
                Code de connexion
              </label>
              <input
                ref={codeRef}
                id="login-code"
                className={`${s.input} ${s.code}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={12}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
              <button type="submit" className={s.primary} disabled={busy}>
                {busy ? 'Vérification…' : 'Se connecter'}
              </button>
              <div className={s.secondaryRow}>
                <button type="button" className={s.link} onClick={() => sendCode()} disabled={wait > 0 || busy}>
                  {wait > 0 ? `Renvoyer un code (${wait} s)` : 'Renvoyer un code'}
                </button>
                <button
                  type="button"
                  className={s.link}
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                >
                  Changer d'adresse
                </button>
              </div>
            </form>
          )}
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
