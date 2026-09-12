# 03 — Pipeline de classificação com IA

Status: 🔲 planejado — ainda não iniciado (pendente investigação de código reaproveitável nos projetos Verity).

## Objetivo

Receber texto de entrada, gerar candidatos de classificação, aplicar reranking/classificação final, e acompanhar métricas de qualidade como um pipeline de produção acompanharia — não só "a IA disse que é categoria X".

## O que vai ter

- **Geração de candidatos**: classificação inicial (ex. via embeddings + k-NN, ou LLM com saída estruturada) gerando top-N categorias candidatas, não só a "melhor resposta".
- **Reranking/classificação final**: segunda passada (cross-encoder, LLM-as-judge, ou regra de negócio) que decide entre os candidatos.
- **Métricas acompanhadas**:
  - Top-1 accuracy e Top-k accuracy
  - Falsos positivos (por categoria)
  - Casos de baixa confiança (abaixo de threshold → fila de revisão humana, não classificação forçada)
- **Dashboard de métricas** simples mostrando a matriz de confusão e a distribuição de confiança.

## Stack planejada

Next.js + Vercel AI SDK (saída estruturada com `generateObject`) + AI Gateway. Dataset de avaliação versionado no repo.
