import { getAdminUserId } from '@/lib/admin-auth';
import { resolveAudience, type AudienceSpec } from '@/lib/notification-audiences';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
  return NextResponse.json({
    count: recipients.length,
    sample: recipients.slice(0, 3).map((r) => ({ email: r.email, name: r.name, cohort: r.cohort })),
  });
}
