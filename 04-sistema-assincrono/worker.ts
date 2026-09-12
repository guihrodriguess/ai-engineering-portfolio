/**
 * Worker — processo separado do servidor Next.js, do jeito que um worker de
 * fila roda em produção de verdade (não é uma API route fingindo ser
 * assíncrona). Faz polling na fila a cada POLL_MS e processa 1 job por vez.
 *
 * Rodar: npm run worker  (em outro terminal, com `npm run dev` já rodando)
 *
 * Limitação conhecida: `pegarProximoJob` + `marcarProcessando` não são uma
 * operação atômica (não há "claim" de banco de verdade aqui, é arquivo
 * local) — rodar 2 workers ao mesmo tempo tem uma janela de corrida onde os
 * dois podem pegar o mesmo job. Documentado, não escondido: um banco real
 * (Postgres com `SELECT ... FOR UPDATE SKIP LOCKED`, ou Redis) resolve isso
 * com uma claim atômica de verdade. Ver README.
 */

import { pegarProximoJob } from './lib/fila/queue';
import { processarJob } from './lib/worker/runJob';

const POLL_MS = 1500;
const WORKER_ID = `worker-${process.pid}`;

function log(msg: string) {
  console.log(`[${WORKER_ID}] ${msg}`);
}

async function cicloUnico(): Promise<boolean> {
  const job = pegarProximoJob();
  if (!job) return false;

  log(`processando job ${job.id} (tentativa ${job.tentativas + 1}/${job.maxTentativas})`);
  const inicio = Date.now();
  await processarJob(job.id, WORKER_ID);
  log(`job ${job.id} — ciclo terminado em ${Date.now() - inicio}ms`);
  return true;
}

async function main() {
  log(`iniciando — polling a cada ${POLL_MS}ms`);
  while (true) {
    let processou = false;
    try {
      processou = await cicloUnico();
    } catch (err) {
      log(`erro inesperado no ciclo: ${err instanceof Error ? err.message : err}`);
    }
    if (!processou) {
      await new Promise(r => setTimeout(r, POLL_MS));
    }
  }
}

main();
