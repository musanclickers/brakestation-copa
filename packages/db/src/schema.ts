import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Copa Brake Station · Primera Edición 2026.
// Schema single-tournament. Cualquier cambio aquí debe reflejarse a mano en
// drizzle/0000_copa_baseline.sql (el entrypoint aplica SQL crudo, no drizzle-kit).
//
// TODO(2027 refactor Primera → Segunda Edición):
// Agregar columna edition_id INTEGER NOT NULL REFERENCES editions(id).
// Nueva tabla editions:
//   editions (id SERIAL PK, name VARCHAR, slug VARCHAR UNIQUE, start_date DATE, end_date DATE, status VARCHAR CHECK IN ('active', 'archived'), created_at TIMESTAMP)
// Insertar edition "Primera Edición 2026" (slug="2026") y backfill matches/predictions/phases con edition_id=1.
// Admin UI gana selector de edición activa en header.
// Ranking filtra por edition_id.
// URL copa.brakestation.com.mx sirve edición activa; archivo accesible en /2026, /2027, etc.
// NO renombrar repo, URL ni DB.

const PHASE_CHECK = sql`IN ('j1','j2','j3','j4','j5','j6','j7','final')`;

// ─── Auth.js v5 tables ──────────────────────────────────────────

// Usuarios: participantes y admins. Un usuario puede jugar en todas las ediciones.
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
  name: text('name'),
  image: text('image'),
  termsAcceptedAt: timestamp('terms_accepted_at', { mode: 'date', withTimezone: true }),
  registrationIp: text('registration_ip'),
  isAdmin: boolean('is_admin').notNull().default(false),
  adminPasswordHash: text('admin_password_hash'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  relacion: text('relacion'),
  relacionDetalle: varchar('relacion_detalle', { length: 100 }),
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

// ─── Matches (32 partidos: 28 fase regular + 4 fase final) ──────
// TODO(2027 refactor): agregar edition_id (ver cabecera).
// Equipos = sponsor + refaccionaria. En la fase final van null hasta que el
// admin asigna semifinales; 3er lugar y Gran Final se llenan solos al capturar
// los marcadores de las semis.

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchCode: text('match_code').unique().notNull(),
    phase: text('phase').notNull(),
    startsAt: timestamp('starts_at', { mode: 'date', withTimezone: true }).notNull(),
    sponsorHome: varchar('sponsor_home', { length: 100 }),
    refaccionariaHome: varchar('refaccionaria_home', { length: 100 }),
    sponsorAway: varchar('sponsor_away', { length: 100 }),
    refaccionariaAway: varchar('refaccionaria_away', { length: 100 }),
    displayLabel: varchar('display_label', { length: 100 }),
    actualHomeScore: integer('actual_home_score'),
    actualAwayScore: integer('actual_away_score'),
    // Fase final: si el partido se definió en penales, qué lado avanzó.
    penaltyWinner: text('penalty_winner'),
  },
  (table) => ({
    matchesPhaseCheck: check('matches_phase_check', sql`${table.phase} ${PHASE_CHECK}`),
    matchesPenaltyWinnerCheck: check('matches_penalty_winner_check', sql`${table.penaltyWinner} IN ('home','away') OR ${table.penaltyWinner} IS NULL`),
    matchesPhaseIdx: index('matches_phase_idx').on(table.phase),
    matchesStartsAtIdx: index('matches_starts_at_idx').on(table.startsAt),
  }),
);

// ─── Predicciones (una por usuario+partido, editable hasta su lockout) ──
// TODO(2027 refactor): agregar edition_id (ver cabecera).

export const matchPredictions = pgTable(
  'match_predictions',
  {
    userId: uuid('user_id').notNull().references(() => users.id),
    matchId: uuid('match_id').notNull().references(() => matches.id),
    predictedHomeScore: integer('predicted_home_score').notNull(),
    predictedAwayScore: integer('predicted_away_score').notNull(),
    seal: text('seal').notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.matchId] }),
    mpHomeScoreRange: check('mp_home_score_range', sql`${table.predictedHomeScore} >= 0 AND ${table.predictedHomeScore} <= 20`),
    mpAwayScoreRange: check('mp_away_score_range', sql`${table.predictedAwayScore} >= 0 AND ${table.predictedAwayScore} <= 20`),
    mpMatchIdx: index('mp_match_idx').on(table.matchId),
  }),
);

// ─── Sello por jornada (uno por usuario+jornada, se regenera en cada guardado) ──
// TODO(2027 refactor): agregar edition_id (ver cabecera).

export const phaseSubmissions = pgTable(
  'phase_submissions',
  {
    userId: uuid('user_id').notNull().references(() => users.id),
    phase: text('phase').notNull(),
    matchesInPhase: integer('matches_in_phase').notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    phaseSeal: text('phase_seal').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.phase] }),
    psPhaseCheck: check('ps_phase_check', sql`${table.phase} ${PHASE_CHECK}`),
    psSealIdx: index('ps_seal_idx').on(table.phaseSeal),
  }),
);

// ─── Audit & admin ──────────────────────────────────────────────

// Bitácora de eventos de participantes. INSERT-only (triggers en el baseline).
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  userId: uuid('user_id').references(() => users.id),
  payload: jsonb('payload'),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});

// Bitácora de cambios hechos por admins (marcadores, asignación de final, admins).
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

// Auditoría de envíos masivos de email desde el admin.
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
