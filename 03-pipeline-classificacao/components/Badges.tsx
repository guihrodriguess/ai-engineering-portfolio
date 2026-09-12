import { CATEGORIA_LABEL, type Categoria } from '@/lib/domain/categorias';
import type { Veredicto } from '@/lib/pipeline/rules';

const VEREDICTO_STYLE: Record<Veredicto, string> = {
  APROVADO: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  REPROVADO: 'bg-red-950 text-red-400 border-red-800',
  ATENCAO: 'bg-amber-950 text-amber-400 border-amber-800',
};

export function VeredictoBadge({ veredicto }: { veredicto: Veredicto }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${VEREDICTO_STYLE[veredicto]}`}>
      {veredicto}
    </span>
  );
}

export function CategoriaBadge({ categoria }: { categoria: Categoria }) {
  return (
    <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
      {CATEGORIA_LABEL[categoria]}
    </span>
  );
}
