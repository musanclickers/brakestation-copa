'use client';

import { buildBracket, type BracketMatch } from '@/lib/bracket';
import { getFlagUrl } from '@brakestation/ui/flags';
import { getTeamDisplayName } from '@brakestation/ui/teams';
import { formatMatchTimeCDMX } from '@brakestation/ui/time';

function TeamRow({ team }: { team: string | null }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 text-white/40">
        <span className="w-5 h-3.5 rounded-sm bg-white/10" />
        <span className="text-xs italic truncate">Por definir</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-white/90">
      <img src={getFlagUrl(team, 'sm')} alt="" className="w-5 h-3.5 rounded-sm object-cover" loading="lazy" />
      <span className="text-xs font-medium truncate">{getTeamDisplayName(team)}</span>
    </div>
  );
}

function MatchCard({ m }: { m: BracketMatch }) {
  const when = m.startsAt ? formatMatchTimeCDMX(m.startsAt) : null;
  return (
    <div className="bracket-card rounded-lg bg-white/[0.07] border border-white/15 px-3 py-2 w-52">
      <TeamRow team={m.homeTeam} />
      <div className="my-1 border-t border-white/10" />
      <TeamRow team={m.awayTeam} />
      <p className="mt-1.5 text-[10px] text-white/45">
        {when ? `${when.short} · ${when.time}` : 'Fecha por definir'}
        {m.venueName ? ` · ${m.venueName}` : ''}
      </p>
    </div>
  );
}

export function BracketView({ matches }: { matches: BracketMatch[] }) {
  const rounds = buildBracket(matches);

  return (
    <div className="overflow-x-auto pb-6">
      <div className="bracket flex gap-6 min-w-max">
        {rounds.map((round) => (
          <div key={round.phase} className="flex flex-col">
            <h3 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-3 text-center">{round.label}</h3>
            <div className="bracket-col flex flex-col flex-1">
              {round.matches.length === 0 ? (
                <p className="text-white/30 text-xs italic w-52 text-center my-auto">Aún no disponible</p>
              ) : (
                round.matches.map((m) => (
                  <div key={m.id} className="bracket-item flex flex-col justify-center flex-1">
                    <MatchCard m={m} />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Líneas conectoras tipo bracket "]". CSS puro, sin librería.
          Cada tarjeta llena su slot (flex-1) y se centra; el "]" se dibuja con
          bordes en ::after: la tarjeta de arriba del par baja media altura de slot
          y la de abajo sube media altura, encontrándose en el punto medio donde se
          centra la tarjeta de la ronda siguiente. El ancho 24px = el gap-6 entre
          columnas, así el vértice cae justo en el borde de la columna siguiente. */}
      <style>{`
        .bracket-item { position: relative; }
        .bracket > div:not(:last-child) .bracket-item::after {
          content: ''; position: absolute; left: 100%; width: 24px;
          box-sizing: border-box;
        }
        .bracket > div:not(:last-child) .bracket-item:nth-child(odd)::after {
          top: 50%; height: 50%;
          border-top: 2px solid rgba(255,255,255,0.18);
          border-right: 2px solid rgba(255,255,255,0.18);
        }
        .bracket > div:not(:last-child) .bracket-item:nth-child(even)::after {
          top: 0; height: 50%;
          border-bottom: 2px solid rgba(255,255,255,0.18);
          border-right: 2px solid rgba(255,255,255,0.18);
        }
      `}</style>
    </div>
  );
}
