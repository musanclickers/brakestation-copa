import { auth } from '@brakestation/auth';
import { db } from '@brakestation/db';
import {
  matches,
  matchPredictions,
  phaseSubmissions,
  tickets,
  ticketRegistrations,
  auditLog,
} from '@brakestation/db/schema';
import {
  isPhaseOpen,
  PHASE_LABELS,
  type Phase,
  PHASE_ORDER,
} from '@brakestation/db/phases';
import { generatePhaseSeal, generateSeal } from '@brakestation/seal';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { comprobanteHtml } from '@/lib/email-templates';
import { sendWhatsApp } from '@/lib/whatsapp';
import { waSealedMessage } from '@/lib/whatsapp-messages';

export const dynamic = 'force-dynamic';

const PredictionSchema = z.object({
  match_id: z.string().uuid(),
  predicted_home_score: z.number().int().min(0).max(20),
  predicted_away_score: z.number().int().min(0).max(20),
});

const BodySchema = z.object({
  ticket_code: z.string().regex(/^(BS|CD|INT)-[A-Z]\d{3}$/),
  predictions: z.array(PredictionSchema).min(1),
  terms_accepted: z.literal(true),
});

const resend = new Resend(process.env.RESEND_API_KEY);
const SEAL_SECRET = process.env.SEAL_SECRET!;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ phase: string }> },
) {
  const { phase: phaseParam } = await params;
  if (!PHASE_ORDER.includes(phaseParam as Phase)) {
    return NextResponse.json({ error: 'invalid_phase' }, { status: 400 });
  }
  const phase = phaseParam as Phase;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const phaseStatus = await isPhaseOpen(phase);
  if (!phaseStatus.open) {
    await db.insert(auditLog).values({
      eventType: 'submit_blocked',
      userId: session.user.id,
      payload: { phase, reason: phaseStatus.reason },
    });
    return NextResponse.json({
      error: 'phase_closed',
      reason: phaseStatus.reason,
      message: messageForCloseReason(phaseStatus.reason),
    }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { ticket_code, predictions } = parsed.data;

  // En eliminatoria (r32 en adelante) no se permite empate: debe haber ganador.
  // Candado real server-side; el cliente además lo bloquea en la UI.
  const KNOCKOUT_PHASES: Phase[] = ['r32', 'r16', 'qf', 'sf', 'final_phase'];
  if (
    KNOCKOUT_PHASES.includes(phase) &&
    predictions.some((p) => p.predicted_home_score === p.predicted_away_score)
  ) {
    return NextResponse.json(
      { error: 'draw_not_allowed', message: 'En eliminatoria debes elegir un ganador: no se permite empate.' },
      { status: 400 },
    );
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.code, ticket_code),
  });
  if (!ticket) {
    return NextResponse.json({ error: 'ticket_not_found' }, { status: 404 });
  }
  if (ticket.redeemedAt && ticket.assignedUserId !== session.user.id) {
    return NextResponse.json({ error: 'ticket_belongs_to_another_user' }, { status: 403 });
  }

  if (ticket.registrationRequired) {
    if (!ticket.registrationId) {
      return NextResponse.json(
        { error: 'registration_required', message: 'Debes completar el registro con foto antes de enviar predicciones.' },
        { status: 403 },
      );
    }
    const registration = await db.query.ticketRegistrations.findFirst({
      where: eq(ticketRegistrations.id, ticket.registrationId),
    });
    if (!registration || registration.reviewStatus !== 'approved') {
      return NextResponse.json(
        { error: 'registration_not_approved', message: 'Tu registro está en revisión. Te avisaremos en cuanto sea aprobado.' },
        { status: 403 },
      );
    }
  }

  const phaseMatches = await db
    .select({ id: matches.id, matchCode: matches.matchCode, phase: matches.phase, startsAt: matches.startsAt })
    .from(matches)
    .where(eq(matches.phase, phase));

  const now = new Date();

  // INT folios get a grace period on the tournament's very first match while
  // it's still in progress — once the final score is loaded or 2.5h after
  // kickoff has passed, the bypass is dropped and the lock applies normally.
  const MATCH_DURATION_BUFFER_MS = 2.5 * 60 * 60 * 1000;
  let firstMatchBypassId: string | null = null;
  if (ticket.type === 'INT') {
    const firstOfTournament = await db
      .select({ id: matches.id, startsAt: matches.startsAt, actualHomeScore: matches.actualHomeScore })
      .from(matches)
      .orderBy(asc(matches.scheduledAt))
      .limit(1);
    const first = firstOfTournament[0];
    if (first) {
      const finalLoaded = first.actualHomeScore !== null;
      const startedAndBufferElapsed = first.startsAt
        ? new Date(first.startsAt).getTime() + MATCH_DURATION_BUFFER_MS <= now.getTime()
        : false;
      if (!finalLoaded && !startedAndBufferElapsed) {
        firstMatchBypassId = first.id;
      }
    }
  }

  const phaseMatchIds = new Set(phaseMatches.map((m) => m.id));
  const lockedMatchIds = new Set(
    phaseMatches
      .filter((m) => m.startsAt && new Date(m.startsAt).getTime() <= now.getTime())
      .filter((m) => m.id !== firstMatchBypassId)
      .map((m) => m.id),
  );

  for (const p of predictions) {
    if (!phaseMatchIds.has(p.match_id)) {
      return NextResponse.json(
        { error: 'validation', details: ['match does not belong to this phase'] },
        { status: 400 },
      );
    }
    if (lockedMatchIds.has(p.match_id)) {
      return NextResponse.json(
        { error: 'match_locked', message: 'No puedes pronosticar un partido que ya comenzó.' },
        { status: 400 },
      );
    }
  }

  const existing = await db.query.phaseSubmissions.findFirst({
    where: and(
      eq(phaseSubmissions.userId, session.user.id),
      eq(phaseSubmissions.ticketCode, ticket_code),
      eq(phaseSubmissions.phase, phase),
    ),
  });

  if (existing) {
    return NextResponse.json(
      {
        error: 'already_sealed',
        message: 'Esta fase ya fue sellada y no puede modificarse.',
      },
      { status: 409 },
    );
  }

  const matchCodeMap = new Map(phaseMatches.map((m) => [m.id, m.matchCode]));
  const submittedAt = new Date();
  let phaseSeal = '';
  let totalCount = 0;

  try {
    await db.transaction(async (tx) => {
      for (const p of predictions) {
        const matchCode = matchCodeMap.get(p.match_id)!;
        const seal = generateSeal(
          {
            v: '1.0',
            type: 'match_prediction',
            ticket_code,
            match_code: matchCode,
            user_id: session.user!.id,
            data: {
              home_score: p.predicted_home_score,
              away_score: p.predicted_away_score,
            },
          },
          SEAL_SECRET,
        );
        await tx.insert(matchPredictions).values({
          userId: session.user!.id!,
          ticketCode: ticket_code,
          matchId: p.match_id,
          predictedHomeScore: p.predicted_home_score,
          predictedAwayScore: p.predicted_away_score,
          seal,
          submittedAt,
        }).onConflictDoUpdate({
          target: [matchPredictions.userId, matchPredictions.ticketCode, matchPredictions.matchId],
          set: {
            predictedHomeScore: p.predicted_home_score,
            predictedAwayScore: p.predicted_away_score,
            seal,
            submittedAt,
          },
        });
      }

      const allPreds = await tx
        .select({
          matchId: matchPredictions.matchId,
          predictedHomeScore: matchPredictions.predictedHomeScore,
          predictedAwayScore: matchPredictions.predictedAwayScore,
        })
        .from(matchPredictions)
        .where(and(
          eq(matchPredictions.userId, session.user!.id!),
          eq(matchPredictions.ticketCode, ticket_code),
          inArray(matchPredictions.matchId, Array.from(phaseMatchIds)),
        ));

      totalCount = allPreds.length;
      const picks = allPreds.map((p) => ({
        match_code: matchCodeMap.get(p.matchId)!,
        h: p.predictedHomeScore,
        a: p.predictedAwayScore,
      }));
      phaseSeal = generatePhaseSeal(phase, picks, SEAL_SECRET);

      await tx.insert(phaseSubmissions).values({
        userId: session.user!.id!,
        ticketCode: ticket_code,
        phase,
        matchesInPhase: totalCount,
        submittedAt,
        phaseSeal,
      });

      if (!ticket.redeemedAt) {
        await tx
          .update(tickets)
          .set({ redeemedAt: submittedAt, assignedUserId: session.user!.id })
          .where(eq(tickets.code, ticket_code));
      }

      await tx.insert(auditLog).values({
        eventType: 'phase_submitted',
        userId: session.user!.id,
        ticketCode: ticket_code,
        payload: { phase, count: totalCount, phase_seal: phaseSeal },
      });
    });
  } catch (err) {
    console.error(`[POST /api/phases/${phase}/predictions/submit] transaction failed:`, err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  const shortcode = phaseSeal.slice(0, 8);

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>',
      to: session.user.email!,
      subject: `Tu quiniela — Comprobante de fase sellada`,
      html: comprobanteHtml({ ticket_code, phase: PHASE_LABELS[phase] ?? phase, phase_seal: phaseSeal, shortcode, submitted_at: submittedAt }),
    });
  } catch (err) {
    console.error('[email] resend send failed:', err);
  }

  try {
    const reg = await db.query.ticketRegistrations.findFirst({
      where: eq(ticketRegistrations.ticketCode, ticket_code),
      columns: { participantPhone: true },
    });
    if (reg?.participantPhone) {
      sendWhatsApp(reg.participantPhone, waSealedMessage(ticket_code, PHASE_LABELS[phase] ?? phase, shortcode));
    }
  } catch {
    // non-blocking
  }

  return NextResponse.json(
    { phase_seal: phaseSeal, shortcode, submitted_at: submittedAt.toISOString() },
    { status: 201 },
  );
}

function messageForCloseReason(reason?: string): string {
  switch (reason) {
    case 'before_window': return 'Esta fase aún no se ha abierto. Intenta más tarde.';
    case 'all_matches_started': return 'Todos los partidos de esta fase ya comenzaron.';
    case 'teams_not_loaded': return 'Esta fase aún no tiene los equipos confirmados. Vuelve después de que se definan los enfrentamientos.';
    case 'matches_not_synced': return 'Calendario aún no disponible. Vuelve en unos minutos.';
    default: return 'Fase no disponible.';
  }
}
