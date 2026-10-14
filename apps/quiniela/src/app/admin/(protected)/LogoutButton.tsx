'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-white/70 hover:text-white transition-colors"
    >
      Cerrar sesión
    </button>
  );
}
