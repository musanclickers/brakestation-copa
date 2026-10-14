import { db } from '@brakestation/db';
import { trivias } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { TriviaForm, type TriviaFormValues } from '../../_components/TriviaForm';

export const dynamic = 'force-dynamic';

function toLocal(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function EditTriviaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.trivias.findFirst({ where: eq(trivias.id, id) });
  if (!row) notFound();

  const initial: TriviaFormValues = {
    id: row.id,
    question: row.question,
    optionA: row.optionA,
    optionB: row.optionB,
    optionC: row.optionC,
    correctOption: row.correctOption as 'a' | 'b' | 'c',
    opensAt: toLocal(row.opensAt),
    closesAt: toLocal(row.closesAt),
    category: row.category as 'futbol' | 'marca',
    phaseLabel: row.phaseLabel,
  };

  return <TriviaForm mode="edit" initial={initial} />;
}
