import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq, desc } from 'drizzle-orm';
import { InviteAdminForm } from './_components/InviteAdminForm';
import { RevokeAdminButton } from './_components/RevokeAdminButton';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admins = await db.query.users.findMany({
    where: eq(users.isAdmin, true),
    columns: { id: true, email: true, name: true, createdAt: true, mustChangePassword: true },
    orderBy: desc(users.createdAt),
  });

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
    </div>
  );
}
