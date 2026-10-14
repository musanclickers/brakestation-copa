import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  char,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// ─── Auth.js v5 tables ──────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
  name: text('name'),
  image: text('image'),
  phone: text('phone'),
  rfc: text('rfc'),
  isAdmin: boolean('is_admin').notNull().default(false),
  adminPasswordHash: text('admin_password_hash'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

// ─── Tickets & QB codes ─────────────────────────────────────────

export const tickets = pgTable(
  'tickets',
  {
    code: text('code').primaryKey(),
    type: text('type').notNull(),
    assignedUserId: uuid('assigned_user_id').references(() => users.id),
    redeemedAt: timestamp('redeemed_at', { mode: 'date', withTimezone: true }),
    sourceBranch: text('source_branch'),
    registrationId: uuid('registration_id'),
    registrationRequired: boolean('registration_required').notNull().default(true),
  },
  (table) => ({
    ticketsTypeCheck: check('tickets_type_check', sql`${table.type} IN ('BS', 'CD', 'INT')`),
  }),
);

export const qbCodes = pgTable('qb_codes', {
  code: text('code').primaryKey(),
  ticketCode: text('ticket_code')
    .notNull()
    .references(() => tickets.code),
  generatedAt: timestamp('generated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp('used_at', { mode: 'date', withTimezone: true }),
});

// ─── Clients catalog (B2B customers) ───────────────────────────

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    city: text('city').notNull(),
    branch: text('branch').notNull(),
    contactName: text('contact_name'),
    contactPhone: text('contact_phone'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clientsTypeCheck: check('clients_type_check', sql`${table.type} IN ('refaccionaria','taller','mayorista','flotilla','otro')`),
    clientsBranchCheck: check('clients_branch_check', sql`${table.branch} IN ('merida','villahermosa','tuxtla')`),
    clientsActiveIdx: index('clients_active_idx').on(table.active),
    clientsBranchIdx: index('clients_branch_idx').on(table.branch),
  }),
);

// ─── Ticket registrations (photo + affiliation) ────────────────

export const ticketRegistrations = pgTable(
  'ticket_registrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketCode: text('ticket_code').notNull().references(() => tickets.code, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    photoUrl: text('photo_url').notNull(),
    photoUploadedAt: timestamp('photo_uploaded_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    affiliationType: text('affiliation_type').notNull(),
    clientId: uuid('client_id').references(() => clients.id),
    clientText: text('client_text').notNull(),
    participantName: text('participant_name').notNull(),
    participantPhone: text('participant_phone').notNull(),
    reviewStatus: text('review_status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { mode: 'date', withTimezone: true }),
    reviewNotes: text('review_notes'),
    waReminderPhase: text('wa_reminder_phase'),
    waReminderSentAt: timestamp('wa_reminder_sent_at', { mode: 'date', withTimezone: true }),
    socialBonusGranted: boolean('social_bonus_granted').notNull().default(false),
    socialBonusGrantedAt: timestamp('social_bonus_granted_at', { mode: 'date', withTimezone: true }),
    socialBonusGrantedBy: uuid('social_bonus_granted_by').references(() => users.id),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    trAffiliationCheck: check('tr_affiliation_check', sql`${table.affiliationType} IN ('negocio','consumidor')`),
    trReviewStatusCheck: check('tr_review_status_check', sql`${table.reviewStatus} IN ('pending','approved','rejected','awaiting_new_photo')`),
    trTicketIdx: index('tr_ticket_idx').on(table.ticketCode),
    trUserIdx: index('tr_user_idx').on(table.userId),
    trClientIdx: index('tr_client_idx').on(table.clientId),
    trReviewStatusIdx: index('tr_review_status_idx').on(table.reviewStatus),
    trActiveUnique: uniqueIndex('ticket_registrations_active_idx').on(table.ticketCode),
  }),
);

// ─── Ticket + Registration relations ───────────────────────────

export const ticketsRelations = relations(tickets, ({ one }) => ({
  registration: one(ticketRegistrations, {
    fields: [tickets.registrationId],
    references: [ticketRegistrations.id],
  }),
}));

