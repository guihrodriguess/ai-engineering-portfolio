import { lerJob, registrarEvento } from '../fila/store';
import { marcarConcluido, marcarProcessando, registrarFalha } from '../fila/queue';
import { extrair, extrairSimulado, resumir, resumirSimulado, TimeoutError, TransientError } from './steps';
import type { Job } from '../types';

/**
 * Processa 1 job até o fim de uma tentativa: sucesso completo (concluido),
 * falha tratada (retentativa agendada ou dead-letter via registrarFalha) —
 * nunca lança pra fora, o worker.ts principal não precisa de try/catch por
 * job (só por segurança extra, ver worker.ts).
 */
export async function processarJob(jobId: string, workerId: string): Promise<void> {
  const job = lerJob(jobId);
  if (!job) return;

  const tentativaAtual = job.tentativas + 1;
  registrarEvento({ type: 'iniciado', jobId, ts: Date.now(), tentativa: tentativaAtual, worker: workerId });

  try {
    const extracao = await comEtapa(job, 'extracao', () =>
      job.simulado ? extrairSimulado(job.texto, tentativaAtual) : extrair(job.texto, tentativaAtual),
    );

    marcarProcessando(jobId, 'resumindo');

    const resumo = await comEtapa(job, 'resumo', () =>
      Promise.resolve(job.simulado ? resumirSimulado(job.texto, extracao) : resumir(job.texto, extracao)),
    );

    marcarConcluido(jobId, { ...extracao, ...resumo });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    // Só timeout e erro transitório merecem retentativa — um erro de
    // validação/negócio não vira transitório só porque tentamos de novo.
    const retentavel = err instanceof TransientError || err instanceof TimeoutError;
    registrarFalha(jobId, mensagem, { fatal: !retentavel });
  }
}

async function comEtapa<T>(job: Job, etapa: 'extracao' | 'resumo', fn: () => Promise<T>): Promise<T> {
  if (etapa === 'extracao') marcarProcessando(job.id, 'extraindo');
  const inicio = Date.now();
  registrarEvento({ type: 'etapa', jobId: job.id, ts: inicio, etapa, status: 'inicio' });
  try {
    const resultado = await fn();
    registrarEvento({ type: 'etapa', jobId: job.id, ts: Date.now(), etapa, status: 'sucesso', duracaoMs: Date.now() - inicio });
    return resultado;
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    registrarEvento({ type: 'etapa', jobId: job.id, ts: Date.now(), etapa, status: 'falha', detalhe, duracaoMs: Date.now() - inicio });
    throw err;
  }
}
