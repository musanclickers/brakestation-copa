import { MagicLinkGenerator } from '@/components/AdminMagicLinks';

export const dynamic = 'force-dynamic';

export default function AdminLinksPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Admin · <span className="text-brand-red">Links</span></h1>
        <p className="text-white/80 text-sm">
          Si a un participante no le llega el correo, genera aquí su link de acceso y mándaselo por otro medio.
        </p>
      </div>
      <MagicLinkGenerator />
    </div>
  );
}
