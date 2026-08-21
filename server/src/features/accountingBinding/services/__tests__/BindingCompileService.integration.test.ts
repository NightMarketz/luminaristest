/**
 * CONTRATO do BindingCompileService — integração contra SQLite REAL, com o REPOSITÓRIO REAL
 * (`AccountingBindingRepository`, não um mock de prisma). É a CAS de ativação (F-BP-2b) que esta
 * suíte precisa provar, e o CAS só existe de verdade com tx real (mesmo motivo de
 * `ReferentialMappingRepository.integration.test.ts` — lição `repositorios-de-contabilidade-nao-sao-exercitados`).
 *
 * O `IBindingValidationService` injetado é um DUBLÊ controlável (classe de verdade, não
 * `jest.mock`) — o validador determinístico é escopo do Corpo B, ainda inexistente neste
 * worktree; o contrato que o compilador consome é `validate(binding) → BindingValidationResult`
 * (definido em `services/BindingCompileService.ts`, ver comentário lá).
 */
import prisma from '@/lib/prisma';
import type { Prisma } from 'generated/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { AccountingBindingRepository } from '@/features/accountingBinding/repositories/AccountingBindingRepository';
import { resolveBindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { AccountingBindingPolicy } from '@/features/accountingBinding/policies/AccountingBindingPolicy';
import type { IAccountingBindingPolicy } from '@/features/accountingBinding/policies/IAccountingBindingPolicy';
import {
  BindingCompileService,
  type CompileBindingInput,
  type IBindingAuditPort,
  type IBindingValidationService,
} from '@/features/accountingBinding/services/BindingCompileService';
import type { AccountingBindingV1 } from '@/features/accountingBinding/dtos/AccountingBindingDto';
import type { BindingValidationResult } from '@/features/accountingBinding/models/validationResult';
import { ForbiddenError } from '@/lib/errors';

const UNIT = 'unit-compile';
const DONO_A = 'u-compile-a';
const SETOR = 'beautySalon';

const escopo = (userId: string = DONO_A, unitId: string = UNIT): BindingScope =>
  resolveBindingScope({ userId }, unitId);

/** Dublê controlável — devolve sempre o MESMO veredito, escolhido por teste. */
class StubValidationService implements IBindingValidationService {
  constructor(private readonly outcome: BindingValidationResult) {}
  async validate(_binding: AccountingBindingV1): Promise<BindingValidationResult> {
    return this.outcome;
  }
}

const OK: BindingValidationResult = { ok: true, blocking: [], warnings: [] };
const BLOQUEANTE: BindingValidationResult = {
  ok: false,
  blocking: [{ code: 'ACCOUNT_NOT_FOUND', accountCode: '9.9.9', message: 'Conta não existe.' }],
  warnings: [],
};

const inputBasico = (sectorKey: string = SETOR): CompileBindingInput => ({
  sectorKey,
  operationalSchema: { 'salon.sale.finalized': ['amount'] },
  chart: [{ code: '1.1.2', nature: 'Asset', acceptsEntries: true }],
  eventBindings: [
    {
      eventKey: 'salon.sale.finalized',
      archetypeKey: 'revenue_recognition',
      fieldSlots: [{ slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' }],
      roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.2' }],
    },
  ],
});

/**
 * Dublê de `IBindingAuditPort` (item 15 do BRIEF, Fase B) — só REGISTRA os eventos recebidos
 * (nunca toca `AuditService`/`AccountingScope` real: essa conversão é fiação de
 * `lib/factory.ts`, fora do escopo desta suíte de contrato). Exposto como `auditEvents` para os
 * testes que precisam provar EMISSÃO (não é vacuidade: um teste abaixo assere sobre este array).
 */
class RecordingAuditPort implements IBindingAuditPort {
  public readonly events: Parameters<IBindingAuditPort['append']>[2][] = [];
  /** tx handle recebido em CADA chamada — usado para provar "na mesma tx" (item 15 do BRIEF):
   *  todo evento de uma mesma `compile()` chega com o MESMO handle, e esse handle é o cliente
   *  transacional do Prisma, nunca o `prisma` de topo (que não abre tx nenhuma). */
  public readonly txHandles: Prisma.TransactionClient[] = [];
  async append(
    tx: Prisma.TransactionClient,
    _scope: BindingScope,
    event: Parameters<IBindingAuditPort['append']>[2],
  ): Promise<void> {
    this.txHandles.push(tx);
    this.events.push(event);
  }
}

const repo = new AccountingBindingRepository();
const policy = new AccountingBindingPolicy();

const buildService = (outcome: BindingValidationResult, auditPort: IBindingAuditPort = new RecordingAuditPort()) =>
  new BindingCompileService(repo, policy, new StubValidationService(outcome), auditPort);

describe('BindingCompileService — contrato em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO_A, name: DONO_A, username: DONO_A, email: `${DONO_A}@test.local`, password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('CONTROLE: sem bloqueante → auto-ativa (F-BP-2b), versão 1, payload persistido', async () => {
    const service = buildService(OK);
    const setor = 'setor-controle';

    const result = await service.compile(escopo(), inputBasico(setor));

    expect(result.status).toBe('Active');
    expect(result.binding.bindingVersion).toBe(1);
    expect(result.binding.status).toBe('Active');
    const payload = JSON.parse(result.binding.payload) as AccountingBindingV1;
    expect(payload.sectorKey).toBe(setor);
    expect(payload.eventBindings).toHaveLength(1);
  });

  it('bloqueante → persiste Draft, e a Active vigente NÃO é tocada', async () => {
    const setor = 'setor-bloqueante';
    const okService = buildService(OK);
    const primeira = await okService.compile(escopo(), inputBasico(setor));
    expect(primeira.status).toBe('Active');

    const blockingService = buildService(BLOQUEANTE);
    const segunda = await blockingService.compile(escopo(), inputBasico(setor));

    expect(segunda.status).toBe('Draft');
    expect(segunda.validation.ok).toBe(false);
    expect(segunda.binding.bindingVersion).toBe(2); // nova versão nasce de qualquer forma

    // A Active da primeira compilação continua Active — um Draft nunca supersede ninguém.
    const ativaAinda = await repo.findById(escopo(), primeira.binding.id);
    expect(ativaAinda!.status).toBe('Active');
  });

  it('versão monotônica: cada compile() nasce v+1, nunca reutiliza nem edita a anterior', async () => {
    const service = buildService(OK);
    const setor = 'setor-monotonico';

    const v1 = await service.compile(escopo(), inputBasico(setor));
    const v2 = await service.compile(escopo(), inputBasico(setor));
    const v3 = await service.compile(escopo(), inputBasico(setor));

    expect([v1, v2, v3].map((r) => r.binding.bindingVersion)).toEqual([1, 2, 3]);
    expect(new Set([v1, v2, v3].map((r) => r.binding.id)).size).toBe(3); // 3 linhas distintas
  });

  it('compile idempotente re-rodado NUNCA edita a versão anterior — payload da v1 intacto após a v2', async () => {
    const service = buildService(OK);
    const setor = 'setor-idempotente';

    const v1 = await service.compile(escopo(), inputBasico(setor));
    const payloadV1AntesDaV2 = v1.binding.payload;

    await service.compile(escopo(), inputBasico(setor));

    const v1Recarregada = await repo.findById(escopo(), v1.binding.id);
    expect(v1Recarregada!.payload).toBe(payloadV1AntesDaV2);
    expect(v1Recarregada!.bindingVersion).toBe(1); // não virou 2 nem sumiu
  });

  /**
   * CAS de ativação — "segunda ativação concorrente não produz 2 Active". Duas chamadas
   * SEQUENCIAIS (o SQLite do projeto serializa escrita por lock real; concorrência genuína não é
   * reproduzível de forma confiável neste harness — `windows-serializa-sqlite-ci-linux-nao`) que
   * representam a corrida: cada uma lê a Active vigente DENTRO da própria tx e a supersede.
   * Asserção NA SEGUNDA CHAMADA (lição `comentario-de-teste-afirma-o-que-nao-assere`): afirmar só
   * depois da primeira não provaria nada sobre a supersessão, só sobre a criação.
   */
  it('CAS de ativação: segunda "ativação concorrente" (sequencial) não produz 2 Active', async () => {
    const service = buildService(OK);
    const setor = 'setor-cas-ativacao';

    const primeira = await service.compile(escopo(), inputBasico(setor));
    const segunda = await service.compile(escopo(), inputBasico(setor));

    // A afirmação real está DEPOIS da segunda chamada.
    const todas = await repo.findMany(escopo(), { sectorKey: setor });
    const ativas = todas.filter((b) => b.status === 'Active');
    expect(ativas).toHaveLength(1);
    expect(ativas[0].id).toBe(segunda.binding.id);

    const primeiraRecarregada = await repo.findById(escopo(), primeira.binding.id);
    expect(primeiraRecarregada!.status).toBe('Superseded');
  });

  it('validateOnly roda o validador e NÃO persiste nada — controle: compile() no MESMO setor persiste', async () => {
    const service = buildService(OK);
    const setor = 'setor-validate-only';

    const preview = await service.validateOnly(escopo(), inputBasico(setor));
    expect(preview.validation.ok).toBe(true);
    expect(preview.candidate.bindingVersion).toBe(1); // prévia, nunca gravada

    expect(await repo.findMany(escopo(), { sectorKey: setor })).toHaveLength(0);

    // Controle de não-vacuidade: o MESMO input, via compile(), persiste de verdade.
    await service.compile(escopo(), inputBasico(setor));
    expect(await repo.findMany(escopo(), { sectorKey: setor })).toHaveLength(1);
  });

  /**
   * Audit trail (item 15 do BRIEF, Fase B) — `compile()` SEMPRE emite `binding.compiled`; sem
   * bloqueante, emite TAMBÉM `binding.activated`, na MESMA tx (mesmo `tx` handle nas duas
   * chamadas, e esse handle NÃO é o `prisma` de topo — prova de "dentro da tx", não só "foi
   * chamado"). Asserção de payload confirma a disciplina de PII: só ids/versão/sectorKey/status.
   */
  it('sem bloqueante: audit emite binding.compiled + binding.activated, na MESMA tx', async () => {
    const auditPort = new RecordingAuditPort();
    const service = buildService(OK, auditPort);
    const setor = 'setor-audit-ativado';

    const result = await service.compile(escopo(), inputBasico(setor));

    expect(auditPort.events.map((e) => e.eventType)).toEqual(['binding.compiled', 'binding.activated']);
    expect(auditPort.events[0].targetId).toBe(result.binding.id);
    expect(auditPort.events[0].payload).toEqual({
      bindingId: result.binding.id,
      sectorKey: setor,
      bindingVersion: 1,
      status: 'Active',
    });
    expect(auditPort.events[1].payload).toEqual({
      bindingId: result.binding.id,
      sectorKey: setor,
      bindingVersion: 1,
    });
    // Mesma tx: os 2 eventos desta ÚNICA compile() chegam com o MESMO handle, e não é o `prisma`
    // de topo (que nunca abre transação nenhuma).
    expect(auditPort.txHandles).toHaveLength(2);
    expect(auditPort.txHandles[0]).toBe(auditPort.txHandles[1]);
    expect(auditPort.txHandles[0]).not.toBe(prisma);
  });

  it('bloqueante: audit emite binding.compiled + binding.validation_failed, NUNCA binding.activated', async () => {
    const auditPort = new RecordingAuditPort();
    const service = buildService(BLOQUEANTE, auditPort);
    const setor = 'setor-audit-bloqueado';

    const result = await service.compile(escopo(), inputBasico(setor));

    expect(auditPort.events.map((e) => e.eventType)).toEqual(['binding.compiled', 'binding.validation_failed']);
    expect(auditPort.events.some((e) => e.eventType === 'binding.activated')).toBe(false);
    expect(auditPort.events[1].payload).toEqual({
      bindingId: result.binding.id,
      sectorKey: setor,
      bindingVersion: 1,
      blockingCount: BLOQUEANTE.blocking.length,
    });
  });

  it('policy nega → ForbiddenError, e NADA é escrito (defesa em profundidade, mesmo padrão de EntryApprovalService)', async () => {
    const negaTudo: IAccountingBindingPolicy = {
      canCompile: () => false,
      canValidate: () => false,
      canRead: () => false,
    };
    const auditPort = new RecordingAuditPort();
    const service = new BindingCompileService(repo, negaTudo, new StubValidationService(OK), auditPort);
    const setor = 'setor-policy-nega';

    await expect(service.compile(escopo(), inputBasico(setor))).rejects.toThrow(ForbiddenError);
    expect(await repo.findMany(escopo(), { sectorKey: setor })).toHaveLength(0);
    expect(auditPort.events).toHaveLength(0); // policy barra ANTES de abrir tx — nenhum audit emitido
  });
});
