import { MagicLinkGenerator } from '@/components/AdminMagicLinks';

export const dynamic = 'force-dynamic';

export default function AdminLinksPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Admin · <span className="text-brand-red">Links</span></h1>
        <p className="text-white/80 text-sm">
          Genera links de acceso para participantes aprobados y envíalos por WhatsApp para que llenen sus pronósticos
        </p>
      </div>
      <MagicLinkGenerator />
    </div>
  );
}
