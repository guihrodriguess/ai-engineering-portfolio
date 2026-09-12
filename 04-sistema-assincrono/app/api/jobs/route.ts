import { z } from 'zod';
import { enfileirar } from '@/lib/fila/queue';
import { listarJobs } from '@/lib/fila/store';

const BodySchema = z.object({
  texto: z.string().min(3),
  simular: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const job = enfileirar(parsed.data.texto, Boolean(parsed.data.simular));
  return Response.json(job, { status: 201 });
}

export async function GET() {
  return Response.json({ jobs: listarJobs() });
}
