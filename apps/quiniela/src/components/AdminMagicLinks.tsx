'use client';

import { useState } from 'react';

type LinkResult = {
  loginLink: string;
  quinielaLink: string | null;
  ticketCode: string | null;
  userExists: boolean;
  registrationStatus: string | null;
  expires: string;
};

export function MagicLinkGenerator() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(null);

    try {
      const res = await fetch('/api/admin/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al generar');
        return;
      }
      setResult(data);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  }

  const statusLabels: Record<string, { text: string; color: string; icon: string }> = {
    pending: { text: 'Pendiente de revisión', color: 'text-amber-300', icon: '⏳' },
    approved: { text: 'Aprobado', color: 'text-green-300', icon: '✅' },
    rejected: { text: 'Rechazado', color: 'text-red-300', icon: '❌' },
    awaiting_new_photo: { text: 'Esperando nueva foto', color: 'text-amber-300', icon: '📸' },
  };

  const isApproved = result?.registrationStatus === 'approved';
  const hasTicket = !!result?.ticketCode;

  function buildWhatsAppMessage(link: string, forQuiniela: boolean): string {
    if (forQuiniela) {
      return `¡Hola! 👋\n\nTu registro en la *Dinámica Goleadora CanaBRAKE* fue aprobado ✅\n\nEntra al siguiente link para llenar tus pronósticos del Mundial 2026:\n\n${link}\n\nEl link es válido por 24 horas.`;
    }
    return `¡Hola! 👋\n\nEntra al siguiente link para registrarte en la *Dinámica Goleadora CanaBRAKE* del Mundial 2026:\n\n${link}\n\nEl link es válido por 24 horas.`;
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleGenerate} className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-6">
        <label className="block text-white font-semibold text-sm mb-2">
          Correo del participante
        </label>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="participante@ejemplo.com"
            required
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/30"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="bg-brand-red text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* User status */}
          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-5">
            <div className="flex items-center gap-3 text-sm">
              <span className={result.userExists ? 'text-green-300' : 'text-amber-300'}>
                {result.userExists ? '● Usuario existe' : '● Usuario nuevo'}
              </span>
              {result.ticketCode && (
                <span className="text-white/70">
                  Boleto: <span className="font-mono font-bold text-white">{result.ticketCode}</span>
                </span>
              )}
              {result.registrationStatus && (() => {
                const s = statusLabels[result.registrationStatus];
                return s ? (
                  <span className={s.color}>{s.icon} {s.text}</span>
                ) : null;
              })()}
            </div>
          </div>

          {/* Primary action: Quiniela link (for approved users with ticket) */}
          {isApproved && hasTicket && result.quinielaLink && (
            <LinkCard
              title="Link para llenar pronósticos"
              description={`Inicia sesión y va directo a la quiniela con boleto ${result.ticketCode}`}
              url={result.quinielaLink}
              waMessage={buildWhatsAppMessage(result.quinielaLink, true)}
              copied={copied}
              onCopyLink={() => copyToClipboard(result.quinielaLink!, 'link')}
              onCopyMessage={() => copyToClipboard(buildWhatsAppMessage(result.quinielaLink!, true), 'msg')}
              primary
            />
          )}

          {/* Registration link (for new or unapproved users) */}
          {(!isApproved || !hasTicket) && (
            <LinkCard
              title="Link de registro"
              description="Inicia sesión y llega a la página de activación de boleto"
              url={result.loginLink}
              waMessage={buildWhatsAppMessage(result.loginLink, false)}
              copied={copied}
              onCopyLink={() => copyToClipboard(result.loginLink, 'link')}
              onCopyMessage={() => copyToClipboard(buildWhatsAppMessage(result.loginLink, false), 'msg')}
              primary={!isApproved}
            />
          )}

          {/* Secondary: always show the other link as a fallback */}
          {isApproved && hasTicket && (
            <details className="group">
              <summary className="text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors">
                Ver también link de registro
              </summary>
              <div className="mt-2">
                <LinkCard
                  title="Link de registro / inicio de sesión"
                  description="Alternativa: lleva a la página de activación"
                  url={result.loginLink}
                  waMessage={buildWhatsAppMessage(result.loginLink, false)}
                  copied={copied}
                  onCopyLink={() => copyToClipboard(result.loginLink, 'link-alt')}
                  onCopyMessage={() => copyToClipboard(buildWhatsAppMessage(result.loginLink, false), 'msg-alt')}
                />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function LinkCard({ title, description, url, waMessage, copied, onCopyLink, onCopyMessage, primary }: {
  title: string;
  description: string;
  url: string;
  waMessage: string;
  copied: string | null;
  onCopyLink: () => void;
  onCopyMessage: () => void;
  primary?: boolean;
}) {
  return (
    <div className={`backdrop-blur-xl rounded-2xl p-5 ${
      primary
        ? 'bg-green-500/[0.08] border-2 border-green-400/30'
        : 'bg-white/[0.06] border border-white/[0.12]'
    }`}>
      <h3 className="text-white font-bold text-sm">{title}</h3>
      <p className="text-white/50 text-xs mt-0.5 mb-4">{description}</p>

      {/* Link */}
      <div className="bg-black/30 rounded-lg p-3 mb-3 overflow-x-auto">
        <code className="text-xs text-blue-300 break-all select-all">{url}</code>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCopyLink}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            copied === 'link' || copied === 'link-alt'
              ? 'bg-green-500/20 text-green-300 border border-green-400/30'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
          }`}
        >
          {copied === 'link' || copied === 'link-alt' ? '✓ Link copiado' : 'Copiar link'}
        </button>
        <button
          onClick={onCopyMessage}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            copied === 'msg' || copied === 'msg-alt'
              ? 'bg-green-500/20 text-green-300 border border-green-400/30'
              : 'bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/30'
          }`}
        >
          {copied === 'msg' || copied === 'msg-alt' ? '✓ Mensaje copiado' : 'Copiar mensaje WhatsApp'}
        </button>
      </div>
    </div>
  );
}
