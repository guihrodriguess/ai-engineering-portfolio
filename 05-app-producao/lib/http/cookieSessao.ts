import { COOKIE_SESSAO, DURACAO_SESSAO_MS } from '@/lib/auth/sessao';

export function definirCookieSessao(token: string): string {
  const maxAge = Math.floor(DURACAO_SESSAO_MS / 1000);
  return `${COOKIE_SESSAO}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}

export function limparCookieSessao(): string {
  return `${COOKIE_SESSAO}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}
