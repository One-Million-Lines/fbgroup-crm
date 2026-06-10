import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env.js';
import { runAppMigrations } from './index.js';

const APP_DB_PATH = resolve(env.STORAGE_DIR, 'app.sqlite');
mkdirSync(dirname(APP_DB_PATH), { recursive: true });
const sqlite = new Database(APP_DB_PATH);
sqlite.pragma('journal_mode = WAL');
runAppMigrations(sqlite);
console.log(`[migrate] app db ready at ${APP_DB_PATH}`);
sqlite.close();
