'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/BrandHeader';

export function ChangePasswordForm({ isForced }: { isForced: boolean }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 12) {
      setError('La nueva contraseña debe tener al menos 12 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser distinta de la actual');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? 'Error al cambiar la contraseña');
        setLoading(false);
        return;
      }
      router.push('/admin/registrations');
    } catch {
      setError('Error de red');
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-8">
      <form onSubmit={handleSubmit} className="max-w-sm w-full backdrop-blur-xl bg-white/[0.10] border border-white/[0.18] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8">
        <h1 className="text-2xl font-bold text-white mb-1 text-center">
          {isForced ? 'Cambia tu contraseña temporal' : 'Cambiar contraseña'}
        </h1>
        {isForced && (
          <p className="text-sm text-white/60 mb-4 text-center">
            Por seguridad, debes establecer una contraseña permanente antes de continuar.
          </p>
        )}

        <label htmlFor="current-pw" className="block mb-1 text-sm font-medium text-white">Contraseña actual</label>
        <input
          id="current-pw"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:bg-white/[0.15] focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 mb-3"
          autoComplete="current-password"
          required
        />

        <label htmlFor="new-pw" className="block mb-1 text-sm font-medium text-white">Nueva contraseña</label>
        <input
          id="new-pw"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:bg-white/[0.15] focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 mb-1"
          autoComplete="new-password"
          required
          minLength={12}
        />
        <p className="text-xs text-white/50 mb-3">Mínimo 12 caracteres.</p>

        <label htmlFor="confirm-pw" className="block mb-1 text-sm font-medium text-white">Confirmar nueva contraseña</label>
        <input
          id="confirm-pw"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:bg-white/[0.15] focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30 mb-3"
          autoComplete="new-password"
          required
        />

        {error && <p className="text-brand-red text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          className="w-full rounded-xl bg-brand-red px-6 py-3 text-white font-semibold text-lg hover:bg-brand-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </div>
  );
}
