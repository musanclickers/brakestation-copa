import { db } from '@brakestation/db';
import { phaseSubmissions, matchPredictions } from '@brakestation/db/schema';
import { getCurrentPhase, isPhase } from '@brakestation/db/phases';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PhaseForm } from '@/components/PhaseForm';
import { getAuthUser } from '@/lib/get-auth-user';
import { loadMatches } from '@/lib/matches';

export const dynamic = 'force-dynamic';

export default async function QuinielaPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; phase?: string }>;
}) {
  const { as: impersonateId, phase: phaseParam } = await searchParams;
  const user = await getAuthUser(impersonateId);
  if (!user) redirect('/entrar');

  const currentPhase = phaseParam && isPhase(phaseParam) ? phaseParam : await getCurrentPhase();

  const [allMatches, submissions, preds] = await Promise.all([
    loadMatches(),
    db.select().from(phaseSubmissions).where(eq(phaseSubmissions.userId, user.id)),
    db
      .select({ matchId: matchPredictions.matchId, h: matchPredictions.predictedHomeScore, a: matchPredictions.predictedAwayScore })
      .from(matchPredictions)
      .where(eq(matchPredictions.userId, user.id)),
  ]);

  return (
    <PhaseForm
      currentPhase={currentPhase}
      allMatches={allMatches}
      submissions={submissions.map((s) => ({
        phase: s.phase,
        phaseSeal: s.phaseSeal,
        submittedAt: s.submittedAt.toISOString(),
        matchesInPhase: s.matchesInPhase,
      }))}
      existingPredictions={Object.fromEntries(preds.map((p) => [p.matchId, { h: p.h, a: p.a }]))}
      userEmail={user.email}
      readOnly={Boolean(user.impersonating)}
    />
  );
}
