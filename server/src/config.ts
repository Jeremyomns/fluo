import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_TIMEZONE } from '@fluo/shared';

const root = fileURLToPath(new URL('../../', import.meta.url));

// Tout est surchargeable par variable d'environnement.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  // 127.0.0.1 = accessible uniquement depuis cet ordinateur. HOST=0.0.0.0 pour le réseau local (étape 6).
  host: process.env.HOST ?? '127.0.0.1',
  timezone: process.env.APP_TZ ?? APP_TIMEZONE,
  dataDir: process.env.DATA_DIR ?? path.join(root, 'data'),
  webDist: path.join(root, 'web', 'dist'),
  migrationsDir: path.join(root, 'server', 'drizzle'),
};
