import catalog2025 from './fixtures/referential-catalog-2025.json';
import { KIT_REGISTRY } from '../registry';
import { SectorKitV1Schema, type SectorKitV1 } from '../dtos/SectorKitDto';
import { BEAUTY_SALON_KIT_V1 } from '../kits/beautySalon/kit.v1';

/**
 * BE-INCR-KIT-SETOR PR-2, item 13 — "código referencial que não seja analítico no catálogo ⇒ o kit é inválido (erro
 * de build do kit)". Roda TODO kit publicado contra o catálogo RFB 2025 de fixture (`fixtures/referential-catalog-
 * 2025.json`: as 1.123 contas / 975 analíticas importadas no gate X2, #372 — só `code` e `isAnalytic`).
 *
 * O catálogo só cobre a versão 2025; um bloco de outro `mappingVersion` não tem contra o que ser checado aqui (o
 * passo 7 da instalação ainda o pula sem catálogo, item 13).
 */
const ANALYTIC = new Map<string, boolean>((catalog2025.accounts as Array<[string, boolean]>).map(([code, isAnalytic]) => [code, isAnalytic]));

function referentialIssues(kit: SectorKitV1): string[] {
  const issues: string[] = [];
  for (const block of kit.referential) {
    if (block.mappingVersion !== catalog2025.layoutVersion) continue;
    for (const e of block.entries) {
      const analytic = ANALYTIC.get(e.referentialCode);
      if (analytic === undefined) issues.push(`${kit.kitKey} v${kit.kitVersion}: ${e.referentialCode} não existe no catálogo ${block.mappingVersion}`);
      else if (!analytic) issues.push(`${kit.kitKey} v${kit.kitVersion}: ${e.referentialCode} é sintética no catálogo ${block.mappingVersion}`);
    }
  }
  return issues;
}

describe('kits × catálogo referencial RFB 2025 (item 13)', () => {
  it('a fixture é o catálogo do X2: 1.123 contas, 975 analíticas', () => {
    expect(catalog2025.accounts).toHaveLength(1123);
    expect([...ANALYTIC.values()].filter(Boolean)).toHaveLength(975);
  });

  it('todo kit publicado só mapeia para conta referencial analítica', () => {
    const issues = Object.values(KIT_REGISTRY).flatMap((versions) => versions.flatMap(referentialIssues));
    expect(issues).toEqual([]);
  });

  it('a checagem pega código sintético e código fora do catálogo (prova na condição que falha)', () => {
    const ruim = SectorKitV1Schema.parse({
      ...BEAUTY_SALON_KIT_V1,
      referential: [
        {
          regime: 'PRESUMIDO',
          mappingVersion: '2025',
          entries: [
            { accountCode: '1.1.1', referentialCode: '1.01', label: 'sintética' },
            { accountCode: '1.1.2', referentialCode: '9.99.99', label: 'inexistente' },
            { accountCode: '1.1.3', referentialCode: '1.01.01.01.01', label: 'analítica' },
          ],
        },
      ],
    });
    expect(referentialIssues(ruim)).toEqual([
      'beautySalon v1: 1.01 é sintética no catálogo 2025',
      'beautySalon v1: 9.99.99 não existe no catálogo 2025',
    ]);
  });
});
