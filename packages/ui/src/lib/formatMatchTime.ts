export function formatMatchTimeCDMX(utcDate: Date | string): {
  short: string;
  time: string;
  full: string;
} {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  const fmtShort = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const fmtTime = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const fmtFull = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    short: fmtShort.format(d),
    time: fmtTime.format(d),
    full: `${fmtFull.format(d)} CDMX`,
  };
}
