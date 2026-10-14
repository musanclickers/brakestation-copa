'use client';

import { useState } from 'react';

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    if (!confirm('¿Re-sincronizar calendario desde football-data.org?')) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/sync-matches', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        setResult(`Error: ${body.message ?? res.statusText}`);
      } else {
        setResult(`OK: ${body.updated} actualizados, ${body.skipped} omitidos`);
      }
    } catch {
      setResult('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-red-600 text-white font-semibold text-sm shadow-lg shadow-brand-red/30 transition-all disabled:opacity-50"
      >
        {loading ? 'Sincronizando...' : 'Re-sincronizar calendario'}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith('Error') ? 'text-red-300' : 'text-emerald-300'}`}>
          {result}
        </span>
      )}
    </div>
  );
}
