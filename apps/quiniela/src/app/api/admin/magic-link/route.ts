import { getAdminUserId } from '@/lib/admin-auth';
import { generateMagicToken } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { users, tickets, ticketRegistrations } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  let user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    columns: { id: true, email: true },
  });

  const userExisted = !!user;

  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ email: normalizedEmail })
      .returning({ id: users.id, email: users.email });
    user = inserted[0]!;
  }

  const userTickets = await db
    .select({
      code: tickets.code,
      registrationId: tickets.registrationId,
    })
    .from(tickets)
    .where(eq(tickets.assignedUserId, user.id));

  let registrationStatus: string | null = null;
  if (userTickets.length > 0 && userTickets[0]!.registrationId) {
    const reg = await db.query.ticketRegistrations.findFirst({
      where: eq(ticketRegistrations.id, userTickets[0]!.registrationId),
      columns: { reviewStatus: true },
    });
    registrationStatus = reg?.reviewStatus ?? null;
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://goleadora.brakestation.com.mx';
  const ticketCode = userTickets[0]?.code ?? null;

  const loginToken = generateMagicToken(user.id, '');
  const loginLink = `${baseUrl}/auth/magic?${new URLSearchParams({
    token: loginToken,
    next: '/activar',
  })}`;

  const quinielaLink = ticketCode
    ? `${baseUrl}/auth/magic?${new URLSearchParams({
        token: generateMagicToken(user.id, ticketCode),
        next: `/quiniela?ticket=${ticketCode}`,
      })}`
    : null;

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return NextResponse.json({
    loginLink,
    quinielaLink,
    ticketCode,
    userExists: userExisted,
    registrationStatus,
    expires: expires.toISOString(),
  });
}
