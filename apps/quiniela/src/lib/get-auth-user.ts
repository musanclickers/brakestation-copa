import { auth } from '@brakestation/auth';
import { getAdminUserId } from './admin-auth';
import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';

type AuthUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  impersonating?: boolean;
};

export async function getAuthUser(impersonateId?: string): Promise<AuthUser | null> {
  const session = await auth();
  let caller: AuthUser | null = null;

  if (session?.user?.id) {
    caller = {
      id: session.user.id,
      email: session.user.email ?? '',
      isAdmin: Boolean(session.user.isAdmin),
    };
  } else {
    const adminId = await getAdminUserId();
    if (!adminId) return null;
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminId),
      columns: { id: true, email: true, isAdmin: true },
    });
    if (!adminUser) return null;
    caller = { id: adminUser.id, email: adminUser.email, isAdmin: true };
  }

  if (!caller) return null;

  if (impersonateId && caller.isAdmin && impersonateId !== caller.id) {
    const target = await db.query.users.findFirst({
      where: eq(users.id, impersonateId),
      columns: { id: true, email: true, isAdmin: true },
    });
    if (target) {
      return { id: target.id, email: target.email, isAdmin: false, impersonating: true };
    }
  }

  return caller;
}
