'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Preview = { to_delete: number; affected_tickets: number; inflated_points: number };

export function DedupeButton() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>('');

  async function runPreview() {
    setBusy(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/trivias/dedupe-responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apply: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error ?? res.status}`);
        return;
      }
      setPreview({
        to_delete: data.to_delete ?? 0,
        affected_tickets: data.affected_tickets ?? 0,
        inflated_points: data.inflated_points ?? 0,
      });
    } finally {
      setBusy(false);
    }
  }

  async function runApply() {
    if (!preview) return;
    const ok = confirm(
      `¿Confirmas eliminar ${preview.to_delete} respuestas duplicadas? Esto bajará ${preview.inflated_points} pts repartidos entre ${preview.affected_tickets} boletos. NO se puede deshacer (haz backup primero si dudas).`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/trivias/dedupe-responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apply: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error ?? res.status}`);
        return;
      }
      setResult(`✓ Eliminadas ${data.deletedCount} respuestas duplicadas.`);
      setPreview(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={runPreview}
          disabled={busy}
          className="bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-2 rounded text-sm"
        >
          {busy && !preview ? 'Calculando…' : 'Dedupe respuestas'}
        </button>
        {preview && (
          <button
            onClick={runApply}
            disabled={busy || preview.to_delete === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 rounded text-sm font-semibold"
          >
            {busy ? 'Aplicando…' : `Aplicar (${preview.to_delete})`}
          </button>
        )}
      </div>
      {preview && (
        <p className="text-xs text-white/70 text-right">
          A borrar: <strong>{preview.to_delete}</strong> respuestas ·
          Boletos afectados: <strong>{preview.affected_tickets}</strong> ·
          Pts inflados: <strong>{preview.inflated_points}</strong>
        </p>
      )}
      {result && <p className="text-xs text-emerald-300">{result}</p>}
    </div>
  );
}
