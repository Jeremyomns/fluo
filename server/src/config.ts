import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_TIMEZONE } from '@fluo/shared';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** `npm run reseau` passe --reseau : Fluo devient joignable depuis les autres appareils du Wi-Fi. */
const lan = process.argv.includes('--reseau');

// Tout est surchargeable par variable d'environnement.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  // 127.0.0.1 = accessible uniquement depuis cet ordinateur ; 0.0.0.0 = tout le réseau local.
  host: process.env.HOST ?? (lan ? '0.0.0.0' : '127.0.0.1'),
  timezone: process.env.APP_TZ ?? APP_TIMEZONE,
  dataDir: process.env.DATA_DIR ?? path.join(root, 'data'),
  webDist: path.join(root, 'web', 'dist'),
  migrationsDir: path.join(root, 'server', 'drizzle'),
  /**
   * Les requêtes venant de cet ordinateur n'ont pas besoin de clé.
   * ⚠️ À mettre à "false" si Fluo passe un jour derrière un proxy (Tailscale, Cloudflare…),
   * car toutes les requêtes sembleraient alors venir de l'ordinateur lui-même.
   */
  trustLocalhost: process.env.FLUO_TRUST_LOCALHOST !== 'false',
};

export const isLanMode = () => !['127.0.0.1', 'localhost', '::1'].includes(config.host);
