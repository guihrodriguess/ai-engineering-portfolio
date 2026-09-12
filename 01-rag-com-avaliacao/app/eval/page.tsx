'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ResultadoAvaliacaoRag } from '@/lib/eval/runEval';

function Stat({ label, valores, hint }: { label: string; valores: [string, string]; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 flex gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-100">{valores[0]}</div>
          <div className="text-[10px] text-zinc-600">por seção</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-400">{valores[1]}</div>
          <div className="text-[10px] text-zinc-600">tamanho fixo</div>
        </div>
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export default function EvalPage() {
  const [simular, setSimular] = useState(true);
  const [resultados, setResultados] = useState<ResultadoAvaliacaoRag[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function rodar() {
    setCarregando(true);
    setErro(null);
    setResultados(null);
    try {
      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simular }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? 'Falha ao rodar avaliação');
      setResultados(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }

  const secao = resultados?.find(r => r.estrategia === 'secao');
  const fixo = resultados?.find(r => r.estrategia === 'fixo');
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-lg font-semibold text-zinc-100">Avaliação do assistente RAG</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Roda as 26 perguntas do dataset (20 respondíveis + 6 fora de escopo) contra as duas
          estratégias de chunking, lado a lado. <Link className="underline" href="/">voltar ao assistente</Link>.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={simular} onChange={e => setSimular(e.target.checked)} />
          Modo simulação (sem custo de IA)
        </label>
        <button
          onClick={rodar}
          disabled={carregando}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {carregando ? 'Rodando avaliação (26 × 2 estratégias)…' : 'Rodar avaliação'}
        </button>
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {secao && fixo && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Recall@3" valores={[pct(secao.metricas.recallAtK), pct(fixo.metricas.recallAtK)]} hint="doc certo entre os chunks usados" />
            <Stat label="MRR" valores={[secao.metricas.mrr.toFixed(2), fixo.metricas.mrr.toFixed(2)]} hint="posição do 1º chunk relevante" />
            <Stat
              label="Fallback correto"
              valores={[pct(secao.metricas.taxaFallbackCorreto), pct(fixo.metricas.taxaFallbackCorreto)]}
              hint="recusou o que era fora de escopo"
            />
            <Stat
              label="Falso fallback"
              valores={[pct(secao.metricas.taxaFalsoFallback), pct(fixo.metricas.taxaFalsoFallback)]}
              hint="recusou o que era respondível (pior é maior)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Citação correta" valores={[pct(secao.metricas.taxaCitacaoCorreta), pct(fixo.metricas.taxaCitacaoCorreta)]} hint="fonte citada = fonte esperada" />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-300">Itens — estratégia &quot;por seção&quot;</h2>
            <TabelaItens itens={secao.itens} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-300">Itens — estratégia &quot;tamanho fixo&quot;</h2>
            <TabelaItens itens={fixo.itens} />
          </div>
        </>
      )}
    </div>
  );
}

function TabelaItens({ itens }: { itens: ResultadoAvaliacaoRag['itens'] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            <th className="px-3 py-2">Pergunta</th>
            <th className="px-3 py-2">Esperado</th>
            <th className="px-3 py-2">Respondeu?</th>
            <th className="px-3 py-2">Rank do relevante</th>
            <th className="px-3 py-2">Citação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map(item => {
            const ok = item.respondivelEsperado === item.respondivel && item.citacaoCorreta !== false;
            return (
              <tr key={item.id} className={`border-t border-zinc-800 ${ok ? '' : 'bg-red-950/20'}`}>
                <td className="max-w-sm px-3 py-2 text-zinc-300">{item.pergunta}</td>
                <td className="px-3 py-2 text-zinc-500">{item.respondivelEsperado ? 'respondível' : 'fora de escopo'}</td>
                <td className={`px-3 py-2 ${item.respondivel === item.respondivelEsperado ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.respondivel ? 'sim' : 'não (fallback)'}
                </td>
                <td className="px-3 py-2 text-zinc-500">{item.rankPrimeiroRelevante ?? '—'}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {item.citacaoCorreta === null ? '—' : item.citacaoCorreta ? '✓' : '✗'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
