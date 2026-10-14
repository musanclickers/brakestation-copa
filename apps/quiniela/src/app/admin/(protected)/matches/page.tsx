import { AdminMatchEditor } from '@/components/AdminMatchEditor';
import { loadMatches } from '@/lib/matches';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage() {
  const all = await loadMatches();
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="font-display text-3xl text-white mb-1">Partidos</h1>
      <p className="text-white/80 text-sm mb-6">
        Captura el marcador final de cada partido; el ranking se recalcula solo. Si un partido se reprograma, cambia aquí su horario (hora Mérida).
      </p>
      <AdminMatchEditor matches={all} />
    </div>
  );
}
