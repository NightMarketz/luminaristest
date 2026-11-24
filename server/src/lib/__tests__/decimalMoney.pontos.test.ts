import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * CENTAVOS-EXATOS PR-2 (BRIEF §2 PR-2, A3 + A6) — guarda de TEXTO: cada ponto que reconverte o valor da venda de reais para
 * centavos chama `roundReaisToCents` do núcleo e não tem mais `Math.round(<reais> * 100)` próprio. Isto prova o texto do
 * arquivo, NÃO o comportamento: o comportamento dos mappers é provado em `mappers/__tests__/decimalMoney.roteamento.mappers.test.ts`
 * (núcleo trocado) e, para as pontes, serviços e o job, pelos testes existentes de cada um (valores iguais ao legado, sem edição).
 * A trava definitiva contra `Math.round(x*100)` voltar é a regra de ESLint do F-CE-8, em PR próprio depois da virada.
 */
const SRC = join(__dirname, '..', '..');

const PONTOS = [
  'features/accounting/sync/mappers/SaleFinalizedMapper.ts',
  'features/accounting/sync/mappers/SalePackageSoldMapper.ts',
  'features/accounting/sync/mappers/SaleReturnedMapper.ts',
  'features/accounting/sync/mappers/SaleSettledMapper.ts',
  'features/accounting/sync/bridges/SalePackageSoldBridge.ts',
  'features/accounting/sync/bridges/CrmReceivableBridge.ts',
  'features/accounting/sync/bridges/saleItems.ts',
  'features/packages/services/PackageAcceptanceService.ts',
  'features/sales/services/RegisterPaymentService.ts',
  'jobs/accountingSyncReconcile.job.ts',
] as const;

describe('CENTAVOS-EXATOS PR-2 — pontos A3/A6 passam pelo núcleo (texto)', () => {
  it.each(PONTOS)('%s importa e chama roundReaisToCents, sem Math.round(… * 100) próprio', (arquivo) => {
    const codigo = readFileSync(join(SRC, arquivo), 'utf-8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)) // comentário não conta
      .join('\n');
    expect(codigo).toMatch(/import \{ roundReaisToCents \} from '[./]+\/lib\/decimalMoney';/);
    expect(codigo).toMatch(/roundReaisToCents\(/);
    expect(codigo).not.toMatch(/Math\.round\([^\n]*\*\s*100\)/);
  });
});
