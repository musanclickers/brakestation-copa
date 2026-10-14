import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { ticketRegistrations, users, tickets } from '@brakestation/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const allRegistrations = await db
    .select()
    .from(ticketRegistrations)
    .orderBy(desc(ticketRegistrations.createdAt));

  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allTickets = await db
    .select({ code: tickets.code, type: tickets.type })
    .from(tickets);
  const ticketMap = new Map(allTickets.map((t) => [t.code, t.type]));

  const headers = [
    'Boleto',
    'Cohort',
    'Estado',
    'Participante',
    'Email',
    'Teléfono',
    'Tipo afiliación',
    'Cliente declarado',
    'Bonus social',
    'Notas revisión',
    'Fecha registro',
    'Fecha revisión',
  ];

  const rows = allRegistrations.map((r) => {
    const user = userMap.get(r.userId);
    const cohort = ticketMap.get(r.ticketCode) ?? '';
    return [
      r.ticketCode,
      cohort,
      r.reviewStatus,
      r.participantName,
      user?.email ?? '',
      r.participantPhone,
      r.affiliationType,
      r.clientText ?? '',
      r.socialBonusGranted ? 'Sí' : 'No',
      r.reviewNotes ?? '',
      r.createdAt.toISOString(),
      r.reviewedAt?.toISOString() ?? '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registrations-all-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
