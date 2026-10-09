-- A name the user chose for themselves. Overrides username, which Discord/Google
-- sign-ins overwrite with the provider's name on every login.
ALTER TABLE users ADD COLUMN display_name TEXT;
