import { db } from '@brakestation/db';
import { matches } from '@brakestation/db/schema';
import { inArray, asc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BracketView } from '@/components/BracketView';
import { getAuthUser } from '@/lib/get-auth-user';
import type { BracketMatch } from '@/lib/bracket';

export const dynamic = 'force-dynamic';

export default async function EliminatoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as: impersonateId } = await searchParams;
  const user = await getAuthUser(impersonateId);
  if (!user) redirect('/activar');

  const asSuffix = user.impersonating && impersonateId ? `?as=${impersonateId}` : '';

  const rows = await db
    .select({
      id: matches.id,
      matchCode: matches.matchCode,
      phase: matches.phase,
      teamHome: matches.teamHome,
      teamAway: matches.teamAway,
      actualHomeTeam: matches.actualHomeTeam,
      actualAwayTeam: matches.actualAwayTeam,
      startsAt: matches.startsAt,
      venueName: matches.venueName,
    })
    .from(matches)
    .where(inArray(matches.phase, ['r32', 'r16', 'qf', 'sf', 'final_phase']))
    .orderBy(asc(matches.scheduledAt));

  const bracketMatches: BracketMatch[] = rows.map((m) => ({
    id: m.id,
    matchCode: m.matchCode,
    phase: m.phase,
    // Para eliminatoria, teamHome/teamAway son 'TBD'; el equipo real llega en actual*.
    homeTeam: m.actualHomeTeam,
    awayTeam: m.actualAwayTeam,
    startsAt: m.startsAt ? m.startsAt.toISOString() : null,
    venueName: m.venueName,
  }));

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <BrandHeader />
        <Link href={`/dashboard${asSuffix}`} className="text-white/60 text-xs hover:text-white">← Dashboard</Link>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-white mb-1">Eliminatoria</h1>
        <p className="text-white/50 text-sm mb-6">Los cruces se completan conforme termina la fase de grupos.</p>
        <BracketView matches={bracketMatches} />
      </main>
      <SiteFooter />
    </div>
  );
}
