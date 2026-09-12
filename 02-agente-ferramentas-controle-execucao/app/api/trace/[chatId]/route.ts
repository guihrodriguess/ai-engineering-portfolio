import { readTrace } from '@/lib/engine/traceStore';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  return Response.json({ events: readTrace(chatId) });
}
