/**
 * GUARDA F-RN-4 — um `AccountingBinding` `Active` persistido com `eventKey` antigo (`salon.*`)
 * enquanto o código emite o novo (`sale.*`) faz TODO evento do vertical 1 cair no ramo "sem
 * mapper" da ponte (ADR-RN §1/§3 item 9; BRIEF §3 comportamento 9; F-RN-4 → (a) atômico —
 * BRIEF §6: "código + recompilação/reativação do binding no MESMO incremento... a correção
 * verifica explicitamente se há binding Active com eventKey antigo, não assume que não há").
 * Sessão de instrumentação (I2) — teste-guarda apenas; zero mudança em código de aplicação.
 *
 * FRONTEIRA §2.1 RESPEITADA DE PROPÓSITO: em produção, o mapper registrado no dispatcher vem de
 * `AccountingBindingFeederService.buildActiveMapperRegistrations()` lendo o `AccountingBinding`
 * `Active` do banco (BE-INCR-BINDING-FEEDER) — `sourceType` do mapper resolvido é literalmente
 * `binding.eventKey` (`accountingBinding/interpreter/InterpretedEventMapper.ts:36`). Este
 * arquivo NÃO importa `features/accountingBinding` (a direção reversa é banida e travada por
 * `accountingBinding/__tests__/importBoundary.test.ts`, 2º `it` — checado por AST leve sobre
 * `features/accounting/**`, sem exceção para `__tests__`); `staleMapper()` abaixo reproduz o
 * MESMO shape que aquele adaptador produziria (mesmo padrão de `markedMapper()` em
 * `AccountingSyncService.test.ts`), citando a origem por referência em vez de importar o código.
 * O que está sob teste é inteiramente `AccountingSyncService` (`features/accounting`, sem cruzar
 * a fronteira) — a classe real, sem mock.
 *
 * A "linha Active com eventKey antigo" é reproduzida como o mapper que
 * `buildActiveMapperRegistrations()` produziria HOJE a partir de `SALON_BINDING_V1` (nenhum dado
 * inventado — é o `eventKey` atual da fixture, `salonBinding.ts:81`). O "evento pós-rename" é um
 * literal de teste (`'sale.finalized'`, a string ratificada em F-RN-2 para o arquétipo
 * `revenue_recognition`) — simula o que a ponte vai emitir DEPOIS da correção, sem tocar
 * `AccountingSyncPort.ts`: o union de produção ainda não inclui esse valor, de propósito (é o
 * que a sessão de correção muda) — daí o cast só neste teste.
 *
 * DEFINIÇÃO DE PRONTO: a asserção final é "o dispatch do evento pós-rename não deveria lançar"
 * (o comportamento correto que F-RN-4 exige: código e binding migram JUNTOS, atomicamente). Hoje
 * ela FALHA na própria chamada de `sync()`, com `ValidationError: Nenhum mapper registrado para
 * o evento 'sale.finalized'.` — a razão exata do achado do BRIEF (dispatcher sem mapper, a ponte
 * engole o erro com `logger.error` porque mapper-ausente não está em `SYNC_SKIP_ERROR_CODES`,
 * HTTP 200, "left for reconciliation").
 */
import { AccountingSyncService } from '../AccountingSyncService';
import type { AccountingEvent } from '../AccountingSyncPort';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { IAccountingEventMapper } from '../mappers/IAccountingEventMapper';
import type { PostEntryInput } from '../../dtos/PostingDto';

jest.mock('../../../../lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

/** O mapper que `InterpretedEventMapper` produziria a partir do `AccountingBinding` `Active` de
 *  HOJE (`SALON_BINDING_V1`, `eventKey: 'salon.sale.finalized'`) — reproduzido em vez de
 *  importado (ver header: fronteira §2.1). `map()` nunca deveria ser alcançado neste teste — o
 *  lookup falha ANTES (`AccountingSyncService.ts` resolve o mapper antes de chamar `.map()`). */
function staleMapper(sourceType: string): IAccountingEventMapper {
  return {
    sourceType: sourceType as AccountingEvent['sourceType'],
    map: () => {
      throw new Error('map() não deveria ser chamado — o lookup do mapper falha antes disso.');
    },
  };
}

const scope: AccountingScope = {
  ownerUserId: 'user-1',
  actorUserId: 'user-1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

describe('Guarda F-RN-4 — binding Active com eventKey antigo trava TODO evento pós-rename (dispatcher sem mapper)', () => {
  it('a ponte emitindo sale.finalized (pós-rename) contra um binding Active ainda salon.* deveria sincronizar, mas o dispatch lança ValidationError', async () => {
    // Mapper "Active no banco, ainda salon.*" — mesmo shape que o feeder de produção resolveria
    // hoje (ver header). Registrado GLOBAL (unscoped), o mesmo formato que
    // `buildSalonAccountingMappers()`/os testes desta classe já usam para um único binding.
    const postEntry = jest.fn(async (_s: AccountingScope, _i: PostEntryInput) => ({ id: 'entry-should-not-run' }));
    const postingService = { postEntry } as unknown as ConstructorParameters<typeof AccountingSyncService>[0];
    const service = new AccountingSyncService(postingService, [staleMapper('salon.sale.finalized')]);

    // O literal que a ponte EMITIRÁ pós-correção (F-RN-2 → (b)). O union de AccountingEvent
    // ainda não o inclui de propósito — a correção muda o Port; este teste não.
    const eventPosRename = {
      sourceType: 'sale.finalized',
      sourceId: 'sale-1',
      unitId: 'unit-1',
      amount: 1000,
      currency: 'BRL',
      occurredAt: '2026-08-25T00:00:00.000Z',
      label: 'Venda sale-1',
    } as unknown as AccountingEvent;

    // Comportamento correto esperado (F-RN-4 → atômico): o binding Active teria sido
    // recompilado/reativado JUNTO com o código, então o dispatch deveria suceder normalmente —
    // nenhum evento do vertical 1 deveria cair no ramo "sem mapper" só porque o binding do banco
    // ficou para trás.
    await expect(service.sync(scope, eventPosRename)).resolves.toBeDefined();

    // Se a linha acima algum dia passar (pós-correção), esta é a prova complementar de que o
    // sucesso não veio de um caminho errado — postEntry SÓ deveria ser chamado depois que o
    // mapper certo foi resolvido.
    expect(postEntry).toHaveBeenCalledTimes(1);
  });
});
