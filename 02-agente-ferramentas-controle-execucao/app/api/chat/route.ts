import { createAgentUIStreamResponse, type UIMessage } from 'ai';
import { supportAgent } from '@/lib/agent';
import { appendTrace, readTrace } from '@/lib/engine/traceStore';

/**
 * Rota de chat padrão do AI SDK: o cliente (useChat) reenvia o histórico
 * completo de UIMessages a cada turno, e o servidor reconstrói o estado da
 * conversa a partir dele — não há sessão persistida no servidor entre
 * requisições (ver "Trust model" em node_modules/ai/docs/03-agents/06-tool-approvals.mdx).
 *
 * Isso inclui respostas de aprovação humana: quando o usuário aprova/nega uma
 * ferramenta no cliente, a próxima chamada a esta rota já vem com a resposta
 * embutida no histórico, e o agente retoma a execução a partir daí.
 */
export async function POST(request: Request) {
  const body: { id?: string; messages: UIMessage[] } = await request.json();
  const chatId = body.id ?? 'sem-id';

  logApprovalResolutions(chatId, body.messages);

  return createAgentUIStreamResponse({
    agent: supportAgent,
    uiMessages: body.messages,
    options: { chatId },
  });
}

/**
 * Varre as mensagens recebidas por uma resposta de aprovação
 * (`{ approvalId, approved }`) e registra no trace, evitando duplicar
 * eventos já registrados em turnos anteriores (o cliente reenvia o
 * histórico inteiro a cada requisição).
 */
function logApprovalResolutions(chatId: string, messages: UIMessage[]) {
  const existing = readTrace(chatId);
  const alreadyLogged = new Set(
    existing
      .filter(e => e.type === 'approval-resolved')
      .map(e => (e as { approvalId: string }).approvalId),
  );
  const requests = new Map(
    existing
      .filter(e => e.type === 'approval-requested')
      .map(e => [
        (e as { approvalId: string }).approvalId,
        (e as { toolName: string }).toolName,
      ]),
  );

  for (const response of findApprovalResponses(messages)) {
    if (alreadyLogged.has(response.approvalId)) continue;
    appendTrace({
      type: 'approval-resolved',
      chatId,
      ts: Date.now(),
      toolName: requests.get(response.approvalId) ?? 'desconhecida',
      approvalId: response.approvalId,
      approved: response.approved,
      reason: response.reason,
    });
  }
}

function findApprovalResponses(
  value: unknown,
  acc: { approvalId: string; approved: boolean; reason?: string }[] = [],
) {
  if (Array.isArray(value)) {
    for (const item of value) findApprovalResponses(item, acc);
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.approvalId === 'string' && typeof obj.approved === 'boolean') {
      acc.push({
        approvalId: obj.approvalId,
        approved: obj.approved,
        reason: typeof obj.reason === 'string' ? obj.reason : undefined,
      });
    }
    for (const v of Object.values(obj)) findApprovalResponses(v, acc);
  }
  return acc;
}
