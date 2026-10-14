import { db } from '@brakestation/db';
import { trivias, triviaResponses } from '@brakestation/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { TriviaList } from '@/components/TriviaList';
import { SiteFooter } from '@/components/SiteFooter';
import { getAuthUser } from '@/lib/get-auth-user';
import { getCanonicalTriviaIds } from '@/lib/compute-trivia-points';

export const dynamic = 'force-dynamic';

export default async function TriviasPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; as?: string }>;
}) {
  const { ticket: ticketCode, as: impersonateId } = await searchParams;
  const user = await getAuthUser(impersonateId);
  if (!user) redirect('/activar');

  // Read EVERY trivia (open + closed + future) so we can identify canonical
  // ones and map the participant's older responses to the right canonical.
  const allTrivias = await db.select().from(trivias);
  const canonicalIds = getCanonicalTriviaIds(allTrivias);

  // The participant sees open canonical trivias plus closed ones they answered
  // (as history, so their trivia points are explained). Future trivias stay
  // hidden. Admin impersonation sees every closed canonical to audit answers.
  // The closed-but-answered filter happens after responses are mapped below.
  const now = Date.now();
  const visibleTrivias = allTrivias.filter((t) => {
    if (!canonicalIds.has(t.id)) return false;
    if (t.opensAt.getTime() > now) return false;
    return true;
  });

  const responses = await db
    .select()
    .from(triviaResponses)
    .where(eq(triviaResponses.userId, user.id));

  // Build a normalized cluster key per trivia so we can re-attach responses
  // that were originally written against a now-superseded duplicate trivia.
  function normalize(q: string) {
    return q.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  const triviaById = new Map(allTrivias.map((t) => [t.id, t]));
  const canonicalByCluster = new Map<string, typeof allTrivias[number]>();
  for (const t of allTrivias) {
    if (!canonicalIds.has(t.id)) continue;
    canonicalByCluster.set(`${t.phaseLabel}|${normalize(t.question)}`, t);
  }

  // For each (cluster the user touched), re-point one response to the canonical
  // trivia for display. The HMAC seal in trivia_responses stays as written —
  // only the in-memory view is rewritten.
  //
  // Selection mirrors the SCORING (lib/compute-trivia-points): scoring credits a
  // question if ANY answered copy is correct, so the panel must surface a CORRECT
  // response when one exists (else the oldest). This keeps panel == points: a
  // question shows ✓ exactly when it awards the 2 pts. Picking the oldest blindly
  // would show ✗ on questions that legitimately scored (8 such cases in prod).
  const responseByCanonicalId = new Map<string, { selectedOption: string; submittedAt: Date; correct: boolean }>();
  const respsSorted = [...responses].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  for (const r of respsSorted) {
    const t = triviaById.get(r.triviaId);
    if (!t) continue;
    const canonical = canonicalByCluster.get(`${t.phaseLabel}|${normalize(t.question)}`);
    if (!canonical) continue;
    const isCorrect = r.selectedOption === t.correctOption;
    const cur = responseByCanonicalId.get(canonical.id);
    // Keep the earliest correct answer; if none correct yet, keep the oldest.
    if (cur && (cur.correct || !isCorrect)) continue;
    responseByCanonicalId.set(canonical.id, { selectedOption: r.selectedOption, submittedAt: r.submittedAt, correct: isCorrect });
  }

  const PHASE_ORDER = ['groups_m1','groups_m2','groups_m3','r32','r16','qf','sf','final_phase'] as const;
  const phaseRank = (label: string) => {
    const idx = PHASE_ORDER.indexOf(label as typeof PHASE_ORDER[number]);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const serialized = visibleTrivias
    .map((t) => {
      const resp = responseByCanonicalId.get(t.id) ?? null;
      const answered = resp !== null;
      return {
        id: t.id,
        phaseLabel: t.phaseLabel,
        question: t.question,
        optionA: t.optionA,
        optionB: t.optionB,
        optionC: t.optionC,
        category: t.category,
        answered,
        selectedOption: resp?.selectedOption ?? null,
        correctOption: user.impersonating || answered ? t.correctOption : null,
        closed: t.closesAt.getTime() <= now,
      };
    })
    // Closed trivias only stay if answered (history); admin sees all closed.
    .filter((t) => user.impersonating || !t.closed || t.answered)
    .sort((a, b) => {
      const aVal = a.answered ? 1 : 0;
      const bVal = b.answered ? 1 : 0;
      if (aVal !== bVal) return aVal - bVal;
      return phaseRank(a.phaseLabel) - phaseRank(b.phaseLabel);
    });

  const allAnswered = serialized.length > 0 && serialized.every((t) => t.answered);

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
          <div className="text-right">
            {ticketCode && <p className="text-xs font-mono font-bold text-brand-red">{ticketCode}</p>}
            <p className="text-[10px] text-white/50">{user.email}</p>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Trivias bonus</h1>
          <p className="text-white/80 mb-8">
            Responde trivias de fútbol y de marca CanaBRAKE × Brake Station para ganar puntos extra.
          </p>

          {serialized.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/[0.05] border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-xl font-bold text-white mb-2">No hay trivias activas</h2>
              <p className="text-white/70 mb-6">
                Las trivias se abren entre fases del Mundial. Te avisaremos cuando haya una nueva disponible.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-2.5 rounded-xl bg-white/[0.10] hover:bg-white/[0.15] text-white font-medium border border-white/20 transition-colors"
              >
                ← Regresar al dashboard
              </Link>
            </div>
          ) : (
            <TriviaList trivias={serialized} ticketCode={ticketCode ?? ''} readOnly={!!user.impersonating} />
          )}

          {allAnswered && (
            <div className="text-center mt-8">
              <Link
                href="/dashboard"
                className="inline-block px-8 py-3 rounded-xl bg-brand-red text-white font-bold hover:bg-red-600 transition-colors"
              >
                ← Regresar al dashboard
              </Link>
            </div>
          )}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
