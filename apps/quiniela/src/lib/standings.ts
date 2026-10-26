// Tabla de posiciones de la fase regular (round-robin, 8 equipos). Puro: sin DB ni Next.
// Puntos 3/1/0. Desempate: DG, GF, resultado directo (pts y luego DG solo entre
// los empatados) y, si sigue igual, orden alfabético con bandera de empate técnico.

export type StandingsMatch = {
  phase: string;
  home: string | null;
  away: string | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
};

type Stats = { pj: number; g: number; e: number; p: number; gf: number; gc: number; dg: number; pts: number };
export type StandingsRow<T> = T & Stats & { tecnico: boolean };

// Final = los dos marcadores capturados (mismo criterio que hasResult()).
const isFinal = (m: StandingsMatch) => m.actualHomeScore != null && m.actualAwayScore != null;
const collator = new Intl.Collator('es');

/** Stats de `names` contando solo partidos finales entre equipos de `names`. */
function tally(names: string[], matches: StandingsMatch[]): Map<string, Stats> {
  const t = new Map(names.map((n) => [n, { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }]));
  for (const m of matches.filter(isFinal)) {
    const home = t.get(m.home ?? ''), away = t.get(m.away ?? '');
    if (!home || !away) continue;
    for (const [s, gf, gc] of [[home, m.actualHomeScore!, m.actualAwayScore!], [away, m.actualAwayScore!, m.actualHomeScore!]] as const) {
      s.pj++; s.gf += gf; s.gc += gc; s.dg += gf - gc;
      if (gf > gc) { s.g++; s.pts += 3; } else if (gf === gc) { s.e++; s.pts++; } else s.p++;
    }
  }
  return t;
}

export function computeStandings<T extends { name: string }>(teams: T[], matches: StandingsMatch[]): StandingsRow<T>[] {
  const all = tally(teams.map((t) => t.name), matches);
  const byTable = (a: Stats, b: Stats) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf;
  const rows = teams.map((t) => ({ ...t, ...all.get(t.name)!, tecnico: false })).sort(byTable);

  // ponytail: grupos de empatados re-ordenados una sola vez por directo; un subgrupo que
  // siga empatado tras el directo va alfabético (regla 4), no se recalcula entre sí.
  const out: StandingsRow<T>[] = [];
  for (let i = 0; i < rows.length; ) {
    let j = i + 1;
    while (j < rows.length && byTable(rows[i]!, rows[j]!) === 0) j++;
    const group = rows.slice(i, j);
    const h2h = tally(group.map((r) => r.name), matches);
    const byH2h = (a: T, b: T) => {
      const x = h2h.get(a.name)!, y = h2h.get(b.name)!;
      return y.pts - x.pts || y.dg - x.dg;
    };
    group.sort((a, b) => byH2h(a, b) || collator.compare(a.name, b.name));
    // Sin partidos jugados no es "empate técnico": todavía no hay nada que desempatar.
    for (const r of group) r.tecnico = r.pj > 0 && group.some((o) => o !== r && byH2h(r, o) === 0);
    out.push(...group);
    i = j;
  }
  return out;
}

/** Última jornada (jN) con al menos un resultado final y cuántos partidos le faltan; null si no hay. */
export function standingsProgress(matches: StandingsMatch[]): { jornada: number; pending: number } | null {
  const played = matches.filter(isFinal).map((m) => Number(m.phase.slice(1)));
  if (!played.length) return null;
  const jornada = Math.max(...played);
  return { jornada, pending: matches.filter((m) => m.phase === `j${jornada}` && !isFinal(m)).length };
}
