-- Aplicado depois das migrations do Drizzle (ver scripts/migrate.ts) —
-- referencia as tabelas usuarios/sessoes, que só existem depois delas.
--
-- Problema que isto resolve: login e validação de sessão precisam achar uma
-- linha ANTES de saber a qual organização ela pertence (é exatamente o
-- org_id que a RLS de usuarios/sessoes exige pra liberar a leitura — ver
-- db/schema/usuarios.ts). Um SECURITY DEFINER estreito, que devolve só as
-- colunas estritamente necessárias pra autenticar, resolve isso sem abrir
-- mão de RLS no resto do acesso à tabela. Mesmo padrão usado por bancos como
-- Supabase pro próprio schema de auth.
--
-- SET search_path fixo evita o ataque clássico de search_path em funções
-- SECURITY DEFINER (alguém criar um objeto com o mesmo nome num schema que
-- vem antes na busca).

CREATE OR REPLACE FUNCTION auth_buscar_por_email(p_email text)
RETURNS TABLE(id uuid, organizacao_id uuid, senha_hash text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id, organizacao_id, senha_hash FROM usuarios WHERE email = p_email;
$$;

CREATE OR REPLACE FUNCTION auth_validar_sessao(p_token_hash text)
RETURNS TABLE(usuario_id uuid, organizacao_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT usuario_id, organizacao_id
  FROM sessoes
  WHERE token_hash = p_token_hash AND expira_em > now();
$$;

GRANT EXECUTE ON FUNCTION auth_buscar_por_email(text) TO app_user;
GRANT EXECUTE ON FUNCTION auth_validar_sessao(text) TO app_user;
