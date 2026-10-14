ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS ticket_registrations_review_status_check;
ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS tr_review_status_check;

ALTER TABLE ticket_registrations
  ADD CONSTRAINT tr_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected', 'awaiting_new_photo'));
