import { generateObject } from 'ai';
import { z } from 'zod';

const MODEL = process.env.WORKER_MODEL ?? 'anthropic/claude-haiku-4-5';
const TIMEOUT_MS = 8000;

export class TransientError extends Error {}
export class TimeoutError extends Error {
  constructor(etapa: string) {
    super(`Etapa "${etapa}" excedeu o timeout de ${TIMEOUT_MS}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Gatilhos de falha determinísticos, embutidos no próprio texto de entrada —
 * mesmo racional do SKU-SLOW / falha na 1ª tentativa do projeto 2: a demo
 * precisa ser reproduzível, não pode depender de uma falha de rede de
 * verdade acontecer na hora certa.
 *
 * [FALHA_TRANSITORIA] — falha nas 2 primeiras tentativas, sucede na 3ª.
 * [FALHA_PERMANENTE]  — falha em todas as tentativas (demonstra dead-letter).
 * [TIMEOUT]           — a etapa de extração demora mais que TIMEOUT_MS.
 */
function verificarGatilho(texto: string, tentativa: number) {
  if (texto.includes('[FALHA_PERMANENTE]')) {
    throw new TransientError('Falha simulada permanente (gatilho [FALHA_PERMANENTE]).');
  }
  if (texto.includes('[FALHA_TRANSITORIA]') && tentativa < 3) {
    throw new TransientError(`Falha simulada transitória (gatilho [FALHA_TRANSITORIA]), tentativa ${tentativa}/3.`);
  }
}

async function comTimeout<T>(promessa: Promise<T>, etapa: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(etapa)), TIMEOUT_MS);
  });
  try {
    return await Promise.race([promessa, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface Extracao {
  assunto: string;
  urgencia: 'baixa' | 'media' | 'alta';
  palavrasChave: string[];
}

export async function extrair(texto: string, tentativa: number): Promise<Extracao> {
  verificarGatilho(texto, tentativa);

  const chamada: Promise<{ object: Extracao }> = texto.includes('[TIMEOUT]')
    ? sleep(TIMEOUT_MS + 2000).then(() => ({ object: { assunto: '', urgencia: 'baixa', palavrasChave: [] } }))
    : generateObject({
        model: MODEL,
        schema: z.object({
          assunto: z.string().describe('Assunto principal do texto em poucas palavras'),
          urgencia: z.enum(['baixa', 'media', 'alta']),
          palavrasChave: z.array(z.string()).max(5),
        }),
        prompt: `Extraia o assunto, a urgência percebida e até 5 palavras-chave do texto a seguir:\n\n${texto}`,
      });

  const { object } = await comTimeout(chamada, 'extracao');
  return object;
}

export interface Resumo {
  resumo: string;
  sentimento: 'positivo' | 'neutro' | 'negativo';
  necessitaAcaoHumana: boolean;
}

export async function resumir(texto: string, extracao: Extracao): Promise<Resumo> {
  const { object } = await generateObject({
    model: MODEL,
    schema: z.object({
      resumo: z.string().describe('Resumo de 1-2 frases'),
      sentimento: z.enum(['positivo', 'neutro', 'negativo']),
      necessitaAcaoHumana: z.boolean().describe('true se parece exigir resposta/ação de alguém, não só arquivar'),
    }),
    prompt: `Assunto: ${extracao.assunto}\nUrgência: ${extracao.urgencia}\n\nTexto original:\n${texto}\n\nResuma e avalie sentimento e necessidade de ação humana.`,
  });
  return object;
}

/** Etapas sem chamada de IA (modo simulação) — mesmas regras de gatilho de falha continuam valendo. */
export async function extrairSimulado(texto: string, tentativa: number): Promise<Extracao> {
  verificarGatilho(texto, tentativa);
  if (texto.includes('[TIMEOUT]')) {
    // Simula o resultado do timeout sem esperar TIMEOUT_MS de verdade — o
    // modo simulação existe pra ser rápido; o que importa demonstrar é o
    // efeito (TimeoutError), não o relógio.
    throw new TimeoutError('extracao');
  }
  const palavras = texto.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean);
  return {
    assunto: palavras.slice(0, 4).join(' ') || 'Sem assunto identificável',
    urgencia: texto.length > 200 ? 'alta' : 'baixa',
    palavrasChave: [...new Set(palavras.filter(p => p.length > 5))].slice(0, 5),
  };
}

export function resumirSimulado(texto: string, extracao: Extracao): Resumo {
  return {
    resumo: `[modo simulação] ${extracao.assunto} — ${texto.replace(/\[.*?\]/g, '').slice(0, 80)}...`,
    sentimento: 'neutro',
    necessitaAcaoHumana: extracao.urgencia !== 'baixa',
  };
}
