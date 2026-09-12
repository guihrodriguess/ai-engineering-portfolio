'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function NavBar() {
  const router = useRouter();

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-8">
      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-zinc-300 hover:underline">Feedbacks</Link>
        <Link href="/observabilidade" className="text-zinc-300 hover:underline">Observabilidade</Link>
      </div>
      <button onClick={sair} className="text-sm text-zinc-500 hover:underline">Sair</button>
    </nav>
  );
}
