import { afterAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { organizacoes } from '@/db/schema';
import { EmailJaCadastradoError, buscarUsuarioParaLogin, registrarConta } from '@/lib/auth/conta';
import { verificarSenha } from '@/lib/auth/senha';

describe('registrarConta / buscarUsuarioParaLogin (integração, Postgres real)', () => {
  const orgsCriadas: string[] = [];

  afterAll(async () => {
    if (orgsCriadas.length) await getDb().delete(organizacoes).where(inArray(organizacoes.id, orgsCriadas));
  });

  it('registra uma conta e permite validar a senha depois', async () => {
    const email = `conta-${Date.now()}@teste.com`;
    const { organizacaoId } = await registrarConta('Organização de Teste', email, 'senhaForte123');
    orgsCriadas.push(organizacaoId);

    const usuario = await buscarUsuarioParaLogin(email);
    expect(usuario).not.toBeNull();
    expect(usuario!.organizacaoId).toBe(organizacaoId);
    expect(verificarSenha('senhaForte123', usuario!.senhaHash)).toBe(true);
    expect(verificarSenha('senhaErrada', usuario!.senhaHash)).toBe(false);
  });

  it('rejeita e-mail duplicado sem deixar organização órfã (transação atômica)', async () => {
    const email = `duplicado-${Date.now()}@teste.com`;
    const { organizacaoId } = await registrarConta('Primeira Org', email, 'senhaForte123');
    orgsCriadas.push(organizacaoId);

    await expect(registrarConta('Segunda Org', email, 'outraSenha456')).rejects.toBeInstanceOf(EmailJaCadastradoError);
  });

  it('buscarUsuarioParaLogin devolve null pra e-mail inexistente', async () => {
    const usuario = await buscarUsuarioParaLogin(`nao-existe-${Date.now()}@teste.com`);
    expect(usuario).toBeNull();
  });
});
