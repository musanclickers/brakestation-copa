import { auth } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { trivias, triviaResponses, tickets, auditLog } from '@brakestation/db/schema';
import { generateSeal } from '@brakestation/seal';
import { eq, and, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  ticket_code: z.string().regex(/^(BS|CD|INT)-[A-Z]\d{3}$/),
  selected_option: z.enum(['a', 'b', 'c']),
});

const SEAL_SECRET = process.env.SEAL_SECRET!;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: triviaId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { ticket_code, selected_option } = parsed.data;

  const trivia = await db.query.trivias.findFirst({
    where: eq(trivias.id, triviaId),
  });
  if (!trivia) {
    return NextResponse.json({ error: 'trivia_not_found' }, { status: 404 });
  }

  const now = new Date();
  if (now < trivia.opensAt || now > trivia.closesAt) {
    return NextResponse.json({ error: 'trivia_closed' }, { status: 403 });
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.code, ticket_code),
  });
  if (!ticket) {
    return NextResponse.json({ error: 'ticket_not_found' }, { status: 404 });
  }

  const existing = await db.query.triviaResponses.findFirst({
    where: and(
      eq(triviaResponses.userId, session.user.id),
      eq(triviaResponses.ticketCode, ticket_code),
      eq(triviaResponses.triviaId, triviaId),
    ),
  });
  if (existing) {
    return NextResponse.json(
      { error: 'already_responded', selected_option: existing.selectedOption },
      { status: 409 },
    );
  }

  const seal = generateSeal(
    {
      v: '1.0',
      type: 'trivia_response',
      trivia_id: triviaId,
      selected_option,
      user_id: session.user.id,
      ticket_code,
    },
    SEAL_SECRET,
  );

  await db.insert(triviaResponses).values({
    userId: session.user.id,
    ticketCode: ticket_code,
    triviaId: triviaId,
    selectedOption: selected_option,
    seal,
  });

  await db.insert(auditLog).values({
    eventType: 'trivia_responded',
    userId: session.user.id,
    ticketCode: ticket_code,
    payload: { trivia_id: triviaId, selected_option },
  });

  return NextResponse.json({ ok: true, seal: seal.slice(0, 8) }, { status: 201 });
}
