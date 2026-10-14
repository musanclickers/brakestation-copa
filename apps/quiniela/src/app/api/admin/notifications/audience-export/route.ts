import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { AudienceSchema, resolveAudience } from '@/lib/notification-audiences';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  let s = String(val);
  // Evita inyección de fórmulas al abrir el CSV en Excel.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV de exactamente las personas que resolveAudience() regresa: el mismo
// conjunto que recibiría el correo.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = z.object({ spec: AudienceSchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'spec_required' }, { status: 400 });
  const { spec } = parsed.data;

  const recipients = await resolveAudience(spec);
  const rows = recipients.map((r) => [r.name, r.email].map(escapeCsv).join(','));
  const csv = '﻿' + ['Nombre,Email', ...rows].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audiencia-${spec.kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
