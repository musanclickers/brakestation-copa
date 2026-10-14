'use client';

import { useEffect, useMemo, useState } from 'react';

type TemplateOption = { key: string; label: string };
type TriviaOption = { id: string; label: string };
type WaRow = {
  userId: string | null;
  name: string;
  email: string;
  cohort: 'BS' | 'CD' | 'INT' | null;
  ticketCode: string | null;
  rawPhone: string | null;
  waPhone: string | null;
  waText: string;
};

type AudienceKind =
  | 'all_activated'
  | 'not_answered_trivia'
  | 'not_predicted_open_matches'
  | 'not_sealed_j3'
  | 'sealed_phase'
  | 'explicit_emails'
  | 'test';

type PhaseOption = { value: string; label: string };

type Props = {
  templates: TemplateOption[];
  trivias: TriviaOption[];
  phases: PhaseOption[];
};

export function NotificationsClient({ templates, trivias, phases }: Props) {
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? '');
  const [audienceKind, setAudienceKind] = useState<AudienceKind>('all_activated');
  const [cohort, setCohort] = useState<'' | 'BS' | 'CD' | 'INT'>('');
  const [triviaId, setTriviaId] = useState(trivias[0]?.id ?? '');
  const [sealedPhaseVal, setSealedPhaseVal] = useState(
    phases.find((p) => p.value === 'r16')?.value ?? phases[0]?.value ?? '',
  );
  const [emailsRaw, setEmailsRaw] = useState('');
  const [testEmail, setTestEmail] = useState('emurillo05@gmail.com');
  const [count, setCount] = useState<number | null>(null);
  const [sample, setSample] = useState<{ email: string; name: string }[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>('');
  const [waMode, setWaMode] = useState(false);
  const [waList, setWaList] = useState<WaRow[] | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waSent, setWaSent] = useState<Set<string>>(new Set());

  const audienceSpec = useMemo(() => {
    if (audienceKind === 'all_activated') {
      return cohort ? { kind: 'all_activated', cohort } : { kind: 'all_activated' };
    }
    if (audienceKind === 'not_answered_trivia') return { kind: 'not_answered_trivia', triviaId };
    if (audienceKind === 'not_predicted_open_matches') return { kind: 'not_predicted_open_matches' };
    if (audienceKind === 'not_sealed_j3') return { kind: 'not_sealed_j3' };
    if (audienceKind === 'sealed_phase') return { kind: 'sealed_phase', phase: sealedPhaseVal };
    if (audienceKind === 'explicit_emails') {
      const emails = emailsRaw
        .split(/[\s,;]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      return { kind: 'explicit_emails', emails };
    }
    return { kind: 'test', email: testEmail };
  }, [audienceKind, cohort, triviaId, sealedPhaseVal, emailsRaw, testEmail]);

  useEffect(() => {
    if (audienceKind === 'test') {
      setCount(1);
      setSample([{ email: testEmail, name: 'Eduardo' }]);
      return;
    }
    let cancelled = false;
    setCount(null);
    fetch('/api/admin/notifications/audience-count', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spec: audienceSpec }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCount(data.count ?? 0);
        setSample(data.sample ?? []);
      })
      .catch(() => setCount(0));
    return () => {
      cancelled = true;
    };
  }, [audienceSpec, audienceKind, testEmail]);

  useEffect(() => {
    if (!templateKey) return;
    fetch('/api/admin/notifications/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateKey, sampleName: sample[0]?.name ?? 'Eduardo' }),
    })
      .then((r) => r.json())
      .then((d) => setPreviewHtml(d.html ?? ''))
      .catch(() => setPreviewHtml(''));
  }, [templateKey, sample]);

  async function doSend(force = false) {
    setSending(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateKey, audience: audienceSpec, force }),
      });
      const data = await res.json();
      if (res.status === 409 && data.requireForce) {
        const ok = confirm(
          `Ya se envió esta plantilla el ${new Date(data.lastSentAt).toLocaleString('es-MX')}. ¿Continuar de todos modos?`,
        );
        if (ok) return doSend(true);
        setResult('Envío cancelado.');
        return;
      }
      if (!res.ok) {
        setResult(`Error: ${data.error ?? res.status}`);
        return;
      }
      setResult(`Enviado: ${data.succeeded}/${data.recipientCount} OK, ${data.failed} fallaron.`);
    } catch (e) {
      setResult(`Error: ${e}`);
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 text-white">
      <h1 className="font-display text-3xl mb-6">Admin — Notificaciones</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Plantilla</label>
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key} className="text-black">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Audiencia</label>
            <div className="space-y-2">
              {(
                [
                  ['all_activated', 'Todos los activados'],
                  ['not_answered_trivia', 'No han contestado una trivia'],
                  ['not_predicted_open_matches', 'No han predicho partidos abiertos'],
                  ['not_sealed_j3', 'No sellaron J3 (pronósticos y/o trivias)'],
                  ['sealed_phase', 'Sellaron una fase'],
                  ['explicit_emails', 'Lista manual de emails'],
                  ['test', 'Modo prueba (1 email)'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="audience"
                    value={k}
                    checked={audienceKind === k}
                    onChange={() => setAudienceKind(k)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {audienceKind === 'all_activated' && (
              <select
                value={cohort}
                onChange={(e) => setCohort(e.target.value as '' | 'BS' | 'CD' | 'INT')}
                className="mt-2 w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
              >
                <option value="" className="text-black">Todos los cohorts</option>
                <option value="BS" className="text-black">Solo BS</option>
                <option value="CD" className="text-black">Solo CD</option>
                <option value="INT" className="text-black">Solo INT</option>
              </select>
            )}

            {audienceKind === 'not_answered_trivia' && (
              <select
                value={triviaId}
                onChange={(e) => setTriviaId(e.target.value)}
                className="mt-2 w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
              >
                {trivias.map((t) => (
                  <option key={t.id} value={t.id} className="text-black">
                    {t.label}
                  </option>
                ))}
              </select>
            )}

            {audienceKind === 'sealed_phase' && (
              <select
                value={sealedPhaseVal}
                onChange={(e) => setSealedPhaseVal(e.target.value)}
                className="mt-2 w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
              >
                {phases.map((p) => (
                  <option key={p.value} value={p.value} className="text-black">
                    {p.label}
                  </option>
                ))}
              </select>
            )}

            {audienceKind === 'explicit_emails' && (
              <textarea
                value={emailsRaw}
                onChange={(e) => setEmailsRaw(e.target.value)}
                rows={4}
                placeholder="email1@x.com, email2@y.com..."
                className="mt-2 w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
              />
            )}

            {audienceKind === 'test' && (
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="mt-2 w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
              />
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded p-4">
            <p className="text-sm">
              Destinatarios: <strong>{count ?? '…'}</strong>
            </p>
            {sample.length > 0 && (
              <ul className="mt-2 text-xs text-white/70">
                {sample.map((s) => (
                  <li key={s.email}>
                    {s.email} — {s.name || '(sin nombre)'}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            disabled={!count || sending}
            onClick={() => setConfirming(true)}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded"
          >
            Enviar email a {count ?? 0} destinatarios
          </button>

          <button
            disabled={!count}
            onClick={async () => {
              const res = await fetch('/api/admin/notifications/audience-export', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ spec: audienceSpec }),
              });
              if (!res.ok) {
                setResult('Error al generar el CSV.');
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `audiencia-${audienceKind}-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full bg-white/10 hover:bg-white/20 disabled:bg-gray-600 text-white font-semibold py-3 rounded"
          >
            Descargar CSV ({count ?? 0})
          </button>

          <button
            disabled={!count || waLoading}
            onClick={async () => {
              setWaLoading(true);
              setWaMode(true);
              try {
                const res = await fetch('/api/admin/notifications/audience-list', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ spec: audienceSpec, templateKey }),
                });
                const data = await res.json();
                setWaList(data.recipients ?? []);
              } catch {
                setWaList([]);
              } finally {
                setWaLoading(false);
              }
            }}
            className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-600 text-white font-semibold py-3 rounded"
          >
            {waLoading ? 'Cargando…' : `WhatsApp persona a persona (${count ?? 0})`}
          </button>

          {result && (
            <p className="text-sm bg-white/5 border border-white/10 rounded p-3">{result}</p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Preview</p>
          <iframe
            title="email-preview"
            srcDoc={previewHtml}
            className="w-full h-[600px] rounded border border-white/20 bg-white"
          />
        </div>
      </div>

      {waMode && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto bg-zinc-900 border border-white/10 rounded-lg p-6 my-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">WhatsApp persona a persona</h2>
              <button
                onClick={() => setWaMode(false)}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
              >
                Cerrar
              </button>
            </div>
            <p className="text-sm text-white/70 mb-4">
              Click en "WA" abre <code>wa.me</code> en pestaña nueva. Mandas desde tu propio WhatsApp.
              Cero throttle, cero servicio Baileys, cero riesgo de ban.
            </p>
            {waList === null ? (
              <p className="text-sm">Cargando…</p>
            ) : waList.length === 0 ? (
              <p className="text-sm">Sin destinatarios.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-white/50 border-b border-white/10">
                    <tr>
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Nombre</th>
                      <th className="text-left py-2">Boleto</th>
                      <th className="text-left py-2">Teléfono</th>
                      <th className="text-left py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waList.map((r, idx) => {
                      const key = `${r.userId ?? r.email}:${r.ticketCode ?? ''}`;
                      const sent = waSent.has(key);
                      const href = r.waPhone
                        ? `https://wa.me/${r.waPhone}?text=${encodeURIComponent(r.waText)}`
                        : null;
                      return (
                        <tr key={key} className={`border-b border-white/5 ${sent ? 'opacity-50' : ''}`}>
                          <td className="py-2 text-white/50">{idx + 1}</td>
                          <td className="py-2">
                            <div>{r.name || '(sin nombre)'}</div>
                            <div className="text-xs text-white/40">{r.email}</div>
                          </td>
                          <td className="py-2 text-xs">{r.ticketCode ?? '—'}</td>
                          <td className="py-2 text-xs">{r.rawPhone ?? '—'}</td>
                          <td className="py-2">
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() =>
                                  setWaSent((prev) => new Set([...prev, key]))
                                }
                                className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                                  sent
                                    ? 'bg-white/10 text-white/70'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                              >
                                {sent ? '✓ Enviado' : 'Abrir WA'}
                              </a>
                            ) : (
                              <span className="text-xs text-white/40">sin teléfono</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-white/40 mt-4">
                  {waSent.size}/{waList.length} marcados como enviados (solo estado local).
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-3">Confirmar envío</h2>
            <p className="text-sm mb-4">
              Plantilla: <strong>{templates.find((t) => t.key === templateKey)?.label}</strong>
              <br />
              Destinatarios: <strong>{count}</strong>
              <br />
              Modo: <strong>{audienceKind === 'test' ? 'prueba' : 'masivo'}</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => doSend(false)}
                disabled={sending}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 py-2 rounded"
              >
                {sending ? 'Enviando…' : 'Confirmar'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
