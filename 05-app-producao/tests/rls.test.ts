import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { feedbacks, organizacoes } from '@/db/schema';
import { comContextoOrg } from '@/lib/http/comContextoOrg';
import { registrarConta } from '@/lib/auth/conta';

/**
 * O teste mais importante deste projeto: prova que o isolamento
 * multi-tenant é imposto pelo Postgres (Row-Level Security), não por um
 * `WHERE organizacaoId = ...` que uma query futura pode esquecer de
 * incluir. Roda contra Postgres real — um mock de ORM nunca pegaria uma
 * policy escrita errado, porque o mock não sabe o que é RLS.
 */
describe('Isolamento multi-tenant via Row-Level Security (Postgres real)', () => {
  let orgA: string;
  let orgB: string;
  let usuarioA: string;
  let usuarioB: string;

  beforeAll(async () => {
    const a = await registrarConta(`Org A RLS ${Date.now()}`, `rls-a-${Date.now()}@teste.com`, 'senhaForte123');
    const b = await registrarConta(`Org B RLS ${Date.now()}`, `rls-b-${Date.now()}@teste.com`, 'senhaForte123');
    orgA = a.organizacaoId;
    orgB = b.organizacaoId;
    usuarioA = a.usuarioId;
    usuarioB = b.usuarioId;

    await comContextoOrg(orgA, tx =>
      tx.insert(feedbacks).values({
        organizacaoId: orgA,
        texto: 'Feedback exclusivo da organização A',
        categoria: 'bug',
        sentimento: 'negativo',
        prioridade: 'alta',
        criadoPor: usuarioA,
      }),
    );
    await comContextoOrg(orgB, tx =>
      tx.insert(feedbacks).values({
        organizacaoId: orgB,
        texto: 'Feedback exclusivo da organização B',
        categoria: 'elogio',
        sentimento: 'positivo',
        prioridade: 'baixa',
        criadoPor: usuarioB,
      }),
    );
  });

  afterAll(async () => {
    await getDb().delete(organizacoes).where(inArray(organizacoes.id, [orgA, orgB]));
  });

  it('cada organização só enxerga o próprio feedback', async () => {
    const vistosPelaA = await comContextoOrg(orgA, tx => tx.select().from(feedbacks).where(eq(feedbacks.organizacaoId, orgA)));
    expect(vistosPelaA).toHaveLength(1);
    expect(vistosPelaA[0].texto).toContain('organização A');
  });

  it('uma query SEM NENHUM filtro WHERE, no contexto de A, ainda assim não devolve a linha de B', async () => {
    // Se a RLS não estivesse valendo, isso devolveria as 2 linhas (A e B) —
    // é a policy do Postgres, não o `.where()` do Drizzle, que corta.
    const semFiltro = await comContextoOrg(orgA, tx => tx.select().from(feedbacks));
    expect(semFiltro.length).toBeGreaterThan(0);
    expect(semFiltro.every(f => f.organizacaoId === orgA)).toBe(true);
  });

  it('nem um SQL raw, na mesma conexão/transação com org_id=A, enxerga a linha de B', async () => {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(sql`select set_config('app.org_id', ${orgA}, true)`);
      const resultado = await tx.execute<{ organizacao_id: string }>(sql`select organizacao_id from feedbacks`);
      expect(resultado.rows.every(r => r.organizacao_id === orgA)).toBe(true);
    });
  });

  it('sem NENHUM org_id setado na sessão, a policy nega tudo — fail-closed, não fail-open', async () => {
    const resultado = await getDb().select().from(feedbacks);
    expect(resultado).toHaveLength(0);
  });
});
