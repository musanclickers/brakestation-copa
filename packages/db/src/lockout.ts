// Reglas de cierre de pronósticos. Puro (sin db) para que el cliente
// (PhaseForm) y el server usen exactamente la misma regla.
//
// La jornada entera cierra 15 min antes de su PRIMER partido. Esto es solo la
// ventana de pronóstico; el candado de "no cambiar equipos de un partido que ya
// va a empezar" sigue siendo por partido (lockoutAt / isMatchLocked).

export const LOCKOUT_MINUTES = 15;

type When = { startsAt: Date | string };
type Teams = {
  refaccionariaHome: string | null;
  refaccionariaAway: string | null;
};

const time = (d: Date | string) => new Date(d).getTime();

export function lockoutAt(startsAt: Date | string): Date {
  return new Date(time(startsAt) - LOCKOUT_MINUTES * 60_000);
}

export function isMatchLocked(startsAt: Date | string, now: Date = new Date()): boolean {
  return now.getTime() >= lockoutAt(startsAt).getTime();
}

/** Cierre de la jornada: 15 min antes de su primer partido. null si no hay partidos. */
export function phaseLockoutAt(phaseMatches: When[]): Date | null {
  if (phaseMatches.length === 0) return null;
  return lockoutAt(new Date(Math.min(...phaseMatches.map((m) => time(m.startsAt)))));
}

/** Sin partidos cuenta como cerrada: no hay nada que pronosticar. */
export function isPhaseLocked(phaseMatches: When[], now: Date = new Date()): boolean {
  const at = phaseLockoutAt(phaseMatches);
  return !at || now.getTime() >= at.getTime();
}

export function teamsAssigned(m: Teams): boolean {
  return Boolean(m.refaccionariaHome && m.refaccionariaAway);
}

/**
 * Se puede pronosticar: la jornada no ha cerrado y el partido tiene equipos.
 * Fase Final: 3er lugar y Gran Final salen de las semis, así que se pronostican
 * "Por definir" en cuanto el admin asigna las semifinales.
 * `matches` puede traer todas las jornadas; se filtra por la del partido.
 */
export function isMatchOpen<M extends Teams & When & { phase: string }>(m: M, matches: M[], now: Date = new Date()): boolean {
  const phaseMatches = matches.filter((x) => x.phase === m.phase);
  if (isPhaseLocked(phaseMatches, now)) return false;
  return teamsAssigned(m) || (m.phase === 'final' && phaseMatches.some(teamsAssigned));
}
