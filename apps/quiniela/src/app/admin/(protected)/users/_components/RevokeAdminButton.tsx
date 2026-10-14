'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RevokeAdminButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm(`¿Revocar acceso admin de ${email}?\n\nEl usuario ya no podrá entrar al panel.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/revoke-admin`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        alert(body.message ?? 'Error al revocar');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      alert('Error de red');
      setLoading(false);
    }
  }

  return (
    <button onClick={handleRevoke} disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 font-semibold disabled:opacity-50 transition flex-shrink-0">
      {loading ? '...' : 'Revocar'}
    </button>
  );
}
