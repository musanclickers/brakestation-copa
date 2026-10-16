'use client';

import { useState } from 'react';
import { resolveTeam } from '@/lib/team-logo';

// Equipo Copa: logo del sponsor en placa blanca, sponsor en negritas y la
// refaccionaria abajo. BRAKE STATION no tiene sponsor: va solo su nombre.
// En fase final sin asignar muestra "Por definir" con placa vacía del mismo
// tamaño para que la tarjeta no salte cuando se asignen equipos.
const SIZES = {
  sm: { plate: 'h-8 w-8', name: 'text-sm font-semibold', sub: 'hidden', initials: 'text-[11px]' },
  md: { plate: 'h-10 w-10 sm:h-12 sm:w-12', name: 'text-sm sm:text-base font-bold', sub: 'text-[11px]', initials: 'text-xs sm:text-sm' },
  lg: { plate: 'h-12 w-12 sm:h-16 sm:w-16', name: 'text-base sm:text-lg font-bold', sub: 'text-xs', initials: 'text-sm sm:text-base' },
} as const;

export function TeamLabel({
  sponsor,
  refaccionaria,
  align = 'center',
  dim = false,
  size = 'md',
  layout = 'vertical',
}: {
  sponsor: string | null;
  refaccionaria: string | null;
  align?: 'left' | 'center' | 'right';
  dim?: boolean;
  size?: keyof typeof SIZES;
  layout?: 'vertical' | 'horizontal';
}) {
  const [imgError, setImgError] = useState(false);
  const team = resolveTeam(sponsor, refaccionaria);
  const s = SIZES[size];
  const horizontal = layout === 'horizontal';
  const items = align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
  const outer = horizontal
    ? `flex-row items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : 'text-left'}`
    : `flex-col gap-1.5 ${items}`;

  const plate = `${s.plate} shrink-0 rounded-lg flex items-center justify-center overflow-hidden`;
  const showLogo = team?.logo && !imgError;

  return (
    <span className={`flex ${outer} min-w-0 ${dim ? 'opacity-60' : ''}`}>
      {!team ? (
        <span aria-hidden className={`${plate} bg-white/[0.06] border border-dashed border-white/15`} />
      ) : showLogo ? (
        <span className={`${plate} p-1 ${team.darkPlate ? 'bg-[#0a1e3d] border border-white/15' : 'bg-white'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG locales; next/image pide dangerouslyAllowSVG */}
          <img
            src={team.logo!}
            alt={team.name}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
            // Si falla antes de hidratar, onError ya no llega. naturalWidth=0 también
            // pasa con SVG sin tamaño en Firefox, así que decode() decide.
            ref={(el) => { if (el?.complete && el.naturalWidth === 0) el.decode().catch(() => setImgError(true)); }}
          />
        </span>
      ) : (
        <span aria-hidden className={`${plate} bg-white/10 text-white/80 font-black ${s.initials}`}>{team.initials}</span>
      )}
      <span className={`flex flex-col min-w-0 ${horizontal ? '' : items}`}>
        {team ? (
          <>
            <span className={`text-white leading-tight line-clamp-2 break-words ${s.name}`}>{team.name}</span>
            {team.sub && <span className={`text-white/60 leading-tight line-clamp-2 ${s.sub}`}>{team.sub}</span>}
          </>
        ) : (
          <span className="text-white/40 text-sm italic">Por definir</span>
        )}
      </span>
    </span>
  );
}
