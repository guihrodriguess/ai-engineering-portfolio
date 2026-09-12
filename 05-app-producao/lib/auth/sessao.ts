import { randomBytes, createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { sessoes } from '@/db/schema';
import { comContextoOrg } from '@/lib/http/comContextoOrg';

export const COOKIE_SESSAO = 'sessao';
export const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

/** Só o hash do token fica no banco — o token em claro só existe no cookie do navegador e nunca é persistido. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface ContextoSessao {
  usuarioId: string;
  organizacaoId: string;
}

export async function criarSessao(usuarioId: string, organizacaoId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS);

  await comContextoOrg(organizacaoId, tx =>
    tx.insert(sessoes).values({ organizacaoId, usuarioId, tokenHash: hashToken(token), expiraEm }),
  );

  return token;
}

/**
 * Valida o token via a função SECURITY DEFINER `auth_validar_sessao` (ver
 * db/sql/02-funcoes-auth.sql) — o mesmo problema de ovo-e-galinha do login:
 * não dá pra aplicar RLS por organização numa consulta que ainda não sabe
 * qual organização é, já que é exatamente isso que a sessão vai revelar.
 */
export async function validarSessao(token: string): Promise<ContextoSessao | null> {
  const db = getDb();
  const resultado = await db.execute<{ usuario_id: string; organizacao_id: string }>(
    sql`select * from auth_validar_sessao(${hashToken(token)})`,
  );
  const linha = resultado.rows[0];
  if (!linha) return null;
  return { usuarioId: linha.usuario_id, organizacaoId: linha.organizacao_id };
}

export async function destruirSessao(token: string, organizacaoId: string): Promise<void> {
  await comContextoOrg(organizacaoId, tx => tx.delete(sessoes).where(eq(sessoes.tokenHash, hashToken(token))));
}
