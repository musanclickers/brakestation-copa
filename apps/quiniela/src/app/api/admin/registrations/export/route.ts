import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { ticketRegistrations, users, phaseSubmissions } from '@brakestation/db/schema';
import { and, desc, eq, not, like } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// J2 = groups_m2, J3 = groups_m3. Add more aliases here if needed.
const PHASE_ALIASES: Record<string, string> = { j2: 'groups_m2', j3: 'groups_m3' };

export async function GET(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  // ?phase=j2,j3 (or raw phase keys) → target participants missing a seal for
  // ANY of these phases. No param → original behavior: no seal in any phase.
  const phaseParam = new URL(req.url).searchParams.get('phase') ?? '';
  const targetPhases = phaseParam
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .map((p) => PHASE_ALIASES[p] ?? p);

  // The original "sin pronósticos" CSV keeps INT folios isolated. The phase
  // filter (J2/J3) intentionally includes INT — admins chase down everyone.
  const where = targetPhases.length
    ? eq(ticketRegistrations.reviewStatus, 'approved')
    : and(
        eq(ticketRegistrations.reviewStatus, 'approved'),
        not(like(ticketRegistrations.ticketCode, 'INT-%')),
      );

  const allRegistrations = await db
    .select()
    .from(ticketRegistrations)
    .where(where)
    .orderBy(desc(ticketRegistrations.createdAt));

  const sealed = await db
    .select({
      userId: phaseSubmissions.userId,
      ticketCode: phaseSubmissions.ticketCode,
      phase: phaseSubmissions.phase,
    })
    .from(phaseSubmissions);

  // key → set of phases sealed for that user+ticket
  const sealedByKey = new Map<string, Set<string>>();
  for (const s of sealed) {
    const key = `${s.userId}:${s.ticketCode}`;
    if (!sealedByKey.has(key)) sealedByKey.set(key, new Set());
    sealedByKey.get(key)!.add(s.phase);
  }

  const unsealedRegistrations = allRegistrations.filter((r) => {
    const phases = sealedByKey.get(`${r.userId}:${r.ticketCode}`);
    if (targetPhases.length === 0) return !phases; // no seal in any phase
    return targetPhases.every((p) => !phases?.has(p)); // sealed NONE of the target phases
  });

  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const headers = [
    'Boleto',
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
    ...(targetPhases.length ? ['Fases pendientes'] : []),
  ];

  // Reverse alias for readable labels (groups_m2 → J2)
  const labelOf: Record<string, string> = {};
  for (const [alias, phase] of Object.entries(PHASE_ALIASES)) labelOf[phase] = alias.toUpperCase();

  const rows = unsealedRegistrations.map((r) => {
    const user = userMap.get(r.userId);
    const phases = sealedByKey.get(`${r.userId}:${r.ticketCode}`);
    const missing = targetPhases.filter((p) => !phases?.has(p)).map((p) => labelOf[p] ?? p);
    return [
      r.ticketCode,
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
      ...(targetPhases.length ? [missing.join(' ')] : []),
    ].map(escapeCsv).join(',');
  });

  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n');

  const namePrefix = targetPhases.length
    ? `sin-sellar-${targetPhases.map((p) => labelOf[p] ?? p).join('-').toLowerCase()}`
    : 'sin-pronosticos';

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${namePrefix}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
