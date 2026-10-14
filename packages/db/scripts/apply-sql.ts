// Dev local: aplica drizzle/0*.sql (migrate) o drizzle/seed_*.sql (seed) contra
// DATABASE_URL. En producción lo mismo lo hace apps/quiniela/scripts/entrypoint.sh.
import { config } from 'dotenv';

// Un solo .env para dev: el de la app (apps/quiniela/.env).
config({ path: ['.env', '../../apps/quiniela/.env'] });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const prefix = process.argv[2] === 'seed' ? 'seed_' : '0';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../drizzle');
const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.sql')).sort();

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
for (const f of files) {
  console.log(`→ ${f}`);
  await sql.unsafe(fs.readFileSync(path.join(dir, f), 'utf-8'));
}
await sql.end();
