import { redirect } from 'next/navigation';
import { getAdminUserId } from '@/lib/admin-auth';
import { AdminLoginForm } from './AdminLoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const userId = await getAdminUserId();
  if (userId) redirect('/admin/matches');
  const { error } = await searchParams;
  return <AdminLoginForm turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ''} initialError={error} />;
}
