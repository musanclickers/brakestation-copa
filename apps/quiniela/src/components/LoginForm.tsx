'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

declare global {
  interface Window {
    turnstile?: { reset: (el?: string) => void };
  }
}

export function LoginForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'registro' | 'entrar'>('registro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      email: String(fd.get('email') ?? ''),
      name: mode === 'registro' ? String(fd.get('name') ?? '') || undefined : undefined,
      terms: mode === 'registro' ? fd.get('terms') === 'on' : undefined,
      turnstileToken: String(fd.get('cf-turnstile-response') ?? '') || undefined,
    };
    try {
      const res = await fetch('/api/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push('/entrar/revisa-tu-correo');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (data.error === 'needs_registration') setMode('registro');
      setError(data.message ?? 'Algo salió mal. Intenta de nuevo.');
    } catch {
      setError('No hay conexión. Revisa tu internet e intenta de nuevo.');
    }
    window.turnstile?.reset();
    setLoading(false);
  }

  const input =
    'rounded-xl bg-white/[0.15] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition-all';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4 backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl p-6">
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
        Tu correo
        <input name="email" type="email" required autoComplete="email" placeholder="tu@correo.com" className={input} />
      </label>

      {mode === 'registro' && (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
            Tu nombre y apellido
            <input name="name" type="text" required minLength={2} maxLength={60} autoComplete="name" placeholder="Luis Martínez" className={input} />
            <span className="text-xs text-white/50">En el ranking solo se ve tu nombre y la inicial del apellido.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-white/80">
            <input name="terms" type="checkbox" required className="mt-1 h-4 w-4 accent-brand-red" />
            <span>
              Tengo 18 años o más y acepto el{' '}
              <Link href="/reglamento" target="_blank" className="underline text-brand-gold">reglamento</Link> y el{' '}
              <Link href="/privacidad" target="_blank" className="underline text-brand-gold">aviso de privacidad</Link>.
            </span>
          </label>
        </>
      )}

      {turnstileSiteKey && <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="dark" />}

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-brand-red px-8 py-3 text-white font-semibold text-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando…' : mode === 'registro' ? 'Registrarme' : 'Mándame mi link'}
      </button>

      <button
        type="button"
        onClick={() => { setMode(mode === 'registro' ? 'entrar' : 'registro'); setError(''); }}
        className="text-sm text-white/60 underline"
      >
        {mode === 'registro' ? '¿Ya te registraste? Entra solo con tu correo' : '¿Primera vez? Regístrate'}
      </button>

      <p className="text-xs text-white/40 text-center">
        No usamos contraseñas: te mandamos un link a tu correo para entrar.
      </p>
    </form>
  );
}
