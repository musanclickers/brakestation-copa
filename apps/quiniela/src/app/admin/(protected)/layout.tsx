import { requireAdminCookie } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { BrandHeader } from '@/components/BrandHeader';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireAdminCookie();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { mustChangePassword: true },
  });

  if (user?.mustChangePassword) {
    redirect('/admin/change-password');
  }

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 shadow-md px-4 py-3 flex items-center justify-between gap-4">
        <BrandHeader />
        <AdminNav />
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-8">{children}</main>
    </>
  );
}
