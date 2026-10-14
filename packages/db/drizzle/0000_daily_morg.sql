CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "admin_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"ticket_code" text,
	"payload" jsonb,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"business_type" text NOT NULL,
	"city" text,
	"message" text,
	"source" text,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"responded_by" text,
	CONSTRAINT "contact_leads_business_type_check" CHECK ("contact_leads"."business_type" IN ('refaccionaria', 'taller', 'mecanico', 'consumidor', 'otro'))
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket_code" text NOT NULL,
	"champion" text NOT NULL,
	"runner_up" text NOT NULL,
	"third_place" text NOT NULL,
	"top_scorer" text NOT NULL,
	"golden_ball" text NOT NULL,
	"opening_result" text NOT NULL,
	"semi1_winner" text NOT NULL,
	"semi2_winner" text NOT NULL,
	"final_result" text NOT NULL,
	"final_total_goals" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seal" text NOT NULL,
	CONSTRAINT "predictions_ticket_code_unique" UNIQUE("ticket_code"),
	CONSTRAINT "predictions_opening_result_check" CHECK ("predictions"."opening_result" IN ('1', 'X', '2')),
	CONSTRAINT "predictions_final_result_check" CHECK ("predictions"."final_result" IN ('1', 'X', '2')),
	CONSTRAINT "predictions_window_check" CHECK ("predictions"."submitted_at" >= '2026-06-01 00:00:00-06'::timestamptz AND "predictions"."submitted_at" <= '2026-06-10 23:59:59-06'::timestamptz)
);
--> statement-breakpoint
CREATE TABLE "qb_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"ticket_code" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"code" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"assigned_user_id" uuid,
	"redeemed_at" timestamp with time zone,
	"source_branch" text,
	CONSTRAINT "tickets_type_check" CHECK ("tickets"."type" IN ('BS', 'CD'))
);
--> statement-breakpoint
CREATE TABLE "trivia_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket_code" text NOT NULL,
	"trivia_id" uuid NOT NULL,
	"selected_option" char(1) NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seal" text NOT NULL,
	CONSTRAINT "trivia_responses_option_check" CHECK ("trivia_responses"."selected_option" IN ('a', 'b', 'c'))
);
--> statement-breakpoint
CREATE TABLE "trivias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_transition" integer NOT NULL,
	"question" text NOT NULL,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text NOT NULL,
	"correct_option" char(1) NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "trivias_phase_check" CHECK ("trivias"."phase_transition" BETWEEN 1 AND 5),
	CONSTRAINT "trivias_correct_option_check" CHECK ("trivias"."correct_option" IN ('a', 'b', 'c')),
	CONSTRAINT "trivias_category_check" CHECK ("trivias"."category" IN ('futbol', 'marca'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"name" text,
	"image" text,
	"phone" text,
	"rfc" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_ticket_code_tickets_code_fk" FOREIGN KEY ("ticket_code") REFERENCES "public"."tickets"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_ticket_code_tickets_code_fk" FOREIGN KEY ("ticket_code") REFERENCES "public"."tickets"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qb_codes" ADD CONSTRAINT "qb_codes_ticket_code_tickets_code_fk" FOREIGN KEY ("ticket_code") REFERENCES "public"."tickets"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_responses" ADD CONSTRAINT "trivia_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_responses" ADD CONSTRAINT "trivia_responses_ticket_code_tickets_code_fk" FOREIGN KEY ("ticket_code") REFERENCES "public"."tickets"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_responses" ADD CONSTRAINT "trivia_responses_trivia_id_trivias_id_fk" FOREIGN KEY ("trivia_id") REFERENCES "public"."trivias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "predictions_user_id_idx" ON "predictions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "predictions_seal_idx" ON "predictions" USING btree ("seal");--> statement-breakpoint
CREATE UNIQUE INDEX "trivia_responses_unique" ON "trivia_responses" USING btree ("user_id","ticket_code","trivia_id");--> statement-breakpoint

-- Immutability triggers for audit_log (PRD requirement: INSERT-only)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es inmutable: no se permite UPDATE ni DELETE';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();