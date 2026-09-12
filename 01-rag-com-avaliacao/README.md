# 01 — Assistente RAG com avaliação

Assistente de perguntas e respostas sobre um contrato fictício de manutenção predial (facilities): retrieval por embedding, reranking com IA, threshold de similaridade, fallback honesto quando a base não sustenta a resposta, e um harness de avaliação com métricas de retrieval e de geração.

> Corpus e dataset 100% sintéticos (`lib/corpus/`, `lib/eval/dataset.ts`) — nenhum dado ou política de cliente real. A abordagem (chunking, threshold, fallback, evals) é inspirada num assistente RAG real já em produção (contratos via SharePoint/Teams), mas reconstruída do zero.

## Por que este projeto

"RAG" normalmente vira "busca vetorial + manda pro modelo" — funciona na demo, com a pergunta certa. O que costuma faltar:

- Por que confiar que o chunk mais parecido embedding-wise é, de fato, o mais relevante pra pergunta?
- O que o sistema faz quando a base simplesmente não tem a resposta — inventa, ou admite que não sabe?
- A estratégia de chunking foi escolhida por quê, e o que aconteceria com outra?
- Como saber se uma mudança no pipeline melhorou ou piorou o sistema, sem rodar sobre um conjunto fixo de perguntas conhecidas?

## Arquitetura

```
lib/corpus/documentos.ts      → 10 documentos sintéticos de um contrato de facilities
lib/chunking/chunk.ts         → 2 estratégias: tamanho fixo+overlap vs. por seção
lib/index/embeddingIndex.ts   → etapa 1: embedding + similaridade de cosseno (índice por estratégia)
lib/rag/rerank.ts             → etapa 2: IA rejulga a relevância real de cada chunk recuperado
lib/rag/pipeline.ts           → etapa 3 (threshold) + etapa 4 (geração com citação ou fallback)
lib/eval/dataset.ts           → 26 perguntas rotuladas (20 respondíveis + 6 fora de escopo)
lib/eval/metrics.ts           → recall@k, MRR, taxa de fallback correto/falso, citação correta
lib/eval/runEval.ts           → roda as 2 estratégias de chunking lado a lado
app/api/perguntar/route.ts    → pergunta 1 vez
app/api/eval/route.ts         → avaliação comparativa completa
app/page.tsx                  → demo interativo (mostra os scores de cada etapa)
app/eval/page.tsx             → dashboard comparando as 2 estratégias de chunking
```

### As 2 estratégias de chunking, e por que comparar

- **Tamanho fixo + overlap** (`chunkFixo`): corta em blocos de ~260 caracteres com 40 de sobreposição. Não sabe nada da estrutura do documento — pode separar uma regra do número que a acompanha.
- **Por seção** (`chunkPorSecao`): usa as marcações `## Seção` que o próprio corpus já tem como fronteira — nunca corta uma regra ao meio, mas gera chunks de tamanho desigual.

O dashboard de avaliação (`/eval`) roda o dataset inteiro contra as duas e mostra os números lado a lado — a resposta de "qual estratégia é melhor" não devia ser um palpite de quem escreveu o pipeline, deveria estar na tela.

### Threshold e os 2 níveis de fallback

1. **Fallback "duro"** (`pipeline.ts`): se nenhum chunk, depois do rerank, passa do limiar de similaridade (0.40), o pipeline nem chama o modelo de geração — economiza a chamada mais cara e evita alucinar em cima de contexto ruim.
2. **Fallback "suave"**: mesmo com contexto acima do limiar, o modelo de geração pode retornar `respondivel: false` se achar que o contexto, apesar de relevante, não contém a informação específica pedida — instruído explicitamente a preferir admitir isso a generalizar/inferir.

### Modo simulação

Toda etapa de IA (embedding, rerank, geração) tem uma versão determinística sem chamada de modelo — sobreposição de palavras em vez de embedding, ordem preservada em vez de rerank, eco do melhor chunk em vez de geração. Permite rodar a demo e a avaliação completa (26 perguntas × 2 estratégias) sem custo. Os números do modo simulação já mostram algo real: recall@3 de 90-95% mas taxa de falso-fallback de 15-20% — a heurística de palavra-chave acerta a maior parte, mas é mais insegura sobre quando admitir que não sabe, exatamente o tipo de coisa que essa avaliação deveria capturar.

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local e defina AI_GATEWAY_API_KEY (vercel.com → AI Gateway → API Keys)
npm run dev
```

Abra http://localhost:3000. Modo simulação vem ligado por padrão.

## Limitações conhecidas / próximos passos

- **Índice em memória**: como nos projetos 2 e 3, o índice vetorial é recalculado/cacheado em memória do processo — corpus real usaria um banco vetorial.
- **Sem avaliação de fidelidade da resposta**: as métricas de geração aqui são citação correta (a fonte bate) e taxa de fallback — não há um juiz de IA verificando se a resposta gerada é fiel ao texto da fonte, palavra por palavra. Seria o próximo passo natural (LLM-as-judge de faithfulness).
- **Corpus pequeno (10 documentos, 26 perguntas)**: suficiente pra validar a metodologia de avaliação e comparar estratégias de chunking, não pra conclusão estatística forte.
