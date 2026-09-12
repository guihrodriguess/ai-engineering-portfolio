import { desc, eq } from 'drizzle-orm';
import { chamadasIa } from '@/db/schema';
import { comContextoOrg } from '@/lib/http/comContextoOrg';
import { exigirSessao, NaoAutenticadoError } from '@/lib/http/sessaoRequest';
import { contarChamadasHoje, COTA_DIARIA_PADRAO } from '@/lib/ai/cota';

export async function GET() {
  let sessao;
  try {
    sessao = await exigirSessao();
  } catch (err) {
    if (err instanceof NaoAutenticadoError) return Response.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const [chamadas, chamadasHoje] = await Promise.all([
    comContextoOrg(sessao.organizacaoId, tx =>
      tx
        .select()
        .from(chamadasIa)
        .where(eq(chamadasIa.organizacaoId, sessao.organizacaoId))
        .orderBy(desc(chamadasIa.criadoEm))
        .limit(50),
    ),
    contarChamadasHoje(sessao.organizacaoId),
  ]);

  const total = chamadas.length;
  const sucessos = chamadas.filter(c => c.sucesso).length;
  const fallbacks = chamadas.filter(c => c.fallback).length;
  const latenciaMedia = total ? chamadas.reduce((soma, c) => soma + c.latenciaMs, 0) / total : 0;
  const custoTotal = chamadas.reduce((soma, c) => soma + Number(c.custoEstimadoUsd), 0);

  return Response.json({
    chamadas,
    resumo: {
      total,
      taxaSucesso: total ? sucessos / total : 0,
      taxaFallback: total ? fallbacks / total : 0,
      latenciaMediaMs: Math.round(latenciaMedia),
      custoTotalUsd: Number(custoTotal.toFixed(6)),
      cotaDiaria: { usada: chamadasHoje, limite: COTA_DIARIA_PADRAO },
    },
  });
}
