import { db } from '@brakestation/db';
import { ticketRegistrations, users, clients } from '@brakestation/db/schema';
import { desc } from 'drizzle-orm';
import { AdminRegistrationReviewer } from '@/components/AdminRegistrationReviewer';

export const dynamic = 'force-dynamic';

type SerializedRegistration = {
  id: string;
  userId: string;
  ticketCode: string;
  userName: string;
  userEmail: string;
  photoUrl: string;
  affiliationType: string;
  clientName: string | null;
  clientText: string | null;
  clientId: string | null;
  participantName: string;
  participantPhone: string;
  reviewStatus: string;
  reviewNotes: string | null;
  socialBonusGranted: boolean;
  createdAt: string;
};

export default async function AdminRegistrationsPage() {
  // Fetch all registrations ordered by newest first
  const allRegistrations = await db
    .select()
    .from(ticketRegistrations)
    .orderBy(desc(ticketRegistrations.createdAt));

  // Fetch all users into a Map
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // Fetch all clients into a Map
  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients);
  const clientMap = new Map(allClients.map((c) => [c.id, c]));

  // Serialize registrations with user and client data
  const serialized: SerializedRegistration[] = allRegistrations.map((r) => {
    const user = userMap.get(r.userId);
    const client = r.clientId ? clientMap.get(r.clientId) : null;
    return {
      id: r.id,
      userId: r.userId,
      ticketCode: r.ticketCode,
      userName: user?.name ?? 'Sin nombre',
      userEmail: user?.email ?? '',
      photoUrl: r.photoUrl,
      affiliationType: r.affiliationType,
      clientName: client?.name ?? null,
      clientText: r.clientText,
      clientId: r.clientId,
      participantName: r.participantName,
      participantPhone: r.participantPhone,
      reviewStatus: r.reviewStatus,
      reviewNotes: r.reviewNotes,
      socialBonusGranted: r.socialBonusGranted,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="font-display text-3xl text-white mb-2">
        Admin — Registros con foto
      </h1>
      <p className="text-white/80 text-sm mb-6">
        Revisa y aprueba/rechaza los registros de boletos con foto.
      </p>
      <AdminRegistrationReviewer registrations={serialized} />
    </div>
  );
}
