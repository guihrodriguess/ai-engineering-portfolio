import { appendTrace } from './traceStore';
import { getIdempotentResult, idempotencyKeyFor, saveIdempotentResult } from './idempotency';

/**
 * Erro transitório: pode ser tentado de novo (falha de rede, indisponibilidade
 * momentânea do sistema downstream). Erros que NÃO são TransientError são
 * tratados como fatais e abortam a tentativa imediatamente — não faz sentido
 * tentar de novo um erro de validação ou de regra de negócio.
 */
export class TransientError extends Error {}

export class TimeoutError extends Error {
  constructor(toolName: string, timeoutMs: number) {
    super(`"${toolName}" excedeu o timeout de ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

type ExecuteFn<TInput, TOutput> = (
  input: TInput,
  signal: AbortSignal,
  attempt: number,
) => Promise<TOutput>;

interface ControlOptions {
  /** Máximo de tentativas (incluindo a primeira). Default: 3. */
  maxAttempts?: number;
  /** Timeout por tentativa, em ms. Default: 4000. */
  timeoutMs?: number;
  /**
   * Se true (default), o resultado é cacheado por (toolName, input) dentro da
   * conversa — uma chamada repetida com os mesmos argumentos não reexecuta o
   * efeito colateral, apenas devolve o resultado já obtido.
   */
  idempotent?: boolean;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffMs(attempt: number) {
  const base = Math.min(300 * 2 ** (attempt - 1), 4000);
  const jitter = Math.random() * 150;
  return base + jitter;
}

/**
 * Envolve a execução de uma ferramenta com: dedupe por idempotência, retry
 * com backoff exponencial (só para TransientError), timeout por tentativa, e
 * emissão de eventos de trace — tudo isso observável pela UI em tempo real.
 */
export function withControls<TInput, TOutput>(
  toolName: string,
  handler: ExecuteFn<TInput, TOutput>,
  options: ControlOptions = {},
) {
  const { maxAttempts = 3, timeoutMs = 4000, idempotent = true } = options;

  return async (
    input: TInput,
    ctx: { chatId: string; toolCallId: string },
  ): Promise<TOutput> => {
    const { chatId, toolCallId } = ctx;
    const startedAt = Date.now();
    appendTrace({
      type: 'tool-start',
      chatId,
      ts: startedAt,
      toolName,
      toolCallId,
      input,
    });

    const idempotencyKey = idempotencyKeyFor(toolName, input);
    if (idempotent) {
      const cached = getIdempotentResult(chatId, idempotencyKey);
      if (cached !== undefined) {
        appendTrace({
          type: 'idempotent-hit',
          chatId,
          ts: Date.now(),
          toolName,
          toolCallId,
          idempotencyKey,
        });
        appendTrace({
          type: 'tool-end',
          chatId,
          ts: Date.now(),
          toolName,
          toolCallId,
          durationMs: Date.now() - startedAt,
          success: true,
        });
        return cached as TOutput;
      }
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStartedAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      appendTrace({
        type: 'attempt',
        chatId,
        ts: attemptStartedAt,
        toolName,
        toolCallId,
        attempt,
        maxAttempts,
        status: 'start',
      });

      try {
        const result = await handler(input, controller.signal, attempt);
        clearTimeout(timer);

        appendTrace({
          type: 'attempt',
          chatId,
          ts: Date.now(),
          toolName,
          toolCallId,
          attempt,
          maxAttempts,
          status: 'success',
          durationMs: Date.now() - attemptStartedAt,
        });

        if (idempotent) {
          saveIdempotentResult(chatId, idempotencyKey, result);
        }

        appendTrace({
          type: 'tool-end',
          chatId,
          ts: Date.now(),
          toolName,
          toolCallId,
          durationMs: Date.now() - startedAt,
          success: true,
        });

        return result;
      } catch (err) {
        clearTimeout(timer);

        const timedOut = controller.signal.aborted;
        const error = timedOut ? new TimeoutError(toolName, timeoutMs) : err;
        const retryable = timedOut || error instanceof TransientError;
        lastError = error;

        appendTrace({
          type: 'attempt',
          chatId,
          ts: Date.now(),
          toolName,
          toolCallId,
          attempt,
          maxAttempts,
          status: timedOut
            ? 'timeout'
            : retryable
              ? 'retryable-error'
              : 'fatal-error',
          detail: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - attemptStartedAt,
        });

        const isLastAttempt = attempt === maxAttempts;
        if (!retryable || isLastAttempt) {
          appendTrace({
            type: 'tool-end',
            chatId,
            ts: Date.now(),
            toolName,
            toolCallId,
            durationMs: Date.now() - startedAt,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        await sleep(backoffMs(attempt));
      }
    }

    // Inalcançável: o loop sempre retorna ou lança antes de terminar.
    throw lastError;
  };
}
