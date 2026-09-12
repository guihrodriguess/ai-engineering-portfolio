import { CORPUS, type Documento } from '../corpus/documentos';

export interface Chunk {
  chunkId: string;
  docId: string;
  docTitulo: string;
  texto: string;
}

export type EstrategiaChunking = 'fixo' | 'secao';

/**
 * Estratégia A — tamanho fixo com overlap. A mais comum em tutoriais: corta
 * o texto em blocos de `tamanho` caracteres, com `overlap` caracteres
 * repetidos entre blocos vizinhos pra não perder contexto na fronteira. Não
 * sabe nada sobre a estrutura do documento — pode cortar no meio de uma
 * frase ou separar uma regra do número que a acompanha.
 */
function chunkFixo(doc: Documento, tamanho = 260, overlap = 40): Chunk[] {
  const texto = doc.texto.replace(/^## .*$/gm, '').replace(/\n{2,}/g, ' ').trim();
  const chunks: Chunk[] = [];
  let inicio = 0;
  let indice = 0;
  while (inicio < texto.length) {
    const fim = Math.min(inicio + tamanho, texto.length);
    const pedaco = texto.slice(inicio, fim).trim();
    if (pedaco) {
      chunks.push({ chunkId: `${doc.id}#fixo-${indice}`, docId: doc.id, docTitulo: doc.titulo, texto: pedaco });
      indice++;
    }
    if (fim === texto.length) break;
    inicio = fim - overlap;
  }
  return chunks;
}

/**
 * Estratégia B — por seção. Usa as marcações `## Seção` que o próprio corpus
 * já tem (ver lib/corpus/documentos.ts) como fronteira de chunk — cada
 * seção vira exatamente um chunk, prefixado pelo título da seção. Nunca
 * corta uma regra ao meio; o trade-off é que seções muito longas ou muito
 * curtas viram chunks de tamanho desigual.
 */
function chunkPorSecao(doc: Documento): Chunk[] {
  const partes = doc.texto.split(/^## /m).filter(Boolean);
  return partes.map((parte, indice) => {
    const [titulo, ...resto] = parte.split('\n');
    const corpo = resto.join('\n').trim();
    return {
      chunkId: `${doc.id}#secao-${indice}`,
      docId: doc.id,
      docTitulo: doc.titulo,
      texto: `${titulo.trim()}: ${corpo}`,
    };
  });
}

export function construirChunks(estrategia: EstrategiaChunking): Chunk[] {
  return CORPUS.flatMap(doc => (estrategia === 'fixo' ? chunkFixo(doc) : chunkPorSecao(doc)));
}
