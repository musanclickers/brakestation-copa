'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { BrandHeader } from './BrandHeader';
import { SiteFooter } from './SiteFooter';
import { getFlagUrl } from '@brakestation/ui/flags';
import { formatMatchTimeCDMX } from '@brakestation/ui/time';
import { getTeamDisplayName } from '@brakestation/ui/teams';
import { scoreMatch, matchResultMeta, type MatchResultMeta, type PenaltyWinner } from '@/lib/score-match';

const PHASE_ORDER = ['groups_m1', 'groups_m2', 'groups_m3', 'r32', 'r16', 'qf', 'sf', 'final_phase'] as const;
type Phase = (typeof PHASE_ORDER)[number];

const PHASE_LABELS: Record<Phase, string> = {
  groups_m1: 'Grupos · Jornada 1',
  groups_m2: 'Grupos · Jornada 2',
  groups_m3: 'Grupos · Jornada 3',
  r32: 'Dieciseisavos',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinales',
  final_phase: 'Cierre del Mundial',
};

const PHASE_WINDOWS: Record<Phase, string> = {
  groups_m1: '1 – 11 jun 2026',
  groups_m2: '12 – 18 jun 2026',
  groups_m3: '19 – 24 jun 2026',
  r32: '28 jun 2026',
  r16: '4 jul 2026',
  qf: '9 jul 2026',
  sf: '14 jul 2026',
  final_phase: '18 – 19 jul 2026',
};

type SerializedMatch = {
  id: string;
  matchCode: string;
  phase: string;
  groupLetter: string | null;
  teamHome: string;
  teamAway: string;
  scheduledAt: string;
  startsAt?: string | null;
  actualHomeTeam: string | null;
  actualAwayTeam: string | null;
  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  penaltyWinner?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
};

type Submission = {
  phase: string;
  phaseSeal: string;
  submittedAt: string;
  matchesInPhase: number;
};

type ExistingPrediction = {
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
};

type Scores = Record<string, { h: number; a: number }>;

type Props = {
  ticketCode: string;
  currentPhase: Phase | null;
  allMatches: SerializedMatch[];
  submissions: Submission[];
  existingPredictions: Record<string, ExistingPrediction[]>;
  phaseOpenMap: Record<string, boolean>;
  userEmail: string;
  readOnly?: boolean;
  pendingApproval?: boolean;
  internalFirstMatchBypassId?: string | null;
  showEliminatoria?: boolean;
};

