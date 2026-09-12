import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { chamadasIa } from '@/db/schema';
import { comContextoOrg } from '@/lib/http/comContextoOrg';
import { obterSessaoAtual } from '@/lib/http/sessaoRequest';
import { contarChamadasHoje, COTA_DIARIA_PADRAO } from '@/lib/ai/cota';
import { NavBar } from '@/components/NavBar';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

export default async function ObservabilidadePage() {
  const sessao = await obterSessaoAtual();
  if (!sessao) redirect('/login');

  const [chamadas, chamadasHoje] = await Promise.all([
    comContextoOrg(sessao.organizacaoId, tx =>
      tx
        .select()
        .from(chamadasIa)
        .where(eq(chamadasIa.organizacaoId, sessao.organizacaoId))
        .orderBy(desc(chamadasIa.criadoEm))
        .limit(50),
    ),
    contarChamadasHoje(sessao.organizacaoId),
  ]);

  const total = chamadas.length;
  const sucessos = chamadas.filter(c => c.sucesso).length;
  const fallbacks = chamadas.filter(c => c.fallback).length;
  const latenciaMedia = total ? Math.round(chamadas.reduce((s, c) => s + c.latenciaMs, 0) / total) : 0;
  const custoTotal = chamadas.reduce((s, c) => s + Number(c.custoEstimadoUsd), 0);

  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
        <header>
          <h1 className="text-lg font-semibold text-zinc-100">Observabilidade de IA</h1>
          <p className="mt-1 text-sm text-zinc-400">Últimas 50 chamadas de IA desta organização — latência, custo estimado e taxa de fallback.</p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Chamadas (últimas 50)" value={String(total)} />
          <Stat label="Taxa de sucesso" value={total ? `${((sucessos / total) * 100).toFixed(0)}%` : '—'} />
          <Stat label="Taxa de fallback" value={total ? `${((fallbacks / total) * 100).toFixed(0)}%` : '—'} />
          <Stat label="Latência média" value={`${latenciaMedia}ms`} />
          <Stat label="Custo estimado" value={`US$ ${custoTotal.toFixed(4)}`} />
        </div>

        <div className="rounded-lg border border-zinc-800 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Cota diária</div>
          <div className="mt-1 text-sm text-zinc-200">
            {chamadasHoje} / {COTA_DIARIA_PADRAO} chamadas de IA usadas hoje
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-900">
            <div
              className="h-full bg-sky-700"
              style={{ width: `${Math.min(100, (chamadasHoje / COTA_DIARIA_PADRAO) * 100)}%` }}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Latência</th>
                <th className="px-3 py-2">Custo</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {chamadas.map(c => (
                <tr key={c.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-500">{new Date(c.criadoEm).toLocaleTimeString('pt-BR')}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.tipo}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.modelo}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.latenciaMs}ms</td>
                  <td className="px-3 py-2 text-zinc-300">US$ {Number(c.custoEstimadoUsd).toFixed(6)}</td>
                  <td className="px-3 py-2">
                    {c.fallback ? (
                      <span className="text-violet-400">fallback</span>
                    ) : c.sucesso ? (
                      <span className="text-emerald-400">ok</span>
                    ) : (
                      <span className="text-red-400">erro</span>
                    )}
                  </td>
                </tr>
              ))}
              {chamadas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-zinc-600">
                    Nenhuma chamada de IA ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
