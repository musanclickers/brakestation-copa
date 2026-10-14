import { db } from '@brakestation/db';
import { clients } from '@brakestation/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAdminUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const branch = searchParams.get('branch');

  const conditions = [eq(clients.active, true)];
  if (branch && ['merida', 'villahermosa', 'tuxtla'].includes(branch)) {
    conditions.push(eq(clients.branch, branch));
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      type: clients.type,
      city: clients.city,
      branch: clients.branch,
    })
    .from(clients)
    .where(and(...conditions))
    .orderBy(asc(clients.name));

  return NextResponse.json({ clients: rows });
}
