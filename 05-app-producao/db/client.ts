import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Conexão de runtime da aplicação — sempre como `app_user` (ver
 * db/sql/01-role-app-user.sql), nunca como o superusuário usado nas
 * migrations. É a role `app_user`, sem BYPASSRLS, que faz a Row-Level
 * Security valer de verdade (ver db/schema/*.ts).
 *
 * Inicialização preguiçosa: evita quebrar `next build` se DATABASE_URL não
 * estiver definida no momento do build (mesma armadilha de qualquer client
 * de banco top-level em Next.js).
 */
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: requireEnv('DATABASE_URL') });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

function requireEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida.`);
  return valor;
}
