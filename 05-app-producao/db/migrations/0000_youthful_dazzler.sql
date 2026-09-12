CREATE TABLE "organizacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessoes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"categoria" text NOT NULL,
	"sentimento" text NOT NULL,
	"prioridade" text NOT NULL,
	"fallback" boolean DEFAULT false NOT NULL,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chamadas_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"modelo" text NOT NULL,
	"latencia_ms" integer NOT NULL,
	"sucesso" boolean NOT NULL,
	"fallback" boolean DEFAULT false NOT NULL,
	"custo_estimado_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chamadas_ia" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_organizacao_id_organizacoes_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organizacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_organizacao_id_organizacoes_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organizacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_organizacao_id_organizacoes_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organizacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamadas_ia" ADD CONSTRAINT "chamadas_ia_organizacao_id_organizacoes_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organizacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unico" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "sessoes_token_hash_unico" ON "sessoes" USING btree ("token_hash");--> statement-breakpoint
CREATE POLICY "usuarios_isolamento_por_organizacao" ON "usuarios" AS PERMISSIVE FOR ALL TO "app_user" USING ("usuarios"."organizacao_id" = current_setting('app.org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "sessoes_isolamento_por_organizacao" ON "sessoes" AS PERMISSIVE FOR ALL TO "app_user" USING ("sessoes"."organizacao_id" = current_setting('app.org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "feedbacks_isolamento_por_organizacao" ON "feedbacks" AS PERMISSIVE FOR ALL TO "app_user" USING ("feedbacks"."organizacao_id" = current_setting('app.org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "chamadas_ia_isolamento_por_organizacao" ON "chamadas_ia" AS PERMISSIVE FOR ALL TO "app_user" USING ("chamadas_ia"."organizacao_id" = current_setting('app.org_id', true)::uuid);