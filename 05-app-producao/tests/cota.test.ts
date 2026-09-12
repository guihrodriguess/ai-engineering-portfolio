import { afterAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { organizacoes } from '@/db/schema';
import { registrarConta } from '@/lib/auth/conta';
import { registrarChamadaIa } from '@/lib/ai/tracing';
import { contarChamadasHoje, dentroDaCotaDiaria } from '@/lib/ai/cota';
import type { ResultadoClassificacao } from '@/lib/ai/classificar';

function chamadaFicticia(): ResultadoClassificacao {
  return {
    classificacao: { categoria: 'bug', sentimento: 'neutro', prioridade: 'baixa' },
    fallback: false,
    sucesso: true,
    latenciaMs: 100,
    modelo: 'teste',
    custoEstimadoUsd: 0.001,
  };
}

describe('cota diária de chamadas de IA (integração, Postgres real)', () => {
  const orgsCriadas: string[] = [];

  afterAll(async () => {
    if (orgsCriadas.length) await getDb().delete(organizacoes).where(inArray(organizacoes.id, orgsCriadas));
  });

  it('conta as chamadas de hoje isoladas por organização', async () => {
    const a = await registrarConta('Org Cota A', `cotaA-${Date.now()}@teste.com`, 'senhaForte123');
    const b = await registrarConta('Org Cota B', `cotaB-${Date.now()}@teste.com`, 'senhaForte123');
    orgsCriadas.push(a.organizacaoId, b.organizacaoId);

    await registrarChamadaIa(a.organizacaoId, 'teste', chamadaFicticia());
    await registrarChamadaIa(a.organizacaoId, 'teste', chamadaFicticia());
    await registrarChamadaIa(b.organizacaoId, 'teste', chamadaFicticia());

    expect(await contarChamadasHoje(a.organizacaoId)).toBe(2);
    expect(await contarChamadasHoje(b.organizacaoId)).toBe(1);
  });

  it('acusa fora da cota quando o limite diário é atingido', async () => {
    const org = await registrarConta('Org Cota Limite', `cotaLimite-${Date.now()}@teste.com`, 'senhaForte123');
    orgsCriadas.push(org.organizacaoId);

    await registrarChamadaIa(org.organizacaoId, 'teste', chamadaFicticia());
    await registrarChamadaIa(org.organizacaoId, 'teste', chamadaFicticia());
    await registrarChamadaIa(org.organizacaoId, 'teste', chamadaFicticia());

    expect(await dentroDaCotaDiaria(org.organizacaoId, 3)).toBe(false);
    expect(await dentroDaCotaDiaria(org.organizacaoId, 4)).toBe(true);
  });
});
