import { db } from '@brakestation/db';
import { matches, phaseSubmissions, matchPredictions, ticketRegistrations, tickets } from '@brakestation/db/schema';
import { PHASE_ORDER, PHASE_LABELS, PHASE_WINDOWS, PHASE_MATCH_COUNTS, getCurrentPhase, isPhaseOpen, isPhasePreviewable, type Phase } from '@brakestation/db/phases';
import { eq, and, asc, inArray, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@brakestation/ui';
import { PhaseForm } from '@/components/PhaseForm';
import { getAuthUser } from '@/lib/get-auth-user';

export const dynamic = 'force-dynamic';

type MatchRow = {
  id: string;
  matchCode: string;
  phase: string;
  groupLetter: string | null;
  teamHome: string;
  teamAway: string;
  scheduledAt: Date;
  actualHomeTeam: string | null;
  actualAwayTeam: string | null;
};

type ExistingPrediction = {
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
};

export default async function QuinielaPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; as?: string; phase?: string }>;
}) {
  const { ticket: ticketCode, as: impersonateId, phase: phaseParam } = await searchParams;
  const user = await getAuthUser(impersonateId);
  if (!user) redirect('/activar');

  const isAdminPreview = !ticketCode && user.isAdmin;

  let pendingApproval = false;
  if (ticketCode && !isAdminPreview) {
    const pendingReg = await db.query.ticketRegistrations.findFirst({
      where: and(
        eq(ticketRegistrations.userId, user.id),
        or(
          eq(ticketRegistrations.reviewStatus, 'pending'),
          eq(ticketRegistrations.reviewStatus, 'awaiting_new_photo'),
        ),
      ),
      columns: { id: true },
    });
    pendingApproval = !!pendingReg;
  }

  if (!ticketCode && !user.isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <Logo variant="brakestation" className="h-16 mx-auto mb-4" />
        <h1 className="font-display text-3xl text-brand-red mb-4">Necesitas un boleto</h1>
        <p className="text-brand-navy/70 text-center max-w-md mb-6">
          Para llenar tu quiniela necesitas un código de boleto válido.
          Escanea el QR de tu boleto o pide tu código en tu sucursal Brake Station.
        </p>
        <Link href="/dashboard" className="text-brand-blue text-sm hover:underline">
          ← Ir al dashboard
        </Link>
      </main>
    );
  }

  const requestedPhase = phaseParam && (PHASE_ORDER as readonly string[]).includes(phaseParam)
    ? (phaseParam as Phase)
    : null;
  const currentPhase = requestedPhase ?? await getCurrentPhase();

  const allMatches = await db
    .select({
      id: matches.id,
      matchCode: matches.matchCode,
      phase: matches.phase,
      groupLetter: matches.groupLetter,
      teamHome: matches.teamHome,
      teamAway: matches.teamAway,
      scheduledAt: matches.scheduledAt,
      startsAt: matches.startsAt,
      venueName: matches.venueName,
      venueCity: matches.venueCity,
      actualHomeTeam: matches.actualHomeTeam,
      actualAwayTeam: matches.actualAwayTeam,
      actualHomeScore: matches.actualHomeScore,
      actualAwayScore: matches.actualAwayScore,
      penaltyWinner: matches.penaltyWinner,
    })
    .from(matches)
    .orderBy(asc(matches.scheduledAt));

  let submissions: typeof phaseSubmissions.$inferSelect[] = [];
  const existingPredictions: Record<string, ExistingPrediction[]> = {};

  if (ticketCode) {
    submissions = await db
      .select()
      .from(phaseSubmissions)
      .where(
        and(
          eq(phaseSubmissions.userId, user.id),
          eq(phaseSubmissions.ticketCode, ticketCode),
        ),
      );

    if (submissions.length > 0) {
      const preds = await db
        .select({
          matchId: matchPredictions.matchId,
          predictedHomeScore: matchPredictions.predictedHomeScore,
          predictedAwayScore: matchPredictions.predictedAwayScore,
        })
        .from(matchPredictions)
        .where(
          and(
            eq(matchPredictions.userId, user.id),
            eq(matchPredictions.ticketCode, ticketCode),
          ),
        );

      const matchPhaseMap = new Map(allMatches.map((m) => [m.id, m.phase]));
      for (const p of preds) {
        const mPhase = matchPhaseMap.get(p.matchId) ?? 'unknown';
        if (!existingPredictions[mPhase]) existingPredictions[mPhase] = [];
        existingPredictions[mPhase].push(p);
      }
    }
  }

  const phaseOpenMap: Record<string, boolean> = {};
  for (const phase of PHASE_ORDER) {
    const result = await isPhaseOpen(phase);
    phaseOpenMap[phase] = result.open;
  }

  const elim = await isPhasePreviewable('r32');
  const showEliminatoria = elim.previewable || (phaseOpenMap['r32'] ?? false);

  const serializedMatches = allMatches.map((m) => ({
    ...m,
    scheduledAt: m.scheduledAt.toISOString(),
    startsAt: m.startsAt?.toISOString() ?? null,
  }));

  const serializedSubmissions = submissions.map((s) => ({
    phase: s.phase,
    phaseSeal: s.phaseSeal,
    submittedAt: s.submittedAt.toISOString(),
    matchesInPhase: s.matchesInPhase,
  }));

  // INT folios get an open first match even after kickoff, but only while it's
  // still in progress. Once the final score is loaded or 2.5h after kickoff
  // passes, the bypass is dropped and the per-match lock applies normally.
  let internalFirstMatchBypassId: string | null = null;
  if (ticketCode) {
    const ticketRow = await db.query.tickets.findFirst({
      where: eq(tickets.code, ticketCode),
      columns: { type: true },
    });
    if (ticketRow?.type === 'INT' && serializedMatches.length > 0) {
      const first = serializedMatches[0]!;
      const MATCH_DURATION_BUFFER_MS = 2.5 * 60 * 60 * 1000;
      const finalLoaded = first.actualHomeScore !== null;
      const startedAndBufferElapsed = first.startsAt
        ? new Date(first.startsAt).getTime() + MATCH_DURATION_BUFFER_MS <= Date.now()
        : false;
      if (!finalLoaded && !startedAndBufferElapsed) {
        internalFirstMatchBypassId = first.id;
      }
    }
  }

  return (
    <PhaseForm
      ticketCode={ticketCode ?? 'ADMIN'}
      currentPhase={currentPhase}
      allMatches={serializedMatches}
      submissions={serializedSubmissions}
      existingPredictions={existingPredictions}
      phaseOpenMap={phaseOpenMap}
      userEmail={user.email}
      readOnly={isAdminPreview}
      pendingApproval={pendingApproval}
      internalFirstMatchBypassId={internalFirstMatchBypassId}
      showEliminatoria={showEliminatoria}
    />
  );
}
