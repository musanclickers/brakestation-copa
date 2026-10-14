'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  triviaId: string;
  responseCount: number;
};

export function TriviaActions({ triviaId, responseCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'delete' | 'close' | null>(null);

  async function onDelete() {
    const confirmed = confirm(
      responseCount > 0
        ? `Esta trivia tiene ${responseCount} respuesta(s). Eliminarla puede fallar — preferible "Cerrar ahora". ¿Continuar de todos modos?`
        : '¿Eliminar esta trivia? No se puede deshacer.',
    );
    if (!confirmed) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/admin/trivias/${triviaId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.error === 'has_responses') {
        const switchToClose = confirm(
          'La trivia tiene respuestas y no se puede eliminar (perdería puntos). ¿La cierro ahora en su lugar?',
        );
        if (switchToClose) {
          await fetch(`/api/admin/trivias/${triviaId}/close`, { method: 'POST' });
          router.refresh();
        }
        return;
      }
      if (!res.ok) {
        alert(`Error: ${data.error ?? res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function onClose() {
    const confirmed = confirm('¿Cerrar la trivia ahora? Dejará de mostrarse a participantes; las respuestas existentes se conservan.');
    if (!confirmed) return;
    setBusy('close');
    try {
      const res = await fetch(`/api/admin/trivias/${triviaId}/close`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Error: ${data.error ?? res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-1">
      <Link
        href={`/admin/trivias/${triviaId}/edit`}
        className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs"
      >
        Editar
      </Link>
      <button
        onClick={onClose}
        disabled={busy !== null}
        className="bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 px-3 py-1 rounded text-xs text-white"
      >
        {busy === 'close' ? '…' : 'Cerrar'}
      </button>
      <button
        onClick={onDelete}
        disabled={busy !== null}
        className="bg-red-600/80 hover:bg-red-600 disabled:opacity-50 px-3 py-1 rounded text-xs text-white"
      >
        {busy === 'delete' ? '…' : 'Eliminar'}
      </button>
    </div>
  );
}
