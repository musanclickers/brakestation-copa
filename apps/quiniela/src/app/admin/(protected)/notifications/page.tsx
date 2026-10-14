import { PHASE_ORDER, PHASE_LABELS } from '@brakestation/db/phases';
import { NOTIFICATION_TEMPLATES } from '@/lib/notification-templates';
import { NotificationsClient } from './_components/NotificationsClient';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  const templates = Object.values(NOTIFICATION_TEMPLATES).map((t) => ({ value: t.key, label: t.label }));
  const phases = PHASE_ORDER.map((p) => ({ value: p, label: PHASE_LABELS[p] }));
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="font-display text-3xl text-white mb-1">Correos a participantes</h1>
      <p className="text-white/80 text-sm mb-6">Cada correo lleva un link que entra directo a la quiniela, sin pedir otro acceso.</p>
      <NotificationsClient templates={templates} phases={phases} />
    </div>
  );
}
