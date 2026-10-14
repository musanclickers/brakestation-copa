import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { trivias } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await db
    .update(trivias)
    .set({ closesAt: new Date() })
    .where(eq(trivias.id, id));
  return NextResponse.json({ ok: true });
}
