import { USER_NAME } from '../config';
import { greeting, longDate, useToday } from '../lib/dates';
import { useShortcut } from '../lib/shortcuts';
import { useTheme } from '../lib/theme';
import s from './Header.module.css';

export function Header() {
  useToday(); // re-rendu à minuit pour mettre la date à jour
  const { theme, toggle } = useTheme();
  useShortcut('t', toggle);
  const toDark = theme === 'light';

  return (
    <header className={s.header}>
      <div>
        <h1 className={s.greeting}>
          {greeting()} {USER_NAME}
        </h1>
        <p className={s.date}>{longDate()}</p>
      </div>
      <button
        type="button"
        className={s.themeBtn}
        onClick={toggle}
        aria-label={toDark ? 'Passer en mode sombre' : 'Passer en mode clair'}
        title={`${toDark ? 'Mode sombre' : 'Mode clair'} (T)`}
      >
        {toDark ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
          </svg>
        )}
      </button>
    </header>
  );
}
