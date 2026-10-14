// Self-check de la Fase Final. Correr: tsx src/lib/bracket.test.ts
import assert from 'node:assert/strict';
import { matchOutcome, finalPairings, type ScoredMatch } from './bracket';

const sf = (h: number | null, a: number | null, pw: string | null = null): ScoredMatch => ({
  sponsorHome: 'Cana Brake', refaccionariaHome: 'Ancona Autopartes',
  sponsorAway: null, refaccionariaAway: 'BRAKE STATION',
  actualHomeScore: h, actualAwayScore: a, penaltyWinner: pw,
});
const sf2 = (h: number, a: number, pw: string | null = null): ScoredMatch => ({
  sponsorHome: 'TVA', refaccionariaHome: 'Buenavista Autopartes',
  sponsorAway: 'Exedy', refaccionariaAway: 'Clutch y Frenos Chuburná',
  actualHomeScore: h, actualAwayScore: a, penaltyWinner: pw,
});

// Gana local en tiempo regular
assert.equal(matchOutcome(sf(2, 1))!.winner.refaccionaria, 'Ancona Autopartes');
assert.equal(matchOutcome(sf(2, 1))!.loser.refaccionaria, 'BRAKE STATION');
// Gana visitante
assert.equal(matchOutcome(sf(0, 3))!.winner.refaccionaria, 'BRAKE STATION');
// Empate decidido en penales
assert.equal(matchOutcome(sf(1, 1, 'away'))!.winner.refaccionaria, 'BRAKE STATION');
assert.equal(matchOutcome(sf(1, 1, 'home'))!.winner.sponsor, 'Cana Brake');
// Empate sin penales capturados / sin marcador / sin equipos → no se puede resolver
assert.equal(matchOutcome(sf(1, 1)), null);
assert.equal(matchOutcome(sf(null, null)), null);
assert.equal(matchOutcome({ ...sf(1, 0), refaccionariaAway: null }), null);

// Pairings: solo cuando las dos semis están resueltas
assert.equal(finalPairings(sf(2, 1), sf2(1, 1)), null);
const p = finalPairings(sf(2, 1), sf2(1, 1, 'away'))!;
assert.deepEqual(p.final.map((t) => t.refaccionaria), ['Ancona Autopartes', 'Clutch y Frenos Chuburná']);
assert.deepEqual(p.tercer.map((t) => t.refaccionaria), ['BRAKE STATION', 'Buenavista Autopartes']);
assert.equal(p.tercer[0].sponsor, null);

console.log('bracket: OK');
