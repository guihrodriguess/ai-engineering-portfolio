# 04 — Sistema assíncrono com IA

Status: 🔲 planejado — ainda não iniciado (pendente investigação de código reaproveitável nos projetos Verity, ex. automações RPA via Playwright do verity-ops).

## Objetivo

Mostrar IA integrada a um sistema orientado a eventos/filas, não a uma chamada síncrona request/response. Cenário candidato: processamento assíncrono de documentos (upload → fila → worker extrai/classifica com IA → evento de conclusão → notificação), mas pode virar análise de eventos em tempo real dependendo do que for reaproveitado do verity-ops.

## O que vai ter

- **Fila** (Vercel Queues, ou alternativa) recebendo jobs de processamento.
- **Workers** consumindo a fila, chamando IA, com **retry** e **dead-letter** para falhas persistentes.
- **Eventos** de progresso (enfileirado → processando → concluído/falhou) visíveis numa UI em tempo real (SSE ou polling).
- **Observabilidade**: log estruturado por job, métricas de fila (tamanho, tempo de espera, taxa de falha), tracing do que a IA fez em cada job.
- **Tratamento de falhas**: timeout de worker, falha de IA (rate limit, erro de schema), reprocessamento controlado (sem duplicar efeitos colaterais).

## Stack planejada

Next.js + Vercel Queues/Workflow + Vercel AI SDK + AI Gateway.