export const ticketRegistrationsRelations = relations(ticketRegistrations, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketRegistrations.ticketCode],
    references: [tickets.code],
  }),
  user: one(users, {
    fields: [ticketRegistrations.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [ticketRegistrations.clientId],
    references: [clients.id],
  }),
  reviewer: one(users, {
    fields: [ticketRegistrations.reviewedBy],
    references: [users.id],
  }),
}));

// ─── Matches (104 FIFA 2026 catalog) ───────────────────────────

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchCode: text('match_code').unique().notNull(),
    phase: text('phase').notNull(),
    groupLetter: text('group_letter'),
    teamHome: text('team_home').notNull(),
    teamAway: text('team_away').notNull(),
    scheduledAt: timestamp('scheduled_at', { mode: 'date', withTimezone: true }).notNull(),
    venueCountry: text('venue_country'),
    venueStadium: text('venue_stadium'),
    startsAt: timestamp('starts_at', { mode: 'date', withTimezone: true }),
    footballDataMatchId: integer('football_data_match_id').unique(),
    venueName: text('venue_name'),
    venueCity: text('venue_city'),
    lastSyncedAt: timestamp('last_synced_at', { mode: 'date', withTimezone: true }),
    actualHomeTeam: text('actual_home_team'),
    actualAwayTeam: text('actual_away_team'),
    actualHomeScore: integer('actual_home_score'),
    actualAwayScore: integer('actual_away_score'),
    // Eliminatoria: si el partido se definió en penales, qué lado avanzó.
    // null = se decidió en tiempo regular/extra (scoring normal).
    penaltyWinner: text('penalty_winner'),
  },
  (table) => ({
    matchesPhaseCheck: check('matches_phase_check', sql`${table.phase} IN ('groups_m1','groups_m2','groups_m3','r32','r16','qf','sf','final_phase')`),
    matchesPenaltyWinnerCheck: check('matches_penalty_winner_check', sql`${table.penaltyWinner} IN ('home','away') OR ${table.penaltyWinner} IS NULL`),
    matchesVenueCheck: check('matches_venue_check', sql`${table.venueCountry} IN ('MX','US','CA') OR ${table.venueCountry} IS NULL`),
    matchesPhaseIdx: index('matches_phase_idx').on(table.phase),
    matchesScheduledAtIdx: index('matches_scheduled_at_idx').on(table.scheduledAt),
  }),
);

// ─── Match predictions (per-match user prediction) ─────────────

export const matchPredictions = pgTable(
  'match_predictions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    ticketCode: text('ticket_code').notNull().references(() => tickets.code),
    matchId: uuid('match_id').notNull().references(() => matches.id),
    predictedHomeScore: integer('predicted_home_score').notNull(),
    predictedAwayScore: integer('predicted_away_score').notNull(),
    seal: text('seal').notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mpHomeScoreRange: check('mp_home_score_range', sql`${table.predictedHomeScore} >= 0 AND ${table.predictedHomeScore} <= 20`),
    mpAwayScoreRange: check('mp_away_score_range', sql`${table.predictedAwayScore} >= 0 AND ${table.predictedAwayScore} <= 20`),
    mpUserTicketMatchUnique: uniqueIndex('mp_user_ticket_match_unique').on(table.userId, table.ticketCode, table.matchId),
    mpUserIdx: index('mp_user_idx').on(table.userId),
    mpTicketIdx: index('mp_ticket_idx').on(table.ticketCode),
    mpMatchIdx: index('mp_match_idx').on(table.matchId),
  }),
);

// ─── Phase submissions (one seal per user+ticket+phase) ────────

export const phaseSubmissions = pgTable(
  'phase_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    ticketCode: text('ticket_code').notNull().references(() => tickets.code),
    phase: text('phase').notNull(),
    matchesInPhase: integer('matches_in_phase').notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    phaseSeal: text('phase_seal').notNull(),
  },
  (table) => ({
    psPhaseCheck: check('ps_phase_check', sql`${table.phase} IN ('groups_m1','groups_m2','groups_m3','r32','r16','qf','sf','final_phase')`),
    psUserTicketPhaseUnique: uniqueIndex('ps_user_ticket_phase_unique').on(table.userId, table.ticketCode, table.phase),
    psSealIdx: index('ps_seal_idx').on(table.phaseSeal),
  }),
);

