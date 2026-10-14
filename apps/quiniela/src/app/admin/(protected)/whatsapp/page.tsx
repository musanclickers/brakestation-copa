import { AdminWhatsApp } from '@/components/AdminWhatsApp';

export const dynamic = 'force-dynamic';

export default function AdminWhatsAppPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">
          Admin · <span className="text-green-400">WhatsApp</span>
        </h1>
        <p className="text-white/80 text-sm">
          Vincula un número de WhatsApp para enviar notificaciones a los participantes.
        </p>
      </div>
      <AdminWhatsApp />
    </div>
  );
}
