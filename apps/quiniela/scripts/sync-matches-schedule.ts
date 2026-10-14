import 'dotenv/config';
import { syncMatchesFromFootballData } from '../src/lib/sync-matches';

const reset = process.argv.includes('--reset');

async function main() {
  if (reset) {
    console.log('[sync] --reset flag: will TRUNCATE matches and re-populate from football-data.org');
  }
  console.log('[sync] Starting football-data.org sync...');
  const result = await syncMatchesFromFootballData({ reset });
  console.log(`[sync] ${result.fetched} fixtures from football-data.org`);
  console.log(`[sync] done. updated=${result.updated}, inserted=${result.inserted}, skipped=${result.skipped}`);
  if (result.errors.length > 0) {
    console.warn(`[sync] ${result.errors.length} errors:`);
    for (const e of result.errors) console.warn(`  - ${e}`);
  }
}

main().catch((e) => {
  console.error('[sync] FAILED', e);
  process.exit(1);
});
