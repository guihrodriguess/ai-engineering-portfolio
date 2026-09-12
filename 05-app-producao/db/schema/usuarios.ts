import { pgTable, uuid, text, timestamp, pgPolicy, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizacoes } from './organizacoes';

/**
 * Isolamento multi-tenant real via Row-Level Security do Postgres — não por
 * filtro `WHERE organizacaoId = ...` espalhado pelo código (que uma query
 * esquecida derruba). A policy só libera linhas cuja `organizacao_id` bate
 * com `current_setting('app.org_id')`, setada por requisição em
 * `lib/http/comContextoOrg.ts`. A role da aplicação (`app_user`, ver
 * db/sql/criar-role-app.sql) não é dona das tabelas e não tem BYPASSRLS —
 * a policy vale de verdade pra ela, não é só documentação.
 */
export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizacaoId: uuid('organizacao_id').notNull().references(() => organizacoes.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    senhaHash: text('senha_hash').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('usuarios_email_unico').on(table.email),
    pgPolicy('usuarios_isolamento_por_organizacao', {
      for: 'all',
      to: 'app_user',
      using: sql`${table.organizacaoId} = nullif(current_setting('app.org_id', true), '')::uuid`,
    }),
  ],
).enableRLS();
