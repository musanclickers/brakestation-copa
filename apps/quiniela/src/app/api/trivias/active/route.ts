import { auth } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { trivias, triviaResponses } from '@brakestation/db/schema';
import { sql, and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const activeTrivias = await db
    .select({
      id: trivias.id,
      question: trivias.question,
      optionA: trivias.optionA,
      optionB: trivias.optionB,
      optionC: trivias.optionC,
      category: trivias.category,
      closesAt: trivias.closesAt,
    })
    .from(trivias)
    .where(
      and(
        sql`${trivias.opensAt} <= NOW()`,
        sql`${trivias.closesAt} > NOW()`,
      ),
    );

  const responses = await db
    .select({ triviaId: triviaResponses.triviaId })
    .from(triviaResponses)
    .where(eq(triviaResponses.userId, session.user.id));

  const answeredIds = new Set(responses.map((r) => r.triviaId));
  const unanswered = activeTrivias.filter((t) => !answeredIds.has(t.id));

  return NextResponse.json(unanswered);
}
