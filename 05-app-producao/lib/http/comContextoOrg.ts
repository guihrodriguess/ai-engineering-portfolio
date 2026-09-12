import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/**
 * Toda query tenant-scoped passa por aqui. `set_config(..., true)` é o
 * equivalente parametrizável de `SET LOCAL app.org_id = ...` — escopado à
 * transação (essencial com connection pooling: a conexão física é
 * devolvida ao pool e reusada por outra requisição depois; `SET` sem
 * `LOCAL`/transação vazaria o org_id de uma requisição pra outra).
 *
 * As policies de RLS em db/schema/*.ts leem exatamente essa variável de
 * sessão — sem ela setada, `current_setting('app.org_id', true)` volta null
 * e a policy não libera nenhuma linha (fail-closed, não fail-open).
 */
export function comContextoOrg<T>(organizacaoId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async tx => {
    await tx.execute(sql`select set_config('app.org_id', ${organizacaoId}, true)`);
    return fn(tx);
  });
}
