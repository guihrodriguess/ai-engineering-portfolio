import { describe, expect, it } from 'vitest';
import { hashSenha, verificarSenha } from '@/lib/auth/senha';

describe('hashSenha / verificarSenha', () => {
  it('verifica a senha correta', () => {
    const hash = hashSenha('minhaSenhaForte123');
    expect(verificarSenha('minhaSenhaForte123', hash)).toBe(true);
  });

  it('rejeita a senha errada', () => {
    const hash = hashSenha('minhaSenhaForte123');
    expect(verificarSenha('senhaErrada', hash)).toBe(false);
  });

  it('gera hashes diferentes pra mesma senha (salt aleatório)', () => {
    const hash1 = hashSenha('mesmaSenha');
    const hash2 = hashSenha('mesmaSenha');
    expect(hash1).not.toBe(hash2);
    expect(verificarSenha('mesmaSenha', hash1)).toBe(true);
    expect(verificarSenha('mesmaSenha', hash2)).toBe(true);
  });

  it('rejeita hash malformado sem lançar exceção', () => {
    expect(verificarSenha('qualquer', 'hash-sem-formato-valido')).toBe(false);
  });
});
