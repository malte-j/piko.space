CREATE TABLE IF NOT EXISTS documents (
  file_id TEXT PRIMARY KEY,
  title TEXT,
  title_version TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_recent_files (
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  last_edited INTEGER NOT NULL,
  PRIMARY KEY (user_id, file_id),
  FOREIGN KEY (file_id) REFERENCES documents(file_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_recent_files_by_recency
  ON user_recent_files(user_id, last_edited DESC);
