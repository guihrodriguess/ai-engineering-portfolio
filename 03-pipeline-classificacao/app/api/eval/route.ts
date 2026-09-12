import { rodarAvaliacao } from '@/lib/eval/runEval';

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const simular = Boolean(body?.simular);

  try {
    const resultado = await rodarAvaliacao(simular);
    return Response.json(resultado);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Falha ao rodar avaliação' },
      { status: 502 },
    );
  }
}
