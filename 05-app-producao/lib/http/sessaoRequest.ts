import { cookies } from 'next/headers';
import { COOKIE_SESSAO, validarSessao, type ContextoSessao } from '@/lib/auth/sessao';

export async function obterSessaoAtual(): Promise<ContextoSessao | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  return validarSessao(token);
}

export class NaoAutenticadoError extends Error {}

export async function exigirSessao(): Promise<ContextoSessao> {
  const sessao = await obterSessaoAtual();
  if (!sessao) throw new NaoAutenticadoError('Sessão ausente ou expirada.');
  return sessao;
}
