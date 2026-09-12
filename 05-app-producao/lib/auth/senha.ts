import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEYLEN = 64;

/**
 * scrypt do `node:crypto` — nativo, sem dependência externa (evita o
 * problema clássico de bcrypt precisar de binário nativo compilado, chato
 * em CI/Docker multi-arquitetura), e é a escolha recomendada pelo próprio
 * OWASP para hash de senha quando bcrypt não está disponível.
 */
export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

/** Comparação em tempo constante — evita timing attack revelando quantos bytes do hash bateram. */
export function verificarSenha(senha: string, senhaHash: string): boolean {
  const [salt, hash] = senhaHash.split(':');
  if (!salt || !hash) return false;
  const calculado = scryptSync(senha, salt, KEYLEN);
  const armazenado = Buffer.from(hash, 'hex');
  if (calculado.length !== armazenado.length) return false;
  return timingSafeEqual(calculado, armazenado);
}
