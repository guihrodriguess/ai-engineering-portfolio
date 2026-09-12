export type JobStatus = 'pendente' | 'extraindo' | 'resumindo' | 'concluido' | 'falha_permanente';

export interface ResultadoJob {
  assunto: string;
  urgencia: 'baixa' | 'media' | 'alta';
  palavrasChave: string[];
  resumo: string;
  sentimento: 'positivo' | 'neutro' | 'negativo';
  necessitaAcaoHumana: boolean;
}

export interface Job {
  id: string;
  texto: string;
  simulado: boolean;
  status: JobStatus;
  tentativas: number;
  maxTentativas: number;
  criadoEm: number;
  atualizadoEm: number;
  /** Definido quando um worker pega o job — usado pra detectar worker travado/morto (lease). */
  processandoDesde: number | null;
  /** Definido após uma falha transitória — o job só volta a ser elegível depois desse instante. */
  proximaTentativaEm: number | null;
  resultado: ResultadoJob | null;
  erro: string | null;
}

export type JobEvent =
  | { type: 'enfileirado'; jobId: string; ts: number }
  | { type: 'iniciado'; jobId: string; ts: number; tentativa: number; worker: string }
  | { type: 'etapa'; jobId: string; ts: number; etapa: 'extracao' | 'resumo'; status: 'inicio' | 'sucesso' | 'falha'; detalhe?: string; duracaoMs?: number }
  | { type: 'retentativa_agendada'; jobId: string; ts: number; tentativa: number; proximaTentativaEm: number; motivo: string }
  | { type: 'concluido'; jobId: string; ts: number; duracaoTotalMs: number }
  | { type: 'falha_permanente'; jobId: string; ts: number; motivo: string }
  | { type: 'job_reclamado'; jobId: string; ts: number; motivo: string };
