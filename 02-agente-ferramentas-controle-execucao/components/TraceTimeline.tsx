'use client';

import { useEffect, useRef, useState } from 'react';
import type { TraceEvent } from '@/lib/engine/traceStore';

const STATUS_STYLES: Record<string, string> = {
  start: 'text-zinc-400',
  success: 'text-emerald-400',
  timeout: 'text-amber-400',
  'retryable-error': 'text-amber-400',
  'fatal-error': 'text-red-400',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  });
}

function EventLine({ event }: { event: TraceEvent }) {
  const time = <span className="text-zinc-500 tabular-nums">{formatTime(event.ts)}</span>;

  switch (event.type) {
    case 'agent-start':
      return (
        <div className="text-zinc-300">
          {time} <span className="font-medium">▶ agente iniciado</span>
        </div>
      );
    case 'agent-end':
      return (
        <div className="text-zinc-300">
          {time} <span className="font-medium">■ agente finalizado</span>{' '}
          <span className="text-zinc-500">({event.steps} passo(s))</span>
        </div>
      );
    case 'step-start':
      return (
        <div className="text-zinc-500">
          {time} passo {event.stepNumber + 1} iniciado
        </div>
      );
    case 'step-end':
      return (
        <div className="text-zinc-500">
          {time} passo {event.stepNumber + 1} concluído
          {event.toolCalls.length > 0 && (
            <span> — chamou: {event.toolCalls.join(', ')}</span>
          )}
        </div>
      );
    case 'tool-start':
      return (
        <div className="text-sky-300">
          {time} <span className="font-medium">{event.toolName}</span> chamado{' '}
          <span className="text-zinc-500 break-all">
            {JSON.stringify(event.input)}
          </span>
        </div>
      );
    case 'attempt': {
      const label =
        event.status === 'start'
          ? `tentativa ${event.attempt}/${event.maxAttempts}`
          : event.status === 'success'
            ? `tentativa ${event.attempt} OK (${event.durationMs}ms)`
            : event.status === 'timeout'
              ? `tentativa ${event.attempt} expirou (timeout)`
              : event.status === 'retryable-error'
                ? `tentativa ${event.attempt} falhou (transitório, vai tentar de novo)`
                : `tentativa ${event.attempt} falhou (erro fatal)`;
      return (
        <div className={`pl-4 ${STATUS_STYLES[event.status] ?? 'text-zinc-400'}`}>
          {time} ↳ {event.toolName}: {label}
          {event.detail && <span className="text-zinc-500"> — {event.detail}</span>}
        </div>
      );
    }
    case 'idempotent-hit':
      return (
        <div className="pl-4 text-violet-300">
          {time} ↳ {event.toolName}: resultado reaproveitado (dedupe por
          idempotência, efeito colateral não repetido)
        </div>
      );
    case 'tool-end':
      return (
        <div className={event.success ? 'text-emerald-400' : 'text-red-400'}>
          {time} {event.toolName} {event.success ? 'concluído' : 'falhou'} em{' '}
          {event.durationMs}ms
          {event.error && <span className="text-zinc-500"> — {event.error}</span>}
        </div>
      );
    case 'approval-requested':
      return (
        <div className="text-amber-300">
          {time} ⏸ aprovação humana necessária para{' '}
          <span className="font-medium">{event.toolName}</span>
          {event.reason && <span className="text-zinc-500"> — {event.reason}</span>}
        </div>
      );
    case 'approval-resolved':
      return (
        <div className={event.approved ? 'text-emerald-400' : 'text-red-400'}>
          {time} {event.approved ? '✓ aprovado' : '✗ negado'}:{' '}
          <span className="font-medium">{event.toolName}</span>
          {event.reason && <span className="text-zinc-500"> — {event.reason}</span>}
        </div>
      );
    default:
      return null;
  }
}

export function TraceTimeline({ chatId, active }: { chatId: string; active: boolean }) {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      try {
        const res = await fetch(`/api/trace/${chatId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setEvents(data.events);
      } catch {
        // silencioso — apenas um painel de observabilidade, não deve
        // quebrar a conversa se a requisição de trace falhar.
      }
    }

    fetchOnce();
    const interval = active ? setInterval(fetchOnce, 900) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [chatId, active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [events.length]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Trace de execução
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed">
        {events.length === 0 && (
          <p className="text-zinc-600">
            Nenhum evento ainda. Envie uma mensagem para começar.
          </p>
        )}
        {events.map((event, i) => (
          <EventLine key={i} event={event} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
