import { pgTable, uuid, text, timestamp, boolean, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizacoes } from './organizacoes';
import { usuarios } from './usuarios';

export const feedbacks = pgTable(
  'feedbacks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizacaoId: uuid('organizacao_id').notNull().references(() => organizacoes.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    categoria: text('categoria').notNull(),
    sentimento: text('sentimento').notNull(),
    prioridade: text('prioridade').notNull(),
    /** true se a classificação veio do fallback heurístico (IA indisponível/timeout), não do modelo. */
    fallback: boolean('fallback').notNull().default(false),
    criadoPor: uuid('criado_por').notNull().references(() => usuarios.id),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    pgPolicy('feedbacks_isolamento_por_organizacao', {
      for: 'all',
      to: 'app_user',
      using: sql`${table.organizacaoId} = nullif(current_setting('app.org_id', true), '')::uuid`,
    }),
  ],
).enableRLS();
