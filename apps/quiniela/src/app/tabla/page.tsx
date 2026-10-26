import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TeamLabel } from '@/components/TeamLabel';
import { loadMatches } from '@/lib/matches';
import { computeStandings, standingsProgress } from '@/lib/standings';

// Pública, sin auth. force-dynamic porque el build de Docker no tiene DB; el
// unstable_cache hace de ISR (1 lectura por minuto) y el PATCH de admin lo
// invalida con revalidateTag('tabla') al capturar un marcador.
export const dynamic = 'force-dynamic';

const TITLE = 'Tabla de posiciones · Copa Brake Station 2026';
const DESCRIPTION = 'Posiciones de los 8 equipos de la Copa Brake Station 2026, actualizadas con cada resultado.';

export const metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: {
    // Next reemplaza openGraph completo en la página: hay que repetir imagen y sitio.
    title: TITLE,
    description: DESCRIPTION,
    url: '/tabla',
    siteName: 'Copa Brake Station',
    locale: 'es_MX',
    type: 'website',
    images: [{ url: '/images/og-copa.jpg', width: 1200, height: 630, alt: 'Copa Brake Station · Primera Edición 2026' }],
  },
};

// Solo nombres de equipo + stats salen de aquí: sin ids, sin pronósticos, sin usuarios.
const loadTable = unstable_cache(
  async () => {
    const regular = (await loadMatches()).filter((m) => m.phase !== 'final');
    const teams = new Map<string, { name: string; sponsor: string | null; refaccionaria: string | null }>();
    for (const m of regular) {
      if (m.home) teams.set(m.home, { name: m.home, sponsor: m.sponsorHome, refaccionaria: m.refaccionariaHome });
      if (m.away) teams.set(m.away, { name: m.away, sponsor: m.sponsorAway, refaccionaria: m.refaccionariaAway });
    }
    return { rows: computeStandings([...teams.values()], regular), progress: standingsProgress(regular) };
  },
  ['tabla'],
  { revalidate: 60, tags: ['tabla'] },
);

// G/E/P/GF/GC se esconden en móvil salvo que activen "Ver todas las columnas".
const EXTRA = 'hidden sm:table-cell group-has-[:checked]:table-cell';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default async function TablaPage() {
  const { rows, progress } = await loadTable();
  const anyTecnico = rows.some((r) => r.tecnico);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
        <BrandHeader />
        <Link href="/entrar" className="text-sm text-white/80 hover:text-white">Participar en la quiniela</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl sm:text-5xl text-white">Tabla de posiciones · Copa Brake Station 2026</h1>
          <p className="text-white/70 text-sm mt-2">
            {progress
              ? `Resultados hasta la jornada ${progress.jornada}${progress.pending ? ` · ${plural(progress.pending, 'partido')} ${progress.pending === 1 ? 'pendiente' : 'pendientes'}` : ''}`
              : 'Aún no se juega la primera jornada.'}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-white/70 py-16">Todavía no hay equipos cargados.</p>
        ) : (
          <div className="group">
            <label className="sm:hidden flex items-center justify-end gap-2 min-h-11 text-sm text-white/80 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-brand-gold" />
              Ver todas las columnas
            </label>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-brand-deep">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">Tabla de posiciones de la fase regular</caption>
                <thead className="text-xs uppercase tracking-wide text-white/70">
                  <tr className="border-b border-white/10">
                    <th scope="col" className="sticky left-0 z-10 bg-brand-deep w-10 px-2 py-3 text-center">
                      {/* w-6 + px-2 = 40px = left-10 del sticky de Equipo; sin esto la tabla lo encoge y Equipo tapa PJ */}
                      <span className="inline-block w-6">#</span>
                    </th>
                    <th scope="col" className="sticky left-10 z-10 bg-brand-deep px-2 py-3 text-left">Equipo</th>
                    <th scope="col" className="px-2 py-3"><abbr title="Partidos jugados" className="no-underline">PJ</abbr></th>
                    <th scope="col" className={`${EXTRA} px-2 py-3`}><abbr title="Ganados" className="no-underline">G</abbr></th>
                    <th scope="col" className={`${EXTRA} px-2 py-3`}><abbr title="Empatados" className="no-underline">E</abbr></th>
                    <th scope="col" className={`${EXTRA} px-2 py-3`}><abbr title="Perdidos" className="no-underline">P</abbr></th>
                    <th scope="col" className={`${EXTRA} px-2 py-3`}><abbr title="Goles a favor" className="no-underline">GF</abbr></th>
                    <th scope="col" className={`${EXTRA} px-2 py-3`}><abbr title="Goles en contra" className="no-underline">GC</abbr></th>
                    <th scope="col" className="px-2 py-3"><abbr title="Diferencia de goles" className="no-underline">DG</abbr></th>
                    <th scope="col" className="px-3 py-3 text-brand-gold"><abbr title="Puntos" className="no-underline">Pts</abbr></th>
                  </tr>
                </thead>
                <tbody className="text-center text-white/90">
                  {rows.map((r, i) => (
                    <tr key={r.name} className="border-b border-white/5 last:border-0">
                      <td className="sticky left-0 z-10 bg-brand-deep px-2 py-2 font-black text-white/80">
                        <span className="inline-block w-6">
                          {i + 1}
                          {r.tecnico && <abbr title="Empate técnico" className="block text-[10px] font-semibold text-brand-gold no-underline">ET</abbr>}
                        </span>
                      </td>
                      <th scope="row" className="sticky left-10 z-10 bg-brand-deep px-2 py-2 text-left font-normal min-w-40">
                        <TeamLabel sponsor={r.sponsor} refaccionaria={r.refaccionaria} layout="horizontal" align="left" />
                      </th>
                      <td className="px-2 py-2">{r.pj}</td>
                      <td className={`${EXTRA} px-2 py-2`}>{r.g}</td>
                      <td className={`${EXTRA} px-2 py-2`}>{r.e}</td>
                      <td className={`${EXTRA} px-2 py-2`}>{r.p}</td>
                      <td className={`${EXTRA} px-2 py-2`}>{r.gf}</td>
                      <td className={`${EXTRA} px-2 py-2`}>{r.gc}</td>
                      <td className="px-2 py-2">{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                      <td className="px-3 py-2 text-base font-black text-white">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-white/70 text-center">
          Desempate: diferencia de goles, goles a favor, resultado directo.
          {anyTecnico && ' ET = empate técnico: siguen iguales tras el resultado directo y se ordenan alfabéticamente.'}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
