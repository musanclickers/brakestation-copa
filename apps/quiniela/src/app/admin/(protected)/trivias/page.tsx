import { db } from '@brakestation/db';
import { trivias, triviaResponses } from '@brakestation/db/schema';
import { asc, sql } from 'drizzle-orm';
import Link from 'next/link';
import { DedupeButton } from './_components/DedupeButton';
import { DedupeTriviasButton } from './_components/DedupeTriviasButton';
import { TriviasList, type TriviaRow } from './_components/TriviasList';

export const dynamic = 'force-dynamic';

export default async function AdminTriviasPage() {
  const rows = await db
    .select({
      id: trivias.id,
      phaseLabel: trivias.phaseLabel,
      question: trivias.question,
      category: trivias.category,
      opensAt: trivias.opensAt,
      closesAt: trivias.closesAt,
      correctOption: trivias.correctOption,
    })
    .from(trivias)
    .orderBy(asc(trivias.opensAt));

  const counts = await db
    .select({ triviaId: triviaResponses.triviaId, n: sql<number>`count(*)::int` })
    .from(triviaResponses)
    .groupBy(triviaResponses.triviaId);
  const countMap = new Map(counts.map((c) => [c.triviaId, c.n]));

  const serialized: TriviaRow[] = rows.map((t) => ({
    id: t.id,
    phaseLabel: t.phaseLabel,
    question: t.question,
    category: t.category,
    opensAtIso: t.opensAt.toISOString(),
    closesAtIso: t.closesAt.toISOString(),
    correctOption: t.correctOption,
    responseCount: countMap.get(t.id) ?? 0,
  }));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 text-white">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <h1 className="font-display text-3xl">Admin — Trivias</h1>
        <div className="flex items-start gap-3 flex-wrap">
          <DedupeButton />
          <DedupeTriviasButton />
          <Link
            href="/admin/trivias/new"
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-semibold"
          >
            + Nueva trivia
          </Link>
        </div>
      </div>

      <TriviasList rows={serialized} />
    </div>
  );
}
