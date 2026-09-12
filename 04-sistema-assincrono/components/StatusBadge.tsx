import type { JobStatus } from '@/lib/types';

const ESTILO: Record<JobStatus, string> = {
  pendente: 'bg-zinc-900 text-zinc-400 border-zinc-700',
  extraindo: 'bg-sky-950 text-sky-400 border-sky-800',
  resumindo: 'bg-sky-950 text-sky-400 border-sky-800',
  concluido: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  falha_permanente: 'bg-red-950 text-red-400 border-red-800',
};

const LABEL: Record<JobStatus, string> = {
  pendente: 'pendente',
  extraindo: 'extraindo',
  resumindo: 'resumindo',
  concluido: 'concluído',
  falha_permanente: 'falha permanente',
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${ESTILO[status]}`}>{LABEL[status]}</span>;
}
