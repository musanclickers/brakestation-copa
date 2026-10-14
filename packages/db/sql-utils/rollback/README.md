# Rollback scripts

Scripts to revert specific forward migrations. Apply in **LIFO order** (newest migration first).

## Rollback order for the 2026-06-16 notifications PR

```bash
psql "$DATABASE_URL" -f packages/db/drizzle/rollback/0021_notification_logs_rollback.sql
psql "$DATABASE_URL" -f packages/db/drizzle/rollback/0020_trivias_phase_label_rollback.sql
```

After applying:

1. Edit `packages/db/drizzle/meta/_journal.json` and remove the entries with `idx: 20` and `idx: 21`.
2. Revert the corresponding Drizzle schema changes in `packages/db/src/schema.ts` (restore `trivias.phaseTransition`, remove `notificationLogs`).
3. Revert the application code that depends on the rolled-back schema (`apps/quiniela/src/lib/notification-templates.ts`, `notification-audiences.ts`, the `/admin/notifications` routes, `/admin/trivias` CRUD, and the trivias page's `phaseLabel` references).

The simplest "revert all code too" path is `git revert <SHA-range>` against the 25-commit batch.

## Gotcha: 0020 rollback can fail loudly

The reverse mapping `phase_label → phase_transition` only covers values that round-trip back to the original `1..5` range (`groups_m2 → 1`, `groups_m3 → 2`, `r32 → 3`, `r16 → 4`, `qf → 5`).

If any trivia row was created post-migration with `phase_label IN ('groups_m1', 'sf', 'final_phase')` — values the new schema accepts but the old `BETWEEN 1 AND 5` did not — the rollback aborts with a `RAISE EXCEPTION` inside a transaction. Resolve by either:

- Deleting the offending rows: `DELETE FROM trivias WHERE phase_label IN ('groups_m1','sf','final_phase');`
- Reassigning them: `UPDATE trivias SET phase_label = 'qf' WHERE phase_label IN ('sf','final_phase');`
- Skipping the rollback entirely (keep the new schema).

Then re-run.
