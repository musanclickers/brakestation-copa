import { db } from '@brakestation/db';
import {
  users,
  tickets,
  ticketRegistrations,
  triviaResponses,
  trivias,
  phaseSubmissions,
  matchPredictions,
  matches,
} from '@brakestation/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

// ponytail: same normalization as compute-trivia-points (lower+trim+collapse ws).
// Inlined instead of exported-shared — it's one line and lives in two read paths.
function normalizeQuestion(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, ' ');
}

export type Recipient = {
  email: string;
  name: string;
  phone: string | null;
  userId: string | null;
  cohort: 'BS' | 'CD' | 'INT' | null;
  ticketCode: string | null;
};

export type AudienceSpec =
  | { kind: 'all_activated'; cohort?: 'BS' | 'CD' | 'INT' }
  | { kind: 'not_answered_trivia'; triviaId: string }
  | { kind: 'not_predicted_open_matches' }
  | { kind: 'not_sealed_j3' }
  | { kind: 'sealed_phase'; phase: string }
  | { kind: 'explicit_emails'; emails: string[] }
  | { kind: 'test'; email: string };

async function activatedBase(cohort?: 'BS' | 'CD' | 'INT') {
  const conds = [eq(ticketRegistrations.reviewStatus, 'approved')];
  if (cohort) conds.push(eq(tickets.type, cohort));

  const rows = await db
    .select({
      email: users.email,
      // participantName is the one actually filled at registration; users.name is
      // usually null. Prefer it so emails/WhatsApp/CSV carry a real name.
      participantName: ticketRegistrations.participantName,
      name: users.name,
      phone: ticketRegistrations.participantPhone,
      userId: users.id,
      cohort: tickets.type,
      ticketCode: ticketRegistrations.ticketCode,
    })
    .from(ticketRegistrations)
    .innerJoin(tickets, eq(ticketRegistrations.ticketCode, tickets.code))
    .innerJoin(users, eq(ticketRegistrations.userId, users.id))
    .where(and(...conds));

  return rows.map<Recipient>((r) => ({
    email: r.email,
    name: r.participantName?.trim() || r.name || '',
    phone: r.phone ?? null,
    userId: r.userId,
    cohort: r.cohort as 'BS' | 'CD' | 'INT',
    ticketCode: r.ticketCode,
  }));
}

async function notAnsweredTrivia(triviaId: string): Promise<Recipient[]> {
  const base = await activatedBase();
  if (base.length === 0) return [];
  const answered = await db
    .select({ userId: triviaResponses.userId })
    .from(triviaResponses)
    .where(eq(triviaResponses.triviaId, triviaId));
  const answeredIds = new Set(answered.map((a) => a.userId));
  return base.filter((r) => !r.userId || !answeredIds.has(r.userId));
}

async function notPredictedOpenMatches(): Promise<Recipient[]> {
  const base = await activatedBase();
  if (base.length === 0) return [];
  const openMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(sql`(${matches.startsAt} IS NULL OR ${matches.startsAt} > NOW())`);
  if (openMatches.length === 0) return [];
  const openIds = openMatches.map((m) => m.id);

  const userIds = base.map((r) => r.userId).filter((x): x is string => !!x);
  if (userIds.length === 0) return base;

  const haveAtLeastOnePrediction = await db
    .select({ userId: matchPredictions.userId })
    .from(matchPredictions)
    .where(
      and(inArray(matchPredictions.userId, userIds), inArray(matchPredictions.matchId, openIds)),
    )
    .groupBy(matchPredictions.userId);

  const haveSet = new Set(haveAtLeastOnePrediction.map((r) => r.userId));
  return base.filter((r) => !r.userId || !haveSet.has(r.userId));
}

