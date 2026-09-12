import { z } from 'zod';
import { buscarUsuarioParaLogin } from '@/lib/auth/conta';
import { verificarSenha } from '@/lib/auth/senha';
import { criarSessao } from '@/lib/auth/sessao';
import { definirCookieSessao } from '@/lib/http/cookieSessao';

const BodySchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

/**
 * Mensagem de erro idêntica pra "email não existe" e "senha errada" —
 * distinguir os dois deixaria um atacante enumerar quais e-mails têm conta
 * (mesmo cuidado documentado no sistema real que inspirou este projeto).
 */
const CREDENCIAIS_INVALIDAS = 'E-mail ou senha inválidos.';

// Hash de formato válido (salt:hash) que nenhuma senha real bate — usado só
// pra manter o custo de CPU do scrypt igual entre "email não existe" e
// "senha errada". Sem isso, a resposta de email inexistente volta mais
// rápido (pula o scrypt inteiro), o que dá pra medir por timing e enumerar
// quais e-mails têm conta — o mesmo motivo da mensagem de erro ser idêntica.
const HASH_FANTASMA = '0'.repeat(32) + ':' + '0'.repeat(128);

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const usuario = await buscarUsuarioParaLogin(parsed.data.email);
  const senhaValida = verificarSenha(parsed.data.senha, usuario?.senhaHash ?? HASH_FANTASMA);
  if (!usuario || !senhaValida) {
    return Response.json({ error: CREDENCIAIS_INVALIDAS }, { status: 401 });
  }

  const token = await criarSessao(usuario.id, usuario.organizacaoId);
  const response = Response.json({ organizacaoId: usuario.organizacaoId, usuarioId: usuario.id });
  response.headers.append('Set-Cookie', definirCookieSessao(token));
  return response;
}
