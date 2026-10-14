ALTER TABLE ticket_registrations
  ADD COLUMN IF NOT EXISTS social_bonus_granted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_bonus_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS social_bonus_granted_by uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS ticket_registrations_social_bonus_idx
  ON ticket_registrations(social_bonus_granted)
  WHERE social_bonus_granted = true;
