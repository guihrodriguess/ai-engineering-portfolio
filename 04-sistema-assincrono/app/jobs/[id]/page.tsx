'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import type { Job, JobEvent } from '@/lib/types';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour12: false });
}

function EventLine({ evento }: { evento: JobEvent }) {
  const time = <span className="text-zinc-500 tabular-nums">{formatTime(evento.ts)}</span>;
  switch (evento.type) {
    case 'enfileirado':
      return <div className="text-zinc-300">{time} ▶ enfileirado</div>;
    case 'iniciado':
      return (
        <div className="text-zinc-300">
          {time} worker {evento.worker} iniciou tentativa {evento.tentativa}
        </div>
      );
    case 'etapa': {
      const cor = evento.status === 'sucesso' ? 'text-emerald-400' : evento.status === 'falha' ? 'text-red-400' : 'text-sky-400';
      return (
        <div className={`pl-4 ${cor}`}>
          {time} ↳ {evento.etapa}: {evento.status}
          {evento.duracaoMs !== undefined && ` (${evento.duracaoMs}ms)`}
          {evento.detalhe && <span className="text-zinc-500"> — {evento.detalhe}</span>}
        </div>
      );
    }
    case 'retentativa_agendada':
      return (
        <div className="text-amber-400">
          {time} retentativa {evento.tentativa} agendada pra {formatTime(evento.proximaTentativaEm)} — {evento.motivo}
        </div>
      );
    case 'job_reclamado':
      return <div className="text-amber-400">{time} ⚠ {evento.motivo}</div>;
    case 'concluido':
      return (
        <div className="text-emerald-400">
          {time} ■ concluído em {evento.duracaoTotalMs}ms desde o enfileiramento
        </div>
      );
    case 'falha_permanente':
      return <div className="text-red-400">{time} ✗ falha permanente — {evento.motivo}</div>;
    default:
      return null;
  }
}

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [eventos, setEventos] = useState<JobEvent[]>([]);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      const res = await fetch(`/api/jobs/${id}`);
      if (cancelado) return;
      if (!res.ok) {
        setNaoEncontrado(true);
        return;
      }
      const data = await res.json();
      setJob(data.job);
      setEventos(data.eventos);
      const terminal = data.job.status === 'concluido' || data.job.status === 'falha_permanente';
      if (!terminal) timer = setTimeout(tick, 1200);
    }

    tick();
    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (naoEncontrado) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-red-400">Job não encontrado.</p>
        <Link className="text-sm underline" href="/">voltar</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <Link href="/" className="text-sm text-zinc-500 underline">← voltar pra fila</Link>

      {job && (
        <>
          <header className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-xs text-zinc-500">
              tentativa {job.tentativas}/{job.maxTentativas} · criado {formatTime(job.criadoEm)}
              {job.simulado && ' · simulado'}
            </span>
          </header>

          <div className="rounded-lg border border-zinc-800 p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Texto original</div>
            <p className="text-sm text-zinc-300">{job.texto}</p>
          </div>

          {job.resultado && (
            <div className="rounded-lg border border-zinc-800 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Resultado</div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-zinc-500">Assunto</dt>
                <dd className="text-zinc-200">{job.resultado.assunto}</dd>
                <dt className="text-zinc-500">Urgência</dt>
                <dd className="text-zinc-200">{job.resultado.urgencia}</dd>
                <dt className="text-zinc-500">Palavras-chave</dt>
                <dd className="text-zinc-200">{job.resultado.palavrasChave.join(', ') || '—'}</dd>
                <dt className="text-zinc-500">Sentimento</dt>
                <dd className="text-zinc-200">{job.resultado.sentimento}</dd>
                <dt className="text-zinc-500">Necessita ação humana</dt>
                <dd className="text-zinc-200">{job.resultado.necessitaAcaoHumana ? 'sim' : 'não'}</dd>
                <dt className="text-zinc-500">Resumo</dt>
                <dd className="text-zinc-200">{job.resultado.resumo}</dd>
              </dl>
            </div>
          )}

          {job.status === 'falha_permanente' && (
            <div className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
              Esgotadas as tentativas automáticas. Último erro: {job.erro}
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Trace de execução</div>
            <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
              {eventos.map((ev, i) => (
                <EventLine key={i} evento={ev} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
