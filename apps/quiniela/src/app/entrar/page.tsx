import { auth } from '@brakestation/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect('/dashboard');
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <BrandHeader size="lg" />
      <h1 className="font-display text-3xl sm:text-4xl text-white mb-2 mt-6 text-center">
        Quiniela <span className="text-brand-gold">Copa Brake Station</span>
      </h1>
      <p className="font-sans text-sm text-white/70 font-semibold mb-8 text-center">
        Pronostica los 32 partidos y compite con amigos, familia y compañeros.
      </p>
      {error === 'link_expired' && (
        <p className="mb-4 max-w-sm text-center text-sm text-amber-200">
          Ese link ya venció. Pide uno nuevo abajo.
        </p>
      )}
      <LoginForm turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ''} />
      <SiteFooter />
    </main>
  );
}
