'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? 'Falha ao entrar');
      router.push('/');
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <h1 className="text-lg font-semibold text-zinc-100">Entrar</h1>
      <form className="flex flex-col gap-3" onSubmit={enviar}>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          E-mail
          <input
            type="email"
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Senha
          <input
            type="password"
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
          />
        </label>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        Não tem organização ainda? <Link className="underline" href="/registrar">Criar</Link>
      </p>
    </div>
  );
}
