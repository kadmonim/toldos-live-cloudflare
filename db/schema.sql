-- The whole database, for Cloudflare D1 (SQLite). Ids are UUIDs kept as text; dates and times are
-- ISO text in UTC ("2026-11-13T00:44:19.912Z"); true/false are 1/0; `old`/`new` hold JSON text.
-- The tree is built from couples: a person's `parents` is the couple they were born to.
CREATE TABLE people (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
     || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  he_first TEXT, he_full TEXT, en_first TEXT, he_last TEXT, en_last TEXT,
  maiden TEXT, nickname TEXT, father_name TEXT, mother_name TEXT,
  sex TEXT CHECK (sex IN ('m', 'f')),
  h_day INTEGER, h_month INTEGER, h_year INTEGER, birth_order INTEGER,
  d_day INTEGER, d_month INTEGER, d_year INTEGER,
  deceased INTEGER NOT NULL DEFAULT 0,
  city TEXT, address TEXT, phone TEXT, home_phone TEXT, email TEXT, hobby TEXT, occupation TEXT, notes TEXT,
  parents TEXT REFERENCES couples(id) ON DELETE SET NULL,
  photo_v INTEGER,
  can_export INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT, archived_by TEXT REFERENCES people(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE couples (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
     || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  a TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  b TEXT REFERENCES people(id) ON DELETE SET NULL,
  is_root INTEGER NOT NULL DEFAULT 0,
  w_day INTEGER, w_month INTEGER, w_year INTEGER,
  photo_v INTEGER,
  apart INTEGER NOT NULL DEFAULT 0, engaged INTEGER NOT NULL DEFAULT 0, venue TEXT
);
CREATE TABLE edits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  by_person TEXT REFERENCES people(id) ON DELETE SET NULL,
  person_id TEXT REFERENCES people(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  old TEXT, new TEXT, undone_at TEXT
);
CREATE TABLE photos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
     || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  by_person TEXT REFERENCES people(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX photos_person ON photos (person_id, created_at);
CREATE INDEX people_parents ON people (parents);
CREATE INDEX edits_at ON edits (at);
