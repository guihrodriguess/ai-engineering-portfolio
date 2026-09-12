# 03 — Pipeline de classificação com IA

Classificador de despesas corporativas: recebe uma descrição em texto livre, gera candidatos de categoria por similaridade semântica, faz reranking com IA sobre o shortlist, aplica regras de negócio determinísticas e devolve um veredicto — acompanhado de métricas de avaliação (top-1, top-k, falsos positivos, taxa de baixa confiança) sobre um dataset sintético rotulado.

> Domínio e dataset 100% sintéticos (`lib/domain/`) — nenhuma política ou dado real de cliente. Inspirado, na abordagem (extração/classificação + regra de negócio + confiança → revisão humana), num pipeline real de auditoria de notas fiscais que ajudei a construir, mas reconstruído do zero com dados fictícios.

## Por que este projeto

"Classificação com IA" normalmente vira um `generateObject` perguntando pro modelo "qual categoria é essa?" e pronto. O que falta pra isso virar um pipeline de verdade:

- Por que confiar cegamente na primeira resposta do modelo, sem nem saber quão confiante ele estava?
- O que acontece quando a categoria certa nem aparece entre as opções mais prováveis?
- Quem decide o que fazer com uma classificação de baixa confiança — aprovar do mesmo jeito?
- Como saber se o pipeline está piorando com uma mudança de prompt, sem rodar sobre um conjunto fixo de casos conhecidos?

## Arquitetura

```
lib/domain/categorias.ts     → categorias, limites de valor, proibições, exemplares (índice)
lib/domain/dataset.ts        → dataset sintético rotulado (40 itens, com casos ambíguos de propósito)
lib/pipeline/candidates.ts   → etapa 1: embedding + similaridade de cosseno → top-k candidatos
lib/pipeline/rerank.ts       → etapa 2: IA decide entre o shortlist + calibra confiança
lib/pipeline/rules.ts        → etapa 3: regras determinísticas (proibição, teto de valor) → veredicto
lib/pipeline/pipeline.ts     → orquestra as 3 etapas + override por baixa confiança
lib/eval/metrics.ts          → top-1/top-k accuracy, matriz de confusão, falsos positivos
lib/eval/runEval.ts          → roda o pipeline sobre o dataset inteiro (concorrência limitada)
app/api/classificar/route.ts → classifica 1 item
app/api/eval/route.ts        → roda a avaliação completa
app/page.tsx                 → demo interativo
app/eval/page.tsx            → dashboard de avaliação
```

### Por que embedding + rerank, e não um único `generateObject` com 8 categorias

Pedir pro modelo escolher direto entre 8 categorias (ou 800, num caso real) funciona, mas não é o que pipelines de classificação em produção fazem quando o espaço de categorias cresce: separa-se **geração de candidatos** (barata, roda sobre todo o espaço de categorias) de **reranking** (mais cara por item, mas só sobre o shortlist). Aqui:

1. **Candidatos** (`candidates.ts`): o texto de entrada e um índice de frases-exemplo por categoria são embedados; similaridade de cosseno reduz 8 categorias a 3 candidatas.
2. **Rerank** (`rerank.ts`): um modelo de linguagem (Haiku — deliberadamente mais barato, decide só entre 3 opções) escolhe a melhor entre as candidatas e calibra uma confiança de 0 a 1, com instrução explícita pra não inflar ("0.5 é 'não tenho certeza', não 'meio errado'").
3. **Regras** (`rules.ts`): a categoria escolhida vira um veredicto (APROVADO/REPROVADO/ATENÇÃO) por regras determinísticas de valor e proibição — a régua de política não deveria mudar toda vez que o modelo de IA muda.

Confiança abaixo de 0.55 força ATENÇÃO mesmo que a regra de valor aprovasse (`pipeline.ts`) — a classificação nunca aprova algo que ela mesma não tem certeza do que é.

### Modo simulação

Toda etapa de IA tem uma versão determinística sem chamada de modelo (`gerarCandidatosSimulado`, `rerankSimulado`) — heurística de contagem de palavra-chave, deliberadamente mais fraca. Serve pra rodar a demo e a avaliação inteira sem custo, e também pra ver a diferença de qualidade entre "heurística ingênua" e "embedding + rerank" nas próprias métricas.

## Avaliação (`/eval`)

Roda o pipeline sobre um dataset de 40 descrições rotuladas, com casos de propósito ambíguos (ex: "jantar com o cliente onde foi pedida uma cerveja" — é alimentação ou bebida alcoólica proibida? o rótulo correto trata o item citado, não a ocasião, como o fato relevante). Um dataset onde tudo é óbvio não mede nada — os casos ambíguos são exatamente os que devem aparecer como falso positivo ou baixa confiança nas métricas, e isso é esperado, não um bug.

Métricas calculadas: **top-1 accuracy**, **top-k accuracy** (a categoria correta apareceu entre os candidatos, mesmo que não tenha vencido o rerank), **falsos positivos por categoria prevista**, **taxa de baixa confiança** (proporção mandada pra revisão humana).

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local e defina AI_GATEWAY_API_KEY (vercel.com → AI Gateway → API Keys)
npm run dev
```

Abra http://localhost:3000. Modo simulação vem ligado por padrão (sem custo); desligue o checkbox pra rodar com IA de verdade.

## Limitações conhecidas / próximos passos

- **Índice de embeddings em memória**: `candidates.ts` recalcula/cacheia os embeddings dos exemplares por processo. Funciona bem pro tamanho do índice aqui (poucas dezenas de frases); um espaço de categorias muito maior precisaria de um banco vetorial de verdade.
- **Dataset pequeno (40 itens)**: suficiente pra demonstrar a metodologia de avaliação, não pra tirar conclusão estatística forte sobre a qualidade do classificador.
- **Reranking com 1 chamada, sem self-consistency**: um pipeline de produção rodaria o rerank mais de uma vez em casos de confiança limítrofe (perto do limiar de 0.55) e usaria a divergência entre chamadas como sinal adicional de incerteza.
