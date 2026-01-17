import type { Config } from 'drizzle-kit';

export default {
  schema: './electron/utils/database.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './dmarc-reader.db',
  },
} satisfies Config;
