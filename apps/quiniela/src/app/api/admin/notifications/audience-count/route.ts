import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { AudienceSchema, resolveAudience } from '@/lib/notification-audiences';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = z.object({ spec: AudienceSchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'spec_required' }, { status: 400 });

  const recipients = await resolveAudience(parsed.data.spec);
  return NextResponse.json({
    count: recipients.length,
    sample: recipients.slice(0, 3).map((r) => ({ email: r.email, name: r.name })),
  });
}
