import { lerEventos, lerJob } from '@/lib/fila/store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = lerJob(id);
  if (!job) return Response.json({ error: 'Job não encontrado' }, { status: 404 });
  return Response.json({ job, eventos: lerEventos(id) });
}
