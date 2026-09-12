# 04 — Sistema assíncrono com IA

Processamento assíncrono de "chamados" em texto livre: uma fila persistida, um **worker como processo separado** (não uma API route fingindo ser assíncrona), extração + resumo por IA em duas etapas, com retry/backoff, timeout, dead-letter e reclaim automático de job travado.

> Domínio sintético (chamados de manutenção fictícios). Inspirado, na arquitetura (fila em banco + worker externo fazendo polling + status multi-etapa), num sistema real de auditoria de notas fiscais que ajudei a construir, mas reconstruído do zero.

## Por que este projeto

Um endpoint que chama a IA e responde já é "assíncrono" no sentido de `async/await` — mas não é um **sistema** assíncrono. O que costuma faltar:

- O que acontece se o worker cair no meio do processamento de um job — ele fica preso pra sempre?
- Uma falha de rede na chamada de IA devia consumir uma retentativa igual a um erro de validação que nunca vai funcionar de novo?
- Como alguém de fora enxerga o que está acontecendo com um job específico, passo a passo, sem abrir um debugger?
- O sistema volta a funcionar sozinho depois de uma falha transitória, ou alguém precisa reprocessar manualmente?

## Arquitetura

```
lib/types.ts             → Job, JobEvent, JobStatus compartilhados
lib/fila/store.ts        → persistência (1 arquivo por job + log de eventos append-only)
lib/fila/queue.ts        → enfileirar, pegarProximoJob (com reclaim), retry com backoff, dead-letter
lib/worker/steps.ts      → etapas de IA (extração, resumo) + gatilhos de falha determinísticos
lib/worker/runJob.ts     → processa 1 job por 1 tentativa, emite eventos de cada etapa
worker.ts                → processo standalone: loop de polling (roda separado do servidor Next)
app/api/jobs/route.ts    → enfileirar (POST) / listar (GET)
app/api/jobs/[id]/route.ts → status + trace de 1 job
app/page.tsx             → formulário de envio + fila ao vivo
app/jobs/[id]/page.tsx   → detalhe do job com timeline de eventos
```

### O worker é um processo de verdade, separado

`worker.ts` não roda dentro de uma API route — é um script standalone (`npm run worker`) que faz polling na fila a cada 1.5s, exatamente como o worker de produção que inspirou este projeto ("roda fora deste repo, faz polling, atualiza a linha"). Rodar a demo localmente exige **dois terminais**: `npm run dev` (servidor) e `npm run worker` (processamento) — de propósito, pra deixar visível que são dois processos com ciclos de vida independentes, não uma simulação de assincronia dentro do mesmo request.

### Retry, timeout e a diferença entre erro transitório e erro fatal

`lib/worker/steps.ts` só marca um erro como retentável se for `TransientError` ou `TimeoutError`; qualquer outro tipo de erro (`registrarFalha(..., { fatal: true })` em `runJob.ts`) vai direto pro dead-letter, sem gastar as tentativas restantes — não adianta tentar de novo um erro que não é transitório. `TimeoutError` é lançado via corrida contra um timer (`AbortController`-like race, ver `comTimeout`) quando uma etapa não responde a tempo.

O retry aqui é **persistido entre execuções do worker** (o estado de tentativa vive no arquivo do job, não em memória de uma função): se o worker cair entre a tentativa 1 e a 2, a próxima execução do worker retoma de onde parou. É uma diferença real em relação ao retry do projeto 2 (que é dentro de uma única chamada síncrona) — aqui o retry sobrevive a reinício de processo.

### Reclaim de job travado

Se um worker morre no meio do processamento (`extraindo`/`resumindo`), o job fica com esse status e um `processandoDesde`. Qualquer worker (o mesmo depois de reiniciar, ou outro) que faça polling e veja esse job preso há mais que `LEASE_MS` (20s) o reclama e reprocessa — sem isso, o job ficaria "processando" pra sempre.

**Limitação conhecida, documentada e não escondida**: pegar-e-marcar não é uma operação atômica de banco de verdade aqui (é leitura+escrita de arquivo local) — rodar 2 workers ao mesmo tempo tem uma janela de corrida real onde os dois podem pegar o mesmo job. Um banco de produção (Postgres com `SELECT ... FOR UPDATE SKIP LOCKED`, ou Redis/BullMQ) resolve isso com uma claim atômica. A fila em arquivo aqui é sobre demonstrar a lógica de estado (retry, backoff, dead-letter, reclaim), não sobre reimplementar um banco.

### Gatilhos de falha determinísticos

Mesmo racional do projeto 2 (SKU-SLOW, falha na 1ª tentativa): a demo precisa ser reproduzível.

| Marcador no texto | Efeito |
|---|---|
| `[FALHA_TRANSITORIA]` | Falha nas 2 primeiras tentativas, sucede na 3ª — mostra retry com backoff |
| `[FALHA_PERMANENTE]` | Falha em todas as tentativas — mostra o job indo pro dead-letter |
| `[TIMEOUT]` | Etapa de extração sempre excede o timeout — mostra `TimeoutError` + eventual dead-letter |

### Modo simulação

Como nos projetos 1-3, as etapas de IA têm versão determinística sem chamada de modelo — os gatilhos de falha acima continuam funcionando igual, só a extração/resumo em si viram heurística de texto em vez de `generateObject`.

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local e defina AI_GATEWAY_API_KEY (vercel.com → AI Gateway → API Keys)

# terminal 1
npm run dev

# terminal 2
npm run worker
```

Abra http://localhost:3000, envie um chamado (ou use um dos exemplos com gatilho de falha) e acompanhe o status mudar ao vivo.

## Limitações conhecidas / próximos passos

- **Fila em arquivo local, sem claim atômica** — ver acima. Produção trocaria por Postgres/Redis (ex: Vercel Marketplace) e a claim viraria uma query atômica de verdade.
- **1 worker por vez, sem paralelismo real testado**: o design permite múltiplos workers (cada um roda seu próprio loop de polling), mas a janela de corrida do reclaim descrita acima é mais provável de aparecer com 2+ workers simultâneos — não testado a fundo aqui.
- **Sem observabilidade agregada entre reinícios**: cada job tem seu trace completo, mas não há um dashboard de métricas globais (taxa de falha, tempo médio de fila) — daria pra agregar a partir dos arquivos de job existentes.
