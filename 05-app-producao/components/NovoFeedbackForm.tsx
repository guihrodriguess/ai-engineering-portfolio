'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NovoFeedbackForm() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? 'Falha ao enviar feedback');
      setTexto('');
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4" onSubmit={enviar}>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Novo feedback de cliente
        <textarea
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          rows={3}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Cole aqui o texto do feedback…"
          required
          minLength={3}
        />
      </label>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {enviando ? 'Classificando…' : 'Classificar e salvar'}
      </button>
    </form>
  );
}
