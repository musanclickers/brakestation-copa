import { getAdminUserId } from '@/lib/admin-auth';
import { resolveAudience, type AudienceSpec } from '@/lib/notification-audiences';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// CSV of exactly the people resolveAudience() returns — same set that would get
// the email/WhatsApp, so the download never drifts from the send.
export async function POST(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { spec } = body as { spec: AudienceSpec };
  if (!spec || typeof spec !== 'object' || !('kind' in spec)) {
    return NextResponse.json({ error: 'spec_required' }, { status: 400 });
  }

  const recipients = await resolveAudience(spec);

  const headers = ['Boleto', 'Participante', 'Email', 'Teléfono', 'Cohorte'];
  const rows = recipients.map((r) =>
    [r.ticketCode ?? '', r.name, r.email, r.phone ?? '', r.cohort ?? ''].map(escapeCsv).join(','),
  );
  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audiencia-${spec.kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
