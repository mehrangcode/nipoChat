import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

// Ensure data + uploads directories exist before opening the DB file.
fs.mkdirSync(env.dataDir, { recursive: true });
fs.mkdirSync(env.uploadsDir, { recursive: true });

export const db = new Database(env.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function runMigrations(): void {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(sql);
}

export function now(): number {
  return Date.now();
}
