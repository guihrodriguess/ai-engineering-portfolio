import { cookies } from 'next/headers';
import { COOKIE_SESSAO, destruirSessao, validarSessao } from '@/lib/auth/sessao';
import { limparCookieSessao } from '@/lib/http/cookieSessao';

export async function POST() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;

  if (token) {
    const sessao = await validarSessao(token);
    if (sessao) await destruirSessao(token, sessao.organizacaoId);
  }

  const response = Response.json({ ok: true });
  response.headers.append('Set-Cookie', limparCookieSessao());
  return response;
}
