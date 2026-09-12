import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { feedbacks } from '@/db/schema';
import { classificarFeedback } from '@/lib/ai/classificar';
import { dentroDaCotaDiaria, COTA_DIARIA_PADRAO } from '@/lib/ai/cota';
import { registrarChamadaIa } from '@/lib/ai/tracing';
import { comContextoOrg } from '@/lib/http/comContextoOrg';
import { exigirSessao, NaoAutenticadoError } from '@/lib/http/sessaoRequest';

export const maxDuration = 30;

const BodySchema = z.object({
  texto: z.string().min(3).max(4000),
});

export async function POST(request: Request) {
  let sessao;
  try {
    sessao = await exigirSessao();
  } catch (err) {
    if (err instanceof NaoAutenticadoError) return Response.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dentroDaCota = await dentroDaCotaDiaria(sessao.organizacaoId);
  if (!dentroDaCota) {
    return Response.json(
      { error: `Cota diária de classificações por IA (${COTA_DIARIA_PADRAO}) atingida para esta organização.` },
      { status: 429 },
    );
  }

  const resultado = await classificarFeedback(parsed.data.texto);
  await registrarChamadaIa(sessao.organizacaoId, 'classificacao_feedback', resultado);

  const [feedback] = await comContextoOrg(sessao.organizacaoId, tx =>
    tx
      .insert(feedbacks)
      .values({
        organizacaoId: sessao.organizacaoId,
        texto: parsed.data.texto,
        categoria: resultado.classificacao.categoria,
        sentimento: resultado.classificacao.sentimento,
        prioridade: resultado.classificacao.prioridade,
        fallback: resultado.fallback,
        criadoPor: sessao.usuarioId,
      })
      .returning(),
  );

  return Response.json({ feedback, fallback: resultado.fallback }, { status: 201 });
}

export async function GET() {
  let sessao;
  try {
    sessao = await exigirSessao();
  } catch (err) {
    if (err instanceof NaoAutenticadoError) return Response.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const lista = await comContextoOrg(sessao.organizacaoId, tx =>
    tx.select().from(feedbacks).where(eq(feedbacks.organizacaoId, sessao.organizacaoId)).orderBy(desc(feedbacks.criadoEm)),
  );

  return Response.json({ feedbacks: lista });
}
