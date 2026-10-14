'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Slot = 'sf1Home' | 'sf1Away' | 'sf2Home' | 'sf2Away';
const SLOTS: { key: Slot; label: string }[] = [
  { key: 'sf1Home', label: 'Semifinal 1 · 1° lugar' },
  { key: 'sf1Away', label: 'Semifinal 1 · 4° lugar' },
  { key: 'sf2Home', label: 'Semifinal 2 · 2° lugar' },
  { key: 'sf2Away', label: 'Semifinal 2 · 3° lugar' },
];

export function FinalAssignForm({
  teams,
  initial,
}: {
  teams: { refaccionaria: string; label: string }[];
  initial: Record<Slot, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const chosen = Object.values(values).filter(Boolean);
  const complete = chosen.length === 4 && new Set(chosen).size === 4;

  async function save() {
    setSaving(true);
    setMsg(null);
    const r = (k: Slot) => ({ refaccionaria: values[k] });
    const res = await fetch('/api/admin/phases/final/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        semifinal_1_home: r('sf1Home'),
        semifinal_1_away: r('sf1Away'),
        semifinal_2_home: r('sf2Home'),
        semifinal_2_away: r('sf2Away'),
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      setMsg({ ok: true, text: 'Listo. Las semifinales ya aparecen en la quiniela.' });
      router.refresh();
    } else {
      setMsg({ ok: false, text: data.message ?? 'No se pudo guardar.' });
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((s) => (
          <label key={s.key} className="flex flex-col gap-1 text-sm text-white/80">
            {s.label}
            <select
              value={values[s.key]}
              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
              className="rounded-xl bg-black/30 border border-white/20 px-3 py-2 text-white"
            >
              <option value="">Elegir equipo…</option>
              {teams.map((t) => (
                <option key={t.refaccionaria} value={t.refaccionaria} disabled={chosen.includes(t.refaccionaria) && values[s.key] !== t.refaccionaria}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-green-300' : 'text-red-300'}`}>{msg.text}</p>}
      <button
        onClick={save}
        disabled={!complete || saving}
        className="bg-brand-red text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-40"
      >
        {saving ? 'Guardando…' : 'Asignar semifinales'}
      </button>
    </div>
  );
}
