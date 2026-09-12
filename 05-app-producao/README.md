# 05 — Aplicação de IA pronta para produção

Central de feedback multi-tenant: cada organização só enxerga os próprios dados — isolamento imposto pelo **Postgres via Row-Level Security de verdade**, não por um `WHERE organizacaoId = ...` espalhado pelo código. Autenticação própria (hash de senha, sessão via cookie httpOnly), classificação de feedback por IA com fallback e cota diária, tracing de custo/latência, testes de integração contra banco real, Docker e CI.

> Inspirado na arquitetura de auth + multi-tenant + RLS de um SaaS real (Verity AI) que investiguei antes de construir este portfólio, mas reconstruído do zero, em TypeScript/Next.js (a stack do resto do portfólio, não Python/FastAPI do original), com domínio e dados 100% sintéticos.

## Por que este projeto

Os projetos 1-4 deste portfólio mostram técnica de IA (RAG, agente, classificação, fila). Este mostra a parte que normalmente falta pra alguém confiar o próprio dado num produto: contrato de API validado, autenticação de verdade, isolamento entre clientes que resiste a um bug de código (não só à boa intenção de quem escreveu a query), testes que rodam contra banco real, e visibilidade de quanto a IA está custando.

## Decisão de arquitetura: Postgres local via Docker, não Vercel Marketplace

O caminho "padrão" pra banco/auth num app Next.js na Vercel seria Neon + Clerk via Marketplace. Optei por **Postgres real via Docker Compose** (não um mock — é Postgres de verdade, com RLS de verdade) e **autenticação própria** (hash + sessão), por uma razão específica de portfólio: quem for rodar este projeto (um recrutador, por exemplo) não deveria precisar da minha conta Vercel/Clerk pra isso. `docker compose up` é auto-suficiente. O caminho de produção real (Neon + Clerk/Marketplace) está documentado abaixo, não escondido — só não é o padrão desta demo.

## Arquitetura

```
db/schema/*.ts                    → tabelas + policies de RLS (Drizzle)
db/sql/01-role-app-user.sql       → cria a role app_user (sem BYPASSRLS) — roda no init do container Postgres
db/sql/02-funcoes-auth.sql        → funções SECURITY DEFINER pro login (ver abaixo)
db/migrations/                    → migrations geradas (drizzle-kit generate)
scripts/migrate.ts                → aplica migrations + funções, contra DATABASE_URL_ADMIN
lib/http/comContextoOrg.ts        → toda query tenant-scoped passa por aqui (SET LOCAL app.org_id)
lib/auth/                         → hash de senha (scrypt), sessão (token opaco + hash), registro/login
lib/ai/classificar.ts             → classificação com IA, timeout, fallback heurístico
lib/ai/tracing.ts + cota.ts       → log de toda chamada de IA + cota diária por organização
app/api/**                        → rotas com validação Zod
app/**/page.tsx                   → UI (server components lendo direto do banco via RLS)
tests/                            → integração contra Postgres real, incluindo o teste de isolamento
```

CI em `.github/workflows/ci-05-app-producao.yml` na raiz do monorepo (não dentro desta pasta — GitHub Actions só reconhece workflows na raiz do repositório): lint, build (que já inclui type-check), sobe um Postgres de serviço, testes, evals.

### Isolamento multi-tenant via Row-Level Security real

Cada tabela com dado de tenant (`usuarios`, `sessoes`, `feedbacks`, `chamadas_ia`) tem RLS habilitado e uma policy `USING (organizacao_id = current_setting('app.org_id'))`. A role de runtime da aplicação, `app_user` (criada em `db/sql/01-role-app-user.sql`), **não é dona das tabelas e não tem BYPASSRLS** — sem essa ausência de privilégio, a policy seria só decoração (o dono de uma tabela ignora RLS por padrão no Postgres). `lib/http/comContextoOrg.ts` seta `app.org_id` via `SET LOCAL` dentro de uma transação a cada operação — `SET LOCAL`, não `SET`, porque a conexão física é devolvida a um pool e reusada por outra requisição depois; sem o escopo de transação, o org_id de uma requisição vazaria pra próxima que pegasse a mesma conexão.

Gotcha real que apareceu durante os testes (ver "Bugs encontrados" abaixo): `current_setting('app.org_id', true)` devolve **string vazia**, não `NULL`, pra uma sessão que nunca setou essa variável — depois que qualquer sessão já usou esse GUC customizado no processo do Postgres. A policy usa `nullif(current_setting(...), '')::uuid` por causa disso; sem o `nullif`, uma conexão sem org_id setado gera erro de cast em vez de simplesmente não devolver linha nenhuma.

### O problema do ovo-e-a-galinha no login (e a solução: SECURITY DEFINER estreito)

Login e validação de sessão precisam achar uma linha **antes** de saber a qual organização ela pertence — exatamente o dado que a RLS de `usuarios`/`sessoes` exige pra liberar leitura. `db/sql/02-funcoes-auth.sql` resolve isso com duas funções `SECURITY DEFINER` (rodam com o privilégio de quem *criou* a função — o superusuário das migrations, que ignora RLS — não de quem *chama*), cada uma devolvendo só as colunas estritamente necessárias pra autenticar, com `search_path` fixo (evita o ataque clássico de search_path em funções SECURITY DEFINER). Mesmo padrão usado pelo próprio schema de auth do Supabase.

### Autenticação própria

