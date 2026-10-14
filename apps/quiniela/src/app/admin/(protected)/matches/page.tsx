import { db } from '@brakestation/db';
import { matches, phaseSubmissions, tickets } from '@brakestation/db/schema';
import { asc, eq, sql } from 'drizzle-orm';
import { AdminMatchEditor } from '@/components/AdminMatchEditor';
import { SyncButton } from './SyncButton';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage() {
  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.scheduledAt));

  const submissionCounts = await db
    .select({
      phase: phaseSubmissions.phase,
      type: tickets.type,
      count: sql<number>`count(*)::int`,
    })
    .from(phaseSubmissions)
    .innerJoin(tickets, eq(phaseSubmissions.ticketCode, tickets.code))
    .groupBy(phaseSubmissions.phase, tickets.type);

  const countMap: Record<string, { public: number; internal: number }> = {};
  for (const row of submissionCounts) {
    if (!countMap[row.phase]) countMap[row.phase] = { public: 0, internal: 0 };
    if (row.type === 'INT') {
      countMap[row.phase]!.internal += row.count;
    } else {
      countMap[row.phase]!.public += row.count;
    }
  }

  const serialized = allMatches.map((m) => ({
    id: m.id,
    matchCode: m.matchCode,
    phase: m.phase,
    teamHome: m.teamHome,
    teamAway: m.teamAway,
    scheduledAt: m.scheduledAt.toISOString(),
    actualHomeTeam: m.actualHomeTeam,
    actualAwayTeam: m.actualAwayTeam,
    actualHomeScore: m.actualHomeScore,
    actualAwayScore: m.actualAwayScore,
    penaltyWinner: m.penaltyWinner,
  }));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white mb-1">Admin — Partidos</h1>
          <p className="text-white/80 text-sm">Edita equipos reales y marcadores. {serialized.length} partidos totales.</p>
        </div>
        <SyncButton />
      </div>

      <AdminMatchEditor matches={serialized} sealedCounts={countMap} />
    </div>
  );
}
