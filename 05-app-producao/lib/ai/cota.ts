import { and, count, eq, gte } from 'drizzle-orm';
import { chamadasIa } from '@/db/schema';
import { comContextoOrg } from '@/lib/http/comContextoOrg';

/** Cota diária simples por organização — controle de custo básico: sem isto, um cliente com bug num loop de retry no frontend pode gerar custo de IA ilimitado. */
export const COTA_DIARIA_PADRAO = 50;

export async function contarChamadasHoje(organizacaoId: string): Promise<number> {
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  return comContextoOrg(organizacaoId, async tx => {
    const [linha] = await tx
      .select({ total: count() })
      .from(chamadasIa)
      .where(and(eq(chamadasIa.organizacaoId, organizacaoId), gte(chamadasIa.criadoEm, inicioDoDia)));
    return linha?.total ?? 0;
  });
}

export async function dentroDaCotaDiaria(organizacaoId: string, limite = COTA_DIARIA_PADRAO): Promise<boolean> {
  return (await contarChamadasHoje(organizacaoId)) < limite;
}
