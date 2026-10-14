'use client';

import { useState } from 'react';

type LinkResult = { link: string; name: string | null; expires: string };

// Soporte: genera el link de acceso de un participante ya registrado para
// mandárselo por otro medio (cuando el correo no le llega).
export function MagicLinkGenerator() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/admin/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setResult(data);
      else setError(data.message ?? 'No se pudo generar el link');
    } catch {
      setError('No hay conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@del-participante.com"
          className="flex-1 rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-white placeholder:text-white/40"
        />
        <button disabled={loading} className="bg-brand-red text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-40">
          {loading ? 'Generando…' : 'Generar link'}
        </button>
      </form>
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      {result && (
        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 space-y-2">
          <p className="text-white text-sm">Link para <strong>{result.name ?? email}</strong>. Vence el {new Date(result.expires).toLocaleString('es-MX', { timeZone: 'America/Merida' })}.</p>
          <code className="block break-all text-xs text-brand-gold bg-black/30 rounded-lg p-3">{result.link}</code>
          <button
            onClick={async () => { await navigator.clipboard.writeText(result.link).catch(() => {}); setCopied(true); }}
            className="border border-white/30 text-white text-sm px-4 py-2 rounded-lg"
          >
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
          <p className="text-xs text-white/50">Quien tenga este link entra a la cuenta. Mándalo solo a la persona dueña del correo.</p>
        </div>
      )}
    </div>
  );
}
