'use client';

import { useState } from 'react';

export function SocialBonusToggle({ registrationId, granted: initial }: { registrationId: string; granted: boolean }) {
  const [granted, setGranted] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/admin/registrations/${registrationId}/social-bonus`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ granted: !granted }),
    });
    if (res.ok) {
      setGranted(!granted);
    } else {
      const body = await res.json();
      alert(body.message ?? 'Error al actualizar');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
        granted
          ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50 hover:bg-yellow-500/40'
          : 'bg-white/[0.06] text-white/60 border border-white/15 hover:bg-white/[0.10] hover:text-white/80'
      }`}
      aria-label={granted ? 'Quitar bonus social' : 'Otorgar bonus social'}
    >
      {granted ? <><span>⭐</span><span>+10</span></> : <><span>+</span><span>Otorgar</span></>}
    </button>
  );
}
