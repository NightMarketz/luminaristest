/**
 * BE-INCR-BINDING-FEEDER (Fatia B, F-FEEDER-4/F-FEEDER-5) — `ApplicationFactory.
 * initializeAccountingSyncFromBindings()` contra SQLite REAL (mesmo padrão de
 * `AccountingBindingRepository.integration.test.ts` — sem mock de Prisma; é exatamente a leitura
 * `findAllActive()` real que este teste precisa provar, não o que um mock foi programado para
 * devolver).
 *
 * O QUE ISTO PROVA (com teste, não com prosa — exigência explícita da Fatia B):
 *   1. F-FEEDER-4 — banco sem NENHUM `AccountingBinding` `Active` faz o método REJEITAR com
 *      `NoActiveAccountingBindingsError`. Este é o erro que `server.ts` (pré-boot) propaga para
 *      `process.exit(1)` antes de `app.listen()` — aqui provamos a fonte do erro, não o
 *      `process.exit` em si (server.ts se auto-executa on import; não há precedente de teste
 *      direto sobre ele neste repo — `accountingSyncScheduler`, mesmo módulo de infra, também não
 *      tem).
 *   2. Com bindings `Active` reais, o boot tem sucesso E a instância resultante nunca deixa uma
 *      unidade SEM binding próprio "pegar emprestado" o mapper de outra — o mesmo comportamento já
 *      provado em isolamento por `AccountingSyncService.test.ts`, aqui confirmado ponta-a-ponta
 *      (banco real → feeder real → AccountingSyncService real).
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import { NoActiveAccountingBindingsError, ValidationError } from '@/lib/errors';
import { SALE_BINDING_V1 } from '@/features/accountingBinding/fixtures/saleBinding';
import type { AccountingEvent } from '@/features/accounting/sync/AccountingSyncPort';

const DONO = 'u-feeder-boot';
const UNIDADE_COM_BINDING = 'unit-feeder-boot-a';
const UNIDADE_SEM_BINDING = 'unit-feeder-boot-b';

describe('ApplicationFactory.initializeAccountingSyncFromBindings — SQLite real', () => {
  beforeAll(async () => {
    // pushTestSchema() recria o arquivo do zero (ver test/helpers/db.ts) — garante ZERO linhas
    // AccountingBinding no momento em que o teste 1 roda, sem depender de ordem de execução de
    // outras suítes de integração no mesmo arquivo compartilhado.
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('F-FEEDER-4: zero AccountingBinding Active no banco → rejeita com NoActiveAccountingBindingsError (boot falha)', async () => {
    const factory = ApplicationFactory.getInstance();
    await expect(factory.initializeAccountingSyncFromBindings()).rejects.toBeInstanceOf(
      NoActiveAccountingBindingsError,
    );
  });

  it('com um AccountingBinding Active real, o boot resolve e a instância NUNCA empresta o mapper de outra unidade', async () => {
    await prisma.accountingBinding.create({
      data: {
        userId: DONO,
        unitId: UNIDADE_COM_BINDING,
        sectorKey: SALE_BINDING_V1.sectorKey,
        bindingVersion: 1,
        compiledAt: new Date(),
        compiledFromHash: 'sha256:teste-feeder-boot',
        payload: JSON.stringify(SALE_BINDING_V1),
        status: 'Active',
        createdById: DONO,
      },
    });

    const factory = ApplicationFactory.getInstance();
    await expect(factory.initializeAccountingSyncFromBindings()).resolves.toBeUndefined();

    const sync = factory.getAccountingSyncService();
    const baseEvent: AccountingEvent = {
      sourceType: 'sale.finalized',
      sourceId: 'sale-feeder-boot-1',
      unitId: UNIDADE_SEM_BINDING, // unidade SEM binding próprio — o caso que F-FEEDER-3 fecha
      amount: 100,
      currency: 'BRL',
      occurredAt: new Date().toISOString(),
      label: 'Venda de teste',
    };

    // A unidade SEM binding próprio nunca deve resolver silenciosamente o mapper da unidade A —
    // isso é literalmente o modo de falha silencioso que esta fatia existe para fechar (item 3).
    await expect(
      sync.sync(
        { ownerUserId: DONO, actorUserId: DONO, unitId: UNIDADE_SEM_BINDING, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' },
        baseEvent,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
