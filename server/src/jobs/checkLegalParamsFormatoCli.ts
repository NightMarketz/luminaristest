/**
 * checkLegalParamsFormatoCli — lacuna deixada fora do #870: o `publish` passou a conferir o formato da linha, mas a linha
 * que JÁ estava publicada não é revalidada. O caso não é impossível: toda vez que a regra de `formatoLinha.ts` aperta (ex.:
 * o discriminador das alíquotas de IBS_CBS), a linha publicada sob a regra anterior continua em vigor. Este comando só LÊ:
 * lista as linhas PUBLISHED fora do formato de hoje e sai 1 se houver alguma. Não corrige nem revoga — a correção de dado
 * é decisão do dono (propor a linha certa com `supersedesId`).
 *
 * Run:
 *   npm run check:legal-params-formato
 */
import prisma from '../lib/prisma';
import { getFactory } from '../lib/factory';
import type { LinhaPublicadaForaDoFormato } from '../features/legalParameters/services/LegalParameterService';

/** Lista as linhas e devolve o código de saída. Nunca chama `process.exit` (testável). */
export async function checkLegalParamsFormato(
  service: { linhasPublicadasForaDoFormato(): Promise<LinhaPublicadaForaDoFormato[]> } = getFactory().getLegalParameterService(),
): Promise<number> {
  const fora = await service.linhasPublicadasForaDoFormato();
  if (fora.length === 0) {
    console.log('legal_parameters: todas as linhas PUBLISHED estão no formato da tabela.');
    return 0;
  }
  console.error(`legal_parameters: ${fora.length} linha(s) PUBLISHED fora do formato:`);
  for (const l of fora) console.error(`  ${l.id} ${l.tabela}/${l.chave}/${l.discriminador ?? '∅'} (vigente desde ${l.vigenteDesde}) — ${l.erro}`);
  return 1;
}

if (require.main === module) {
  checkLegalParamsFormato()
    .then((code) => {
      process.exitCode = code;
    })
    .finally(() => prisma.$disconnect());
}
