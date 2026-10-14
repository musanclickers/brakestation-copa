'use client';

import { useState } from 'react';
import { utcIsoToCdmxInput, cdmxInputToUtcIso } from '@/lib/cdmx-datetime';

type Props = {
  phase: string;
  label: string;
  initialPreview: boolean;
  initialSealOpensAtIso: string | null;
};

export function PhaseSettingsForm({ phase, label, initialPreview, initialSealOpensAtIso }: Props) {
  const [preview, setPreview] = useState(initialPreview);
  const [local, setLocal] = useState(utcIsoToCdmxInput(initialSealOpensAtIso));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/phases/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewEnabled: preview, sealOpensAt: cdmxInputToUtcIso(local) }),
      });
      const body = await res.json();
      setMsg(res.ok ? 'Guardado' : `Error: ${body.error ?? res.statusText}`);
    } catch {
      setMsg('Error de red');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        Preview visible
      </label>
      <label className="flex flex-col text-xs text-white/60">
        Sellado abre (CDMX)
        <input
          type="datetime-local"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className="mt-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-brand-red hover:bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      {msg && (
        <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-300' : 'text-emerald-300'}`}>{msg}</span>
      )}
    </div>
  );
}
