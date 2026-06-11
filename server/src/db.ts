import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'marathon.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      phone TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      date TEXT NOT NULL,
      route_description TEXT DEFAULT '',
      start_point TEXT DEFAULT '',
      end_point TEXT DEFAULT '',
      cutoff_time TEXT DEFAULT '',
      fee REAL NOT NULL DEFAULT 0,
      supplies TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'ongoing', 'finished')),
      image_url TEXT DEFAULT '',
      registration_deadline TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL CHECK(name IN ('full', 'half', 'family')),
      distance REAL NOT NULL,
      max_participants INTEGER NOT NULL DEFAULT 0,
      current_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      emergency_contact TEXT NOT NULL,
      emergency_phone TEXT NOT NULL,
      bib_number TEXT DEFAULT '',
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
      certificate_url TEXT DEFAULT '',
      finish_time TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (project_id) REFERENCES event_projects(id)
    );
  `);

  seedData();
}

function seedData(): void {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)'
    ).run('admin', 'admin@marathon.com', hash, 'admin', '13800000000');
  }

  const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
  if (eventCount.count === 0) {
    const now = new Date();
    const futureDate1 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const futureDate2 = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
    const futureDate3 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const deadline1 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const deadline2 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    const deadline3 = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);

    const insertEvent = db.prepare(`
      INSERT INTO events (name, city, date, route_description, start_point, end_point, cutoff_time, fee, supplies, status, image_url, registration_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertProject = db.prepare(`
      INSERT INTO event_projects (event_id, name, distance, max_participants, current_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    const event1 = insertEvent.run(
      '2026北京国际马拉松',
      '北京',
      futureDate1.toISOString().split('T')[0],
      '从天安门广场出发，沿长安街向西，经过复兴门、公主坟，到达颐和园。全程平坦，适合PB。',
      '天安门广场',
      '颐和园东门',
      '6小时',
      200,
      '参赛T恤、号码布、计时芯片、完赛奖牌、完赛证书、补给包',
      'upcoming',
      '',
      deadline1.toISOString().split('T')[0]
    );

    const eventId1 = event1.lastInsertRowid;
    insertProject.run(eventId1, 'full', 42.195, 10000, 3200);
    insertProject.run(eventId1, 'half', 21.0975, 8000, 4500);
    insertProject.run(eventId1, 'family', 5, 2000, 800);

    const event2 = insertEvent.run(
      '2026上海半程马拉松',
      '上海',
      futureDate2.toISOString().split('T')[0],
      '从外滩出发，沿黄浦江畔，经过陆家嘴、世纪公园，终点设在上海东方体育中心。',
      '外滩',
      '上海东方体育中心',
      '3小时30分',
      150,
      '参赛T恤、号码布、计时芯片、完赛奖牌、能量补给',
      'upcoming',
      '',
      deadline2.toISOString().split('T')[0]
    );

    const eventId2 = event2.lastInsertRowid;
    insertProject.run(eventId2, 'half', 21.0975, 15000, 8900);
    insertProject.run(eventId2, 'family', 5, 3000, 1200);

    const event3 = insertEvent.run(
      '2026厦门环岛马拉松',
      '厦门',
      futureDate3.toISOString().split('T')[0],
      '环厦门岛一圈，沿途经过环岛路、曾厝垵、胡里山炮台、鹭江道等标志性景点。',
      '厦门国际会展中心',
      '厦门国际会展中心',
      '6小时30分',
      180,
      '参赛T恤、号码布、计时芯片、完赛奖牌、完赛证书、补给包、纪念毛巾',
      'upcoming',
      '',
      deadline3.toISOString().split('T')[0]
    );

    const eventId3 = event3.lastInsertRowid;
    insertProject.run(eventId3, 'full', 42.195, 8000, 5100);
    insertProject.run(eventId3, 'half', 21.0975, 6000, 3800);
  }
}

export default db;
