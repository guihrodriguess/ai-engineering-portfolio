import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { organizacoes, usuarios } from '@/db/schema';
import { hashSenha } from './senha';

export class EmailJaCadastradoError extends Error {}

/**
 * Cria organização + primeiro usuário numa única transação: o `set_config`
 * do org_id precisa acontecer DEPOIS de a organização existir (é o próprio
 * `org.id` recém-gerado) e ANTES do insert em `usuarios` (a policy de RLS
 * usa esse valor como `WITH CHECK` implícito — ver db/schema/usuarios.ts).
 * Se o insert de usuário falhar (ex: email duplicado), a organização
 * também não fica órfã — tudo ou nada.
 */
export async function registrarConta(nomeOrganizacao: string, email: string, senha: string) {
  const db = getDb();
  const senhaHash = hashSenha(senha);

  try {
    return await db.transaction(async tx => {
      const [org] = await tx.insert(organizacoes).values({ nome: nomeOrganizacao }).returning();
      await tx.execute(sql`select set_config('app.org_id', ${org.id}, true)`);
      const [usuario] = await tx.insert(usuarios).values({ organizacaoId: org.id, email, senhaHash }).returning();
      return { organizacaoId: org.id, usuarioId: usuario.id };
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new EmailJaCadastradoError(`E-mail "${email}" já está em uso.`);
    throw err;
  }
}

/** Usada só no login — ver db/sql/02-funcoes-auth.sql pro porquê de precisar de um SECURITY DEFINER aqui. */
export async function buscarUsuarioParaLogin(email: string) {
  const db = getDb();
  const resultado = await db.execute<{ id: string; organizacao_id: string; senha_hash: string }>(
    sql`select * from auth_buscar_por_email(${email})`,
  );
  const linha = resultado.rows[0];
  if (!linha) return null;
  return { id: linha.id, organizacaoId: linha.organizacao_id, senhaHash: linha.senha_hash };
}

/**
 * `db.transaction` embrulha o erro do driver `pg` num `DrizzleQueryError`
 * (ver node_modules/drizzle-orm/errors.d.ts) — o `code` da Postgres
 * ("23505" = unique_violation) fica em `.cause`, não na raiz do erro que a
 * gente pega no catch.
 */
function isUniqueViolation(err: unknown): boolean {
  return codigoPg(err) === '23505';
}

function codigoPg(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  if ('code' in err && typeof err.code === 'string') return err.code;
  if ('cause' in err) return codigoPg((err as { cause: unknown }).cause);
  return undefined;
}
