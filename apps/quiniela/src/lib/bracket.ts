// Fase Final de la Copa (módulo puro, sin DB, testeable con tsx):
//   F-SF1: 1° vs 4°   F-SF2: 2° vs 3°
//   F-3ER: perdedor SF1 vs perdedor SF2
//   F-FINAL: ganador SF1 vs ganador SF2

export type Team = { sponsor: string | null; refaccionaria: string };

export type ScoredMatch = {
  sponsorHome: string | null;
  refaccionariaHome: string | null;
  sponsorAway: string | null;
  refaccionariaAway: string | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  penaltyWinner: string | null;
};

/** Ganador y perdedor de una semifinal; null si falta marcador, equipos o el desempate. */
export function matchOutcome(m: ScoredMatch): { winner: Team; loser: Team } | null {
  if (!m.refaccionariaHome || !m.refaccionariaAway) return null;
  if (m.actualHomeScore == null || m.actualAwayScore == null) return null;
  const home: Team = { sponsor: m.sponsorHome, refaccionaria: m.refaccionariaHome };
  const away: Team = { sponsor: m.sponsorAway, refaccionaria: m.refaccionariaAway };
  let homeWins: boolean;
  if (m.actualHomeScore !== m.actualAwayScore) homeWins = m.actualHomeScore > m.actualAwayScore;
  else if (m.penaltyWinner === 'home' || m.penaltyWinner === 'away') homeWins = m.penaltyWinner === 'home';
  else return null; // empate sin serie de penales capturada
  return homeWins ? { winner: home, loser: away } : { winner: away, loser: home };
}

/** Equipos de 3er lugar y Gran Final; null hasta que ambas semis estén resueltas. */
export function finalPairings(sf1: ScoredMatch, sf2: ScoredMatch): { tercer: [Team, Team]; final: [Team, Team] } | null {
  const a = matchOutcome(sf1);
  const b = matchOutcome(sf2);
  if (!a || !b) return null;
  return { tercer: [a.loser, b.loser], final: [a.winner, b.winner] };
}
