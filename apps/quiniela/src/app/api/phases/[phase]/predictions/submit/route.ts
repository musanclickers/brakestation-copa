import { auth, EMAIL_FROM } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { matches, matchPredictions, phaseSubmissions, auditLog } from '@brakestation/db/schema';
import { isPhase, isMatchOpen, isMatchLocked, homeName, awayName, PHASE_LABELS } from '@brakestation/db/phases';
import { generatePhaseSeal, generateSeal } from '@brakestation/seal';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { comprobanteHtml } from '@/lib/email-templates';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  predictions: z
    .array(
      z.object({
        match_id: z.string().uuid(),
        predicted_home_score: z.number().int().min(0).max(20),
        predicted_away_score: z.number().int().min(0).max(20),
      }),
    )
    .min(1)
    .max(8),
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Guarda (upsert) pronósticos de una jornada. Cada partido se puede editar hasta
// su propio lockout (15 min antes); que un partido de la jornada ya haya cerrado
// no bloquea a los demás. Cada guardado regenera el sello de la jornada.
export async function POST(req: Request, { params }: { params: Promise<{ phase: string }> }) {
  if (!isSameOrigin(req)) return forbiddenOrigin();

  const { phase } = await params;
  if (!isPhase(phase)) return NextResponse.json({ error: 'invalid_phase' }, { status: 400 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', details: parsed.error.issues }, { status: 400 });
  }
  const { predictions } = parsed.data;

  const phaseMatches = await db.select().from(matches).where(eq(matches.phase, phase));
  const byId = new Map(phaseMatches.map((m) => [m.id, m]));
  const now = new Date();

  for (const p of predictions) {
    const m = byId.get(p.match_id);
    if (!m) {
      return NextResponse.json({ error: 'validation', message: 'Ese partido no es de esta jornada.' }, { status: 400 });
    }
    if (isMatchLocked(m.startsAt, now)) {
      await db.insert(auditLog).values({ eventType: 'submit_blocked', userId, payload: { phase, match: m.matchCode, reason: 'locked' } });
      return NextResponse.json(
        { error: 'match_locked', message: `${homeName(m) ?? m.displayLabel} vs ${awayName(m) ?? ''} ya no acepta pronósticos: cerró 15 minutos antes de empezar.` },
        { status: 409 },
      );
    }
    if (!isMatchOpen(m, now)) {
      return NextResponse.json({ error: 'teams_not_loaded', message: 'Este partido todavía no tiene equipos definidos.' }, { status: 409 });
    }
    // Fase final: no hay empates (se definen en penales), hay que elegir ganador.
    if (phase === 'final' && p.predicted_home_score === p.predicted_away_score) {
      return NextResponse.json(
        { error: 'draw_not_allowed', message: 'En la Fase Final no hay empates: elige quién gana.' },
        { status: 400 },
      );
    }
  }

  const SEAL_SECRET = process.env.SEAL_SECRET!;
  const submittedAt = new Date();
  let phaseSeal = '';
  let allPreds: { matchId: string; h: number; a: number }[] = [];

  try {
    await db.transaction(async (tx) => {
      for (const p of predictions) {
        const m = byId.get(p.match_id)!;
        const seal = generateSeal(
          { v: '1.0', type: 'match_prediction', match_code: m.matchCode, user_id: userId, data: { home_score: p.predicted_home_score, away_score: p.predicted_away_score } },
          SEAL_SECRET,
        );
        const values = { predictedHomeScore: p.predicted_home_score, predictedAwayScore: p.predicted_away_score, seal, submittedAt };
        await tx
          .insert(matchPredictions)
          .values({ userId, matchId: p.match_id, ...values })
          .onConflictDoUpdate({ target: [matchPredictions.userId, matchPredictions.matchId], set: values });
      }

      allPreds = await tx
        .select({ matchId: matchPredictions.matchId, h: matchPredictions.predictedHomeScore, a: matchPredictions.predictedAwayScore })
        .from(matchPredictions)
        .innerJoin(matches, eq(matches.id, matchPredictions.matchId))
        .where(and(eq(matchPredictions.userId, userId), eq(matches.phase, phase)));

      phaseSeal = generatePhaseSeal(
        phase,
        allPreds.map((r) => ({ match_code: byId.get(r.matchId)!.matchCode, h: r.h, a: r.a })),
        SEAL_SECRET,
      );
      const sub = { matchesInPhase: allPreds.length, submittedAt, phaseSeal };
      await tx
        .insert(phaseSubmissions)
        .values({ userId, phase, ...sub })
        .onConflictDoUpdate({ target: [phaseSubmissions.userId, phaseSubmissions.phase], set: sub });

      await tx.insert(auditLog).values({
        eventType: 'phase_submitted',
        userId,
        payload: { phase, saved: predictions.length, total: allPreds.length, phase_seal: phaseSeal },
      });
    });
  } catch (err) {
    console.error(`[POST /api/phases/${phase}/predictions/submit] transaction failed:`, err);
    return NextResponse.json({ error: 'internal', message: 'No pudimos guardar. Intenta de nuevo.' }, { status: 500 });
  }

  const shortcode = phaseSeal.slice(0, 8);

  try {
    const picks = allPreds
      .map((r) => ({ m: byId.get(r.matchId)!, h: r.h, a: r.a }))
      .sort((x, y) => x.m.startsAt.getTime() - y.m.startsAt.getTime())
      .map(({ m, h, a }) => ({ home: homeName(m) ?? '', away: awayName(m) ?? '', h, a }));
    await resend.emails.send({
      from: EMAIL_FROM,
      to: session.user.email!,
      subject: `Tus pronósticos de ${PHASE_LABELS[phase]} · Copa Brake Station`,
      html: comprobanteHtml({ phase: PHASE_LABELS[phase], shortcode, submittedAt, picks }),
    });
  } catch (err) {
    console.error('[email] resend send failed:', err);
  }

  return NextResponse.json(
    { phase_seal: phaseSeal, shortcode, submitted_at: submittedAt.toISOString(), total: allPreds.length },
    { status: 201 },
  );
}
