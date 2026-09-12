/**
 * Evals do classificador de feedback, rodando como gate de CI (ver
 * .github/workflows/ci.yml) — antes de qualquer deploy, não só depois.
 *
 * Roda contra o fallback heurístico (classificarHeuristico), não contra o
 * modelo de IA: CI não deveria depender de uma chave de API paga só pra
 * rodar em todo PR, e o objetivo aqui é ter um gate barato e determinístico
 * — a avaliação de qualidade do modelo de IA em si é o assunto do projeto 3
 * deste portfólio (candidatos + rerank + métricas de classificação).
 */
import { classificarHeuristico } from '../lib/ai/classificar';

interface Caso {
  texto: string;
  categoriaEsperada: 'bug' | 'sugestao' | 'elogio' | 'duvida' | 'reclamacao';
}

const CASOS: Caso[] = [
  { texto: 'O aplicativo travou e deu erro ao tentar salvar o relatório.', categoriaEsperada: 'bug' },
  { texto: 'Encontrei um bug feio: o botão de exportar não funciona mais.', categoriaEsperada: 'bug' },
  { texto: 'Seria bom ter um modo escuro na próxima versão.', categoriaEsperada: 'sugestao' },
  { texto: 'Sugiro que a busca também procure dentro dos comentários.', categoriaEsperada: 'sugestao' },
  { texto: 'Adorei a nova função de exportação, parabéns pelo trabalho!', categoriaEsperada: 'elogio' },
  { texto: 'Excelente atendimento, o time foi ótimo comigo hoje.', categoriaEsperada: 'elogio' },
  { texto: 'Como faço para exportar meus dados em CSV?', categoriaEsperada: 'duvida' },
  { texto: 'Tenho uma dúvida sobre como funciona o plano anual, alguém pode explicar?', categoriaEsperada: 'duvida' },
  { texto: 'Estou muito insatisfeito com a demora no suporte, já faz uma semana sem resposta.', categoriaEsperada: 'reclamacao' },
  { texto: 'O preço subiu demais e ninguém avisou com antecedência, isso é inaceitável.', categoriaEsperada: 'reclamacao' },
];

const LIMIAR_ACEITAVEL = 0.7;

function main() {
  let acertos = 0;
  for (const caso of CASOS) {
    const resultado = classificarHeuristico(caso.texto);
    const acertou = resultado.categoria === caso.categoriaEsperada;
    if (acertou) acertos++;
    console.log(
      `${acertou ? 'OK ' : 'X  '} esperado=${caso.categoriaEsperada.padEnd(11)} obtido=${resultado.categoria.padEnd(11)} "${caso.texto}"`,
    );
  }

  const acuracia = acertos / CASOS.length;
  console.log(`\nAcurácia: ${(acuracia * 100).toFixed(0)}% (${acertos}/${CASOS.length}) — limiar de gate: ${LIMIAR_ACEITAVEL * 100}%`);

  if (acuracia < LIMIAR_ACEITAVEL) {
    console.error('FALHOU: acurácia do fallback heurístico abaixo do limiar aceitável.');
    process.exit(1);
  }
}

main();
