import { buildApp } from './app.js';
import { env } from './config/env.js';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runAppMigrations } from './db/index.js';

const appDbPath = resolve(env.STORAGE_DIR, 'app.sqlite');
mkdirSync(dirname(appDbPath), { recursive: true });
const sqlite = new Database(appDbPath);
sqlite.pragma('journal_mode = WAL');
runAppMigrations(sqlite);
sqlite.close();

const app = await buildApp();
try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
