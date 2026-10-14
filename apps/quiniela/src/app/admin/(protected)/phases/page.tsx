import { db } from '@brakestation/db';
import { matches, matchPredictions } from '@brakestation/db/schema';
import { PHASE_ORDER, PHASE_LABELS, isMatchOpen, isMatchLocked, teamName } from '@brakestation/db/phases';
import { asc, sql, eq } from 'drizzle-orm';
import { FinalAssignForm } from './FinalAssignForm';
import { FINAL_CODES } from '@/lib/final-phase';

export const dynamic = 'force-dynamic';

export default async function AdminPhasesPage() {
  const [all, counts] = await Promise.all([
    db.select().from(matches).orderBy(asc(matches.startsAt)),
    db
      .select({ phase: matches.phase, count: sql<number>`COUNT(*)::int` })
      .from(matchPredictions)
      .innerJoin(matches, eq(matches.id, matchPredictions.matchId))
      .groupBy(matches.phase),
  ]);
  const countBy = new Map(counts.map((c) => [c.phase, c.count]));

  const teams = new Map<string, string | null>();
  for (const m of all.filter((m) => m.phase !== 'final')) {
    if (m.refaccionariaHome) teams.set(m.refaccionariaHome, m.sponsorHome);
    if (m.refaccionariaAway) teams.set(m.refaccionariaAway, m.sponsorAway);
  }
  const teamOptions = [...teams.entries()]
    .map(([refaccionaria, sponsor]) => ({ refaccionaria, label: teamName(sponsor, refaccionaria)! }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const sf1 = all.find((m) => m.matchCode === FINAL_CODES.sf1);
  const sf2 = all.find((m) => m.matchCode === FINAL_CODES.sf2);
  const sfLocked = Boolean(sf1 && isMatchLocked(sf1.startsAt));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl text-white mb-1">Jornadas</h1>
        <p className="text-white/80 text-sm">
          Cada partido cierra pronósticos 15 minutos antes de empezar. No hay que abrir ni cerrar nada a mano.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm text-white">
          <thead className="bg-white/[0.06] text-white/60 text-xs uppercase">
            <tr><th className="p-3 text-left">Jornada</th><th className="p-3">Partidos</th><th className="p-3">Abiertos</th><th className="p-3">Con resultado</th><th className="p-3">Pronósticos</th></tr>
          </thead>
          <tbody>
            {PHASE_ORDER.map((p) => {
              const ms = all.filter((m) => m.phase === p);
              return (
                <tr key={p} className="border-t border-white/10">
                  <td className="p-3 font-semibold">{PHASE_LABELS[p]}</td>
                  <td className="p-3 text-center">{ms.length}</td>
                  <td className="p-3 text-center">{ms.filter((m) => isMatchOpen(m)).length}</td>
                  <td className="p-3 text-center">{ms.filter((m) => m.actualHomeScore != null).length}</td>
                  <td className="p-3 text-center">{countBy.get(p) ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
        <h2 className="text-xl font-bold text-white">Fase Final · asignar semifinales</h2>
        <p className="text-white/70 text-sm mt-1 mb-4">
          Cuando termine la jornada 7, elige los 4 primeros lugares. El 3er lugar y la Gran Final se llenan solos en cuanto captures los marcadores de las dos semifinales (si una semi termina empatada, marca quién ganó la serie de penales).
        </p>
        {sfLocked ? (
          <p className="text-amber-300 text-sm">Las semifinales ya cerraron pronósticos; sus equipos ya no se pueden cambiar.</p>
        ) : (
          <FinalAssignForm
            teams={teamOptions}
            initial={{
              sf1Home: sf1?.refaccionariaHome ?? '',
              sf1Away: sf1?.refaccionariaAway ?? '',
              sf2Home: sf2?.refaccionariaHome ?? '',
              sf2Away: sf2?.refaccionariaAway ?? '',
            }}
          />
        )}
      </section>
    </div>
  );
}
