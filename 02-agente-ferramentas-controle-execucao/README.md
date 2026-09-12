# 02 — Agente com ferramentas e controle de execução

Agente de suporte a e-commerce que demonstra o que separa um "chatbot com tool calling" de um **sistema de execução de ações com controle real**: retry com backoff, timeout por tentativa, idempotência (nunca repetir um efeito colateral), tracing detalhado e aprovação humana (Human-in-the-Loop) para ações sensíveis.

> Dados e "banco de dados" 100% sintéticos (`lib/data/pedidos.ts`) — nenhuma informação real de cliente.

## Por que este projeto

Tool calling básico (`generateText` com `tools`) já existe em qualquer tutorial. O que este projeto mostra é a camada que falta entre "o modelo decidiu chamar uma ferramenta" e "essa ação pode rodar em produção com segurança":

- O que acontece quando a ferramenta falha por um motivo transitório?
- O que acontece se o modelo chamar a mesma ferramenta duas vezes com o mesmo argumento — ela reembolsa duas vezes?
- Quem aprova uma ação que gasta dinheiro ou é irreversível, antes dela executar?
- Como alguém de fora (observabilidade) vê o que o agente fez, passo a passo?

## Arquitetura

```
app/api/chat/route.ts      → endpoint de chat (createAgentUIStreamResponse)
app/api/trace/[chatId]/    → consulta do trace de execução (polling da UI)
lib/agent.ts                → ToolLoopAgent: instruções, toolApproval, stopWhen, callbacks de trace
lib/tools.ts                 → definição das 4 ferramentas, cada execute() envolto por withControls
lib/engine/controls.ts      → retry + timeout + idempotência + tracing (genérico, não sabe de domínio)
lib/engine/idempotency.ts   → dedupe por (chatId, ferramenta, input) — arquivo local
lib/engine/traceStore.ts    → log de eventos de execução por conversa — arquivo local (JSONL)
lib/data/pedidos.ts          → "banco de dados" sintético em memória
app/page.tsx + components/  → chat (useChat) + painel de trace em tempo real
```

### Camada de controle (`lib/engine/controls.ts`)

`withControls(nomeDaFerramenta, handler, opções)` envolve qualquer `execute` de ferramenta e adiciona, sem a ferramenta precisar saber:

- **Idempotência**: calcula uma chave a partir de `(ferramenta, input)` e, se já houver resultado para essa chave nesta conversa, devolve o resultado cacheado em vez de reexecutar o efeito colateral.
- **Retry com backoff exponencial + jitter**: só para `TransientError` (falha que faz sentido tentar de novo) ou timeout — um erro de negócio (ex: "pedido não encontrado") nunca é tentado de novo.
- **Timeout por tentativa**: via `AbortController`; se a ferramenta não responder a tempo, a tentativa é abortada e contabilizada.
- **Tracing**: cada tentativa, sucesso, falha, timeout e dedupe é registrado com timestamp, visível ao vivo no painel da direita.

Além disso, `emitirReembolso` implementa uma segunda camada de idempotência **no nível de negócio** (`lib/tools.ts`): mesmo que os argumentos de duas chamadas sejam diferentes (ex: motivo diferente), um pedido já reembolsado nunca é reembolsado de novo — a invariante é sobre o `pedidoId`, não sobre os argumentos da chamada.

### Human-in-the-Loop (`lib/agent.ts`)

Usa o suporte nativo de aprovação do AI SDK (`toolApproval` no `ToolLoopAgent`):

- `cancelarPedido`: **sempre** exige aprovação (ação destrutiva).
- `emitirReembolso`: exige aprovação apenas quando o valor passa de R$150 — decisão tomada a partir do input já tipado da chamada.

Quando uma aprovação é necessária, o agente pausa a execução e devolve um `tool-approval-request` ao cliente; a UI mostra os botões Aprovar/Negar, e a resposta (`tool-approval-response`) é enviada de volta no próximo turno para o agente retomar de onde parou — sem servidor manter sessão em memória (ver "Trust model" nos docs do AI SDK sobre tool approvals).

### Tracing

Dois níveis, ambos no mesmo arquivo JSONL por conversa (`.data/trace/<chatId>.jsonl`):

1. **Genérico**, emitido por `withControls`: início/fim de cada tentativa, timeout, dedupe por idempotência.
2. **De orquestração**, emitido pelos callbacks do agente (`onStepStart`/`onStepEnd`/`onEnd`): passos do loop, quais ferramentas cada passo chamou, pedidos de aprovação.

A UI consulta `GET /api/trace/[chatId]` por polling e renderiza como uma timeline.

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local e defina AI_GATEWAY_API_KEY (vercel.com → AI Gateway → API Keys)
npm run dev
```

Abra http://localhost:3000.

## Roteiro de demonstração

| Mensagem | O que demonstra |
|---|---|
| "Qual o status do pedido PED-1002?" | `buscarPedido` falha na 1ª tentativa (erro transitório simulado) e se recupera na 2ª — ver retry no trace |
| "Tem estoque do SKU-SLOW?" | `verificarEstoque` excede o timeout por tentativa e tenta de novo — ver `TimeoutError` no trace |
| "Quero reembolso de R$80 no pedido PED-1001" | Abaixo do limite — executa direto, sem aprovação |
| "Quero reembolso de R$400 no pedido PED-1003" | Acima do limite — pede aprovação humana antes de executar |
| "Cancele o pedido PED-1004" | Ação destrutiva — sempre pede aprovação |
| Peça o mesmo reembolso de novo na mesma conversa | Mostra o dedupe por idempotência de negócio — não reembolsa duas vezes |

## Limitações conhecidas / próximos passos

- **Store local em arquivo**: `lib/engine/traceStore.ts` e `lib/engine/idempotency.ts` usam arquivos JSON locais — funcionam para demo em uma instância, mas não são seguros entre múltiplas instâncias (Vercel serverless). Em produção, troque por Redis/Postgres (Upstash, Neon via Marketplace).
- **Sem streaming no painel de trace**: a UI faz polling a cada ~900ms em vez de Server-Sent Events — suficiente para a demo, mas um próximo passo natural seria unificar num único stream.
- **Falhas simuladas são deterministas** (para a demo ser reproduzível), não aleatórias — fica documentado em `lib/tools.ts`.
