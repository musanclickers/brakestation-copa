import { AdminBackground } from '@/components/AdminBackground';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminBackground>{children}</AdminBackground>;
}
