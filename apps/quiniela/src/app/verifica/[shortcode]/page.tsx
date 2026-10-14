import { db } from '@brakestation/db';
import { phaseSubmissions, matchPredictions, matches, users, auditLog } from '@brakestation/db/schema';
import { PHASE_LABELS, homeName, awayName, type Phase } from '@brakestation/db/phases';
import { verifyPhaseSeal } from '@brakestation/seal';
import { eq, and, asc, like } from 'drizzle-orm';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TeamLabel } from '@/components/TeamLabel';
import { scoreMeta, type PenaltyWinner } from '@/lib/score-match';
import { firstNameInitial } from '@/lib/rank-entries';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Comprobante', robots: { index: false } };

// Comprobante público por shortcode (primeros 8 hex del sello de jornada).
// Muestra el nombre enmascarado ("Luis M."), nunca el email.
export default async function VerificaPage({ params }: { params: Promise<{ shortcode: string }> }) {
  const { shortcode } = await params;
  if (!/^[0-9a-f]{8}$/.test(shortcode)) return <NotFound />;

  const submission = (
    await db.select().from(phaseSubmissions).where(like(phaseSubmissions.phaseSeal, `${shortcode}%`)).limit(1)
  )[0];
  if (!submission) return <NotFound />;
  const phase = submission.phase as Phase;

  const [rows, owner] = await Promise.all([
    db
      .select({ m: matches, h: matchPredictions.predictedHomeScore, a: matchPredictions.predictedAwayScore })
      .from(matches)
      .leftJoin(matchPredictions, and(eq(matchPredictions.matchId, matches.id), eq(matchPredictions.userId, submission.userId)))
      .where(eq(matches.phase, phase))
      .orderBy(asc(matches.startsAt)),
    db.query.users.findFirst({ where: eq(users.id, submission.userId), columns: { name: true } }),
  ]);

  const picks = rows.filter((r) => r.h != null).map((r) => ({ match_code: r.m.matchCode, h: r.h!, a: r.a! }));
  const isValid = verifyPhaseSeal(phase, picks, submission.phaseSeal, process.env.SEAL_SECRET!);
  if (!isValid) {
    await db.insert(auditLog).values({ eventType: 'seal_mismatch', userId: submission.userId, payload: { shortcode, phase } });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <BrandHeader />
        <Link href="/" className="text-sm text-white/70 hover:text-white">Ir al inicio</Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <article className={`rounded-3xl border-2 p-5 sm:p-8 bg-white/[0.06] ${isValid ? 'border-emerald-400/40' : 'border-red-400/50'}`}>
          <p className={`text-xs font-bold uppercase tracking-widest ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
            {isValid ? '✓ Sello válido' : '✗ Sello inválido'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{PHASE_LABELS[phase]}</h1>
          <p className="text-white/70 text-sm mt-1">
            {firstNameInitial(owner?.name ?? 'Participante')} · {submission.matchesInPhase} pronósticos · guardado el{' '}
            {submission.submittedAt.toLocaleString('es-MX', { timeZone: 'America/Merida' })}
          </p>
          <p className="font-mono text-xs text-white/40 break-all mt-3">{submission.phaseSeal}</p>
          {!isValid && (
            <p className="mt-4 text-sm text-red-200">
              Los pronósticos guardados ya no coinciden con este sello. Si lo cambiaste después, busca el comprobante más reciente en tu correo.
            </p>
          )}

          <ul className="mt-6 space-y-2">
            {rows.map(({ m, h, a }) => {
              const done = m.actualHomeScore != null && m.actualAwayScore != null;
              const meta = done && h != null ? scoreMeta(h, a!, m.actualHomeScore!, m.actualAwayScore!, m.penaltyWinner as PenaltyWinner) : null;
              return (
                <li key={m.id} className={`rounded-2xl border p-3 ${meta ? meta.tint : 'bg-white/[0.04] border-white/10'}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0"><TeamLabel sponsor={m.sponsorHome} refaccionaria={m.refaccionariaHome} align="right" /></div>
                    <span className="font-mono font-black text-white text-lg w-16 text-center">{h ?? '–'} - {a ?? '–'}</span>
                    <div className="flex-1 min-w-0"><TeamLabel sponsor={m.sponsorAway} refaccionaria={m.refaccionariaAway} align="left" /></div>
                  </div>
                  {done && (
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-white/70">
                        Resultado {m.actualHomeScore}–{m.actualAwayScore}
                        {m.penaltyWinner && ` · Serie de penales: ganó ${m.penaltyWinner === 'home' ? homeName(m) : awayName(m)}`}
                      </span>
                      {meta && <span className={`px-2 py-0.5 rounded-full font-bold ${meta.bg}`}>{meta.label}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-brand-deep text-center">
      <BrandHeader />
      <h1 className="text-2xl font-bold text-white mt-6">No encontramos ese comprobante</h1>
      <p className="text-white/60 mt-2 max-w-sm">Revisa el código. Si cambiaste tus pronósticos, usa el sello del correo más reciente.</p>
      <Link href="/" className="mt-6 text-brand-gold underline">Ir al inicio</Link>
    </main>
  );
}
