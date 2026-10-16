import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq, desc, and, or, isNotNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { RELACIONES, RELACION_LABELS, isRelacion, relacionLabel } from '@/lib/relacion';
import { InviteAdminForm } from './_components/InviteAdminForm';
import { RevokeAdminButton } from './_components/RevokeAdminButton';

export const dynamic = 'force-dynamic';

// ponytail: tope de 1000 filas en pantalla; el CSV de Notificaciones trae a todos. Paginar si se rebasa.
const PARTICIPANTES_MAX = 1000;

export default async function AdminUsersPage({ searchParams }: { searchParams: { relacion?: string | string[] } }) {
  const filtro = isRelacion(searchParams.relacion) ? searchParams.relacion : null;
  const esParticipante = or(isNotNull(users.termsAcceptedAt), isNotNull(users.relacion));

  const admins = await db.query.users.findMany({
    where: eq(users.isAdmin, true),
    columns: { id: true, email: true, name: true, createdAt: true, mustChangePassword: true },
    orderBy: desc(users.createdAt),
  });

  const [conteos, participantes] = await Promise.all([
    db
      .select({ relacion: users.relacion, n: sql<number>`count(*)::int` })
      .from(users)
      .where(esParticipante)
      .groupBy(users.relacion),
    db.query.users.findMany({
      where: filtro ? and(esParticipante, eq(users.relacion, filtro)) : esParticipante,
      columns: { id: true, email: true, name: true, relacion: true, relacionDetalle: true, createdAt: true },
      orderBy: desc(users.createdAt),
      limit: PARTICIPANTES_MAX,
    }),
  ]);
  const conteo = new Map(conteos.map((c) => [c.relacion, c.n]));
  const total = conteos.reduce((a, c) => a + c.n, 0);
  const sinDato = conteo.get(null) ?? 0;
  const chip = (activo: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
      activo ? 'border-brand-red bg-brand-red/20 text-white' : 'border-white/15 bg-white/[0.06] text-white/75 hover:bg-white/[0.12]'
    }`;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Admin · <span className="text-brand-red">Usuarios</span></h1>
        <p className="text-white/80 text-sm">Gestiona quiénes tienen acceso al panel admin ({admins.length} activos)</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Invitar nuevo admin</h2>
          <InviteAdminForm />
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">Admins activos</h2>
          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-hidden">
            {admins.length === 0 ? (
              <p className="px-4 py-8 text-center text-white/60">No hay admins registrados.</p>
            ) : (
              <ul className="divide-y divide-white/[0.08]">
                {admins.map(admin => (
                  <li key={admin.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{admin.name ?? '(sin nombre)'}</p>
                      <p className="text-white/65 text-xs font-mono truncate">{admin.email}</p>
                      {admin.mustChangePassword && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-200 text-xs">Pendiente cambio de password</span>
                      )}
                    </div>
                    <RevokeAdminButton userId={admin.id} email={admin.email} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-white mb-1">Participantes</h2>
        <p className="text-white/70 text-sm mb-4">
          {total} registrados{sinDato > 0 && ` · ${sinDato} sin relación (se registraron antes de que existiera el campo)`}
        </p>

        <nav aria-label="Filtrar por relación" className="flex flex-wrap gap-2 mb-4">
          <Link href="/admin/users" className={chip(!filtro)} aria-current={!filtro ? 'page' : undefined}>
            Todos <span className="font-mono text-white/60">{total}</span>
          </Link>
          {RELACIONES.map((r) => (
            <Link key={r} href={`/admin/users?relacion=${r}`} className={chip(filtro === r)} aria-current={filtro === r ? 'page' : undefined}>
              {RELACION_LABELS[r]} <span className="font-mono text-white/60">{conteo.get(r) ?? 0}</span>
            </Link>
          ))}
        </nav>

        <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-x-auto">
          {participantes.length === 0 ? (
            <p className="px-4 py-8 text-center text-white/60">Nadie con esta relación todavía.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-white/60 text-xs uppercase tracking-wide">
                <tr className="border-b border-white/[0.08]">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Relación</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {participantes.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 text-white">{p.name ?? '(sin nombre)'}</td>
                    <td className="px-4 py-2.5 text-white/65 font-mono text-xs">{p.email}</td>
                    <td className="px-4 py-2.5 text-white/85">{relacionLabel(p.relacion, p.relacionDetalle)}</td>
                    <td className="px-4 py-2.5 text-white/60 whitespace-nowrap">
                      {p.createdAt.toLocaleDateString('es-MX', { timeZone: 'America/Merida', day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
