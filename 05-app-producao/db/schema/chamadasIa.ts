import { pgTable, uuid, text, timestamp, integer, boolean, numeric, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizacoes } from './organizacoes';

/**
 * Log de observabilidade de toda chamada de IA feita pela aplicação — a base
 * do dashboard de tracing de custo/latência (`/observabilidade`) e do
 * controle de cota diária (ver lib/ai/cota.ts, que conta linhas desta
 * tabela em vez de manter um contador separado).
 */
export const chamadasIa = pgTable(
  'chamadas_ia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizacaoId: uuid('organizacao_id').notNull().references(() => organizacoes.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    modelo: text('modelo').notNull(),
    latenciaMs: integer('latencia_ms').notNull(),
    sucesso: boolean('sucesso').notNull(),
    fallback: boolean('fallback').notNull().default(false),
    custoEstimadoUsd: numeric('custo_estimado_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    erro: text('erro'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    pgPolicy('chamadas_ia_isolamento_por_organizacao', {
      for: 'all',
      to: 'app_user',
      using: sql`${table.organizacaoId} = nullif(current_setting('app.org_id', true), '')::uuid`,
    }),
  ],
).enableRLS();
