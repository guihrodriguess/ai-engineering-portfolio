'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import type { Job } from '@/lib/types';

const EXEMPLOS = [
  { label: 'Normal', texto: 'Cliente relata que o ar-condicionado da sala 3 parou de gelar desde ontem à tarde. Pede visita técnica ainda essa semana.' },
  { label: 'Com falha transitória (retry)', texto: '[FALHA_TRANSITORIA] Vazamento na tubulação do banheiro do 2º andar, água já está escorrendo pro corredor.' },
  { label: 'Com timeout', texto: '[TIMEOUT] Solicitação de orçamento para troca de 4 luminárias no estacionamento.' },
  { label: 'Falha permanente (dead-letter)', texto: '[FALHA_PERMANENTE] Chamado de teste que deveria falhar sempre, pra mostrar o job indo pra falha permanente.' },
];

export default function Page() {
  const [texto, setTexto] = useState('');
  const [simular, setSimular] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscarJobs(): Promise<Job[]> {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    return data.jobs ?? [];
  }

  useEffect(() => {
    let cancelado = false;
    async function tick() {
      const dados = await buscarJobs();
      if (!cancelado) setJobs(dados);
    }
    tick();
    const interval = setInterval(tick, 1500);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, []);

  async function enviar(textoEnvio = texto) {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoEnvio, simular }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? 'Falha ao enfileirar');
      setTexto('');
      setJobs(await buscarJobs());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setEnviando(false);
    }
  }

  const contagem = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-lg font-semibold text-zinc-100">Sistema assíncrono com IA</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Fila em arquivo + worker como processo separado (rode <code className="rounded bg-zinc-900 px-1">npm run worker</code>{' '}
          em outro terminal) — extração e resumo por IA, com retry/backoff, timeout, dead-letter e
          reclaim de job travado. Projeto 4 do{' '}
          <a className="underline" href="/../README.md" target="_blank" rel="noreferrer">
            portfólio de AI Engineering
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-amber-400">
          Se um job ficar parado em &quot;pendente&quot;, o worker não está rodando — abra outro terminal com{' '}
          <code className="rounded bg-zinc-900 px-1">npm run worker</code>.
        </p>
      </header>

      <div className="space-y-2 text-sm text-zinc-500">
        <p>Experimente (os 3 últimos exercitam retry, timeout e dead-letter de propósito):</p>
        <ul className="flex flex-wrap gap-2">
          {EXEMPLOS.map(ex => (
            <li key={ex.label}>
              <button
                className="rounded border border-zinc-800 px-2 py-1 text-left text-xs text-sky-400 hover:border-zinc-700 hover:underline"
                onClick={() => enviar(ex.texto)}
              >
                {ex.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4"
        onSubmit={e => {
          e.preventDefault();
          enviar();
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Texto do chamado
          <textarea
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            rows={3}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descreva o chamado…"
            required
          />
        </label>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 pb-2 text-xs text-zinc-400">
            <input type="checkbox" checked={simular} onChange={e => setSimular(e.target.checked)} />
            Modo simulação (sem custo de IA)
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            {enviando ? 'Enfileirando…' : 'Enfileirar'}
          </button>
        </div>
      </form>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-300">Fila ({jobs.length})</h2>
          {Object.entries(contagem).map(([status, n]) => (
            <span key={status} className="text-xs text-zinc-500">
              {status}: {n}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {jobs.length === 0 && <p className="text-sm text-zinc-600">Nenhum job ainda.</p>}
          {jobs.map(job => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-800 p-3 hover:border-zinc-700"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-300">{job.texto}</p>
                <p className="text-xs text-zinc-600">
                  {new Date(job.criadoEm).toLocaleTimeString('pt-BR')} · tentativa {job.tentativas}/{job.maxTentativas}
                  {job.simulado && ' · simulado'}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
