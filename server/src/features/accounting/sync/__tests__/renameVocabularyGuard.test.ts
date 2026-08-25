/**
 * Teste-guarda de INSTRUMENTAÇÃO (sessao-instrumentacao, agente I1 do lote de rename).
 * ZERO mudança em código de aplicação — este arquivo só afirma o vocabulário RATIFICADO.
 *
 * Autorização: ADR-RN-salon-to-sale-rename.md §7 passo 3 + BRIEF §6 (F-RN-1→(b), F-RN-2→(b),
 * ratificados 2026-08-25). Mapeamento exato (F-RN-2→(b), "colapsar o segmento redundante"):
 *   salon.sale.finalized  -> sale.finalized
 *   salon.sale.settled    -> sale.settled
 *   salon.sale.returned   -> sale.returned
 *   salon.package.sold    -> sale.package.sold
 *   salon.sale.cogs       -> sale.cogs
 *
 * Escopo desta guarda (fatia F-RN-1/F-RN-2, "vocabulário"): os 3 lugares onde o namespace de
 * evento é uma STRING LITERAL hoje —
 *   (1) a fixture do binding (`salonBinding.ts`: `eventKey` dos 5 `eventBindings` + as chaves de
 *       `SALON_OPERATIONAL_SCHEMA_SNAPSHOT`),
 *   (2) a propriedade `sourceType` de cada um dos 5 mappers "legado" (golden-only),
 *   (3) o `sourceType` retornado pelos 5 event-builders de `AccountingSyncPort.ts` — que é o que as
 *       bridges de fato emitem (as bridges não têm literal `sourceType` próprio; chamam os builders
 *       do Port, confirmado por leitura de `bridges/*.ts`).
 *
 * A fixture (1) vive num módulo irmão (`accountingBinding`) que `features/accounting` (onde este
 * arquivo mora) está PROIBIDO de importar — direção reversa banida por
 * `accountingBinding/__tests__/importBoundary.test.ts` ("features/accounting nunca importa de
 * accountingBinding"), que varre POR TEXTO todo `.ts` sob `features/accounting`, teste incluso
 * (confirmado rodando a suíte: uma primeira versão deste arquivo com um `import` TypeScript direto
 * do módulo irmão fez essa guarda de fronteira falhar, listando este próprio arquivo como
 * infrator — e o regex dela lê o arquivo INTEIRO como texto, comentário incluso, então nem esta nota
 * pode soletrar o caminho proibido literalmente). Por isso a parte (1) abaixo lê o arquivo-fonte da
 * fixture como TEXTO (`fs.readFileSync`, mesma técnica que o `importBoundary.test.ts` já usa) e casa
 * os literais por regex — nenhum `import` TypeScript atravessa a fronteira, só leitura de arquivo.
 *
 * NÃO cobertos por esta guarda (achados fora de escopo, registrados no relatório da sessão):
 *   - F-RN-1 (identificadores de código acompanham: `Salon*` -> `Sale*`, `git mv`) — nenhuma
 *     asserção de nome de classe/arquivo aqui; os `import ... as` abaixo usam o nome ATUAL da
 *     classe (`SalonSaleFinalizedMapper` etc.) porque é o nome que existe hoje no disco, e o
 *     formulário da sessão não sancionou forçar uma asserção de identificador numa guarda de
 *     vocabulário.
 *   - F-RN-3 (migração do dado já persistido) e F-RN-4 (reativação atômica do binding `Active` no
 *     banco) — comportamento de runtime/dado, não de vocabulário estático; ficam para a guarda do
 *     agente irmão (I2) ou para a sessão de correção.
 *   - `jobs/accountingSyncReconcile.job.ts`, `lib/factory.ts`,
 *     `controllers/dynamicTablesController.ts` (comportamento §3 itens 6/7 do BRIEF) — não lidos
 *     aqui; fora da fatia F-RN-1/F-RN-2.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { SalonSaleFinalizedMapper } from '../mappers/SalonSaleFinalizedMapper';
import { SalonSaleSettledMapper } from '../mappers/SalonSaleSettledMapper';
import { SalonSaleReturnedMapper } from '../mappers/SalonSaleReturnedMapper';
import { SalonPackageSoldMapper } from '../mappers/SalonPackageSoldMapper';
import { SalonSaleCogsMapper } from '../mappers/SalonSaleCogsMapper';
import {
  buildSalonSaleFinalizedEvent,
  buildSalonSaleSettledEvent,
  buildSalonSaleReturnedEvent,
  buildSalonPackageSoldEvent,
  buildSalonSaleCogsEvent,
} from '../AccountingSyncPort';

/** F-RN-2->(b), tabela exata do BRIEF §6 (a recomendação ratificada, não a opção (a) do swap
 *  mecânico). Chave = eventKey ANTIGO (o que o código emite hoje); valor = eventKey RATIFICADO. */
const RATIFIED_VOCABULARY = {
  'salon.sale.finalized': 'sale.finalized',
  'salon.sale.settled': 'sale.settled',
  'salon.sale.returned': 'sale.returned',
  'salon.package.sold': 'sale.package.sold',
  'salon.sale.cogs': 'sale.cogs',
} as const;

