'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Preview = {
  total_duplicates: number;
  will_delete: number;
  will_close: number;
  responses_preserved: number;
};

export function DedupeTriviasButton() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>('');

  async function runPreview() {
    setBusy(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/trivias/dedupe-trivias', {
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
        total_duplicates: data.total_duplicates ?? 0,
        will_delete: data.will_delete ?? 0,
        will_close: data.will_close ?? 0,
        responses_preserved: data.responses_preserved ?? 0,
      });
    } finally {
      setBusy(false);
    }
  }

  async function runApply() {
    if (!preview) return;
    const ok = confirm(
      `Vas a eliminar ${preview.will_delete} trivias duplicadas vacías y cerrar ${preview.will_close} duplicadas con respuestas (sus ${preview.responses_preserved} respuestas se conservan). ¿Continuar?`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/trivias/dedupe-trivias', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apply: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error ?? res.status}`);
        return;
      }
      setResult(`✓ Eliminadas ${data.deletedCount} · cerradas ${data.closedCount}.`);
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
          {busy && !preview ? 'Calculando…' : 'Dedupe trivias'}
        </button>
        {preview && (
          <button
            onClick={runApply}
            disabled={busy || preview.total_duplicates === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 rounded text-sm font-semibold"
          >
            {busy ? 'Aplicando…' : `Aplicar (${preview.total_duplicates})`}
          </button>
        )}
      </div>
      {preview && (
        <p className="text-xs text-white/70 text-right">
          Duplicadas: <strong>{preview.total_duplicates}</strong> ·
          A borrar (vacías): <strong>{preview.will_delete}</strong> ·
          A cerrar (con respuestas): <strong>{preview.will_close}</strong>
        </p>
      )}
      {result && <p className="text-xs text-emerald-300">{result}</p>}
    </div>
  );
}
