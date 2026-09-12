import { z } from 'zod';
import { perguntar } from '@/lib/rag/pipeline';

const BodySchema = z.object({
  pergunta: z.string().min(3),
  estrategia: z.enum(['fixo', 'secao']),
  simular: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const resultado = await perguntar(parsed.data);
    return Response.json(resultado);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha ao responder' }, { status: 502 });
  }
}
