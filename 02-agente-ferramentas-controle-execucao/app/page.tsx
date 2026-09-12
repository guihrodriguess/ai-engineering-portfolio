'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import type { SupportAgentUIMessage } from '@/lib/agent';
import { TraceTimeline } from '@/components/TraceTimeline';

const EXEMPLOS = [
  'Qual o status do pedido PED-1002?',
  'Tem estoque do SKU-SLOW? (demonstra timeout)',
  'Quero reembolso de R$80 no pedido PED-1001, produto veio com defeito',
  'Quero reembolso de R$400 no pedido PED-1003 (exige aprovação)',
  'Cancele o pedido PED-1004 (exige aprovação)',
];

function ToolPart({ part }: { part: Record<string, unknown> & { type: string } }) {
  const toolName = part.type === 'dynamic-tool' ? (part.toolName as string) : part.type.slice('tool-'.length);
  const state = part.state as string;
  const approval = part.approval as
    | { id: string; approved?: boolean; requestReason?: string; isAutomatic?: boolean }
    | undefined;

  const { addToolApprovalResponse } = useChatContext();

  return (
    <div className="my-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
      <div className="font-mono text-xs text-zinc-400">{toolName}</div>
      {state === 'input-available' && (
        <div className="text-zinc-500">executando…</div>
      )}
      {state === 'approval-requested' && approval && !approval.isAutomatic && (
        <div className="mt-1 space-y-2">
          <p className="text-amber-300">
            Aprovação necessária{approval.requestReason ? `: ${approval.requestReason}` : ''}
          </p>
          <div className="flex gap-2">
            <button
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
              onClick={() =>
                addToolApprovalResponse({ id: approval.id, approved: true })
              }
            >
              Aprovar
            </button>
            <button
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500"
              onClick={() =>
                addToolApprovalResponse({
                  id: approval.id,
                  approved: false,
                  reason: 'Negado pelo atendente',
                })
              }
            >
              Negar
            </button>
          </div>
        </div>
      )}
      {state === 'output-denied' && (
        <div className="text-red-400">negado{approval?.requestReason ? ` — ${approval.requestReason}` : ''}</div>
      )}
      {state === 'output-available' && (
        <pre className="mt-1 overflow-x-auto text-xs text-zinc-300">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      )}
      {state === 'output-error' && (
        <div className="text-red-400">erro: {String(part.errorText)}</div>
      )}
    </div>
  );
}

// addToolApprovalResponse precisa vir do hook useChat no componente pai;
// repassamos via contexto simples para não precisar fazer prop-drilling em
// cada parte de mensagem.
const ChatCtx = createContext<{
  addToolApprovalResponse: (r: { id: string; approved: boolean; reason?: string }) => void;
} | null>(null);
function useChatContext() {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error('ChatCtx não disponível');
  return ctx;
}

export default function Page() {
  const [chatId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error, addToolApprovalResponse } =
    useChat<SupportAgentUIMessage>({
      id: chatId,
      transport: new DefaultChatTransport({ api: '/api/chat' }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

  const ctxValue = useMemo(() => ({ addToolApprovalResponse }), [addToolApprovalResponse]);
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col gap-4 p-4">
      <header className="shrink-0">
        <h1 className="text-lg font-semibold text-zinc-100">
          Agente de suporte — controle de execução
        </h1>
        <p className="text-sm text-zinc-400">
          Tool calling com retry/timeout, idempotência, tracing e aprovação humana (HITL).
          Projeto 2 do{' '}
          <a className="underline" href="/../README.md" target="_blank" rel="noreferrer">
            portfólio de AI Engineering
          </a>
          .
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-2">
        <ChatCtx.Provider value={ctxValue}>
          <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-800">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2 text-sm text-zinc-500">
                  <p>Experimente:</p>
                  <ul className="space-y-1">
                    {EXEMPLOS.map(ex => (
                      <li key={ex}>
                        <button
                          className="text-left text-sky-400 hover:underline"
                          onClick={() => sendMessage({ text: ex })}
                        >
                          {ex}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {messages.map(message => (
                <div key={message.id}>
                  <div className="text-xs font-semibold uppercase text-zinc-500">
                    {message.role === 'user' ? 'você' : 'agente'}
                  </div>
                  {message.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return (
                        <p key={i} className="whitespace-pre-wrap text-sm text-zinc-100">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
                      return (
                        <ToolPart
                          key={i}
                          part={part as Record<string, unknown> & { type: string }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
              {error && <p className="text-sm text-red-400">{error.message}</p>}
            </div>
            <form
              className="flex gap-2 border-t border-zinc-800 p-3"
              onSubmit={e => {
                e.preventDefault();
                if (!input.trim()) return;
                sendMessage({ text: input });
                setInput('');
              }}
            >
              <input
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Digite sua mensagem…"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </div>
        </ChatCtx.Provider>

        <TraceTimeline chatId={chatId} active={busy || messages.length > 0} />
      </div>
    </div>
  );
}
