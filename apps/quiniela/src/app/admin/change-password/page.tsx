import { requireAdminCookie } from '@/lib/admin-auth';
import { ChangePasswordForm } from './ChangePasswordForm';
import { BrandHeader } from '@/components/BrandHeader';
import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const userId = await requireAdminCookie();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { mustChangePassword: true, adminPasswordHash: true },
  });

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 shadow-md px-4 py-3 flex items-center justify-between gap-4">
        <BrandHeader />
        <Link href="/admin/matches" className="text-white/80 text-sm hover:text-white transition-colors">
          ← Panel admin
        </Link>
      </header>
      <main className="max-w-md mx-auto p-4 md:p-8">
        <ChangePasswordForm isForced={user?.mustChangePassword ?? false} hasPassword={Boolean(user?.adminPasswordHash)} />
      </main>
    </>
  );
}
