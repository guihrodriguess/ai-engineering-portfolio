'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORIAS, CATEGORIA_LABEL } from '@/lib/domain/categorias';
import { VeredictoBadge } from '@/components/Badges';
import type { ResultadoAvaliacao } from '@/lib/eval/runEval';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export default function EvalPage() {
  const [simular, setSimular] = useState(true);
  const [resultado, setResultado] = useState<ResultadoAvaliacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [somenteErros, setSomenteErros] = useState(false);

  async function rodar() {
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simular }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? 'Falha ao rodar avaliação');
      setResultado(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }

  const itensExibidos = resultado ? resultado.itens.filter(i => !somenteErros || !i.top1Correto) : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-lg font-semibold text-zinc-100">Avaliação do pipeline de classificação</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Roda o pipeline completo sobre um dataset sintético rotulado (40 itens, com casos
          ambíguos de propósito) e mede top-1, top-k, falsos positivos e taxa de baixa
          confiança. <Link className="underline" href="/">voltar ao classificador</Link>.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={simular} onChange={e => setSimular(e.target.checked)} />
          Modo simulação (sem custo de IA — heurística de palavra-chave, mais fraca de propósito)
        </label>
        <button
          onClick={rodar}
          disabled={carregando}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {carregando ? 'Rodando avaliação…' : 'Rodar avaliação'}
        </button>
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {resultado && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Top-1 accuracy"
              value={`${(resultado.metricas.top1Accuracy * 100).toFixed(0)}%`}
              hint="categoria escolhida = correta"
            />
            <Stat
              label="Top-k accuracy"
              value={`${(resultado.metricas.topKAccuracy * 100).toFixed(0)}%`}
              hint="correta estava nos candidatos"
            />
            <Stat
              label="Baixa confiança"
              value={`${(resultado.metricas.taxaBaixaConfianca * 100).toFixed(0)}%`}
              hint="foi pra revisão humana"
            />
            <Stat label="Itens avaliados" value={String(resultado.metricas.total)} hint={resultado.simulado ? 'modo simulação' : 'modo real (IA)'} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-300">Falsos positivos por categoria prevista</h2>
            <p className="mb-2 text-xs text-zinc-500">
              Quantas vezes o pipeline escolheu essa categoria quando a correta era outra.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map(cat => {
                const n = resultado.metricas.falsosPositivosPorCategoria[cat] ?? 0;
                if (n === 0) return null;
                return (
                  <span key={cat} className="rounded border border-red-900 bg-red-950/50 px-2 py-1 text-xs text-red-300">
                    {CATEGORIA_LABEL[cat]}: {n}
                  </span>
                );
              })}
              {Object.keys(resultado.metricas.falsosPositivosPorCategoria).length === 0 && (
                <span className="text-xs text-zinc-500">Nenhum.</span>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Itens</h2>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={somenteErros} onChange={e => setSomenteErros(e.target.checked)} />
                Mostrar só erros de top-1
              </label>
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Texto</th>
                    <th className="px-3 py-2">Correta</th>
                    <th className="px-3 py-2">Prevista</th>
                    <th className="px-3 py-2">Confiança</th>
                    <th className="px-3 py-2">Veredicto</th>
                  </tr>
                </thead>
                <tbody>
                  {itensExibidos.map(item => (
                    <tr key={item.id} className="border-t border-zinc-800">
                      <td className="max-w-xs px-3 py-2 text-zinc-300">{item.texto}</td>
                      <td className="px-3 py-2 text-zinc-400">{CATEGORIA_LABEL[item.categoriaCorreta]}</td>
                      <td className={`px-3 py-2 ${item.top1Correto ? 'text-emerald-400' : 'text-red-400'}`}>
                        {CATEGORIA_LABEL[item.categoriaPrevista]}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {(item.confianca * 100).toFixed(0)}%{item.baixaConfianca && ' ⚠'}
                      </td>
                      <td className="px-3 py-2">
                        <VeredictoBadge veredicto={item.veredicto} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
