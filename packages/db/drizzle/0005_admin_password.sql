ALTER TABLE users
  ADD COLUMN admin_password_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users(email);
