import { db } from '@brakestation/db';
import { tickets } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { auth } from '@brakestation/auth';
import { computeRanking } from '@/lib/compute-ranking';

export const dynamic = 'force-dynamic';

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortParam } = await searchParams;
  const session = await auth();
  const isAdmin = Boolean(session?.user?.isAdmin);

  let sessionHasInternalTicket = false;
  if (session?.user?.id) {
    const sessionTickets = await db
      .select({ type: tickets.type })
      .from(tickets)
      .where(eq(tickets.assignedUserId, session.user.id));
    sessionHasInternalTicket = sessionTickets.some((t) => t.type === 'INT');
  }

  // Strict cohort separation:
  // - INT-folio holder → forced into internal ranking, no public access
  // - BS/CD-folio holder → forced into public ranking, no internal access
  // - Admin → can switch between both via the toggle for audit
  let cohort: 'public' | 'int';
  if (isAdmin) {
    cohort = cohortParam === 'int' ? 'int' : 'public';
  } else if (sessionHasInternalTicket) {
    cohort = 'int';
  } else {
    cohort = 'public';
  }

  // Only admins see the toggle. Participants are locked to their own cohort.
  const showCohortToggle = isAdmin;

  const ranked = await computeRanking(cohort);
  const top50 = ranked.slice(0, 50);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/stadium-night.jpg)', filter: 'brightness(1.15) saturate(1.25) contrast(1.05)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e3d]/55 via-[#1a3a6b]/45 to-[#2c1810]/55" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top left, rgba(58,99,168,0.45), transparent 65%), radial-gradient(ellipse at bottom right, rgba(227,33,37,0.30), transparent 70%)' }} />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Regresar al dashboard"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
            </Link>
            <BrandHeader />
          </div>
          <div className="w-16" />
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">
              <span className="text-brand-red">Ranking</span>
              {cohort === 'int' && <span className="text-white/60 text-2xl sm:text-3xl ml-2">· Interno</span>}
            </h1>
            <p className="text-white/70">
              Top 50 participantes · {cohort === 'int' ? 'Empleados Brake Station' : 'Dinámica Goleadora CanaBRAKE'}
            </p>
            <p className="text-white/50 text-xs mt-1">🏆 Solo el 1.<sup>er</sup> lugar gana el premio.</p>
            {showCohortToggle && (
              <div className="mt-4 inline-flex rounded-xl bg-white/[0.08] border border-white/[0.15] p-1">
                <Link
                  href="/ranking?cohort=public"
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${cohort === 'public' ? 'bg-brand-red text-white font-semibold' : 'text-white/70 hover:text-white'}`}
                >
                  Público
                </Link>
                <Link
                  href="/ranking?cohort=int"
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${cohort === 'int' ? 'bg-brand-red text-white font-semibold' : 'text-white/70 hover:text-white'}`}
                >
                  Interno
                </Link>
              </div>
            )}
          </div>

          {top50.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-16 text-center">
              <p className="text-white/70">El ranking aparece cuando se calculen los primeros puntos.</p>
              <p className="text-white/50 text-sm mt-2">Vuelve después del 11 de junio.</p>
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.05] border-b border-white/[0.15]">
                  <tr>
                    <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider w-12">#</th>
                    <th className="px-4 py-3 text-left text-white/80 font-semibold uppercase text-xs tracking-wider">{cohort === 'int' ? 'Participante' : 'Folio'}</th>
                    <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider hidden sm:table-cell">Partidos</th>
                    <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider hidden sm:table-cell">Trivias</th>
                    <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider hidden sm:table-cell">Bonus</th>
                    <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Solo el 1er lugar gana: lo destacamos a el unicamente para
                      no sugerir un podio premiado de 3. El resto, numeros planos. */}
                  {top50.map((r, i) => (
                    <tr key={i} className={`border-b border-white/[0.05] transition-colors ${
                      i === 0 ? 'bg-gradient-to-r from-amber-500/[0.18] via-yellow-500/[0.10] to-transparent border-l-4 border-l-yellow-500'
                      : 'hover:bg-white/[0.04]'
                    }`}>
                      <td className="px-4 py-3 text-center">
                        {i === 0 ? (
                          <span className="text-2xl" title="Ganador">🏆</span>
                        ) : (
                          <span className="text-white/50 font-mono">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cohort === 'int' ? (
                          <>
                            <div className="text-white font-medium">{r.name}</div>
                            <div className="text-xs font-mono text-white/60">{r.ticketCode}</div>
                          </>
                        ) : (
                          <div className="text-white font-mono font-bold">{r.ticketCode}</div>
                        )}
                        <div className="sm:hidden text-[10px] text-white/45 mt-1">
                          Partidos: {r.matchPoints} · Trivias: {r.triviaPoints}{r.bonusPoints > 0 ? ` · Bonus: ${r.bonusPoints}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-white/85 hidden sm:table-cell">{r.matchPoints}</td>
                      <td className="px-4 py-3 text-center text-white/85 hidden sm:table-cell">{r.triviaPoints}</td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {r.bonusPoints > 0 ? <span className="text-yellow-300 font-bold">⭐ {r.bonusPoints}</span> : <span className="text-white/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-brand-red font-bold text-lg">{r.totalPoints}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
