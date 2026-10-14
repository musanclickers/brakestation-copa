'use client';

import { useState } from 'react';
import { getFlagUrl, TEAM_TO_ISO } from '@brakestation/ui/flags';
import { getTeamDisplayName } from '@brakestation/ui/teams';

// Opciones de equipo para los selects: etiqueta en español, valor en el nombre
// canónico (inglés) que entiende football-data / las banderas. Se dedupe por
// etiqueta para colapsar alias (USA, United States of America → "Estados Unidos").
const TEAM_OPTIONS: { value: string; label: string }[] = (() => {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const name of Object.keys(TEAM_TO_ISO)) {
    if (name === 'TBD') continue;
    const label = getTeamDisplayName(name);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ value: name, label });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, 'es'));
  return out;
})();

type Match = {
  id: string;
  matchCode: string;
  phase: string;
  teamHome: string;
  teamAway: string;
  scheduledAt: string;
  actualHomeTeam: string | null;
  actualAwayTeam: string | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  penaltyWinner: string | null;
};

const PHASE_ORDER = ['groups_m1', 'groups_m2', 'groups_m3', 'r32', 'r16', 'qf', 'sf', 'final_phase'];

const PHASE_LABELS: Record<string, string> = {
  groups_m1: 'Grupos · Jornada 1',
  groups_m2: 'Grupos · Jornada 2',
  groups_m3: 'Grupos · Jornada 3',
  r32: 'Dieciseisavos',
  r16: 'Octavos',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
  final_phase: 'Cierre del Mundial',
};

