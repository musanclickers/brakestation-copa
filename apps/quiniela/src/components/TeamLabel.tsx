// Nombre de equipo Copa: sponsor chico arriba, refaccionaria en negritas.
// BRAKE STATION no tiene sponsor; en fase final sin asignar muestra "Por definir".
export function TeamLabel({
  sponsor,
  refaccionaria,
  align = 'center',
  dim = false,
}: {
  sponsor: string | null;
  refaccionaria: string | null;
  align?: 'left' | 'center' | 'right';
  dim?: boolean;
}) {
  const alignCls = align === 'left' ? 'text-left items-start' : align === 'right' ? 'text-right items-end' : 'text-center items-center';
  if (!refaccionaria) {
    return <span className={`flex flex-col ${alignCls} text-white/40 text-sm italic`}>Por definir</span>;
  }
  return (
    <span className={`flex flex-col ${alignCls} min-w-0 ${dim ? 'opacity-60' : ''}`}>
      {sponsor && <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-brand-gold/90 leading-tight">{sponsor}</span>}
      <span className="text-white text-[12px] sm:text-sm font-bold leading-tight line-clamp-2">{refaccionaria}</span>
    </span>
  );
}
