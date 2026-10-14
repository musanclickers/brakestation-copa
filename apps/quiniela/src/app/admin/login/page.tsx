import { redirect } from 'next/navigation';
import { getAdminUserId } from '@/lib/admin-auth';
import { AdminLoginForm } from './AdminLoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const userId = await getAdminUserId();
  if (userId) redirect('/admin/registrations');

  return <AdminLoginForm />;
}
