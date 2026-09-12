# 01 — Assistente RAG com avaliação

Status: 🔲 planejado — ainda não iniciado.

## Objetivo

Mostrar que um RAG não é só "buscar documento + perguntar pra LLM". Este projeto reconstrói, com dados sintéticos, a arquitetura de um assistente RAG real já em produção (contratos via SharePoint + Microsoft Teams), incluindo as partes que normalmente ficam de fora de demos:

- **Chunking** com estratégia documentada (tamanho, overlap, separadores por tipo de documento) e comparação entre estratégias.
- **Embeddings** com modelo explicitado e custo por 1k tokens calculado.
- **Reranking** (cross-encoder ou LLM-as-reranker) sobre os top-k resultados da busca vetorial.
- **Similarity threshold** — corte de confiança abaixo do qual o sistema não responde.
- **Fallback** — resposta explícita de "não sei" / escalonamento quando não há contexto suficiente, em vez de alucinar.
- **Conjunto de evals**: dataset de perguntas-resposta com contexto esperado, métricas de retrieval (recall@k, MRR) e de geração (faithfulness, relevância), rodando em CI.

## Dados

Conjunto sintético de "contratos" fictícios (gerados, sem PII real), para poder publicar o repositório e rodar a demo sem qualquer dado de cliente.

## Stack planejada

Next.js + Vercel AI SDK + AI Gateway, banco vetorial (a decidir: pgvector via Marketplace ou alternativa local), harness de evals próprio ou `evalite`/`promptfoo`.
