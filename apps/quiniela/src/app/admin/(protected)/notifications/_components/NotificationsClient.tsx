'use client';

import { useEffect, useState } from 'react';

type Option = { value: string; label: string };
type Kind = 'all_registered' | 'missing_open_predictions' | 'predicted_phase' | 'explicit_emails';

const AUDIENCES: { kind: Kind; label: string }[] = [
  { kind: 'missing_open_predictions', label: 'Les falta pronosticar partidos abiertos' },
  { kind: 'all_registered', label: 'Todos los registrados' },
  { kind: 'predicted_phase', label: 'Pronosticaron una jornada' },
  { kind: 'explicit_emails', label: 'Correos específicos' },
];

export function NotificationsClient({ templates, phases }: { templates: Option[]; phases: Option[] }) {
  const [templateKey, setTemplateKey] = useState(templates[0]?.value ?? '');
  const [kind, setKind] = useState<Kind>('missing_open_predictions');
  const [phase, setPhase] = useState(phases[0]?.value ?? 'j1');
  const [emails, setEmails] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const spec =
    kind === 'predicted_phase' ? { kind, phase }
    : kind === 'explicit_emails' ? { kind, emails: emails.split(/[\s,;]+/).filter(Boolean) }
    : { kind };

  const post = (url: string, body: unknown) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  useEffect(() => {
    setCount(null);
    if (kind === 'explicit_emails' && !emails.trim()) return;
    const t = setTimeout(async () => {
      const res = await post('/api/admin/notifications/audience-count', { spec }).catch(() => null);
      if (res?.ok) setCount((await res.json()).count);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, phase, emails]);

  useEffect(() => {
    if (!templateKey) return;
    post('/api/admin/notifications/preview', { templateKey })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPreview({ subject: d.subject, html: d.html }))
      .catch(() => {});
  }, [templateKey]);

  async function send(audience: unknown, force = false) {
    setBusy(true);
    setStatus(null);
    const res = await post('/api/admin/notifications/send', { templateKey, audience, force }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.status === 409 && data.requireForce) {
      const when = data.lastSentAt ? new Date(data.lastSentAt).toLocaleString('es-MX', { timeZone: 'America/Merida' }) : 'hace poco';
      if (confirm(`Esta plantilla ya se mandó (${when}). ¿Mandarla otra vez?`)) return send(audience, true);
      return;
    }
    if (res?.ok) setStatus({ ok: true, text: `Enviados ${data.succeeded} de ${data.recipientCount}${data.failed ? ` (${data.failed} fallaron)` : ''}.` });
    else setStatus({ ok: false, text: data.error === 'empty_audience' ? 'Nadie cumple con esa audiencia.' : 'No se pudo enviar.' });
  }

  async function exportCsv() {
    const res = await post('/api/admin/notifications/audience-export', { spec }).catch(() => null);
    if (!res?.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `audiencia-${kind}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const field = 'rounded-xl bg-black/30 border border-white/20 px-3 py-2 text-white w-full';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <label className="block text-sm text-white/80">
          Plantilla
          <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className={`${field} mt-1`}>
            {templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="block text-sm text-white/80">
          ¿A quién?
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={`${field} mt-1`}>
            {AUDIENCES.map((a) => <option key={a.kind} value={a.kind}>{a.label}</option>)}
          </select>
        </label>
        {kind === 'predicted_phase' && (
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className={field}>
            {phases.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        )}
        {kind === 'explicit_emails' && (
          <textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="uno@correo.com, otro@correo.com" className={field} />
        )}
        <p className="text-sm text-white/70">
          {count === null ? 'Calculando…' : `${count} destinatario${count === 1 ? '' : 's'}`}
          <button onClick={exportCsv} className="ml-3 text-brand-gold underline text-xs">Descargar CSV</button>
        </p>

        <div className="rounded-2xl border border-white/10 p-4 space-y-2">
          <p className="text-sm text-white/80">Primero mándate una prueba:</p>
          <div className="flex gap-2">
            <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="tu@correo.com" className={field} />
            <button disabled={busy || !testEmail} onClick={() => send({ kind: 'test', email: testEmail })} className="border border-white/30 text-white px-4 rounded-xl disabled:opacity-40">Probar</button>
          </div>
        </div>

        <button
          disabled={busy || !count}
          onClick={() => confirm(`¿Mandar a ${count} personas?`) && send(spec)}
          className="w-full bg-brand-red text-white py-3 rounded-xl font-semibold disabled:opacity-40"
        >
          {busy ? 'Enviando…' : `Enviar a ${count ?? 0}`}
        </button>
        {status && <p role="status" className={`text-sm ${status.ok ? 'text-green-300' : 'text-red-300'}`}>{status.text}</p>}
      </div>

      <div>
        <p className="text-sm text-white/70 mb-2">Vista previa · <span className="text-white">{preview?.subject}</span></p>
        {preview && <iframe title="Vista previa del correo" srcDoc={preview.html} sandbox="" className="w-full h-[640px] rounded-2xl bg-white" />}
      </div>
    </div>
  );
}
