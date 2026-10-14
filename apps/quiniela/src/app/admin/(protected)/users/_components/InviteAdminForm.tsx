'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InviteAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.message ?? 'Error al invitar admin'); return; }
      setResult(body);
      setEmail('');
      setName('');
      router.refresh();
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-white/85 font-semibold mb-2 text-sm">Nombre completo</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={120}
            placeholder="Ej. Juan Pérez García"
            className="w-full bg-white/[0.10] border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:bg-white/[0.15] focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30" />
        </div>
        <div>
          <label className="block text-white/85 font-semibold mb-2 text-sm">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="juan@brakestation.com.mx"
            className="w-full bg-white/[0.10] border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:bg-white/[0.15] focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30" />
        </div>
        {error && <div className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full bg-brand-red hover:bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all">
          {loading ? 'Enviando...' : 'Invitar admin'}
        </button>
      </form>

      {result && (
        <div className="mt-4 backdrop-blur-xl bg-emerald-500/[0.10] border-2 border-emerald-500/40 rounded-xl p-4">
          <p className="text-emerald-200 font-bold mb-2">✓ Admin invitado</p>
          <p className="text-white/85 text-sm mb-3">Se envió email con instrucciones. Contraseña temporal:</p>
          <div className="bg-black/40 border border-white/15 rounded-lg p-3 font-mono text-yellow-200 text-base break-all select-all">
            {result.tempPassword}
          </div>
          <p className="text-white/60 text-xs mt-2 italic">El admin debe cambiar esta contraseña al primer login.</p>
        </div>
      )}
    </>
  );
}
