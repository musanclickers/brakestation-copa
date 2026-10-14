'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/BrandHeader';

export function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? 'Error al iniciar sesión');
        setLoading(false);
        return;
      }
      router.push(body.redirect ?? '/admin/registrations');
    } catch {
      setError('Error de red. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-sm w-full backdrop-blur-xl bg-white/[0.10] border border-white/[0.18] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8">
        <div className="flex justify-center mb-6">
          <BrandHeader />
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-1">Panel admin</h1>
        <p className="text-sm text-white/60 text-center mb-6">Coordinación Comercial</p>

        <label htmlFor="admin-email" className="block mb-1 text-sm font-medium text-white/80">Email</label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/60 focus:bg-white/[0.15] focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 mb-3"
          autoComplete="email"
          required
        />

        <label htmlFor="admin-password" className="block mb-1 text-sm font-medium text-white/80">Contraseña</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/60 focus:bg-white/[0.15] focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 mb-3"
          autoComplete="current-password"
          required
        />

        {error && <p className="text-red-300 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full rounded-xl bg-brand-red px-6 py-3 text-white font-semibold text-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-xs text-white/60 text-center mt-4">
          ¿No eres admin?{' '}
          <a href="/activar" className="text-blue-300 underline">Ve al sitio de la dinámica</a>
        </p>
      </form>
    </div>
  );
}
