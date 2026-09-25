import { useShortcut } from '../lib/shortcuts';
import { useStore } from '../lib/store';
import { helpOpenStore, settingsOpenStore } from '../lib/uiState';
import s from './Footer.module.css';
import { SettingsSheet } from './SettingsSheet';
import { ShortcutsHelp } from './ShortcutsHelp';

/** Pied de page discret : sauvegarde et aide des raccourcis. */
export function Footer() {
  const settings = useStore(settingsOpenStore);
  const help = useStore(helpOpenStore);
  useShortcut('?', () => helpOpenStore.set(true));

  return (
    <>
      <footer className={s.footer}>
        <button type="button" className={s.link} onClick={() => settingsOpenStore.set(true)}>
          Sauvegarde et réglages
        </button>
        <button type="button" className={`${s.link} ${s.desktop}`} onClick={() => helpOpenStore.set(true)}>
          Raccourcis clavier <kbd className={s.kbd}>?</kbd>
        </button>
      </footer>
      {settings && <SettingsSheet onClose={() => settingsOpenStore.set(false)} />}
      {help && <ShortcutsHelp onClose={() => helpOpenStore.set(false)} />}
    </>
  );
}
