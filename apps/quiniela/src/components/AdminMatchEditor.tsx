'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMatchTime } from '@brakestation/ui/time';
import { utcIsoToMeridaInput, meridaInputToUtcIso } from '@/lib/merida-datetime';
import type { SerializedMatch } from '@/lib/matches';
import { TeamLabel } from './TeamLabel';

const PHASE_LABELS: Record<string, string> = {
  j1: 'Jornada 1', j2: 'Jornada 2', j3: 'Jornada 3', j4: 'Jornada 4',
  j5: 'Jornada 5', j6: 'Jornada 6', j7: 'Jornada 7', final: 'Fase Final',
};

function MatchRow({ m }: { m: SerializedMatch }) {
  const router = useRouter();
  const [home, setHome] = useState(m.actualHomeScore?.toString() ?? '');
  const [away, setAway] = useState(m.actualAwayScore?.toString() ?? '');
  const [pw, setPw] = useState<'' | 'home' | 'away'>(m.penaltyWinner ?? '');
  const [startsAt, setStartsAt] = useState(utcIsoToMeridaInput(m.startsAt));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isDraw = home !== '' && home === away;
  const needsPenalty = m.phase === 'final' && isDraw;
  const t = formatMatchTime(m.startsAt);

  async function save(body: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/matches/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      const extra = data.populated?.length ? `. También se llenó: ${data.populated.join(', ')}` : '';
      setMsg({ ok: true, text: `Guardado${extra}` });
      router.refresh();
    } else {
      setMsg({ ok: false, text: data.message ?? 'No se pudo guardar' });
    }
  }

  const input = 'w-14 rounded-lg bg-black/30 border border-white/20 px-2 py-1.5 text-center text-white disabled:opacity-40';

  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-white/50 mb-2">
        <span className="font-mono">{m.matchCode}{m.displayLabel ? ` · ${m.displayLabel}` : ''}</span>
        <span>{t.short} · {t.time} h</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[8rem] flex justify-end"><TeamLabel sponsor={m.sponsorHome} refaccionaria={m.refaccionariaHome} align="right" size="sm" layout="horizontal" /></div>
        <input type="number" min={0} max={20} value={home} onChange={(e) => setHome(e.target.value)} className={input} aria-label="Goles local" disabled={!m.home} />
        <span className="text-white/40">–</span>
        <input type="number" min={0} max={20} value={away} onChange={(e) => setAway(e.target.value)} className={input} aria-label="Goles visitante" disabled={!m.home} />
        <div className="flex-1 min-w-[8rem]"><TeamLabel sponsor={m.sponsorAway} refaccionaria={m.refaccionariaAway} align="left" size="sm" layout="horizontal" /></div>
      </div>
      {needsPenalty && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-amber-200">
          Empate: ¿quién ganó la serie de penales?
          <select value={pw} onChange={(e) => setPw(e.target.value as '' | 'home' | 'away')} className="rounded-lg bg-black/30 border border-amber-400/50 px-2 py-1 text-white">
            <option value="">Elegir…</option>
            <option value="home">{m.refaccionariaHome}</option>
            <option value="away">{m.refaccionariaAway}</option>
          </select>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          disabled={saving || !m.home || home === '' || away === '' || (needsPenalty && !pw)}
          onClick={() => save({ actual_home_score: Number(home), actual_away_score: Number(away), penalty_winner: needsPenalty ? pw : null })}
          className="bg-brand-red text-white text-sm px-4 py-2 rounded-lg font-semibold disabled:opacity-40"
        >
          Guardar marcador
        </button>
        <details className="text-xs text-white/60">
          <summary className="cursor-pointer">Cambiar horario</summary>
          <div className="mt-2 flex items-center gap-2">
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-lg bg-black/30 border border-white/20 px-2 py-1 text-white" />
            <button
              disabled={saving || !meridaInputToUtcIso(startsAt)}
              onClick={() => save({ starts_at: meridaInputToUtcIso(startsAt) })}
              className="border border-white/30 text-white px-3 py-1 rounded-lg disabled:opacity-40"
            >
              Guardar horario
            </button>
          </div>
        </details>
        {msg && <span role="status" className={`text-xs ${msg.ok ? 'text-green-300' : 'text-red-300'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

export function AdminMatchEditor({ matches }: { matches: SerializedMatch[] }) {
  const phases = [...new Set(matches.map((m) => m.phase))];
  return (
    <div className="space-y-8">
      {phases.map((p) => (
        <section key={p}>
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-3">{PHASE_LABELS[p] ?? p}</h2>
          <div className="space-y-3">{matches.filter((m) => m.phase === p).map((m) => <MatchRow key={m.id} m={m} />)}</div>
        </section>
      ))}
    </div>
  );
}
