'use client';

import { useState, useEffect, useMemo } from 'react';
import { BrandHeader } from './BrandHeader';
import { SiteFooter } from './SiteFooter';
import { TeamLabel } from './TeamLabel';
import { formatMatchTime, formatCountdown } from '@brakestation/ui/time';
import { phaseLockoutAt, isMatchOpen } from '@brakestation/db/lockout';
import { scoreMeta } from '@/lib/score-match';
import type { SerializedMatch } from '@/lib/matches';

// Duplicado mínimo de @brakestation/db/phases: este es un componente cliente y
// no debe importar el módulo que abre la conexión a la DB.
const PHASE_ORDER = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'final'] as const;
type Phase = (typeof PHASE_ORDER)[number];
const PHASE_LABELS: Record<Phase, string> = {
  j1: 'Jornada 1', j2: 'Jornada 2', j3: 'Jornada 3', j4: 'Jornada 4',
  j5: 'Jornada 5', j6: 'Jornada 6', j7: 'Jornada 7', final: 'Fase Final',
};

type Submission = { phase: string; phaseSeal: string; submittedAt: string; matchesInPhase: number };
type Scores = Record<string, { h?: number; a?: number }>;

type Props = {
  currentPhase: Phase | null;
  allMatches: SerializedMatch[];
  submissions: Submission[];
  existingPredictions: Record<string, { h: number; a: number }>; // por matchId
  userEmail: string;
  readOnly?: boolean;
};

