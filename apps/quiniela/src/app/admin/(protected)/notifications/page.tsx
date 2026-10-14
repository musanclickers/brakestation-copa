import { db } from '@brakestation/db';
import { trivias } from '@brakestation/db/schema';
import { PHASE_ORDER, PHASE_LABELS } from '@brakestation/db/phases';
import { NOTIFICATION_TEMPLATES } from '@/lib/notification-templates';
import { NotificationsClient } from './_components/NotificationsClient';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const triviasRows = await db
    .select({ id: trivias.id, question: trivias.question, phaseLabel: trivias.phaseLabel })
    .from(trivias)
    .orderBy(asc(trivias.opensAt));

  const templates = Object.values(NOTIFICATION_TEMPLATES).map((t) => ({ key: t.key, label: t.label }));
  const triviaOptions = triviasRows.map((t) => ({
    id: t.id,
    label: `[${t.phaseLabel}] ${t.question.slice(0, 60)}`,
  }));
  const phaseOptions = PHASE_ORDER.map((p) => ({ value: p, label: PHASE_LABELS[p] }));

  return <NotificationsClient templates={templates} trivias={triviaOptions} phases={phaseOptions} />;
}
