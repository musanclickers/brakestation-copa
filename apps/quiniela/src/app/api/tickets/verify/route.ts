import { auth } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { tickets, ticketRegistrations } from '@brakestation/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code || !/^(BS|CD|INT)-[A-Z]\d{3}$/.test(code)) {
    return NextResponse.json(
      { error: 'invalid_format', message: 'Formato debe ser BS-XXX, CD-XXX o INT-XXX' },
      { status: 400 },
    );
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.code, code),
  });
  if (!ticket) {
    return NextResponse.json(
      { error: 'not_found', message: 'Código no existe en el catálogo' },
      { status: 404 },
    );
  }

  if (!ticket.registrationRequired) {
    return NextResponse.json({ ok: true, code: ticket.code, type: ticket.type, registration_required: false });
  }

  const activeReg = await db.query.ticketRegistrations.findFirst({
    where: and(
      eq(ticketRegistrations.ticketCode, code),
      ne(ticketRegistrations.reviewStatus, 'rejected'),
    ),
  });

  if (activeReg) {
    return NextResponse.json({
      error: 'already_registered',
      message: activeReg.reviewStatus === 'pending'
        ? 'Este boleto está en revisión'
        : 'Este boleto ya fue activado',
      review_status: activeReg.reviewStatus,
    }, { status: 409 });
  }

  const rejectedReg = await db.query.ticketRegistrations.findFirst({
    where: and(
      eq(ticketRegistrations.ticketCode, code),
      eq(ticketRegistrations.reviewStatus, 'rejected'),
    ),
  });

  return NextResponse.json({
    ok: true,
    code: ticket.code,
    type: ticket.type,
    registration_required: true,
    rejected: rejectedReg ? { notes: rejectedReg.reviewNotes } : null,
  });
}
