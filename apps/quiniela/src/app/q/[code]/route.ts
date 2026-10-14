import { auth } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { tickets } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!/^(BS|CD|INT)-[A-Z]\d{3}$/.test(code)) {
    return NextResponse.redirect(new URL('/?error=invalid_code', req.url));
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.code, code),
  });
  if (!ticket) {
    return NextResponse.redirect(new URL('/?error=ticket_not_found', req.url));
  }

  const session = await auth();

  if (ticket.redeemedAt && ticket.assignedUserId !== session?.user?.id) {
    return NextResponse.redirect(new URL('/?error=ticket_used', req.url));
  }

  if (!session?.user) {
    const url = new URL('/activar', req.url);
    url.searchParams.set('ticket', code);
    return NextResponse.redirect(url);
  }

  const url = new URL('/quiniela', req.url);
  url.searchParams.set('ticket', code);
  return NextResponse.redirect(url);
}
