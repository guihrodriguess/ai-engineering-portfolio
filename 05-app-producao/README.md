# 05 — Aplicação de IA pronta para produção

Status: 🔲 planejado — ainda não iniciado (pendente investigação de código reaproveitável na Verity AI, que já tem auth, multi-tenant/RLS, 551 testes e Docker em produção real).

## Objetivo

Mostrar os elementos que separam um protótipo de IA de um produto: não é sobre ter uma feature nova, é sobre ter a base que sustenta qualquer feature de IA em produção.

## O que vai ter

- **API** com contratos bem definidos (REST ou tRPC) e validação de entrada/saída.
- **Autenticação** real (sessão ou JWT), não só uma chave de API fixa.
- **Banco de dados** (Postgres via Marketplace) com migrations versionadas.
- **Testes** cobrindo as partes críticas: autorização, o "core" de IA (saída validada por schema), casos de borda (entrada vazia, timeout, erro de provedor).
- **Docker** para rodar localmente igual a produção.
- **Deploy** na Vercel, com ambientes separados (preview/produção).
- **Tracing** das chamadas de IA (latência, tokens, custo por request) — via Vercel AI Gateway observability.
- **Evals** rodando em CI antes de cada deploy, não só testes unitários de código.
- **Controle de custo/latência**: limite de tokens, timeout configurável, cache de respostas quando aplicável.

## Stack planejada

Next.js + Vercel AI SDK + AI Gateway + Postgres (Marketplace) + Vitest/Playwright + Docker + deploy na Vercel.
