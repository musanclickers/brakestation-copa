import { auth } from '@brakestation/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatMatchTime } from '@brakestation/ui/time';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TeamLabel } from '@/components/TeamLabel';
import { loadMatches } from '@/lib/matches';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const all = await loadMatches();
  const next = all.filter((m) => m.home && new Date(m.startsAt).getTime() > Date.now()).slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <main className="max-w-4xl mx-auto px-4 pt-10 pb-6 flex flex-col items-center text-center">
        <BrandHeader size="lg" />
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-brand-gold font-semibold">Primera Edición 2026</p>
        <h1 className="mt-2 font-display text-4xl sm:text-6xl text-white leading-none">Quiniela Copa Brake Station</h1>
        <p className="mt-4 max-w-xl text-white/75 text-base sm:text-lg">
          Ocho equipos, 32 partidos, del 17 de octubre al 6 de diciembre. Pronostica cada marcador y compite con amigos, familia y compañeros de trabajo.
        </p>
        <Link
          href="/entrar"
          className="mt-8 inline-block bg-brand-red hover:bg-red-600 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-[0_10px_30px_rgba(227,33,37,0.4)] transition-colors"
        >
          Quiero participar
        </Link>
        <Link href="/entrar" className="mt-3 text-sm text-white/60 underline">Ya me registré, entrar</Link>

        <section className="mt-12 grid w-full gap-3 sm:grid-cols-3 text-left">
          {[
            ['10 puntos', 'si le atinas al marcador exacto.'],
            ['3 puntos', 'si aciertas quién gana o que hay empate.'],
            ['15 minutos', 'antes de cada partido se cierran los pronósticos. Hasta entonces puedes cambiarlos.'],
          ].map(([big, small]) => (
            <div key={big} className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
              <p className="font-display text-3xl text-brand-gold">{big}</p>
              <p className="text-sm text-white/75 mt-1">{small}</p>
            </div>
          ))}
        </section>

        {next.length > 0 && (
          <section className="mt-12 w-full text-left">
            <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-3">Próximos partidos</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {next.map((m) => {
                const t = formatMatchTime(m.startsAt);
                return (
                  <div key={m.id} className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                    <p className="text-[11px] text-white/50 mb-2">{t.short} · {t.time} h</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0"><TeamLabel sponsor={m.sponsorHome} refaccionaria={m.refaccionariaHome} align="right" /></div>
                      <span className="text-white/40 text-xs font-bold">vs</span>
                      <div className="flex-1 min-w-0"><TeamLabel sponsor={m.sponsorAway} refaccionaria={m.refaccionariaAway} align="left" /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-white/40 mt-3">Horarios de Mérida.</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
