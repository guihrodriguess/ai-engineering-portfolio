import { describe, expect, it } from 'vitest';
import { classificarHeuristico } from '@/lib/ai/classificar';

describe('classificarHeuristico (fallback determinístico)', () => {
  it('classifica um relato de bug como categoria bug e prioridade alta', () => {
    const r = classificarHeuristico('O sistema travou e deu erro ao salvar o relatório.');
    expect(r.categoria).toBe('bug');
    expect(r.prioridade).toBe('alta');
    expect(r.sentimento).toBe('negativo');
  });

  it('classifica um elogio como categoria elogio e sentimento positivo', () => {
    const r = classificarHeuristico('Ótimo atendimento, adorei a nova função, parabéns pelo trabalho!');
    expect(r.categoria).toBe('elogio');
    expect(r.sentimento).toBe('positivo');
  });

  it('classifica uma pergunta como dúvida', () => {
    const r = classificarHeuristico('Como faço para exportar meus dados?');
    expect(r.categoria).toBe('duvida');
  });

  it('sempre devolve um objeto com os 3 campos, mesmo pra texto genérico', () => {
    const r = classificarHeuristico('Texto qualquer sem palavra-chave nenhuma.');
    expect(r).toHaveProperty('categoria');
    expect(r).toHaveProperty('sentimento');
    expect(r).toHaveProperty('prioridade');
  });
});
