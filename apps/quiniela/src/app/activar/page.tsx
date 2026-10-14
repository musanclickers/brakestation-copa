import { auth } from '@brakestation/auth';
import { LoginForm } from '@/components/LoginForm';
import { TicketActivationFlow } from '@/components/TicketActivationFlow';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { NewPhotoUploadForm } from '@/components/NewPhotoUploadForm';
import { db } from '@brakestation/db';
import { ticketRegistrations } from '@brakestation/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ActivarPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; force?: string }>;
}) {
  const { ticket, force } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-[#0a1e3d] via-[#1a3a6b] to-[#2c1810]">
        <BrandHeader variant="horizontal" size="lg" />
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-2 mt-6 text-center">
          Vive el <span className="text-brand-red">Mundial</span> con <span className="text-brand-red">CanaBRAKE</span>
        </h1>
        <p className="font-sans text-sm text-white/60 font-semibold mb-8">
          Activa tu boleto para participar
        </p>
        <LoginForm ticketCode={ticket} />
        <SiteFooter />
      </main>
    );
  }

  if (session.user.id) {
    const existing = await db.query.ticketRegistrations.findFirst({
      where: and(
        eq(ticketRegistrations.userId, session.user.id),
        ne(ticketRegistrations.reviewStatus, 'rejected'),
      ),
    });
    if (existing) {
      if (existing.reviewStatus === 'awaiting_new_photo') {
        return (
          <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-[#0a1e3d] via-[#1a3a6b] to-[#2c1810]">
            <BrandHeader variant="horizontal" size="lg" />
            <div className="mt-6 w-full max-w-md backdrop-blur-xl bg-amber-500/[0.10] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-8 text-center">
              <div className="text-5xl mb-4">📸</div>
              <h1 className="text-2xl font-black text-white mb-2">Necesitamos una nueva foto</h1>
              <p className="text-white/85 mb-4">Boleto: <span className="font-mono font-bold">{existing.ticketCode}</span></p>
              {existing.reviewNotes && (
                <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-left mb-4">
                  <p className="text-amber-200 text-xs font-bold uppercase tracking-wider mb-2">Motivo</p>
                  <p className="text-white/90">{existing.reviewNotes}</p>
                </div>
              )}
              <p className="text-white/70 text-sm mb-6">Tus datos personales quedan intactos. Solo sube la foto nueva.</p>
              <NewPhotoUploadForm registrationId={existing.id} />
            </div>
            <SiteFooter />
          </main>
        );
      }
      if (force !== '1') {
        redirect('/dashboard');
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-[#0a1e3d] via-[#1a3a6b] to-[#2c1810]">
      <BrandHeader variant="horizontal" size="lg" />
      <div className="mt-6 w-full max-w-md">
        <TicketActivationFlow
          userEmail={session.user.email!}
          prefilledCode={ticket ?? null}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
