// Mérida = UTC-6 fijo (sin horario de verano).
const TZ = 'America/Merida';

const fmtShort = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const fmtFull = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false });

export function formatMatchTime(utcDate: Date | string): { short: string; time: string; full: string } {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return {
    short: fmtShort.format(d),
    time: fmtTime.format(d),
    full: `${fmtFull.format(d)} (hora Mérida)`,
  };
}

/** "faltan 2 h 5 min", "faltan 12 min", "falta 1 día". ms <= 0 → null. */
export function formatCountdown(ms: number): string | null {
  if (ms <= 0) return null;
  const min = Math.floor(ms / 60_000);
  if (min < 60) return min <= 1 ? 'falta 1 min' : `faltan ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `faltan ${h} h ${min % 60} min`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'falta 1 día' : `faltan ${d} días`;
}