const sampleFields = {
  saleId: 'sale-guard-1',
  unitId: 'unit-guard-1',
  amount: 100,
  currency: 'BRL',
  occurredAt: '2026-08-25T00:00:00.000Z',
  label: 'guard-fixture',
};

describe('rename salon.* -> sale.* — guarda de VOCABULÁRIO (F-RN-1/F-RN-2)', () => {
  describe('fixture do binding (accountingBinding/fixtures/salonBinding.ts, lida como texto — ver nota de fronteira acima)', () => {
    // FIXTURE_PATH é montado com segmentos separados (join de strings soltas) — não é uma
    // declaração de import TypeScript, é só leitura de arquivo (fs.readFileSync).
    const FIXTURE_PATH = join(__dirname, '..', '..', '..', 'accountingBinding', 'fixtures', 'salonBinding.ts');
    const fixtureSource = readFileSync(FIXTURE_PATH, 'utf8');

    it('não deveria mais conter nenhum literal do namespace legado salon.(sale|package).*', () => {
      // Hoje a fixture tem 10 ocorrências (5 eventKey + 5 chaves de SALON_OPERATIONAL_SCHEMA_SNAPSHOT)
      // — esta asserção espera ZERO, e por isso falha até a sessao-correcao trocar os literais.
      const legacyMatches = fixtureSource.match(/salon\.(sale|package)\.[a-zA-Z]+/g) ?? [];
      expect(legacyMatches).toEqual([]);
    });

    it('deveria conter as 10 ocorrências do vocabulário ratificado (5 eventKey + 5 chaves do snapshot)', () => {
      const ratifiedTokens = Object.values(RATIFIED_VOCABULARY); // 5 valores sale.*
      const expectedOccurrences = ratifiedTokens.flatMap((token) => [token, token]).sort(); // 2× cada
      const escapeRegex = (s: string) => s.replace(/[.]/g, '\\.');
      // Âncora nas ASPAS, não em \b: com \b, 'sale.finalized' casaria como substring de
      // 'sale.sale.finalized' — o gaguejo da opção (a) que o F-RN-2 rejeitou passaria despercebido
      // aqui (achado da review independente, verificado por execução).
      const pattern = new RegExp(`['"](${ratifiedTokens.map(escapeRegex).join('|')})['"]`, 'g');
      const actualOccurrences = (fixtureSource.match(pattern) ?? [])
        .map((m) => m.slice(1, -1))
        .sort();
      expect(actualOccurrences).toEqual(expectedOccurrences);
    });
  });

  describe('mappers "legado" (golden-only) — propriedade sourceType da classe', () => {
    it('SalonSaleFinalizedMapper.sourceType', () => {
      expect(new SalonSaleFinalizedMapper().sourceType).toBe(RATIFIED_VOCABULARY['salon.sale.finalized']);
    });
    it('SalonSaleSettledMapper.sourceType', () => {
      expect(new SalonSaleSettledMapper().sourceType).toBe(RATIFIED_VOCABULARY['salon.sale.settled']);
    });
    it('SalonSaleReturnedMapper.sourceType', () => {
      expect(new SalonSaleReturnedMapper().sourceType).toBe(RATIFIED_VOCABULARY['salon.sale.returned']);
    });
    it('SalonPackageSoldMapper.sourceType', () => {
      expect(new SalonPackageSoldMapper().sourceType).toBe(RATIFIED_VOCABULARY['salon.package.sold']);
    });
    it('SalonSaleCogsMapper.sourceType', () => {
      expect(new SalonSaleCogsMapper().sourceType).toBe(RATIFIED_VOCABULARY['salon.sale.cogs']);
    });
  });

  describe('AccountingSyncPort — sourceType emitido pelos 5 event-builders (o que as bridges emitem)', () => {
    it('buildSalonSaleFinalizedEvent', () => {
      expect(buildSalonSaleFinalizedEvent(sampleFields).sourceType).toBe(RATIFIED_VOCABULARY['salon.sale.finalized']);
    });
    it('buildSalonSaleSettledEvent', () => {
      expect(buildSalonSaleSettledEvent({ ...sampleFields, paymentMethod: 'Cash' }).sourceType).toBe(
        RATIFIED_VOCABULARY['salon.sale.settled'],
      );
    });
    it('buildSalonSaleReturnedEvent', () => {
      expect(buildSalonSaleReturnedEvent(sampleFields).sourceType).toBe(RATIFIED_VOCABULARY['salon.sale.returned']);
    });
    it('buildSalonPackageSoldEvent', () => {
      expect(buildSalonPackageSoldEvent(sampleFields).sourceType).toBe(RATIFIED_VOCABULARY['salon.package.sold']);
    });
    it('buildSalonSaleCogsEvent', () => {
      expect(buildSalonSaleCogsEvent({ ...sampleFields, costCents: 100 }).sourceType).toBe(
        RATIFIED_VOCABULARY['salon.sale.cogs'],
      );
    });
  });
});