- **Senha**: `scrypt` do `node:crypto` (nativo — sem dependência de binário compilado tipo bcrypt), comparação em tempo constante (`timingSafeEqual`).
- **Login**: mesma mensagem de erro pra "e-mail não existe" e "senha errada" (evita enumeração de conta), e o scrypt roda mesmo quando o e-mail não existe (contra um hash fantasma) — sem isso, a resposta de e-mail inexistente volta mais rápido, e dá pra enumerar contas por tempo de resposta. Ambos os detalhes só apareceram porque testei explicitamente por esse ângulo, não vieram de graça.
- **Sessão**: token aleatório de 256 bits; só o **hash SHA-256** do token fica no banco (um vazamento do banco não permite forjar sessão). Cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção.

### IA: classificação com fallback e cota

`lib/ai/classificar.ts` classifica o feedback (categoria/sentimento/prioridade) com timeout de 6s; se falhar ou expirar, cai num classificador heurístico determinístico — a aplicação nunca fica sem resposta só porque o provedor de IA teve problema, e isso fica marcado (`fallback: true`) no dado salvo e no trace, não escondido atrás de uma resposta que parece normal. `lib/ai/cota.ts` aplica uma cota diária simples (50 chamadas/organização) contando linhas de `chamadas_ia` — controle de custo básico: sem isso, um retry-loop no frontend de um cliente pode gerar custo de IA sem limite.

### Observabilidade (`/observabilidade`)

Todo resultado de `classificarFeedback` (sucesso, fallback ou erro) vira uma linha em `chamadas_ia`: modelo, latência, custo estimado, se foi fallback. O dashboard agrega taxa de sucesso/fallback, latência média, custo total e o consumo da cota diária — visibilidade de produção, não só "funcionou ou não".

## Testes

Testes de integração contra **Postgres real** (não mock de ORM — um mock nunca pegaria uma policy de RLS escrita errado):

- `tests/senha.test.ts`, `tests/classificarHeuristico.test.ts` — unitários, funções puras.
- `tests/conta.test.ts` — registro, e-mail duplicado sem organização órfã (transação atômica), login.
- `tests/cota.test.ts` — contagem de cota isolada por organização.
- **`tests/rls.test.ts`** — o teste mais importante: prova que uma organização não enxerga o dado da outra mesmo numa query sem `WHERE` nenhum, mesmo via SQL raw na mesma conexão, e que sem nenhum `org_id` setado a policy nega tudo (fail-closed).

```bash
docker compose up -d db
cp .env.example .env.local   # ajuste se necessário
npm run db:migrate
npm test
```

## Rodando localmente

```bash
docker compose up -d db
cp .env.example .env.local
npm run db:migrate
npm install
npm run dev
```

Ou a stack inteira em containers (banco + migrations + app), igual produção:

```bash
docker compose up --build
```

## CI (`.github/workflows/ci-05-app-producao.yml` na raiz do monorepo)

Lint → build de produção (o `next build` já faz o type-check — um `tsc --noEmit` isolado falha aqui, porque tipos como `LayoutProps` só existem depois que o Next gera `.next/types`) → sobe um Postgres de serviço → cria a role `app_user` → aplica migrations → **roda os testes de integração (incluindo RLS) contra esse Postgres** → roda os evals do classificador (gate de qualidade mínima, sem custo de IA — usa o fallback heurístico). Falha em qualquer etapa bloqueia o merge.

## Bugs reais encontrados rodando os testes (não simulados)

Documentado por transparência — é exatamente o que os testes deveriam pegar:

1. **RLS "fail-closed" quebrado**: `current_setting('app.org_id', true)` devolvia `''` (não `NULL`) pra sessão sem org_id setado, e o cast `::uuid` de string vazia lançava erro em vez de simplesmente não devolver linha. Corrigido com `nullif(..., '')`.
2. **Duplicidade de e-mail não virava o erro certo**: `db.transaction` embrulha o erro do driver Postgres num `DrizzleQueryError`, com o `code` de erro (`23505` = unique violation) dentro de `.cause`, não na raiz — a checagem original só olhava a raiz.
3. **CI falhava num type-check que passava local**: `npx tsc --noEmit` isolado, como primeiro passo do workflow, falhava com "Cannot find name 'LayoutProps'" — esse tipo só existe depois que `next build`/`next dev` geram `.next/types/`. Localmente eu já tinha rodado `npm run build` em cada pasta antes de validar, então nunca vi o problema; um checkout limpo (exatamente o que o CI faz) expõe. Corrigido substituindo o passo isolado pelo `next build` (que já type-checa internamente, na ordem certa).

## Limitações conhecidas / próximos passos

- **Vulnerabilidade moderada em dependência de dev do `drizzle-kit`** (`esbuild` do servidor de dev, via `@esbuild-kit/*` — [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)): dev-only, não roda em produção nem é servido publicamente; sem correção não-breaking disponível no momento. A vulnerabilidade de alta severidade real (SQL injection no `drizzle-orm` — [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9)) foi corrigida atualizando pra `drizzle-orm@0.45.2+`.
- **Não deployado numa Vercel real**: o caminho de deploy (Neon + Clerk via Marketplace, ou Docker numa VPS) está documentado, não executado — decisão consciente pra não atrelar o portfólio à minha conta pessoal (ver "Decisão de arquitetura" acima).
- **Cota diária simples**: conta linhas de `chamadas_ia`, sem reset programado nem alerta — funcional pra demonstrar o conceito, não pronta pra faturamento real.
- **Evals de CI usam o fallback heurístico, não o modelo de IA**: decisão de custo (CI não deveria depender de uma chave paga pra rodar em todo PR). Avaliação de qualidade do modelo de IA em si é o assunto do projeto 3 deste portfólio.
