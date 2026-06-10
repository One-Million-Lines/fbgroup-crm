import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env.js';
import * as appSchema from './schema.app.js';
import * as wsSchema from './schema.workspace.js';

const APP_DB_PATH = resolve(env.STORAGE_DIR, 'app.sqlite');

function ensureDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

let _appDb: BetterSQLite3Database<typeof appSchema> | null = null;

export function appDb() {
  if (!_appDb) {
    ensureDir(APP_DB_PATH);
    const sqlite = new Database(APP_DB_PATH);
    sqlite.pragma('journal_mode = WAL');
    _appDb = drizzle(sqlite, { schema: appSchema });
  }
  return _appDb;
}

const _wsCache = new Map<string, BetterSQLite3Database<typeof wsSchema>>();

export function workspaceDb(workspaceId: string) {
  let db = _wsCache.get(workspaceId);
  if (!db) {
    const path = resolve(env.STORAGE_DIR, 'workspaces', workspaceId, 'crm.sqlite');
    ensureDir(path);
    const sqlite = new Database(path);
    sqlite.pragma('journal_mode = WAL');
    db = drizzle(sqlite, { schema: wsSchema });
    runWorkspaceMigrations(sqlite);
    _wsCache.set(workspaceId, db);
  }
  return db;
}

export function runAppMigrations(sqlite: Database.Database) { sqlite.exec(APP_SQL); }
export function runWorkspaceMigrations(sqlite: Database.Database) { sqlite.exec(WS_SQL); }

const APP_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_users (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wu_user ON workspace_users(user_id);
CREATE INDEX IF NOT EXISTS idx_wu_ws ON workspace_users(workspace_id);
`;

const WS_SQL = `
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'facebook',
  fb_group_id TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  privacy TEXT,
  visible_member_count INTEGER,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS groups_fb_group_unique ON groups(fb_group_id);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  profile_url TEXT,
  fbid TEXT,
  username TEXT,
  profile_image_url TEXT,
  bio TEXT,
  location TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_members_fbid ON members(fbid);
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_url ON members(profile_url);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  first_seen_in_group_at TEXT NOT NULL,
  last_seen_in_group_at TEXT NOT NULL,
  joined_at TEXT,
  left_at TEXT,
  last_post_at TEXT,
  post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'unknown',
  subscription_start_at TEXT,
  subscription_end_at TEXT,
  payment_status TEXT DEFAULT 'unknown',
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS gm_unique ON group_members(group_id, member_id);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  group_member_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_gm ON notes(group_member_id);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_member_tags (
  group_member_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY(group_member_id, tag_id)
);

CREATE TABLE IF NOT EXISTS scan_sessions (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  sub_tab TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  total_detected INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,
  missing_members INTEGER DEFAULT 0,
  updated_members INTEGER DEFAULT 0,
  created_by_user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_member_results (
  id TEXT PRIMARY KEY,
  scan_session_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  member_id TEXT,
  raw_label TEXT,
  display_name TEXT,
  profile_url TEXT,
  fbid TEXT,
  username TEXT,
  role TEXT,
  confidence_score REAL DEFAULT 0,
  result_type TEXT,
  detected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_activity (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  member_id TEXT,
  fb_post_url TEXT,
  author_label TEXT,
  author_profile_url TEXT,
  posted_at TEXT,
  detected_at TEXT NOT NULL,
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  has_media INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_post_group_ts ON post_activity(group_id, posted_at);
CREATE UNIQUE INDEX IF NOT EXISTS post_url_unique ON post_activity(fb_post_url);

CREATE TABLE IF NOT EXISTS daily_group_stats (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_members INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,
  left_members INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  detected_posts INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(group_id, date)
);
`;
