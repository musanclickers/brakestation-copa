import Link from 'next/link';
import { auth } from '@brakestation/auth';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { computeRanking } from '@/lib/compute-ranking';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Ranking' };

export default async function RankingPage() {
  const session = await auth();
  const ranked = await computeRanking();
  const top = ranked.slice(0, 100);
  const myId = session?.user?.id;
  const myIndex = myId ? ranked.findIndex((r) => r.userId === myId) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
        <BrandHeader />
        <Link href={myId ? '/dashboard' : '/entrar'} className="text-sm text-white/80 hover:text-white">
          {myId ? 'Mi panel' : 'Participar'}
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-white">Ranking</h1>
          <p className="text-white/60 text-sm mt-1">
            Empates: gana quien tenga más marcadores exactos, luego más resultados, luego quien guardó su último pronóstico antes.
          </p>
          {myIndex >= 0 && <p className="mt-3 text-brand-gold font-semibold">Vas en el lugar #{myIndex + 1} de {ranked.length}</p>}
        </div>

        {top.length === 0 ? (
          <p className="text-center text-white/60 py-16">Todavía no hay pronósticos. El ranking aparece en cuanto alguien guarde el suyo.</p>
        ) : (
          <ol className="space-y-2">
            {top.map((r, i) => (
              <li
                key={r.userId}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  r.userId === myId ? 'bg-brand-red/20 border-brand-red/50' : i < 3 ? 'bg-brand-gold/10 border-brand-gold/30' : 'bg-white/[0.05] border-white/10'
                }`}
              >
                <span className={`w-8 text-center font-black ${i < 3 ? 'text-brand-gold' : 'text-white/60'}`}>{i + 1}</span>
                <span className="flex-1 min-w-0 truncate font-semibold text-white">{r.name}</span>
                <span className="hidden sm:inline text-xs text-white/50">{r.exactHits} exactos · {r.resultHits} resultados</span>
                <span className="w-14 text-right font-black text-white text-lg">{r.totalPoints}</span>
              </li>
            ))}
          </ol>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
