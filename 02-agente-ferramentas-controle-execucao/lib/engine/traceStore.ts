import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Armazenamento de trace de execução, em arquivo JSONL por conversa (chatId).
 *
 * Isso é um store local para fins de demonstração. Em produção, troque por
 * um backend compartilhado entre instâncias (Postgres, Redis) — ver README.
 */

export type TraceEvent =
  | { type: 'agent-start'; chatId: string; ts: number }
  | { type: 'agent-end'; chatId: string; ts: number; steps: number }
  | { type: 'step-start'; chatId: string; ts: number; stepNumber: number }
  | {
      type: 'step-end';
      chatId: string;
      ts: number;
      stepNumber: number;
      toolCalls: string[];
      finishReason: string;
    }
  | {
      type: 'tool-start';
      chatId: string;
      ts: number;
      toolName: string;
      toolCallId: string;
      input: unknown;
    }
  | {
      type: 'tool-end';
      chatId: string;
      ts: number;
      toolName: string;
      toolCallId: string;
      durationMs: number;
      success: boolean;
      error?: string;
    }
  | {
      type: 'attempt';
      chatId: string;
      ts: number;
      toolName: string;
      toolCallId: string;
      attempt: number;
      maxAttempts: number;
      status: 'start' | 'success' | 'timeout' | 'retryable-error' | 'fatal-error';
      detail?: string;
      durationMs?: number;
    }
  | {
      type: 'idempotent-hit';
      chatId: string;
      ts: number;
      toolName: string;
      toolCallId: string;
      idempotencyKey: string;
    }
  | {
      type: 'approval-requested';
      chatId: string;
      ts: number;
      toolName: string;
      toolCallId: string;
      approvalId: string;
      reason?: string;
    }
  | {
      type: 'approval-resolved';
      chatId: string;
      ts: number;
      toolName: string;
      approvalId: string;
      approved: boolean;
      reason?: string;
    };

const DATA_DIR = path.join(process.cwd(), '.data', 'trace');

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function fileFor(chatId: string) {
  const safeId = chatId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeId}.jsonl`);
}

export function appendTrace(event: TraceEvent) {
  ensureDir();
  appendFileSync(fileFor(event.chatId), JSON.stringify(event) + '\n', 'utf-8');
}

export function readTrace(chatId: string): TraceEvent[] {
  const file = fileFor(chatId);
  if (!existsSync(file)) return [];
  const raw = readFileSync(file, 'utf-8');
  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as TraceEvent);
}