// ─── Phase settings (overrides admin: preview + hora de sellado) ──

export const phaseSettings = pgTable(
  'phase_settings',
  {
    phase: text('phase').primaryKey(),
    previewEnabled: boolean('preview_enabled').notNull().default(false),
    sealOpensAt: timestamp('seal_opens_at', { mode: 'date', withTimezone: true }),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    phaseSettingsPhaseCheck: check(
      'phase_settings_phase_check',
      sql`${table.phase} IN ('groups_m1','groups_m2','groups_m3','r32','r16','qf','sf','final_phase')`,
    ),
  }),
);

// ─── Trivias ────────────────────────────────────────────────────

export const trivias = pgTable(
  'trivias',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phaseLabel: text('phase_label').notNull(),
    question: text('question').notNull(),
    optionA: text('option_a').notNull(),
    optionB: text('option_b').notNull(),
    optionC: text('option_c').notNull(),
    correctOption: char('correct_option', { length: 1 }).notNull(),
    opensAt: timestamp('opens_at', { mode: 'date', withTimezone: true }).notNull(),
    closesAt: timestamp('closes_at', { mode: 'date', withTimezone: true }).notNull(),
    category: text('category').notNull(),
  },
  (table) => ({
    triviasPhaseLabelCheck: check('trivias_phase_label_check', sql`${table.phaseLabel} IN ('groups_m1','groups_m2','groups_m3','r32','r16','qf','sf','final_phase')`),
    triviasCorrectOptionCheck: check('trivias_correct_option_check', sql`${table.correctOption} IN ('a', 'b', 'c')`),
    triviasCategoryCheck: check('trivias_category_check', sql`${table.category} IN ('futbol', 'marca')`),
  }),
);

export const triviaResponses = pgTable(
  'trivia_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    ticketCode: text('ticket_code')
      .notNull()
      .references(() => tickets.code),
    triviaId: uuid('trivia_id')
      .notNull()
      .references(() => trivias.id),
    selectedOption: char('selected_option', { length: 1 }).notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    seal: text('seal').notNull(),
  },
  (table) => ({
    triviaResponsesOptionCheck: check('trivia_responses_option_check', sql`${table.selectedOption} IN ('a', 'b', 'c')`),
    triviaResponsesUnique: uniqueIndex('trivia_responses_unique').on(table.userId, table.ticketCode, table.triviaId),
  }),
);

// ─── Audit & admin ──────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  userId: uuid('user_id').references(() => users.id),
  ticketCode: text('ticket_code').references(() => tickets.code),
  payload: jsonb('payload'),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});

export const adminActions = pgTable('admin_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  targetTable: text('target_table').notNull(),
  targetId: text('target_id').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});

// ─── Notification logs (admin mass send audit) ─────────────────

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sentBy: uuid('sent_by').notNull().references(() => users.id),
    templateKey: text('template_key').notNull(),
    audienceSpec: jsonb('audience_spec').notNull(),
    recipientCount: integer('recipient_count').notNull(),
    succeededCount: integer('succeeded_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    isTest: boolean('is_test').notNull().default(false),
    startedAt: timestamp('started_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date', withTimezone: true }),
  },
  (table) => ({
    nlTemplateStartedIdx: index('idx_notification_logs_template_started').on(
      table.templateKey,
      table.startedAt,
    ),
    nlSentByIdx: index('idx_notification_logs_sent_by').on(table.sentBy, table.startedAt),
  }),
);

// ─── Contact leads (landing) ────────────────────────────────────

export const contactLeads = pgTable(
  'contact_leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    businessType: text('business_type').notNull(),
    city: text('city'),
    message: text('message'),
    source: text('source'),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { mode: 'date', withTimezone: true }),
    respondedBy: text('responded_by'),
  },
  (table) => ({
    contactLeadsBusinessTypeCheck: check(
      'contact_leads_business_type_check',
      sql`${table.businessType} IN ('refaccionaria', 'taller', 'mecanico', 'consumidor', 'otro')`,
    ),
  }),
);
