--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS upvotes (
  id INTEGER PRIMARY KEY,
  user TEXT,
  link TEXT,
  createdAt TIMESTAMP DEFAULT (datetime('now','localtime')) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_upvotes_user ON upvotes (user);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  discordId TEXT UNIQUE ON CONFLICT FAIL,
  username TEXT UNIQUE ON CONFLICT FAIL,
  code TEXT,
  active BOOLEAN NOT NULL CHECK (active IN (0, 1)),
  createdAt TIMESTAMP DEFAULT (datetime('now','localtime')) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  escrowId INTEGER,
  sender TEXT,
  senderId TEXT,
  receiver TEXT,
  receiverId TEXT,
  amount REAL,
  currency TEXT,
  createdAt TIMESTAMP DEFAULT (datetime('now','localtime')) NOT NULL,
  FOREIGN KEY (sender, senderId, receiver, receiverId) REFERENCES supplier_groups (username, discordId, username, discordId)
);
--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE upvotes;
DROP TABLE users;
DROP TABLE transactions;
