import { config as carregarEnv } from 'dotenv';
carregarEnv({ path: '.env.local' });

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Roda uma vez antes de toda a suíte: aplica migrations + funções de auth
 * contra o Postgres real (docker compose up -d db, localmente; um serviço
 * Postgres efêmero no workflow de CI — ver .github/workflows/ci.yml).
 *
 * Testes de integração aqui rodam contra banco de verdade, não um mock de
 * ORM — é a única forma de testar RLS de verdade (ver tests/rls.test.ts):
 * um mock nunca vai pegar uma policy escrita errado.
 */
export default async function globalSetup() {
  const connectionString = process.env.DATABASE_URL_ADMIN;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL_ADMIN não definida. Rode `docker compose up -d db` e configure .env.local antes de `npm test` (ver .env.example).',
    );
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'db/migrations') });

  const funcoesSql = readFileSync(path.join(process.cwd(), 'db/sql/02-funcoes-auth.sql'), 'utf-8');
  await pool.query(funcoesSql);

  await pool.end();
}
