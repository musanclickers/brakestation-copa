'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/BrandHeader';

declare global {
  interface Window {
    turnstile?: { reset: (el?: string) => void };
  }
}

const ERRORS: Record<string, string> = {
  link_expired: 'Ese link ya venció. Pide otro abajo.',
  link_used: 'Ese link ya se usó. Entra con tu contraseña.',
};

export function AdminLoginForm({ turnstileSiteKey, initialError }: { turnstileSiteKey: string; initialError?: string }) {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [error, setError] = useState<string | null>(initialError ? ERRORS[initialError] ?? null : null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const turnstileToken = String(fd.get('cf-turnstile-response') ?? '') || undefined;
    const email = String(fd.get('email') ?? '');
    try {
      const res = await fetch(mode === 'login' ? '/api/admin/login' : '/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password: String(fd.get('password') ?? ''), turnstileToken } : { email, turnstileToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message ?? 'No se pudo. Intenta de nuevo.');
      } else if (mode === 'login') {
        router.push(body.redirect ?? '/admin/matches');
        return;
      } else {
        setInfo(body.message);
      }
    } catch {
      setError('No hay conexión. Intenta de nuevo.');
    }
    window.turnstile?.reset();
    setLoading(false);
  }

  const input = 'w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/60 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 mb-3';

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4 sm:p-6">
      {turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <form onSubmit={handleSubmit} className="max-w-sm w-full backdrop-blur-xl bg-white/[0.10] border border-white/[0.18] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8">
        <div className="flex justify-center mb-6"><BrandHeader /></div>
        <h1 className="text-2xl font-bold text-white text-center mb-1">Panel admin</h1>
        <p className="text-sm text-white/60 text-center mb-6">
          {mode === 'login' ? 'Quiniela Copa Brake Station' : 'Primer acceso: te mandamos un link para crear tu contraseña.'}
        </p>

        <label htmlFor="admin-email" className="block mb-1 text-sm font-medium text-white/80">Email</label>
        <input id="admin-email" name="email" type="email" className={input} autoComplete="email" required />

        {mode === 'login' && (
          <>
            <label htmlFor="admin-password" className="block mb-1 text-sm font-medium text-white/80">Contraseña</label>
            <input id="admin-password" name="password" type="password" className={input} autoComplete="current-password" required />
          </>
        )}

        {turnstileSiteKey && <div className="cf-turnstile mb-3" data-sitekey={turnstileSiteKey} data-theme="dark" />}

        {error && <p role="alert" className="text-red-300 text-sm mb-3">{error}</p>}
        {info && <p role="status" className="text-green-300 text-sm mb-3">{info}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-red px-6 py-3 text-white font-semibold text-lg hover:bg-red-600 disabled:opacity-50">
          {loading ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Mandarme el link'}
        </button>

        <button type="button" onClick={() => { setMode(mode === 'login' ? 'setup' : 'login'); setError(null); setInfo(null); }} className="w-full text-xs text-white/60 underline mt-4">
          {mode === 'login' ? '¿Primera vez como admin? Crea tu contraseña' : 'Ya tengo contraseña'}
        </button>
        <p className="text-xs text-white/50 text-center mt-3">
          ¿No eres admin? <a href="/" className="text-brand-gold underline">Ve a la quiniela</a>
        </p>
      </form>
    </div>
  );
}
