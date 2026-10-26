import { config } from 'dotenv';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

// `neon deploy` writes branch env vars to `.env.local`. Load that first, then
// fall back to `.env` for environments that use the conventional file.
config({ path: '.env.local' });
config({ path: '.env' });

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      // Migrations/schema commands must use the direct (unpooled) connection.
      connection:
        process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL']!,
    },
  }),
});
