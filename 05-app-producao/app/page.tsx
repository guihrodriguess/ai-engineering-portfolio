import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { feedbacks } from '@/db/schema';
import { comContextoOrg } from '@/lib/http/comContextoOrg';
import { obterSessaoAtual } from '@/lib/http/sessaoRequest';
import { NavBar } from '@/components/NavBar';
import { NovoFeedbackForm } from '@/components/NovoFeedbackForm';

const COR_PRIORIDADE: Record<string, string> = {
  alta: 'text-red-400',
  media: 'text-amber-400',
  baixa: 'text-zinc-500',
};

export default async function Page() {
  const sessao = await obterSessaoAtual();
  if (!sessao) redirect('/login');

  const lista = await comContextoOrg(sessao.organizacaoId, tx =>
    tx.select().from(feedbacks).where(eq(feedbacks.organizacaoId, sessao.organizacaoId)).orderBy(desc(feedbacks.criadoEm)),
  );

  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
        <header>
          <h1 className="text-lg font-semibold text-zinc-100">Central de feedback</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Multi-tenant com Row-Level Security real no Postgres, auth própria, tracing de custo/latência de IA e cota diária. Projeto 5 do{' '}
            <a className="underline" href="/../README.md" target="_blank" rel="noreferrer">
              portfólio de AI Engineering
            </a>
            .
          </p>
        </header>

        <NovoFeedbackForm />

        <div className="space-y-2">
          {lista.length === 0 && <p className="text-sm text-zinc-600">Nenhum feedback ainda.</p>}
          {lista.map(f => (
            <div key={f.id} className="rounded-lg border border-zinc-800 p-3">
              <p className="text-sm text-zinc-200">{f.texto}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded border border-zinc-700 px-2 py-0.5">{f.categoria}</span>
                <span className="rounded border border-zinc-700 px-2 py-0.5">{f.sentimento}</span>
                <span className={`rounded border border-zinc-700 px-2 py-0.5 ${COR_PRIORIDADE[f.prioridade] ?? ''}`}>
                  prioridade {f.prioridade}
                </span>
                {f.fallback && (
                  <span className="rounded border border-violet-800 bg-violet-950 px-2 py-0.5 text-violet-300">
                    fallback heurístico
                  </span>
                )}
                <span>{new Date(f.criadoEm).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
