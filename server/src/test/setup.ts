import fs from 'fs';
import path from 'path';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import db, { initDatabase, closeDatabase } from '../db';

const dataDir = path.join(__dirname, '..', '..', 'data');
const testDbPath = path.join(dataDir, 'test-marathon.db');
const testDbWalPath = path.join(dataDir, 'test-marathon.db-wal');
const testDbShmPath = path.join(dataDir, 'test-marathon.db-shm');

beforeAll(() => {
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(testDbWalPath)) fs.unlinkSync(testDbWalPath);
  if (fs.existsSync(testDbShmPath)) fs.unlinkSync(testDbShmPath);
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(testDbWalPath)) fs.unlinkSync(testDbWalPath);
  if (fs.existsSync(testDbShmPath)) fs.unlinkSync(testDbShmPath);
});

beforeEach(() => {
  const tables = ['registrations', 'event_projects', 'events', 'users'];
  for (const table of tables) {
    db.exec(`DELETE FROM ${table}`);
  }
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('registrations','event_projects','events','users')");
  initDatabase();
});
