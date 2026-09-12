'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RespondivelBadge, ScoreBar } from '@/components/Badges';
import type { ResultadoRag } from '@/lib/rag/pipeline';
import type { EstrategiaChunking } from '@/lib/chunking/chunk';

const EXEMPLOS = [
  'Qual o prazo de primeiro atendimento para um chamado crítico?',
  'A troca de um transformador está inclusa no contrato sem custo adicional?',
  'Qual a cor padrão do uniforme da equipe técnica?',
  'O contrato cobre manutenção de elevadores?',
];

export default function Page() {
  const [pergunta, setPergunta] = useState('');
  const [estrategia, setEstrategia] = useState<EstrategiaChunking>('secao');
  const [simular, setSimular] = useState(true);
  const [resultado, setResultado] = useState<ResultadoRag | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function perguntar(perguntaEnvio = pergunta) {
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch('/api/perguntar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: perguntaEnvio, estrategia, simular }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? 'Falha ao responder');
      setResultado(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-lg font-semibold text-zinc-100">Assistente RAG com avaliação</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Retrieval por embedding → rerank com IA → threshold de similaridade → geração com
          citação (ou fallback). Sobre um contrato de facilities 100% sintético. Projeto 1 do{' '}
          <a className="underline" href="/../README.md" target="_blank" rel="noreferrer">
            portfólio de AI Engineering
          </a>
          . Veja também a{' '}
          <Link className="underline" href="/eval">
            avaliação (recall@k, MRR, fallback)
          </Link>
          .
        </p>
      </header>

      <div className="space-y-2 text-sm text-zinc-500">
        <p>Experimente (as duas últimas são fora de escopo de propósito — devem cair em fallback):</p>
        <ul className="flex flex-wrap gap-2">
          {EXEMPLOS.map(ex => (
            <li key={ex}>
              <button
                className="rounded border border-zinc-800 px-2 py-1 text-left text-xs text-sky-400 hover:border-zinc-700 hover:underline"
                onClick={() => {
                  setPergunta(ex);
                  perguntar(ex);
                }}
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4"
        onSubmit={e => {
          e.preventDefault();
          perguntar();
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Pergunta
          <textarea
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            rows={2}
            value={pergunta}
            onChange={e => setPergunta(e.target.value)}
            placeholder="Ex: Qual o prazo de solução para um chamado de prioridade alta?"
            required
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Chunking
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              value={estrategia}
              onChange={e => setEstrategia(e.target.value as EstrategiaChunking)}
            >
              <option value="secao">Por seção</option>
              <option value="fixo">Tamanho fixo + overlap</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs text-zinc-400">
            <input type="checkbox" checked={simular} onChange={e => setSimular(e.target.checked)} />
            Modo simulação (sem custo de IA)
          </label>
          <button
            type="submit"
            disabled={carregando}
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            {carregando ? 'Consultando…' : 'Perguntar'}
          </button>
        </div>
      </form>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {resultado && (
        <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <RespondivelBadge respondivel={resultado.respondivel} />
            {resultado.simulado && (
              <span className="rounded border border-violet-800 bg-violet-950 px-2 py-0.5 text-xs text-violet-300">
                simulado
              </span>
            )}
            {resultado.fallback && (
              <span className="text-xs text-amber-400">
                {resultado.fallback === 'sem_contexto_relevante'
                  ? 'nenhum trecho passou do limiar de similaridade — modelo de geração nem foi chamado'
                  : 'contexto passou do limiar, mas o modelo avaliou que não responde com segurança'}
              </span>
            )}
          </div>

          {resultado.respondivel ? (
            <div>
              <p className="text-sm text-zinc-100">{resultado.resposta}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Fontes: {resultado.fontes.join(', ')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Não encontrei informação suficiente no contrato pra responder com segurança.
            </p>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Chunks recuperados → rerankeados (limiar de similaridade: 0.40)
            </div>
            <div className="space-y-2">
              {resultado.chunksRerankeados.map(c => (
                <div key={c.chunkId} className="rounded border border-zinc-800 p-2">
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                    <span>{c.docTitulo}</span>
                    {c.scoreRerank < 0.4 && <span className="text-zinc-600">abaixo do limiar</span>}
                  </div>
                  <ScoreBar label="retrieval" score={c.scoreRetrieval} />
                  <ScoreBar label="rerank" score={c.scoreRerank} />
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{c.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
