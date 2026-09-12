import { chamadasIa } from '@/db/schema';
import { comContextoOrg } from '@/lib/http/comContextoOrg';
import type { ResultadoClassificacao } from './classificar';

/** Grava toda chamada de IA (sucesso, fallback ou erro) — é o que alimenta o dashboard em /observabilidade e o controle de cota em lib/ai/cota.ts. */
export async function registrarChamadaIa(organizacaoId: string, tipo: string, resultado: ResultadoClassificacao): Promise<void> {
  await comContextoOrg(organizacaoId, tx =>
    tx.insert(chamadasIa).values({
      organizacaoId,
      tipo,
      modelo: resultado.modelo,
      latenciaMs: resultado.latenciaMs,
      sucesso: resultado.sucesso,
      fallback: resultado.fallback,
      custoEstimadoUsd: resultado.custoEstimadoUsd.toString(),
      erro: resultado.erro ?? null,
    }),
  );
}