// Activated participants who are missing J3 (groups_m3): haven't SEALED their J3
// predictions, and/or haven't answered every currently-open J3 trivia question.
// "y/o" → qualifies if either gap exists. ponytail: J3-specific to match the
// request + its paired template (recordatorio cierre de grupos).
async function notSealedJ3(): Promise<Recipient[]> {
  const base = await activatedBase();
  if (base.length === 0) return [];

  const sealed = await db
    .select({ userId: phaseSubmissions.userId, ticketCode: phaseSubmissions.ticketCode })
    .from(phaseSubmissions)
    .where(eq(phaseSubmissions.phase, 'groups_m3'));
  const sealedSet = new Set(sealed.map((s) => `${s.userId}:${s.ticketCode}`));

  // Currently-open J3 trivias, deduped to question clusters (seed bug made copies).
  const openTrivias = await db
    .select({ id: trivias.id, question: trivias.question })
    .from(trivias)
    .where(
      and(
        eq(trivias.phaseLabel, 'groups_m3'),
        sql`${trivias.opensAt} <= NOW()`,
        sql`${trivias.closesAt} > NOW()`,
      ),
    );
  const clusterByTrivia = new Map<string, string>();
  const openClusters = new Set<string>();
  for (const t of openTrivias) {
    const c = normalizeQuestion(t.question);
    clusterByTrivia.set(t.id, c);
    openClusters.add(c);
  }

  const answeredByUser = new Map<string, Set<string>>();
  if (clusterByTrivia.size > 0) {
    const resp = await db
      .select({ userId: triviaResponses.userId, triviaId: triviaResponses.triviaId })
      .from(triviaResponses)
      .where(inArray(triviaResponses.triviaId, [...clusterByTrivia.keys()]));
    for (const r of resp) {
      const c = clusterByTrivia.get(r.triviaId);
      if (!c) continue;
      let s = answeredByUser.get(r.userId);
      if (!s) {
        s = new Set();
        answeredByUser.set(r.userId, s);
      }
      s.add(c);
    }
  }

  return base.filter((r) => {
    if (!r.userId) return true; // can't verify → include to be safe
    const missingSeal = !sealedSet.has(`${r.userId}:${r.ticketCode}`);
    const answered = answeredByUser.get(r.userId)?.size ?? 0;
    const missingTrivia = answered < openClusters.size;
    return missingSeal || missingTrivia;
  });
}

// Activados que SÍ sellaron una fase (p.ej. r16 = octavos). Lo contrario de
// notSealedJ3: sirve para avisar/agradecer a quienes ya participaron en la fase.
async function sealedPhase(phase: string): Promise<Recipient[]> {
  const base = await activatedBase();
  if (base.length === 0) return [];
  const sealed = await db
    .select({ userId: phaseSubmissions.userId, ticketCode: phaseSubmissions.ticketCode })
    .from(phaseSubmissions)
    .where(eq(phaseSubmissions.phase, phase));
  const sealedSet = new Set(sealed.map((s) => `${s.userId}:${s.ticketCode}`));
  return base.filter((r) => r.userId && sealedSet.has(`${r.userId}:${r.ticketCode}`));
}

async function explicitEmails(emails: string[]): Promise<Recipient[]> {
  const normalized = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return [];
  const rows = await db
    .select({
      email: users.email,
      name: users.name,
      phone: users.phone,
      userId: users.id,
    })
    .from(users)
    .where(inArray(users.email, normalized));
  const foundEmails = new Set(rows.map((r) => r.email));
  const recipients: Recipient[] = rows.map((r) => ({
    email: r.email,
    name: r.name ?? '',
    phone: r.phone ?? null,
    userId: r.userId,
    cohort: null,
    ticketCode: null,
  }));
  for (const e of normalized) {
    if (!foundEmails.has(e)) {
      recipients.push({ email: e, name: '', phone: null, userId: null, cohort: null, ticketCode: null });
    }
  }
  return recipients;
}

export async function resolveAudience(spec: AudienceSpec): Promise<Recipient[]> {
  switch (spec.kind) {
    case 'all_activated':
      return activatedBase(spec.cohort);
    case 'not_answered_trivia':
      return notAnsweredTrivia(spec.triviaId);
    case 'not_predicted_open_matches':
      return notPredictedOpenMatches();
    case 'not_sealed_j3':
      return notSealedJ3();
    case 'sealed_phase':
      return sealedPhase(spec.phase);
    case 'explicit_emails':
      return explicitEmails(spec.emails);
    case 'test':
      return [{ email: spec.email, name: 'Eduardo', phone: null, userId: null, cohort: null, ticketCode: null }];
  }
}

export async function countAudience(spec: AudienceSpec): Promise<number> {
  const recipients = await resolveAudience(spec);
  return recipients.length;
}
