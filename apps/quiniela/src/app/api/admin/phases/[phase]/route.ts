import { db } from '@brakestation/db';
import { phaseSettings } from '@brakestation/db/schema';
import { PHASE_ORDER } from '@brakestation/db/phases';
import { getAdminUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ phase: string }> },
) {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const { phase } = await params;
  if (!(PHASE_ORDER as readonly string[]).includes(phase)) {
    return Response.json({ error: 'invalid_phase' }, { status: 400 });
  }

  let body: { previewEnabled?: boolean; sealOpensAt?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }

  const previewEnabled = body.previewEnabled ?? false;
  let sealOpensAt: Date | null = null;
  if (body.sealOpensAt) {
    const d = new Date(body.sealOpensAt);
    if (Number.isNaN(d.getTime())) {
      return Response.json({ error: 'invalid_date' }, { status: 400 });
    }
    sealOpensAt = d;
  }

  await db
    .insert(phaseSettings)
    .values({ phase, previewEnabled, sealOpensAt, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: phaseSettings.phase,
      set: { previewEnabled, sealOpensAt, updatedAt: new Date() },
    });

  return Response.json({ ok: true });
}
