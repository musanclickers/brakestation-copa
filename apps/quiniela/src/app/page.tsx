import { auth } from '@brakestation/auth';
import { redirect } from 'next/navigation';
import { IntroSplash } from './_components/IntroSplash';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');
  return <IntroSplash redirectTo="/activar" />;
}