export function PhaseForm({ currentPhase, allMatches, submissions, existingPredictions, userEmail, readOnly = false }: Props) {
  const [activeTab, setActiveTab] = useState<Phase>(currentPhase ?? 'j1');
  const [scores, setScores] = useState<Scores>({});
  const [saved, setSaved] = useState(existingPredictions);
  const [subs, setSubs] = useState(submissions);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ shortcode: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const phaseMatches = useMemo(() => allMatches.filter((m) => m.phase === activeTab), [allMatches, activeTab]);
  // Toda la jornada cierra junta, 15 min antes de su primer partido.
  const lockDate = phaseLockoutAt(phaseMatches);
  const phaseLocked = !lockDate || now >= lockDate.getTime();
  const isOpen = (m: SerializedMatch) => isMatchOpen(m, phaseMatches, new Date(now));
  const openMatches = phaseMatches.filter(isOpen);
  const isFinal = activeTab === 'final';

  // Borrador local: lo que el usuario tecleó y aún no guarda, sobre lo ya guardado.
  const draftKey = `copa:${userEmail}:${activeTab}`;
  useEffect(() => {
    const initial: Scores = {};
    for (const m of phaseMatches) if (saved[m.id]) initial[m.id] = { ...saved[m.id] };
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) Object.assign(initial, JSON.parse(draft) as Scores);
    } catch { /* ok */ }
    setScores(initial);
  }, [draftKey, phaseMatches, saved]);

  function updateScore(matchId: string, field: 'h' | 'a', raw: string) {
    const value = raw === '' ? undefined : Math.max(0, Math.min(20, parseInt(raw, 10) || 0));
    setScores((prev) => {
      const next: Scores = { ...prev, [matchId]: { ...prev[matchId], [field]: value } };
      try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
    setResult(null);
  }

  const complete = (s?: { h?: number; a?: number }) => s?.h !== undefined && s?.a !== undefined;
  const changed = openMatches.filter((m) => {
    const s = scores[m.id];
    if (!complete(s)) return false;
    const prev = saved[m.id];
    return !prev || prev.h !== s!.h || prev.a !== s!.a;
  });
  const drawIds = new Set(isFinal ? openMatches.filter((m) => complete(scores[m.id]) && scores[m.id]!.h === scores[m.id]!.a).map((m) => m.id) : []);
  const savedCount = phaseMatches.filter((m) => saved[m.id]).length;

  async function handleSave() {
    if (drawIds.size > 0) {
      setError('En la Fase Final no hay empates: elige quién gana en cada partido.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const predictions = changed.map((m) => ({
      match_id: m.id,
      predicted_home_score: scores[m.id]!.h!,
      predicted_away_score: scores[m.id]!.a!,
    }));
    try {
      const res = await fetch(`/api/phases/${activeTab}/predictions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const nextSaved = { ...saved };
        for (const p of predictions) nextSaved[p.match_id] = { h: p.predicted_home_score, a: p.predicted_away_score };
        setSaved(nextSaved);
        setSubs((prev) => [
          ...prev.filter((s) => s.phase !== activeTab),
          { phase: activeTab, phaseSeal: data.phase_seal, submittedAt: data.submitted_at, matchesInPhase: data.total },
        ]);
        setResult({ shortcode: data.shortcode, total: data.total });
        try { localStorage.removeItem(draftKey); } catch { /* ok */ }
      } else {
        setError(data.message ?? 'No pudimos guardar. Intenta de nuevo.');
      }
    } catch {
      setError('No hay conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const sub = subs.find((s) => s.phase === activeTab);

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-deep">
      <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url(/images/stadium-night.jpg)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e3d]/80 via-[#14306a]/60 to-[#0a1e3d]/90" />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-black/30">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10" aria-label="Regresar a mi panel">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm font-medium hidden sm:inline">Mi panel</span>
            </a>
            <BrandHeader />
          </div>
          <p className="text-xs text-white/60 truncate max-w-[45%]">{userEmail}</p>
        </header>

        <nav className="border-b border-white/10 overflow-x-auto backdrop-blur-sm bg-black/10">
          <div className="flex min-w-max items-stretch">
            <span className="px-3 py-3 text-[10px] uppercase tracking-widest text-white/40 self-center">Fase Regular</span>
            {PHASE_ORDER.map((p) => (
              <button
                key={p}
                onClick={() => { setActiveTab(p); setResult(null); setError(null); }}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === p ? 'border-brand-red text-white' : 'border-transparent text-white/50 hover:text-white/80'
                } ${p === 'final' ? 'ml-3 border-l border-l-white/10' : ''}`}
              >
                {p === 'final' ? '🏆 Fase Final' : PHASE_LABELS[p].replace('Jornada ', 'J')}
                {subs.some((s) => s.phase === p) && <span className="ml-1 text-green-400">✓</span>}
              </button>
            ))}
          </div>
        </nav>

        <main className="max-w-5xl mx-auto p-4 md:p-8">
          <div className="mb-6 backdrop-blur-xl bg-white/[0.06] rounded-2xl border border-white/10 p-5">
            <p className="text-[11px] uppercase tracking-widest text-brand-gold">{isFinal ? 'Fase Final' : 'Fase Regular'}</p>
            <h2 className="text-white font-bold text-xl">{PHASE_LABELS[activeTab]}</h2>
            <p className="text-white/60 text-sm mt-1">
              Todos los partidos de la jornada cierran juntos, 15 minutos antes del primero. Hasta entonces puedes cambiar tus pronósticos las veces que quieras.
              {isFinal && ' Aquí no hay empates: elige quién gana (vale aunque se defina en penales).'}
            </p>
            <p className="text-white/80 text-sm mt-2">
              Llevas {savedCount} de {phaseMatches.length} pronósticos guardados.
              {sub && <> Sello actual: <a href={`/verifica/${sub.phaseSeal.slice(0, 8)}`} className="font-mono text-brand-gold underline">{sub.phaseSeal.slice(0, 8)}</a></>}
            </p>
          </div>

          {lockDate && phaseLocked ? (
            <div role="status" className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-amber-200 font-bold">🔒 Jornada cerrada</p>
                <p className="text-amber-100/80 text-sm">Ya no se pueden cambiar los pronósticos. Los que guardaste siguen valiendo.</p>
              </div>
              {sub && (
                <a href={`/verifica/${sub.phaseSeal.slice(0, 8)}`} className="rounded-xl border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/10">
                  Ver mi comprobante
                </a>
              )}
            </div>
          ) : lockDate && openMatches.length > 0 ? (
            <div
              role="status"
              className={`mb-6 rounded-2xl border p-4 ${lockDate.getTime() - now < 60 * 60_000 ? 'border-amber-400/60 bg-amber-500/10 text-amber-200' : 'border-white/15 bg-white/[0.06] text-white/85'}`}
            >
              <p className="font-semibold">
                Cierra el {formatMatchTime(lockDate.toISOString()).short} a las {formatMatchTime(lockDate.toISOString()).time} h
                <span className="font-normal opacity-80"> · {formatCountdown(lockDate.getTime() - now)}</span>
              </p>
            </div>
          ) : null}

          {result && (
            <div role="status" className="backdrop-blur-xl bg-green-500/10 border border-green-400/30 rounded-2xl p-4 mb-6">
              <p className="text-green-300 font-semibold">Listo, guardamos tus pronósticos.</p>
              <p className="text-green-200/80 text-sm">
                Nuevo sello <code className="bg-black/20 px-2 py-0.5 rounded">{result.shortcode}</code>. Te mandamos el comprobante por correo.
              </p>
            </div>
          )}
          {error && (
            <div role="alert" className="backdrop-blur-xl bg-red-500/10 border border-red-400/30 rounded-2xl p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">{phaseMatches.map(renderMatchCard)}</div>

          {!readOnly && openMatches.length > 0 && (
            <div className="sticky bottom-0 pt-4 pb-6 bg-gradient-to-t from-[#0a1e3d] via-[#0a1e3d]/90 to-transparent mt-8 text-center">
              <button
                onClick={handleSave}
                disabled={changed.length === 0 || drawIds.size > 0 || submitting}
                className="bg-brand-red text-white px-10 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-all"
              >
                {submitting ? 'Guardando…' : changed.length > 0 ? `Guardar ${changed.length} pronóstico${changed.length > 1 ? 's' : ''}` : 'Todo guardado'}
              </button>
              {drawIds.size > 0 && <p className="text-amber-300 text-xs mt-2">Hay {drawIds.size} empate{drawIds.size > 1 ? 's' : ''}: en la Fase Final tienes que elegir ganador.</p>}
            </div>
          )}
          {readOnly && <p className="text-center text-white/50 text-sm font-semibold py-6">Vista de solo lectura (admin)</p>}
        </main>
        <SiteFooter />
      </div>
    </div>
  );

  function renderMatchCard(m: SerializedMatch) {
    const { short: dateStr, time: timeStr } = formatMatchTime(m.startsAt);
    const locked = phaseLocked;
    const open = isOpen(m);
    const s = scores[m.id];
    const pred = saved[m.id];
    const done = m.actualHomeScore != null && m.actualAwayScore != null;
    const meta = done && pred ? scoreMeta(pred.h, pred.a, m.actualHomeScore!, m.actualAwayScore!, m.penaltyWinner) : null;
    const isDraw = drawIds.has(m.id);
    const unsaved = open && complete(s) && (!pred || pred.h !== s!.h || pred.a !== s!.a);

    const box = 'w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-center text-lg sm:text-xl font-bold flex-shrink-0';
    return (
      <div
        key={m.id}
        className={`backdrop-blur-xl rounded-2xl p-4 border ${
          meta ? meta.tint : isDraw ? 'bg-white/[0.08] border-amber-400/70' : unsaved ? 'bg-white/[0.08] border-brand-gold/50' : pred ? 'bg-white/[0.08] border-green-400/30' : 'bg-white/[0.06] border-white/[0.15]'
        } ${locked && !done ? 'opacity-80' : ''}`}
      >
        <div className="flex justify-between items-center mb-3 gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60">{m.displayLabel ?? m.matchCode}</span>
          <span className="text-[11px] text-white/60">{dateStr} · {timeStr}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0"><TeamLabel sponsor={m.sponsorHome} refaccionaria={m.refaccionariaHome} align="right" dim={locked && !done} /></div>
          {open && !readOnly ? (
            <>
              <input type="number" inputMode="numeric" min={0} max={20} value={s?.h ?? ''} placeholder="–"
                onChange={(e) => updateScore(m.id, 'h', e.target.value)} aria-label={`Goles de ${m.home ?? 'local'}`}
                className={`${box} bg-white/[0.15] border border-white/20 text-white placeholder:text-white/30 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/40`} />
              <span className="text-white/30 text-xs font-bold">vs</span>
              <input type="number" inputMode="numeric" min={0} max={20} value={s?.a ?? ''} placeholder="–"
                onChange={(e) => updateScore(m.id, 'a', e.target.value)} aria-label={`Goles de ${m.away ?? 'visitante'}`}
                className={`${box} bg-white/[0.15] border border-white/20 text-white placeholder:text-white/30 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/40`} />
            </>
          ) : (
            <>
              <span className={`${box} flex items-center justify-center bg-white/[0.08] border border-white/10 text-white/70`}>{pred?.h ?? '–'}</span>
              <span className="text-white/30 text-xs font-bold">vs</span>
              <span className={`${box} flex items-center justify-center bg-white/[0.08] border border-white/10 text-white/70`}>{pred?.a ?? '–'}</span>
            </>
          )}
          <div className="flex-1 min-w-0"><TeamLabel sponsor={m.sponsorAway} refaccionaria={m.refaccionariaAway} align="left" dim={locked && !done} /></div>
        </div>

        <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          {done ? (
            <>
              <span className="text-white/80">
                Resultado: <span className="font-mono font-semibold">{m.actualHomeScore}–{m.actualAwayScore}</span>
                {m.penaltyWinner && <span className="text-amber-300 font-semibold"> · Serie de penales: ganó {m.penaltyWinner === 'home' ? m.refaccionariaHome : m.refaccionariaAway}</span>}
              </span>
              {meta ? (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold uppercase tracking-wider ${meta.bg} ${meta.shadow}`}>{meta.icon} {meta.label}</span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-white/[0.08] text-white/60 font-bold uppercase">Sin pronóstico</span>
              )}
            </>
          ) : locked ? (
            <span className="text-amber-300/90 font-semibold">🔒 Pronósticos cerrados{pred ? '' : ' · no alcanzaste a pronosticar'}</span>
          ) : !open ? (
            <span className="text-white/50">Los equipos se definen al terminar la jornada 7.</span>
          ) : (
            <>
              <span className="text-white/50">
                {m.home === null && 'Los equipos salen de las semifinales del sábado. Puedes poner tu marcador desde ahora.'}
              </span>
              {isDraw ? <span className="text-amber-300 font-medium">Elige un ganador</span>
                : unsaved ? <span className="text-brand-gold font-medium">Sin guardar</span>
                : pred ? <span className="text-green-300">Guardado</span> : null}
            </>
          )}
        </div>
      </div>
    );
  }
}
