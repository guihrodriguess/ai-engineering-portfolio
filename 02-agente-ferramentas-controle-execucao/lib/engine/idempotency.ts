import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Dedupe de chamadas de ferramenta por (chatId, ferramenta, input).
 *
 * Evita reexecutar um efeito colateral (ex: emitir reembolso) quando o
 * modelo — ou uma política de retry — chama a mesma ferramenta mais de uma
 * vez com os mesmos argumentos dentro da mesma conversa.
 *
 * Store local em arquivo para fins de demonstração; troque por Redis/Postgres
 * em produção para funcionar entre múltiplas instâncias — ver README.
 */

type IdempotencyRecord = {
  status: 'done';
  result: unknown;
  storedAt: number;
};

const DATA_DIR = path.join(process.cwd(), '.data', 'idempotency');

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function fileFor(chatId: string) {
  const safeId = chatId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeId}.json`);
}

function readAll(chatId: string): Record<string, IdempotencyRecord> {
  const file = fileFor(chatId);
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function writeAll(chatId: string, data: Record<string, IdempotencyRecord>) {
  ensureDir();
  writeFileSync(fileFor(chatId), JSON.stringify(data, null, 2), 'utf-8');
}

export function idempotencyKeyFor(toolName: string, input: unknown): string {
  const hash = createHash('sha256')
    .update(toolName + ':' + JSON.stringify(input))
    .digest('hex')
    .slice(0, 16);
  return `${toolName}:${hash}`;
}

export function getIdempotentResult(chatId: string, key: string): unknown | undefined {
  const all = readAll(chatId);
  return all[key]?.status === 'done' ? all[key].result : undefined;
}

export function saveIdempotentResult(chatId: string, key: string, result: unknown) {
  const all = readAll(chatId);
  all[key] = { status: 'done', result, storedAt: Date.now() };
  writeAll(chatId, all);
}
