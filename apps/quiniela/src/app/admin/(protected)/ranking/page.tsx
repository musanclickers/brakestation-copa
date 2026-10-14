import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import Link from 'next/link';
import { computeRanking } from '@/lib/compute-ranking';

export const dynamic = 'force-dynamic';

// Ranking completo con nombre y correo (solo admin). El público ve "Luis M.".
export default async function AdminRankingPage() {
  const [ranked, allUsers] = await Promise.all([
    computeRanking(),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
  ]);
  const byId = new Map(allUsers.map((u) => [u.id, u]));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="font-display text-3xl text-white mb-1">Ranking completo</h1>
      <p className="text-white/70 text-sm mb-6">
        {ranked.length} participantes con al menos un pronóstico. Desempates: exactos, luego resultados, luego quién guardó antes su último pronóstico.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm text-white">
          <thead className="bg-white/[0.06] text-white/60 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Correo</th>
              <th className="p-3">Pronósticos</th>
              <th className="p-3">Exactos</th>
              <th className="p-3">Resultados</th>
              <th className="p-3">Puntos</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => {
              const u = byId.get(r.userId);
              return (
                <tr key={r.userId} className="border-t border-white/10">
                  <td className="p-3 font-bold">{i + 1}</td>
                  <td className="p-3">{u?.name ?? '—'}</td>
                  <td className="p-3 text-white/70">{u?.email}</td>
                  <td className="p-3 text-center">{r.predictions}</td>
                  <td className="p-3 text-center">{r.exactHits}</td>
                  <td className="p-3 text-center">{r.resultHits}</td>
                  <td className="p-3 text-center font-black">{r.totalPoints}</td>
                  <td className="p-3"><Link href={`/dashboard?as=${r.userId}`} className="text-brand-gold underline text-xs">Ver como</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
