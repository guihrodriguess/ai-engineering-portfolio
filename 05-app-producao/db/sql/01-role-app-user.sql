-- Roda uma vez, na criação do container (docker-entrypoint-initdb.d) — antes
-- de qualquer tabela existir. Por isso os GRANTs de tabela são "default
-- privileges": valem automaticamente pras tabelas que as migrations forem
-- criar depois, como a role dona (postgres/superusuário das migrations).
--
-- Senha de dev, só para o Postgres local do docker-compose — nunca é o
-- caminho de produção (ver README: produção usaria Postgres gerenciado via
-- Vercel Marketplace, com credenciais provisionadas automaticamente).
CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev_only';

GRANT CONNECT ON DATABASE app_producao TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- app_user NUNCA recebe BYPASSRLS. É essa ausência, não uma policy, que
-- garante que a Row-Level Security das tabelas (ver db/schema/*.ts) vale de
-- verdade pra role que a aplicação usa em runtime.
