'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CategoriaBadge, VeredictoBadge } from '@/components/Badges';
import type { ResultadoClassificacao } from '@/lib/pipeline/pipeline';

const EXEMPLOS = [
  { texto: 'Jantar em restaurante japonês com a equipe de projeto', valor: 95 },
  { texto: 'Jantar com o cliente onde foi pedida uma cerveja para acompanhar', valor: 70 },
  { texto: 'Aplicativo de transporte até o show da convenção anual', valor: 28 },
  { texto: 'Nota de R$38 sem estabelecimento legível', valor: 38 },
];

export default function Page() {
  const [texto, setTexto] = useState('');
  const [valor, setValor] = useState('');
  const [simular, setSimular] = useState(true);
  const [resultado, setResultado] = useState<ResultadoClassificacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function classificar(textoEnvio = texto, valorEnvio = valor) {
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch('/api/classificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoEnvio, valor: Number(valorEnvio), simular }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? 'Falha ao classificar');
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
        <h1 className="text-lg font-semibold text-zinc-100">
          Pipeline de classificação com IA
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Candidatos por embedding → reranking com IA → regras de negócio → veredicto.
          Projeto 3 do{' '}
          <a className="underline" href="/../README.md" target="_blank" rel="noreferrer">
            portfólio de AI Engineering
          </a>
          . Veja também a{' '}
          <Link className="underline" href="/eval">
            avaliação (top-1, top-k, falsos positivos)
          </Link>
          .
        </p>
      </header>

      <div className="space-y-2 text-sm text-zinc-500">
        <p>Experimente:</p>
        <ul className="flex flex-wrap gap-2">
          {EXEMPLOS.map(ex => (
            <li key={ex.texto}>
              <button
                className="rounded border border-zinc-800 px-2 py-1 text-left text-xs text-sky-400 hover:border-zinc-700 hover:underline"
                onClick={() => {
                  setTexto(ex.texto);
                  setValor(String(ex.valor));
                  classificar(ex.texto, String(ex.valor));
                }}
              >
                {ex.texto} (R$ {ex.valor})
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4"
        onSubmit={e => {
          e.preventDefault();
          classificar();
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Descrição da despesa
          <textarea
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            rows={2}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Ex: Jantar com o cliente, incluiu uma cerveja"
            required
          />
        </label>
        <div className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-300">
            Valor (R$)
            <input
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={e => setValor(e.target.value)}
              required
            />
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
            {carregando ? 'Classificando…' : 'Classificar'}
          </button>
        </div>
      </form>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {resultado && (
        <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CategoriaBadge categoria={resultado.categoriaEscolhida} />
            <VeredictoBadge veredicto={resultado.veredicto} />
            <span className="text-xs text-zinc-500">
              confiança {(resultado.confianca * 100).toFixed(0)}%
              {resultado.baixaConfianca && ' — abaixo do limiar'}
            </span>
            {resultado.simulado && (
              <span className="rounded border border-violet-800 bg-violet-950 px-2 py-0.5 text-xs text-violet-300">
                simulado
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Candidatos (etapa 1 — embedding)
            </div>
            <div className="space-y-1">
              {resultado.candidatos.map(c => (
                <div key={c.categoria} className="flex items-center gap-2 text-xs">
                  <span className="w-40 shrink-0 text-zinc-400">{c.categoria}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-900">
                    <div
                      className="h-full bg-sky-700"
                      style={{ width: `${Math.max(0, Math.min(1, c.score)) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-zinc-500">{c.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Justificativa (etapa 2 — rerank)
            </div>
            <p className="text-sm text-zinc-300">{resultado.justificativa}</p>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Motivos do veredicto (etapa 3 — regras)
            </div>
            <ul className="list-inside list-disc text-sm text-zinc-300">
              {resultado.motivos.map(m => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
