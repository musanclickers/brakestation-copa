import { config } from 'dotenv';

// Un solo .env para dev: el de la app (apps/quiniela/.env).
config({ path: ['.env', '../../apps/quiniela/.env'] });
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
