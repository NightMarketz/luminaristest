/**
 * BARREIRA REAL — mesmo padrão do PR #255 (92a8bf36, CounterpartyRepository.integration.test.ts),
 * copiado para os dois eventos de AP/AR que carregam o mesmo comentário de intenção em
 * `auditCanonical.ts`:
 *
 *   // INCR-AP — Contas a Pagar. Id-only / money-as-string; NEVER the supplier name (PII-safe, D6).
 *   'payable.created': ['payableId', 'supplierRef', 'amountCents', 'dueDate', 'expenseAccountCode'],
 *   'receivable.created': ['receivableId', 'customerRef', 'amountCents', 'dueDate', 'revenueAccountCode'],
 *
 * O comentário nunca foi verificado por um teste que ficasse VERMELHO se alguém alargasse a
 * allowlist com `supplierName`/`customerName` — exatamente o gap que o #255 fechou para
 * `counterparty.created`/`counterparty.archived`. `PayableService.createPayable` e
 * `ReceivableService.createReceivable` já não montam supplierName/customerName no payload (só
 * supplierRef/customerRef), então — como no #255 — nenhum teste que passe pelo call-site do
 * serviço tem o que a allowlist alargada deixaria vazar: os call-sites testam a si mesmos, não a
 * allowlist. Por isso este teste, como o do #255, chama `AuditService.append()` DIRETO —
 * bypassando PayableService/ReceivableService — com um payload BRUTO contendo `supplierName`/
 * `customerName`, contra o banco de integração real, e afirma sobre o `AuditEvent` PERSISTIDO.
 * O componente sob teste é a ALLOWLIST (`canonicalizeAuditPayload`), não o call-site.
 *
 * Gate do conserto (mesmo experimento, invertido), confirmado manualmente e colado no corpo do
 * PR: com a allowlist como está em `main`, os dois `it` abaixo passam; adicionando
 * `'supplierName'`/`'customerName'` às respectivas entradas, os dois falham em
 * `expect(payload).not.toHaveProperty(...)`.
 *
 * PROIBIDO (decisão já tomada, ver #255): um denylist genérico varrendo toda PAYLOAD_ALLOWLIST por
 * nome de campo de PII — colidiria com `entry.posted`/`entry.drafted`/`entry.draft_updated`, que
 * allowlistam `description` de propósito (o VALOR é sanitizado no call-site via
 * auditDescription; a KEY fica). Este arquivo testa só os dois eventTypes com o campo PII
 * conhecido daquele evento.
 */
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { PayableRepository } from '@/features/accounting/repositories/PayableRepository';
import { ReceivableRepository } from '@/features/accounting/repositories/ReceivableRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-ap-ar-allowlist';
const DONO_A = 'u-ap-ar-allowlist-a';

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const payableRepo = new PayableRepository();
const receivableRepo = new ReceivableRepository();

describe('AuditService.append — barreira real da allowlist para payable.created/receivable.created (padrão #255)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO_A, name: DONO_A, username: DONO_A, email: `${DONO_A}@test.local`, password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('barreira real: AuditService.append() aplica a allowlist mesmo com payload BRUTO contendo supplierName (payable.created)', async () => {
    const auditService = getFactory().getAuditService();
    const scope = escopo(DONO_A);
    const targetId = randomUUID();

    await payableRepo.runTransaction((tx) =>
      auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'payable.created',
        targetType: 'payable',
        targetId,
        // Payload BRUTO — como se um call-site (bugado ou futuro) tivesse injetado a PII direto.
        // A barreira sob teste é a allowlist, não a disciplina do chamador.
        payload: {
          payableId: targetId,
          supplierRef: 'ref-1',
          amountCents: '50000',
          dueDate: '2026-07-10',
          expenseAccountCode: '4.1',
          supplierName: 'Fornecedor Vazado Direto',
        },
      }),
    );

    const evento = await prisma.auditEvent.findFirst({
      where: { scopeUserId: DONO_A, unitId: UNIT, eventType: 'payable.created', targetId },
    });
    expect(evento).not.toBeNull();
    const payload = JSON.parse(evento!.payload) as Record<string, unknown>;
    expect(payload).not.toHaveProperty('supplierName');
    expect(payload.payableId).toBe(targetId);
  });

  it('barreira real: AuditService.append() aplica a allowlist mesmo com payload BRUTO contendo customerName (receivable.created)', async () => {
    const auditService = getFactory().getAuditService();
    const scope = escopo(DONO_A);
    const targetId = randomUUID();

    await receivableRepo.runTransaction((tx) =>
      auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'receivable.created',
        targetType: 'receivable',
        targetId,
        payload: {
          receivableId: targetId,
          customerRef: 'ref-1',
          amountCents: '50000',
          dueDate: '2026-07-10',
          revenueAccountCode: '3.1',
          customerName: 'Cliente Vazado Direto',
        },
      }),
    );

    const evento = await prisma.auditEvent.findFirst({
      where: { scopeUserId: DONO_A, unitId: UNIT, eventType: 'receivable.created', targetId },
    });
    expect(evento).not.toBeNull();
    const payload = JSON.parse(evento!.payload) as Record<string, unknown>;
    expect(payload).not.toHaveProperty('customerName');
    expect(payload.receivableId).toBe(targetId);
  });
});
