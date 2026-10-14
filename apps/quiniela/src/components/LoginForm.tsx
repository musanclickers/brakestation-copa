'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

type LoginFormProps = {
  ticketCode?: string;
};

export function LoginForm({ ticketCode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const callbackUrl = '/activar' + (ticketCode ? `?ticket=${ticketCode}` : '');
      await signIn('resend', { email, callbackUrl });
    } catch {
      setError('Hubo un error al enviar el enlace. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4 backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl p-6">
      <label htmlFor="email" className="text-sm font-medium text-white/80">
        Ingresa tu email para activar tu boleto
      </label>
      <input
        id="email"
        type="email"
        required
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-xl bg-white/[0.15] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white/25 focus:border-brand-red transition-all"
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-brand-red px-8 py-3 text-white font-semibold text-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : 'Activar mi boleto'}
      </button>
      <p className="text-sm text-white/40 text-center">
        Te enviaremos un enlace mágico a tu email para acceder sin contraseña.
      </p>
    </form>
  );
}
