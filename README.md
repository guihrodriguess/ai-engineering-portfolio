# Portfólio de AI Engineering

> "Se você quer trabalhar com IA de verdade, não monte um portfólio cheio de chatbots parecidos. Monte sistemas que mostrem que você sabe levar IA além da demo."

Este portfólio é organizado em torno de 5 sistemas que demonstram, cada um, uma dimensão diferente de levar IA para produção — não apenas "chamar uma LLM e mostrar a resposta".

Cada projeto é uma aplicação standalone (Next.js + Vercel AI SDK + Vercel AI Gateway), com seu próprio README detalhando arquitetura, decisões e trade-offs.

## Projetos

| # | Projeto | Foco | Status |
|---|---------|------|--------|
| 1 | [RAG com avaliação](./01-rag-com-avaliacao) | Chunking, embeddings, reranking, similarity threshold, fallback, evals de qualidade | 🔲 Planejado (baseado em caso real, ver nota abaixo) |
| 2 | [Agente com ferramentas e controle de execução](./02-agente-ferramentas-controle-execucao) | Tool calling, estado, retry/timeout, idempotência, tracing, Human-in-the-Loop | ✅ v1 funcional |
| 3 | [Pipeline de classificação com IA](./03-pipeline-classificacao) | Geração de candidatos, reranking, métricas top-1/top-k, falsos positivos, baixa confiança | 🔲 Planejado |
| 4 | [Sistema assíncrono com IA](./04-sistema-assincrono) | Filas, eventos, workers, observabilidade, tratamento de falhas | 🔲 Planejado |
| 5 | [Aplicação de IA pronta para produção](./05-app-producao) | API, auth, banco, testes, Docker, deploy, tracing, evals, custo/latência | 🔲 Planejado |

## Nota sobre o Projeto 1

Já existe um assistente RAG real em produção (chatbot de contratos via Microsoft Teams, com ingestão do SharePoint, sanitização de PII e reranking). Por conter dados e segredos de um cliente real, ele não pode ser publicado como está — o projeto 1 deste portfólio será uma versão de **case study**: mesma arquitetura e decisões técnicas (chunking, reranking, threshold, fallback, evals), reconstruída com dados sintéticos/públicos para poder ser mostrada e rodada por qualquer pessoa.

## Stack comum

- **Linguagem:** TypeScript
- **Framework:** Next.js (App Router)
- **IA:** [Vercel AI SDK](https://ai-sdk.dev) + [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (modelos via string `provider/model`, ex. `anthropic/claude-sonnet-4-5`)
- **Deploy:** Vercel

Cada projeto documenta no próprio README qualquer dependência adicional (banco, fila, etc.).
