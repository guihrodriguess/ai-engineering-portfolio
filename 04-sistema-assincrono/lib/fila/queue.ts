import { randomUUID } from 'node:crypto';
import { lerJob, listarJobs, registrarEvento, salvarJob } from './store';
import type { Job } from '../types';

export const MAX_TENTATIVAS = 3;
/** Job "processando" há mais que isto é considerado worker travado/morto — outro worker pode reclamá-lo. */
export const LEASE_MS = 20_000;

export function enfileirar(texto: string, simulado: boolean): Job {
  const agora = Date.now();
  const job: Job = {
    id: randomUUID(),
    texto,
    simulado,
    status: 'pendente',
    tentativas: 0,
    maxTentativas: MAX_TENTATIVAS,
    criadoEm: agora,
    atualizadoEm: agora,
    processandoDesde: null,
    proximaTentativaEm: null,
    resultado: null,
    erro: null,
  };
  salvarJob(job);
  registrarEvento({ type: 'enfileirado', jobId: job.id, ts: agora });
  return job;
}

/**
 * Escolhe o próximo job elegível pra processar: `pendente` cuja
 * `proximaTentativaEm` já passou (respeitando o backoff de retentativa), OU
 * um job preso em `extraindo`/`resumindo` há mais que `LEASE_MS` (worker
 * anterior travou ou caiu no meio do processamento — reclamado em vez de
 * ficar preso pra sempre). Entre os elegíveis, o mais antigo primeiro (FIFO).
 */
export function pegarProximoJob(): Job | null {
  const agora = Date.now();
  const jobs = listarJobs();

  const elegiveis = jobs.filter(job => {
    if (job.status === 'pendente') {
      return !job.proximaTentativaEm || job.proximaTentativaEm <= agora;
    }
    if ((job.status === 'extraindo' || job.status === 'resumindo') && job.processandoDesde) {
      return agora - job.processandoDesde > LEASE_MS;
    }
    return false;
  });

  if (elegiveis.length === 0) return null;

  elegiveis.sort((a, b) => a.criadoEm - b.criadoEm);
  const job = elegiveis[0];

  if (job.status !== 'pendente') {
    registrarEvento({
      type: 'job_reclamado',
      jobId: job.id,
      ts: agora,
      motivo: `Job preso em "${job.status}" há mais de ${LEASE_MS / 1000}s — reclamado por worker novo (o anterior provavelmente caiu).`,
    });
  }

  return job;
}

export function marcarProcessando(jobId: string, status: 'extraindo' | 'resumindo') {
  const job = lerJob(jobId);
  if (!job) return;
  job.status = status;
  job.processandoDesde = Date.now();
  job.atualizadoEm = Date.now();
  salvarJob(job);
}

export function marcarConcluido(jobId: string, resultado: Job['resultado']) {
  const job = lerJob(jobId);
  if (!job) return;
  job.status = 'concluido';
  job.resultado = resultado;
  job.processandoDesde = null;
  job.proximaTentativaEm = null;
  job.atualizadoEm = Date.now();
  salvarJob(job);
  registrarEvento({ type: 'concluido', jobId, ts: job.atualizadoEm, duracaoTotalMs: job.atualizadoEm - job.criadoEm });
}

/** Backoff exponencial + jitter, igual ao padrão de retry do projeto 2 — só que persistido entre execuções do worker, não em memória de uma única chamada. */
function backoffMs(tentativa: number) {
  const base = Math.min(1000 * 2 ** (tentativa - 1), 15_000);
  return base + Math.random() * 500;
}

/**
 * Registra uma falha: se `fatal` (erro de negócio/validação — ver
 * runJob.ts, que só marca `fatal` quando o erro NÃO é TransientError nem
 * TimeoutError), vai direto pro dead-letter, sem gastar as tentativas
 * restantes — não faz sentido tentar de novo um erro que não é transitório.
 * Senão, se ainda há tentativas disponíveis, agenda retentativa com backoff e
 * devolve o job pra fila (`pendente`); se esgotou, também vai pro
 * `falha_permanente` (dead-letter) — o job para de ser reprocessado
 * automaticamente e fica visível pra intervenção manual.
 */
export function registrarFalha(jobId: string, erro: string, opts: { fatal?: boolean } = {}): 'retentativa' | 'falha_permanente' {
  const job = lerJob(jobId);
  if (!job) return 'falha_permanente';

  job.tentativas += 1;
  job.processandoDesde = null;
  job.atualizadoEm = Date.now();
  job.erro = erro;

  if (opts.fatal || job.tentativas >= job.maxTentativas) {
    job.status = 'falha_permanente';
    job.proximaTentativaEm = null;
    salvarJob(job);
    registrarEvento({
      type: 'falha_permanente',
      jobId,
      ts: job.atualizadoEm,
      motivo: opts.fatal
        ? `Erro não-transitório — não adianta tentar de novo: ${erro}`
        : `Esgotadas ${job.tentativas}/${job.maxTentativas} tentativas. Último erro: ${erro}`,
    });
    return 'falha_permanente';
  }

  const delay = backoffMs(job.tentativas);
  job.status = 'pendente';
  job.proximaTentativaEm = Date.now() + delay;
  salvarJob(job);
  registrarEvento({
    type: 'retentativa_agendada',
    jobId,
    ts: job.atualizadoEm,
    tentativa: job.tentativas,
    proximaTentativaEm: job.proximaTentativaEm,
    motivo: erro,
  });
  return 'retentativa';
}
