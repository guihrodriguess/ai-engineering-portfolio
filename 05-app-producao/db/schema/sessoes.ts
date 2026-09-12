import { pgTable, uuid, text, timestamp, pgPolicy, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizacoes } from './organizacoes';
import { usuarios } from './usuarios';

/**
 * Sessão de login. `tokenHash` guarda o hash do token de sessão — nunca o
 * token em claro (o cookie no navegador tem o token; se o banco vazar, um
 * atacante não consegue forjar sessão a partir do hash). Ver lib/auth/sessao.ts.
 */
export const sessoes = pgTable(
  'sessoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizacaoId: uuid('organizacao_id').notNull().references(() => organizacoes.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  },
  table => [
    uniqueIndex('sessoes_token_hash_unico').on(table.tokenHash),
    pgPolicy('sessoes_isolamento_por_organizacao', {
      for: 'all',
      to: 'app_user',
      using: sql`${table.organizacaoId} = nullif(current_setting('app.org_id', true), '')::uuid`,
    }),
  ],
).enableRLS();
