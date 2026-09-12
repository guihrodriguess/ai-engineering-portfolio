import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Raiz do tenant. Não tem RLS — não existe endpoint que liste organizações
 * de outra organização, e todo o resto do schema pendura em `organizacaoId`.
 */
export const organizacoes = pgTable('organizacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});
