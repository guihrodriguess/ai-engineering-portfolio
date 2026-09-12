import { z } from 'zod';
import { EmailJaCadastradoError, registrarConta } from '@/lib/auth/conta';
import { criarSessao } from '@/lib/auth/sessao';
import { definirCookieSessao } from '@/lib/http/cookieSessao';

const BodySchema = z.object({
  nomeOrganizacao: z.string().min(2).max(120),
  email: z.string().email(),
  senha: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { organizacaoId, usuarioId } = await registrarConta(
      parsed.data.nomeOrganizacao,
      parsed.data.email,
      parsed.data.senha,
    );
    const token = await criarSessao(usuarioId, organizacaoId);

    const response = Response.json({ organizacaoId, usuarioId }, { status: 201 });
    response.headers.append('Set-Cookie', definirCookieSessao(token));
    return response;
  } catch (err) {
    if (err instanceof EmailJaCadastradoError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    return Response.json({ error: 'Falha ao registrar conta' }, { status: 500 });
  }
}
