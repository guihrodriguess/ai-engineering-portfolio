import { z } from 'zod';
import { classificar } from '@/lib/pipeline/pipeline';

const BodySchema = z.object({
  texto: z.string().min(3),
  valor: z.number().nonnegative(),
  simular: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const resultado = await classificar(parsed.data);
    return Response.json(resultado);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Falha ao classificar' },
      { status: 502 },
    );
  }
}
