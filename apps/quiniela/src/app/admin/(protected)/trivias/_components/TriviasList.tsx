'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TriviaActions } from './TriviaActions';

export type TriviaRow = {
  id: string;
  phaseLabel: string;
  question: string;
  category: string;
  opensAtIso: string;
  closesAtIso: string;
  correctOption: string;
  responseCount: number;
};

const PHASE_ORDER = [
  'groups_m1', 'groups_m2', 'groups_m3', 'r32', 'r16', 'qf', 'sf', 'final_phase',
] as const;

type Props = { rows: TriviaRow[] };
type Mode = 'auto' | 'force';

export function TriviasList({ rows: allRows }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>('');
  const [mode, setMode] = useState<Mode>('auto');
  const [hideClosed, setHideClosed] = useState(true);
  const [onlyWithResponses, setOnlyWithResponses] = useState(false);

  const now = Date.now();

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (hideClosed && new Date(r.closesAtIso).getTime() <= now) return false;
      if (onlyWithResponses && r.responseCount === 0) return false;
      return true;
    });
  }, [allRows, hideClosed, onlyWithResponses, now]);

  const grouped = useMemo(() => {
    const map = new Map<string, TriviaRow[]>();
    for (const t of rows) {
      const list = map.get(t.phaseLabel) ?? [];
      list.push(t);
      map.set(t.phaseLabel, list);
    }
    return map;
  }, [rows]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllInPhase(phase: string, checked: boolean) {
    const ids = grouped.get(phase)?.map((t) => t.id) ?? [];
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(rows.map((r) => r.id)));
    else setSelected(new Set());
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const ids = [...selected];
    const message =
      mode === 'force'
        ? `⚠️ FORZAR BORRADO de ${ids.length} trivia(s) + TODAS sus respuestas. Los puntos ganados con esas trivias se pierden. ¿Continuar?`
        : `¿Eliminar ${ids.length} trivia(s)? Las que tengan respuestas se CIERRAN (no se borran) para conservar puntos. Activa "Forzar borrado" si prefieres eliminarlas junto con sus respuestas.`;
    const ok = confirm(message);
    if (!ok) return;
    setBusy(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/trivias/bulk-delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error ?? res.status}`);
        return;
      }
      const parts: string[] = [];
      if (data.deletedCount > 0) parts.push(`eliminadas ${data.deletedCount}`);
      if (data.closedCount > 0) parts.push(`cerradas ${data.closedCount}`);
      if (data.deletedResponses > 0) parts.push(`respuestas borradas ${data.deletedResponses}`);
      setResult(`✓ ${parts.join(' · ') || 'sin cambios'}.`);
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && selected.size < rows.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 sticky top-0 bg-zinc-950/80 backdrop-blur z-10 p-3 rounded border border-white/10 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked;
              }}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            {selected.size > 0 ? `${selected.size} seleccionadas` : 'Seleccionar todo'}
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={hideClosed}
              onChange={(e) => setHideClosed(e.target.checked)}
            />
            Ocultar cerradas
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWithResponses}
              onChange={(e) => setOnlyWithResponses(e.target.checked)}
            />
            Solo con respuestas
          </label>
          <span className="text-xs text-white/40">
            {rows.length}/{allRows.length} visibles
          </span>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/70 flex items-center gap-1">
              Modo:
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs"
              >
                <option value="auto" className="text-black">Auto (cerrar si hay respuestas)</option>
                <option value="force" className="text-black">Forzar borrado (pierde respuestas)</option>
              </select>
            </label>
            <button
              onClick={bulkDelete}
              disabled={busy}
              className={`${
                mode === 'force' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50 text-white text-sm px-4 py-2 rounded font-semibold`}
            >
              {busy ? 'Procesando…' : `Eliminar seleccionadas (${selected.size})`}
            </button>
          </div>
        )}
      </div>

      {result && (
        <p className="text-xs text-emerald-300 mb-3">{result}</p>
      )}

      {PHASE_ORDER.filter((p) => grouped.has(p)).map((phase) => {
        const phaseRows = grouped.get(phase)!;
        const phaseAllChecked = phaseRows.every((t) => selected.has(t.id));
        const phaseSomeChecked = phaseRows.some((t) => selected.has(t.id)) && !phaseAllChecked;
        return (
          <section key={phase} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={phaseAllChecked}
                ref={(el) => {
                  if (el) el.indeterminate = phaseSomeChecked;
                }}
                onChange={(e) => toggleAllInPhase(phase, e.target.checked)}
              />
              <h2 className="text-lg font-semibold">{phase}</h2>
              <span className="text-xs text-white/40">({phaseRows.length})</span>
            </div>
            <div className="space-y-2">
              {phaseRows.map((t) => {
                const opensAt = new Date(t.opensAtIso);
                const closesAt = new Date(t.closesAtIso);
                const open = opensAt.getTime() <= now;
                const closed = closesAt.getTime() <= now;
                const state = closed ? 'cerrada' : open ? 'abierta' : 'próxima';
                const stateColor = closed
                  ? 'text-white/40'
                  : open
                  ? 'text-green-400'
                  : 'text-yellow-400';
                const isSelected = selected.has(t.id);
                return (
                  <div
                    key={t.id}
                    className={`bg-white/5 border rounded p-3 flex items-center justify-between gap-3 ${
                      isSelected ? 'border-red-500/60 bg-red-500/5' : 'border-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(t.id)}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        <span className="text-xs uppercase mr-2 text-white/50">{t.category}</span>
                        {t.question}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {opensAt.toLocaleString('es-MX')} → {closesAt.toLocaleString('es-MX')} ·
                        respuestas: {t.responseCount} · correcta: {t.correctOption.toUpperCase()}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ${stateColor}`}>{state}</span>
                    <TriviaActions triviaId={t.id} responseCount={t.responseCount} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {rows.length === 0 && <p className="text-white/60">No hay trivias creadas todavía.</p>}
    </div>
  );
}