function MatchRow({ match: m }: { match: Match }) {
  const [homeScore, setHomeScore] = useState<string>(m.actualHomeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState<string>(m.actualAwayScore?.toString() ?? '');
  const [homeTeam, setHomeTeam] = useState(m.actualHomeTeam ?? '');
  const [awayTeam, setAwayTeam] = useState(m.actualAwayTeam ?? '');
  const [penaltyWinner, setPenaltyWinner] = useState<'' | 'home' | 'away'>(
    m.penaltyWinner === 'home' || m.penaltyWinner === 'away' ? m.penaltyWinner : '',
  );
  const isKnockout = !m.phase.startsWith('groups_');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const displayHome = getTeamDisplayName(homeTeam || m.teamHome);
  const displayAway = getTeamDisplayName(awayTeam || m.teamAway);
  const flagHome = getFlagUrl(homeTeam || m.teamHome, 'sm');
  const flagAway = getFlagUrl(awayTeam || m.teamAway, 'sm');

  async function save() {
    setSaving(true);
    setMsg('');
    const body: Record<string, unknown> = {};
    if (homeTeam !== (m.actualHomeTeam ?? '')) body.actual_home_team = homeTeam || null;
    if (awayTeam !== (m.actualAwayTeam ?? '')) body.actual_away_team = awayTeam || null;
    const hs = homeScore === '' ? null : parseInt(homeScore);
    const as2 = awayScore === '' ? null : parseInt(awayScore);
    if (hs !== m.actualHomeScore) body.actual_home_score = hs;
    if (as2 !== m.actualAwayScore) body.actual_away_score = as2;
    if ((penaltyWinner || null) !== (m.penaltyWinner ?? null)) body.penalty_winner = penaltyWinner || null;

    if (Object.keys(body).length === 0) { setMsg('Sin cambios'); setSaving(false); return; }

    try {
      const res = await fetch(`/api/admin/matches/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setMsg(res.ok ? '✓' : 'Error');
    } catch { setMsg('Error red'); }
    setSaving(false);
  }

  return (
    <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-4 hover:bg-white/[0.10] transition-all">
      {/* Match code headline */}
      <p className="font-mono text-xs font-bold text-white/70 mb-3">{m.matchCode}</p>

      {/* Teams + score inputs */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Home team */}
        <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
          <img src={flagHome} alt={displayHome} className="w-10 h-7 sm:w-12 sm:h-8 rounded object-cover shadow-sm" loading="lazy" />
          <span className="text-white text-[11px] sm:text-sm font-medium text-center leading-tight line-clamp-2">{displayHome}</span>
          <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)}
            className="mt-1 w-full max-w-[8.5rem] text-[11px] bg-white/[0.12] border border-white/20 rounded-lg px-1.5 py-1 text-white focus:outline-none focus:ring-2 focus:ring-brand-red/40">
            <option value="" className="bg-[#1a2744]">— Por definir —</option>
            {homeTeam && !TEAM_OPTIONS.some((t) => t.value === homeTeam) && (
              <option value={homeTeam} className="bg-[#1a2744]">{getTeamDisplayName(homeTeam)}</option>
            )}
            {TEAM_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#1a2744]">{t.label}</option>
            ))}
          </select>
        </div>

        {/* Score inputs */}
        <input type="number" min={0} max={20} value={homeScore} onChange={(e) => setHomeScore(e.target.value)}
          className="w-10 h-10 sm:w-12 sm:h-12 text-center bg-white/[0.15] border border-white/20 rounded-xl text-lg sm:text-xl font-bold text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white/25 transition-all flex-shrink-0"
          placeholder="–" />
        <span className="text-white/30 text-xs font-bold flex-shrink-0">vs</span>
        <input type="number" min={0} max={20} value={awayScore} onChange={(e) => setAwayScore(e.target.value)}
          className="w-10 h-10 sm:w-12 sm:h-12 text-center bg-white/[0.15] border border-white/20 rounded-xl text-lg sm:text-xl font-bold text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white/25 transition-all flex-shrink-0"
          placeholder="–" />

        {/* Away team */}
        <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
          <img src={flagAway} alt={displayAway} className="w-10 h-7 sm:w-12 sm:h-8 rounded object-cover shadow-sm" loading="lazy" />
          <span className="text-white text-[11px] sm:text-sm font-medium text-center leading-tight line-clamp-2">{displayAway}</span>
          <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)}
            className="mt-1 w-full max-w-[8.5rem] text-[11px] bg-white/[0.12] border border-white/20 rounded-lg px-1.5 py-1 text-white focus:outline-none focus:ring-2 focus:ring-brand-red/40">
            <option value="" className="bg-[#1a2744]">— Por definir —</option>
            {awayTeam && !TEAM_OPTIONS.some((t) => t.value === awayTeam) && (
              <option value={awayTeam} className="bg-[#1a2744]">{getTeamDisplayName(awayTeam)}</option>
            )}
            {TEAM_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#1a2744]">{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Penales (solo eliminatoria) */}
      {isKnockout && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-white/80">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={penaltyWinner !== ''}
              onChange={(e) => setPenaltyWinner(e.target.checked ? 'home' : '')} />
            Se definió en penales
          </label>
          {penaltyWinner !== '' && (
            <select value={penaltyWinner} onChange={(e) => setPenaltyWinner(e.target.value as 'home' | 'away')}
              className="bg-white/[0.12] border border-white/20 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-brand-red/40">
              <option value="home" className="bg-[#1a2744]">Avanzó: {displayHome}</option>
              <option value="away" className="bg-[#1a2744]">Avanzó: {displayAway}</option>
            </select>
          )}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/[0.08]">
        <button onClick={save} disabled={saving}
          className="text-xs px-4 py-1.5 rounded-lg bg-brand-red text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
          {saving ? '...' : 'Guardar'}
        </button>
        {msg && <span className={`text-xs ${msg === '✓' ? 'text-emerald-300' : 'text-red-300'}`}>{msg}</span>}
      </div>
    </div>
  );
}

type SealedCounts = Record<string, { public: number; internal: number }>;

export function AdminMatchEditor({ matches, sealedCounts }: { matches: Match[]; sealedCounts: SealedCounts }) {
  const grouped = new Map<string, Match[]>();
  for (const m of matches) {
    const arr = grouped.get(m.phase) ?? [];
    arr.push(m);
    grouped.set(m.phase, arr);
  }

  return (
    <div className="space-y-3">
      {PHASE_ORDER.map((phase, idx) => {
        const group = grouped.get(phase);
        if (!group?.length) return null;
        const sealed = sealedCounts[phase] ?? { public: 0, internal: 0 };
        const sealedTotal = sealed.public + sealed.internal;

        return (
          <details key={phase} className="group backdrop-blur-xl bg-white/[0.06] border border-white/[0.15] rounded-2xl overflow-hidden open:bg-white/[0.10] open:border-white/[0.20] transition-all" open={idx === 0}>
            <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-white font-bold text-lg">{PHASE_LABELS[phase] ?? phase}</h2>
                <span className="text-xs text-white/65 px-2 py-0.5 rounded-full bg-white/[0.08]">{group.length} partidos</span>
                {sealedTotal > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-emerald-300 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10">
                      {sealed.public} público{sealed.public === 1 ? '' : 's'}
                    </span>
                    <span className="text-purple-300 font-medium px-2 py-0.5 rounded-full bg-purple-500/10">
                      {sealed.internal} interno{sealed.internal === 1 ? '' : 's'}
                    </span>
                    <span className="text-white/40">·</span>
                    <span className="text-white/70 font-medium">{sealedTotal} envíos</span>
                  </div>
                )}
              </div>
              <svg className="w-5 h-5 text-white/60 transition-transform duration-200 group-open:rotate-180 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="border-t border-white/[0.08] p-3 grid gap-3 sm:grid-cols-2">
              {group.map((m) => <MatchRow key={m.id} match={m} />)}
            </div>
          </details>
        );
      })}
    </div>
  );
}