export function PhaseForm({
  ticketCode,
  currentPhase,
  allMatches,
  submissions,
  existingPredictions,
  phaseOpenMap,
  userEmail,
  readOnly = false,
  pendingApproval = false,
  internalFirstMatchBypassId = null,
  showEliminatoria = false,
}: Props) {
  const submittedPhases = useMemo(() => new Set(submissions.map((s) => s.phase)), [submissions]);
  const defaultTab = currentPhase ?? PHASE_ORDER.find((p) => !submittedPhases.has(p)) ?? 'groups_m1';
  const [activeTab, setActiveTab] = useState<Phase>(defaultTab);
  const [scores, setScores] = useState<Scores>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ phase_seal: string; shortcode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const phaseMatches = useMemo(
    () => allMatches.filter((m) => m.phase === activeTab),
    [allMatches, activeTab],
  );

  const lockedMatchIds = useMemo(() => {
    const locked = new Set<string>();
    for (const m of allMatches) {
      if (m.id === internalFirstMatchBypassId) continue;
      if (m.startsAt && new Date(m.startsAt).getTime() <= now) {
        locked.add(m.id);
      }
    }
    return locked;
  }, [allMatches, now, internalFirstMatchBypassId]);

  const openMatches = useMemo(
    () => phaseMatches.filter((m) => !lockedMatchIds.has(m.id)),
    [phaseMatches, lockedMatchIds],
  );

  const isSubmitted = submittedPhases.has(activeTab);
  const isOpen = phaseOpenMap[activeTab] ?? false;
  const hasOpenMatches = openMatches.length > 0;
  const phaseHasStartedMatches = phaseMatches.some((m) => m.startsAt && new Date(m.startsAt).getTime() <= now);
  const showEditForm = !isSubmitted && isOpen && hasOpenMatches && !result;
  const showReadOnly = isSubmitted && !result;
  const showPlaceholder = !isSubmitted && !isOpen && !phaseHasStartedMatches;
  const showMissed = !isSubmitted && !isOpen && phaseHasStartedMatches && !result;

  useEffect(() => {
    const existingPreds = existingPredictions[activeTab] ?? [];
    const initial: Scores = {};
    for (const p of existingPreds) {
      initial[p.matchId] = { h: p.predictedHomeScore, a: p.predictedAwayScore };
    }

    if (!isSubmitted) {
      const key = `quiniela:${ticketCode}:${activeTab}`;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved) as Scores;
          for (const [matchId, score] of Object.entries(parsed)) {
            initial[matchId] = score;
          }
        }
      } catch { /* ok */ }
    }

    setScores(initial);
  }, [ticketCode, activeTab, isSubmitted, existingPredictions]);

  const updateScore = useCallback(
    (matchId: string, field: 'h' | 'a', value: number) => {
      if (lockedMatchIds.has(matchId)) return;
      setScores((prev) => {
        const existing = prev[matchId] ?? { h: 0, a: 0 };
        const next: Scores = { ...prev, [matchId]: { ...existing, [field]: value } };
        try {
          localStorage.setItem(`quiniela:${ticketCode}:${activeTab}`, JSON.stringify(next));
        } catch { /* quota */ }
        return next;
      });
    },
    [ticketCode, activeTab, lockedMatchIds],
  );

  const filledCount = openMatches.filter((m) => {
    const s = scores[m.id];
    return s && s.h >= 0 && s.a >= 0;
  }).length;
  const allFilled = filledCount === openMatches.length && openMatches.length > 0;

  // Eliminatoria (r32+): no se permite empate. Marca los partidos con marcador
  // empatado para bloquear el sellado y avisar por partido.
  const isKnockout = !activeTab.startsWith('groups_');
  const drawMatchIds = useMemo(() => {
    if (!isKnockout) return new Set<string>();
    return new Set(
      openMatches.filter((m) => { const s = scores[m.id]; return s && s.h === s.a; }).map((m) => m.id),
    );
  }, [isKnockout, openMatches, scores]);
  const hasInvalidDraw = drawMatchIds.size > 0;

  async function handleSubmit() {
    setShowConfirm(false);
    if (hasInvalidDraw) {
      setError('En eliminatoria no se permite empate: elige un ganador en cada partido.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);

    const predictions = openMatches.map((m) => ({
      match_id: m.id,
      predicted_home_score: scores[m.id]?.h ?? 0,
      predicted_away_score: scores[m.id]?.a ?? 0,
    }));

    try {
      const res = await fetch(`/api/phases/${activeTab}/predictions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_code: ticketCode, predictions, terms_accepted: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ phase_seal: data.phase_seal, shortcode: data.shortcode });
        try { localStorage.removeItem(`quiniela:${ticketCode}:${activeTab}`); } catch { /* ok */ }
      } else {
        setError(data.message ?? data.error ?? 'Error al enviar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  function getHomeTeamRaw(m: SerializedMatch): string {
    return m.actualHomeTeam ?? m.teamHome;
  }
  function getAwayTeamRaw(m: SerializedMatch): string {
    return m.actualAwayTeam ?? m.teamAway;
  }
  function getHomeTeam(m: SerializedMatch): string {
    return getTeamDisplayName(getHomeTeamRaw(m));
  }
  function getAwayTeam(m: SerializedMatch): string {
    return getTeamDisplayName(getAwayTeamRaw(m));
  }

  const groupedMatches = useMemo(() => {
    if (!activeTab.startsWith('groups_')) return null;
    const groups: Record<string, SerializedMatch[]> = {};
    for (const m of phaseMatches) {
      const g = m.groupLetter ?? '?';
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [phaseMatches, activeTab]);

  function calcMatchPoints(predH: number, predA: number, actualH: number, actualA: number, penaltyWinner?: PenaltyWinner): MatchResultMeta {
    return matchResultMeta(scoreMatch(predH, predA, actualH, actualA, penaltyWinner), penaltyWinner != null, predH === predA);
  }

  const progressPct = openMatches.length > 0 ? Math.round((filledCount / openMatches.length) * 100) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/stadium-night.jpg)', filter: 'brightness(1.15) saturate(1.25) contrast(1.05)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e3d]/55 via-[#1a3a6b]/45 to-[#2c1810]/55" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top left, rgba(58,99,168,0.45), transparent 65%), radial-gradient(ellipse at bottom right, rgba(227,33,37,0.30), transparent 70%)' }} />
    <div className="relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-black/30">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Regresar al dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
          </a>
          <BrandHeader />
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60">{userEmail}</p>
          <p className="text-xs font-semibold text-white/80">{ticketCode}</p>
        </div>
      </header>

      {/* Phase tabs */}
      <nav className="border-b border-white/10 overflow-x-auto backdrop-blur-sm bg-black/10">
        <div className="flex min-w-max">
          {PHASE_ORDER.map((p) => {
            const isSub = submittedPhases.has(p);
            const isAct = phaseOpenMap[p];
            return (
              <button
                key={p}
                onClick={() => { setActiveTab(p); setResult(null); setError(null); }}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === p
                    ? 'border-brand-red text-white'
                    : 'border-transparent text-white/50 hover:text-white/80'
                } ${isSub ? 'bg-green-500/10' : ''}`}
              >
                {PHASE_LABELS[p]}
                {isSub && <span className="ml-1 text-green-400">✓</span>}
                {isAct && !isSub && <span className="ml-1 text-blue-400">●</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {pendingApproval && (
        <div className="bg-amber-500/90 text-black text-center text-xs font-bold py-2 px-4">
          Tu registro está en revisión. Si no es aprobado, estas predicciones no tendrán validez.
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Phase header with progress */}
        {showEditForm && (
          <div className="mb-6 backdrop-blur-xl bg-white/[0.06] rounded-2xl border border-white/10 p-5">
            <h2 className="text-white font-bold text-xl mb-1">{PHASE_LABELS[activeTab]}</h2>
            {lockedMatchIds.size > 0 && phaseMatches.some((m) => lockedMatchIds.has(m.id)) && (
              <p className="text-amber-300/80 text-xs mb-2">
                Los partidos que ya comenzaron están bloqueados.
              </p>
            )}
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-red rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-white/70 text-sm font-medium">{filledCount}/{openMatches.length}</span>
            </div>
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="backdrop-blur-xl bg-green-500/10 border border-green-400/30 rounded-2xl p-6 mb-6 text-center">
            <p className="text-green-300 font-semibold text-lg mb-2">¡Fase sellada!</p>
            <p className="text-green-200 text-sm mb-2">
              Sello: <code className="bg-black/20 px-2 py-1 rounded text-green-300">{result.shortcode}</code>
            </p>
            <a href={`/verifica/${result.shortcode}`} className="text-blue-300 text-sm hover:underline">
              Verificar mi sello
            </a>
            <p className="text-white/50 text-xs mt-3">
              Tus predicciones quedaron registradas y no pueden modificarse.
            </p>
          </div>
        )}

        {error && (
          <div className="backdrop-blur-xl bg-red-500/10 border border-red-400/30 rounded-2xl p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Read-only view — all matches locked */}
        {showReadOnly && (() => {
          const sub = submissions.find((s) => s.phase === activeTab)!;
          const preds: ExistingPrediction[] = existingPredictions[activeTab] ?? [];
          const predMap = new Map(preds.map((p) => [p.matchId, p]));
          return (
            <div>
              <div className="backdrop-blur-xl bg-green-500/10 border border-green-400/30 rounded-2xl p-4 mb-6">
                <p className="text-green-300 font-semibold">Fase sellada</p>
                <p className="text-green-200/70 text-sm">
                  Sello: <code className="bg-black/20 px-2 py-1 rounded text-green-300">{sub.phaseSeal.slice(0, 8)}</code>
                  {' · '}Enviada: {new Date(sub.submittedAt).toLocaleString('es-MX')}
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {phaseMatches.map((m) => {
                  const pred = predMap.get(m.id);
                  const homeRaw = getHomeTeamRaw(m);
                  const awayRaw = getAwayTeamRaw(m);
                  const home = getTeamDisplayName(homeRaw);
                  const away = getTeamDisplayName(awayRaw);
                  const hasResult = m.actualHomeScore != null && m.actualAwayScore != null;
                  const pts = hasResult && pred ? calcMatchPoints(pred.predictedHomeScore, pred.predictedAwayScore, m.actualHomeScore!, m.actualAwayScore!, m.penaltyWinner as PenaltyWinner) : null;
                  return (
                    <div key={m.id} className={`backdrop-blur-xl rounded-2xl p-4 border ${
                      pts?.pts === 5 ? 'bg-emerald-500/10 border-emerald-400/30'
                      : pts?.pts === 2 ? 'bg-blue-500/10 border-blue-400/30'
                      : pts?.pts === 0 ? 'bg-red-500/10 border-red-400/20'
                      : 'bg-white/[0.06] border-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <img src={getFlagUrl(homeRaw, 'sm')} alt="" className="w-5 h-4 rounded-sm object-cover" loading="lazy" />
                        <span className="flex-1 text-right text-white text-sm font-medium truncate">{home}</span>
                        <span className="w-8 text-center text-white font-bold">{pred?.predictedHomeScore ?? '-'}</span>
                        <span className="text-white/30">–</span>
                        <span className="w-8 text-center text-white font-bold">{pred?.predictedAwayScore ?? '-'}</span>
                        <span className="flex-1 text-white text-sm font-medium truncate">{away}</span>
                        <img src={getFlagUrl(awayRaw, 'sm')} alt="" className="w-5 h-4 rounded-sm object-cover" loading="lazy" />
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                        {hasResult ? (
                          <>
                            <span className="text-sm text-white/80">Real: <span className="font-mono font-semibold">{m.actualHomeScore}–{m.actualAwayScore}</span></span>
              {m.penaltyWinner && (
                <span className="text-[11px] font-semibold text-amber-300">· Penales: Ganó {getTeamDisplayName(m.penaltyWinner === 'home' ? (m.actualHomeTeam ?? m.teamHome) : (m.actualAwayTeam ?? m.teamAway))}</span>
              )}
                            {pts ? (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pts.bg} ${pts.shadow}`}>
                                {pts.icon} {pts.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/[0.08] text-white/60">
                                Sin pronóstico
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/[0.08] text-white/60">
                            ⏳ Próximo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Edit form — with locked match support */}
        {showEditForm && (
          <div>
            {activeTab.startsWith('groups_') && groupedMatches ? (
              groupedMatches.map(([group, groupMs]) => (
                <div key={group} className="mb-8">
                  <h3 className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-3 px-1">
                    Grupo {group}
                  </h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {groupMs.map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {phaseMatches.map((m) => renderMatchCard(m))}
              </div>
            )}

            {/* Sticky submit button */}
            <div className="sticky bottom-0 pt-4 pb-6 bg-gradient-to-t from-[#0a1e3d] via-[#0a1e3d]/90 to-transparent mt-8">
              <div className="text-center">
                {readOnly ? (
                  <p className="text-white/50 text-sm font-semibold py-4">Vista de solo lectura (admin)</p>
                ) : (
                  <>
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={!allFilled || hasInvalidDraw || submitting}
                      className="bg-brand-red text-white px-10 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-all hover:scale-[1.02]"
                    >
                      {submitting ? 'Sellando...' : `Sellar ${PHASE_LABELS[activeTab]}`}
                    </button>
                    {!allFilled && (
                      <p className="text-white/40 text-xs mt-2">
                        Completa los {openMatches.length} partidos disponibles para sellar
                      </p>
                    )}
                    {allFilled && hasInvalidDraw && (
                      <p className="text-amber-300 text-xs mt-2">
                        En eliminatoria no se permite empate: elige un ganador en {drawMatchIds.size} partido{drawMatchIds.size > 1 ? 's' : ''}.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Future phase — not yet open */}
        {showPlaceholder && (
          <div className="text-center py-20">
            <p className="text-white/60 text-lg mb-2">{PHASE_LABELS[activeTab]}</p>
            <p className="text-white/30 text-sm">Disponible desde {PHASE_WINDOWS[activeTab]}</p>
            {showEliminatoria && activeTab !== 'groups_m1' && activeTab !== 'groups_m2' && activeTab !== 'groups_m3' && (
              <Link href="/eliminatoria" className="inline-block mt-4 text-sm text-brand-blue hover:underline">
                Ver eliminatoria →
              </Link>
            )}
          </div>
        )}

        {/* Missed phase — never submitted and all matches started */}
        {showMissed && (
          <div className="text-center py-20">
            <p className="text-white/60 text-lg mb-2">{PHASE_LABELS[activeTab]}</p>
            <p className="text-white/30 text-sm">Todos los partidos de esta fase ya comenzaron.</p>
          </div>
        )}
      </main>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-lg text-white mb-2">¿Sellar esta fase?</h3>
            <p className="text-white/70 text-sm mb-4">
              Se generará un sello digital como comprobante de tus predicciones.
              <strong className="text-white"> Una vez sellada, no podrás modificarla.</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-white/20 rounded-xl py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-brand-red text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Confirmar y sellar
              </button>
            </div>
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
    </div>
  );

  function renderMatchCard(m: SerializedMatch) {
    const isLocked = lockedMatchIds.has(m.id);
    const homeRaw = getHomeTeamRaw(m);
    const awayRaw = getAwayTeamRaw(m);
    const home = getTeamDisplayName(homeRaw);
    const away = getTeamDisplayName(awayRaw);
    const kickoff = m.startsAt ?? m.scheduledAt;
    const { short: dateStr, time: timeStr } = formatMatchTimeCDMX(kickoff);
    const pred = scores[m.id];
    const hasPrediction = pred?.h !== undefined && pred?.a !== undefined;

    if (isLocked) {
      const hasResult = m.actualHomeScore != null && m.actualAwayScore != null;
      const pts = hasResult && hasPrediction ? calcMatchPoints(pred.h, pred.a, m.actualHomeScore!, m.actualAwayScore!, m.penaltyWinner as PenaltyWinner) : null;
      return (
        <div
          key={m.id}
          className={`
            backdrop-blur-xl rounded-2xl p-4 border relative
            ${pts?.pts === 5 ? 'bg-emerald-500/10 border-emerald-400/30'
            : pts?.pts === 2 ? 'bg-blue-500/10 border-blue-400/30'
            : pts?.pts === 0 ? 'bg-red-500/10 border-red-400/20'
            : 'bg-white/[0.04] border-white/[0.08]'}
            opacity-70
          `}
        >
          {/* Lock badge */}
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300/90 border border-amber-400/20">
              🔒 Cerrado
            </span>
          </div>

          {/* Top: group + time */}
          <div className="flex justify-between items-center mb-3 pr-20">
            {m.groupLetter && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-white/50 bg-white/10 px-2 py-0.5 rounded">
                Grupo {m.groupLetter}
              </span>
            )}
            <span className="text-[11px] text-white/50 ml-auto">
              {dateStr} · {timeStr}
            </span>
          </div>

          {/* Teams + scores */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
              <img src={getFlagUrl(homeRaw)} alt={home} className="w-10 h-7 sm:w-12 sm:h-8 rounded object-cover shadow-sm opacity-60" loading="lazy" />
              <span className="text-white/60 text-[11px] sm:text-sm font-medium text-center leading-tight line-clamp-2">{home}</span>
            </div>

            {hasPrediction ? (
              <>
                <span className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/[0.08] border border-white/10 rounded-xl text-lg sm:text-xl font-bold text-white/50">{pred.h}</span>
                <span className="text-white/20 text-xs font-bold flex-shrink-0">vs</span>
                <span className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/[0.08] border border-white/10 rounded-xl text-lg sm:text-xl font-bold text-white/50">{pred.a}</span>
              </>
            ) : (
              <>
                <span className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/[0.05] border border-white/[0.06] rounded-xl text-lg text-white/20">–</span>
                <span className="text-white/20 text-xs font-bold flex-shrink-0">vs</span>
                <span className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/[0.05] border border-white/[0.06] rounded-xl text-lg text-white/20">–</span>
              </>
            )}

            <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
              <img src={getFlagUrl(awayRaw)} alt={away} className="w-10 h-7 sm:w-12 sm:h-8 rounded object-cover shadow-sm opacity-60" loading="lazy" />
              <span className="text-white/60 text-[11px] sm:text-sm font-medium text-center leading-tight line-clamp-2">{away}</span>
            </div>
          </div>

          {/* Result row for locked matches */}
          {hasResult && (
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm text-white/80">Real: <span className="font-mono font-semibold">{m.actualHomeScore}–{m.actualAwayScore}</span></span>
              {m.penaltyWinner && (
                <span className="text-[11px] font-semibold text-amber-300">· Penales: Ganó {getTeamDisplayName(m.penaltyWinner === 'home' ? (m.actualHomeTeam ?? m.teamHome) : (m.actualAwayTeam ?? m.teamAway))}</span>
              )}
              {pts && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pts.bg} ${pts.shadow}`}>
                  {pts.icon} {pts.label}
                </span>
              )}
            </div>
          )}
          {!hasResult && !hasPrediction && (
            <p className="text-amber-300/50 text-[10px] mt-2 text-center">Sin predicción</p>
          )}
        </div>
      );
    }

    const isInvalidDraw = drawMatchIds.has(m.id);
    return (
      <div
        key={m.id}
        className={`
          backdrop-blur-xl bg-white/[0.08] hover:bg-white/[0.12]
          border rounded-2xl p-4
          shadow-[0_8px_32px_0_rgba(0,0,0,0.18)]
          transition-all duration-200 hover:-translate-y-0.5
          focus-within:shadow-[0_0_0_3px_rgba(227,33,37,0.2)]
          ${isInvalidDraw
            ? 'border-amber-400/70 ring-1 ring-amber-400/40'
            : hasPrediction ? 'border-green-400/30' : 'border-white/[0.15] hover:border-white/[0.22] focus-within:border-brand-red/60'}
        `}
      >
        {/* Top: group + time */}
        <div className="flex justify-between items-center mb-3">
          {m.groupLetter && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-white/50 bg-white/10 px-2 py-0.5 rounded">
              Grupo {m.groupLetter}
            </span>
          )}
          <span className="text-[11px] text-white/50 ml-auto">
            {dateStr} · {timeStr}
          </span>
        </div>

        {/* Teams + inputs */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Home team */}
          <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
            <img src={getFlagUrl(homeRaw)} alt={home} className="w-10 h-7 sm:w-12 sm:h-8 rounded object-cover shadow-sm" loading="lazy" />
            <span className="text-white text-[11px] sm:text-sm font-medium text-center leading-tight line-clamp-2" title={home}>
              {home}
            </span>
          </div>

          {/* Score inputs */}
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            max={20}
            value={scores[m.id]?.h ?? ''}
            onChange={(e) => updateScore(m.id, 'h', parseInt(e.target.value) || 0)}
            aria-label={`Goles de ${home}`}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white/[0.15] backdrop-blur border border-white/20 rounded-xl text-center text-lg sm:text-xl font-bold text-white placeholder:text-white/30 focus:bg-white/25 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/40 transition-all flex-shrink-0"
            placeholder="–"
          />
          <span className="text-white/30 text-xs font-bold flex-shrink-0">vs</span>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            max={20}
            value={scores[m.id]?.a ?? ''}
            onChange={(e) => updateScore(m.id, 'a', parseInt(e.target.value) || 0)}
            aria-label={`Goles de ${away}`}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white/[0.15] backdrop-blur border border-white/20 rounded-xl text-center text-lg sm:text-xl font-bold text-white placeholder:text-white/30 focus:bg-white/25 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/40 transition-all flex-shrink-0"
            placeholder="–"
          />

          {/* Away team */}
          <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
            <img src={getFlagUrl(awayRaw)} alt={away} className="w-10 h-7 sm:w-12 sm:h-8 rounded object-cover shadow-sm" loading="lazy" />
            <span className="text-white text-[11px] sm:text-sm font-medium text-center leading-tight line-clamp-2" title={away}>
              {away}
            </span>
          </div>
        </div>

        {/* Eliminatoria: aviso de empate no permitido */}
        {isInvalidDraw && (
          <p className="text-amber-300 text-[11px] mt-2 font-medium">
            ⚠️ En eliminatoria no hay empates: elige un ganador.
          </p>
        )}

        {/* Venue */}
        {m.venueName && (
          <p className="text-[10px] text-white/30 mt-2 truncate">
            📍 {m.venueName}{m.venueCity ? ` · ${m.venueCity}` : ''}
          </p>
        )}
      </div>
    );
  }
}
