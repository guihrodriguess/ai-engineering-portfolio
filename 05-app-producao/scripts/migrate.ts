import { config as carregarEnv } from 'dotenv';
carregarEnv({ path: '.env.local' });

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Roda como o superusuário das migrations (DATABASE_URL_ADMIN), nunca como
 * app_user — quem cria tabela, policy e função tem que ser dono/superuser.
 *
 * 2 passos: (1) migrations do Drizzle (tabelas + policies de RLS, geradas a
 * partir de db/schema/*.ts); (2) as funções SECURITY DEFINER de autenticação
 * (db/sql/02-funcoes-auth.sql) — não são "schema" no sentido do Drizzle, e
 * dependem das tabelas já existirem, por isso ficam de fora do
 * drizzle-kit generate e são aplicadas à parte, aqui.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL_ADMIN;
  if (!connectionString) throw new Error('DATABASE_URL_ADMIN não definida.');

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log('Aplicando migrations do Drizzle...');
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'db/migrations') });

  console.log('Aplicando funções de autenticação (SECURITY DEFINER)...');
  const funcoesSql = readFileSync(path.join(process.cwd(), 'db/sql/02-funcoes-auth.sql'), 'utf-8');
  await pool.query(funcoesSql);

  await pool.end();
  console.log('Migração concluída.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
