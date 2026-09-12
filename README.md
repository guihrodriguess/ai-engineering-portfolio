# Portfólio de AI Engineering

> "Se você quer trabalhar com IA de verdade, não monte um portfólio cheio de chatbots parecidos. Monte sistemas que mostrem que você sabe levar IA além da demo."

Cinco sistemas, cada um demonstrando uma dimensão diferente de colocar IA em produção — não só "chamar uma LLM e mostrar a resposta". Cada projeto é uma aplicação standalone (Next.js + [Vercel AI SDK](https://ai-sdk.dev) + [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)), com testes reais, decisões documentadas e limitações honestas — não escondidas.

Todo domínio e dado é **100% sintético**: nenhum projeto aqui usa dado ou segredo de cliente real, mesmo quando a arquitetura é inspirada em sistemas reais que já construí (ver notas em cada projeto).

## Os 5 projetos

### 1 · [RAG com avaliação](./01-rag-com-avaliacao)
Assistente de perguntas e respostas sobre um contrato de facilities sintético. Retrieval por embedding → rerank com IA → corte por limiar de similaridade → geração com citação obrigatória — com **fallback honesto** quando a base não sustenta a resposta, em vez de alucinar. Duas estratégias de chunking comparadas lado a lado no próprio dashboard de avaliação (recall@k, MRR, taxa de fallback).

### 2 · [Agente com ferramentas e controle de execução](./02-agente-ferramentas-controle-execucao) — [demo ao vivo ↗](https://ai-agente-controle-execucao.vercel.app)
Agente de suporte com a camada que separa "tool calling de tutorial" de "ação que pode rodar em produção": retry com backoff exponencial, timeout por tentativa, idempotência (nunca repete um efeito colateral), tracing detalhado e aprovação humana obrigatória (Human-in-the-Loop) pra ações sensíveis — reembolso acima de um teto, cancelamento de pedido.

### 3 · [Pipeline de classificação com IA](./03-pipeline-classificacao) — [demo ao vivo ↗](https://ai-pipeline-classificacao.vercel.app)
Classificador de despesas corporativas: candidatos por similaridade de embedding → reranking com IA sobre o shortlist → regras de negócio determinísticas → veredicto. Dataset de avaliação com casos ambíguos **de propósito** (um dataset onde tudo é óbvio não mede nada) — métricas de top-1/top-k accuracy, falsos positivos e taxa de baixa confiança. A demo ao vivo já roda em modo simulação por padrão — funciona sem nenhuma chamada de IA real.

### 4 · [Sistema assíncrono com IA](./04-sistema-assincrono)
Processamento assíncrono com fila persistida e **worker como processo separado de verdade** (não uma API route fingindo ser assíncrona) — extração e resumo por IA em duas etapas, com retry persistido entre execuções do worker, timeout, dead-letter e reclaim automático de job travado se o worker cair no meio do processamento.

### 5 · [Aplicação de IA pronta para produção](./05-app-producao)
Central de feedback multi-tenant com isolamento imposto por **Row-Level Security real no Postgres** (não um `WHERE` que uma query futura pode esquecer), autenticação própria, testes de integração contra banco real — incluindo um teste que prova o isolamento entre organizações mesmo via SQL raw — Docker Compose completo e CI no GitHub Actions.

## Testado de verdade, não só "parece funcionar"

Cada projeto foi validado com `tsc --noEmit`, `eslint` e `next build` limpos, mais smoke tests reais contra o app rodando — não só a leitura do código. Isso importa porque **encontrei bugs reais** nesse processo, documentados nos READMEs de cada projeto em vez de escondidos:

- Projeto 4: o gatilho de timeout simulado não lançava `TimeoutError` de verdade — só esperava e sucedia.
- Projeto 5: `current_setting()` do Postgres devolve string vazia (não `NULL`) pra uma sessão que nunca setou a variável de tenant, o que quebrava o isolamento "fail-closed" até eu testar esse caminho especificamente; e a detecção de e-mail duplicado não pegava o erro certo porque o driver embrulha o código do Postgres dentro de `.cause`.

## Rodando localmente

Os projetos 1, 2 e 3 sobem com um comando:

```bash
cd 0X-nome-do-projeto
npm install
npm run dev
```

Os projetos 1 e 3 têm **modo simulação** ligado por padrão — dá pra usar sem nenhuma chave de API. O projeto 2 sempre chama IA de verdade (é o ponto dele: controle de execução real). O projeto 4 precisa de dois terminais (`npm run dev` + `npm run worker`); o projeto 5 precisa de Docker (`docker compose up -d db && npm run db:migrate && npm run dev`, ou `docker compose up --build` pra stack inteira). Detalhes de cada um no README da respectiva pasta.

## Stack comum

| | |
|---|---|
| Linguagem | TypeScript |
| Framework | Next.js (App Router) |
| IA | [Vercel AI SDK](https://ai-sdk.dev) + [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) — modelos via string `provider/model` |
| Banco (projeto 5) | Postgres + Drizzle ORM |
| Deploy | Vercel |

Cada projeto documenta no próprio README qualquer dependência adicional.

## Nota sobre o projeto 1

Já existe um assistente RAG real em produção (chatbot de contratos via Microsoft Teams, com ingestão do SharePoint, sanitização de PII e reranking) que construí antes deste portfólio. Por conter dados e segredos de um cliente real, ele não podia ser publicado como está — o projeto 1 aqui reconstrói a mesma arquitetura e as mesmas decisões técnicas (chunking, reranking, threshold, fallback, evals) do zero, com dados sintéticos, pra poder ser mostrado e rodado por qualquer pessoa.

## Licença

[MIT](./LICENSE) — use, copie, adapte o que for útil.
