import type { Config } from 'drizzle-kit';

/**
 * Migrations geradas/aplicadas sempre com a connection string ADMIN (dono
 * das tabelas, precisa criar policies com `TO app_user`) — nunca com a
 * DATABASE_URL de runtime da aplicação, que conecta como app_user e não tem
 * privilégio pra rodar DDL.
 */
export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_ADMIN ?? 'postgres://postgres:postgres@localhost:5432/app_producao',
  },
} satisfies Config;
