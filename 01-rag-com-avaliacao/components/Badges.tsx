export function RespondivelBadge({ respondivel }: { respondivel: boolean }) {
  return respondivel ? (
    <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-emerald-400">
      RESPONDIDO
    </span>
  ) : (
    <span className="rounded border border-amber-800 bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-400">
      FALLBACK
    </span>
  );
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-right text-zinc-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-900">
        <div className="h-full bg-sky-700" style={{ width: `${Math.max(0, Math.min(1, score)) * 100}%` }} />
      </div>
      <span className="w-10 text-zinc-500">{score.toFixed(2)}</span>
    </div>
  );
}
