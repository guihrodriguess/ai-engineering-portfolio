# 05 — Aplicação de IA pronta para produção

Status: 🔲 planejado — ainda não iniciado (pendente investigação de código reaproveitável nos projetos Verity).

## Objetivo

Reunir, num único projeto, as preocupações que separam um protótipo de IA de uma aplicação de produção:

- **API** documentada (OpenAPI/Swagger)
- **Autenticação** real (sessão/JWT, não só uma chave hardcoded)
- **Banco de dados** com migrations
- **Testes** (unitários + integração, rodando em CI)
- **Docker** para rodar localmente igual a produção
- **Deploy em cloud** (Vercel) com preview deployments por PR
- **Tracing** das chamadas de IA (latência, tokens, custo por request)
- **Evals** automatizados rodando em CI antes de cada deploy
- **Controle de custo e latência**: budget por request/usuário, timeout, modelo fallback mais barato quando aplicável

## Stack planejada

Next.js + Vercel AI SDK + AI Gateway (observability nativo de custo/latência) + banco via Marketplace (Postgres/Neon) + testes com Vitest/Playwright + deploy Vercel com CI no GitHub Actions.
