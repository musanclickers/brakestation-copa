import { db } from '@brakestation/db';
import { adminActions } from '@brakestation/db/schema';
import { getAdminUserId } from '@/lib/admin-auth';
import { syncMatchesFromFootballData } from '@/lib/sync-matches';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const result = await syncMatchesFromFootballData();

    await db.insert(adminActions).values({
      adminId,
      action: 'sync_matches_from_football_data',
      targetTable: 'matches',
      targetId: 'all',
      afterState: result,
    });

    return Response.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: 'sync_failed', message }, { status: 500 });
  }
}
