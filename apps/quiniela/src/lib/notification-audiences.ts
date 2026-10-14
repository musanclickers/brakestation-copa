import { db } from '@brakestation/db';
import { users, matchPredictions, matches } from '@brakestation/db/schema';
import { PHASE_ORDER, isMatchOpen } from '@brakestation/db/phases';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';

export type Recipient = { email: string; name: string; userId: string | null };

// Única definición de audiencias: la validan count, export y send, así que el
// CSV nunca difiere de a quién le llega el correo.
export const AudienceSchema = z.union([
  z.object({ kind: z.literal('all_registered') }),
  z.object({ kind: z.literal('missing_open_predictions') }),
  z.object({ kind: z.literal('predicted_phase'), phase: z.enum(PHASE_ORDER as [string, ...string[]]) }),
  z.object({ kind: z.literal('explicit_emails'), emails: z.array(z.string().email()).min(1).max(500) }),
  z.object({ kind: z.literal('test'), email: z.string().email() }),
]);
export type AudienceSpec = z.infer<typeof AudienceSchema>;

async function registered(): Promise<Recipient[]> {
  const rows = await db
    .select({ email: users.email, name: users.name, userId: users.id })
    .from(users)
    .where(isNotNull(users.termsAcceptedAt));
  return rows.map((r) => ({ email: r.email, name: r.name ?? '', userId: r.userId }));
}

/** Registrados a los que les falta pronosticar algún partido que sigue abierto. */
async function missingOpenPredictions(): Promise<Recipient[]> {
  const openIds = (await db.select().from(matches)).filter((m) => isMatchOpen(m)).map((m) => m.id);
  if (openIds.length === 0) return [];
  const base = await registered();
  const preds = await db
    .select({ userId: matchPredictions.userId })
    .from(matchPredictions)
    .where(inArray(matchPredictions.matchId, openIds));
  const count = new Map<string, number>();
  for (const p of preds) count.set(p.userId, (count.get(p.userId) ?? 0) + 1);
  return base.filter((r) => (count.get(r.userId!) ?? 0) < openIds.length);
}

/** Quienes guardaron al menos un pronóstico de esa jornada. */
async function predictedPhase(phase: string): Promise<Recipient[]> {
  const rows = await db
    .selectDistinct({ email: users.email, name: users.name, userId: users.id })
    .from(matchPredictions)
    .innerJoin(matches, eq(matches.id, matchPredictions.matchId))
    .innerJoin(users, eq(users.id, matchPredictions.userId))
    .where(and(eq(matches.phase, phase)));
  return rows.map((r) => ({ email: r.email, name: r.name ?? '', userId: r.userId }));
}

async function explicitEmails(emails: string[]): Promise<Recipient[]> {
  const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const rows = await db
    .select({ email: users.email, name: users.name, userId: users.id })
    .from(users)
    .where(inArray(users.email, normalized));
  const found = new Map(rows.map((r) => [r.email, r]));
  return normalized.map((e) => {
    const r = found.get(e);
    return { email: e, name: r?.name ?? '', userId: r?.userId ?? null };
  });
}

export async function resolveAudience(spec: AudienceSpec): Promise<Recipient[]> {
  switch (spec.kind) {
    case 'all_registered':
      return registered();
    case 'missing_open_predictions':
      return missingOpenPredictions();
    case 'predicted_phase':
      return predictedPhase(spec.phase);
    case 'explicit_emails':
      return explicitEmails(spec.emails);
    case 'test':
      return [{ email: spec.email, name: 'Prueba', userId: null }];
  }
}
