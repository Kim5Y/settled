import { config } from 'dotenv';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d';
import contractJson from './contract.json';

// `neon deploy` writes branch env vars to `.env.local`. Load that first, then
// fall back to `.env` for environments that use the conventional file.
config({ path: '.env.local' });
config({ path: '.env' });

export const contract = contractFromJson<Contract>(contractJson);

export const db = postgres({
  contract,
  // Neon pooled connection string, injected by `neon deploy`.
  url: process.env['DATABASE_URL']!,
});
