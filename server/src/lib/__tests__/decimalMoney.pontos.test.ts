import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * CENTAVOS-EXATOS PR-2 (BRIEF §2 PR-2, A3 + A6) — guarda de TEXTO: cada ponto que reconverte o valor da venda de reais para
 * centavos chama `roundReaisToCents` do núcleo e não tem mais `Math.round(<reais> * 100)` próprio. Isto prova o texto do
 * arquivo, NÃO o comportamento: o comportamento dos mappers é provado em `mappers/__tests__/decimalMoney.roteamento.mappers.test.ts`
 * (núcleo trocado) e, para as pontes, serviços e o job, só pelos testes existentes de cada um, com valores de 2 casas (iguais ao
 * legado, sem edição): NENHUM deles pina o sub-centavo, e `saleItems.loadUnconditionalDiscountCents` não tem teste unitário.
 * A trava definitiva contra `Math.round(x*100)` voltar é a regra de ESLint do F-CE-8, em PR próprio depois da virada.
 */
const SRC = join(__dirname, '..', '..');

/** [arquivo, nº de chamadas a `roundReaisToCents` que ele tem de ter] */
const PONTOS: ReadonlyArray<readonly [string, number]> = [
  ['features/accounting/sync/mappers/SaleFinalizedMapper.ts', 1],
  ['features/accounting/sync/mappers/SalePackageSoldMapper.ts', 1],
  ['features/accounting/sync/mappers/SaleReturnedMapper.ts', 1],
  ['features/accounting/sync/mappers/SaleSettledMapper.ts', 1],
  ['features/accounting/sync/bridges/SalePackageSoldBridge.ts', 1],
  ['features/accounting/sync/bridges/CrmReceivableBridge.ts', 1],
  ['features/accounting/sync/bridges/saleItems.ts', 1],
  ['features/packages/services/PackageAcceptanceService.ts', 1],
  ['features/sales/services/RegisterPaymentService.ts', 1],
  ['jobs/accountingSyncReconcile.job.ts', 2],
];

describe('CENTAVOS-EXATOS PR-2 — pontos A3/A6 passam pelo núcleo (texto)', () => {
  it.each(PONTOS)('%s importa e chama roundReaisToCents (%i vez), sem Math.round(… * 100) próprio', (arquivo, chamadas) => {
    const codigo = readFileSync(join(SRC, arquivo), 'utf-8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)) // comentário não conta
      .join('\n');
    expect(codigo).toMatch(/import \{ roundReaisToCents \} from '[./]+\/lib\/decimalMoney';/);
    expect(codigo.match(/roundReaisToCents\(/g)?.length ?? 0).toBe(chamadas);
    expect(codigo).not.toMatch(/Math\.round\([^\n]*\*\s*100\)/);
  });
});
