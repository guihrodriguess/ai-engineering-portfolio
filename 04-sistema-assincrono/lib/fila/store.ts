import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Job, JobEvent } from '../types';

/**
 * Persistência em arquivo, um job por arquivo (`.data/fila/<id>.json`) mais
 * um log de eventos append-only por job (`.data/fila/<id>.events.jsonl`).
 *
 * Um job por arquivo — em vez de um array grande num arquivo só — evita
 * colisão de escrita entre o servidor Next (que só cria jobs) e o processo
 * de worker (que só atualiza jobs existentes): cada um mexe em arquivos
 * diferentes na maior parte do tempo. Pra produção de verdade, isto vira uma
 * tabela de fila num banco real (Postgres/Redis) — ver README.
 */

const DATA_DIR = path.join(process.cwd(), '.data', 'fila');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function jobPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

function eventsPath(id: string) {
  return path.join(DATA_DIR, `${id}.events.jsonl`);
}

export function salvarJob(job: Job) {
  ensureDir();
  writeFileSync(jobPath(job.id), JSON.stringify(job, null, 2), 'utf-8');
}

export function lerJob(id: string): Job | null {
  const p = jobPath(id);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as Job;
}

export function listarJobs(): Job[] {
  ensureDir();
  return readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(path.join(DATA_DIR, f), 'utf-8')) as Job)
    .sort((a, b) => b.criadoEm - a.criadoEm);
}

export function registrarEvento(evento: JobEvent) {
  ensureDir();
  appendFileSync(eventsPath(evento.jobId), JSON.stringify(evento) + '\n', 'utf-8');
}

export function lerEventos(jobId: string): JobEvent[] {
  const p = eventsPath(jobId);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l) as JobEvent);
}
