ALTER TABLE "ticket_registrations" ADD COLUMN "wa_reminder_phase" text;
ALTER TABLE "ticket_registrations" ADD COLUMN "wa_reminder_sent_at" timestamp with time zone;
