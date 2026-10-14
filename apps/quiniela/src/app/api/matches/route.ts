import { db } from '@brakestation/db';
import { matches } from '@brakestation/db/schema';
import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(matches)
      .orderBy(asc(matches.scheduledAt));

    return NextResponse.json(rows, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[GET /api/matches] error:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
