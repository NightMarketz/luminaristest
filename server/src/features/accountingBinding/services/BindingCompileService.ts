import { createHash } from 'crypto';
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingBinding, Prisma } from 'generated/prisma';
import { AccountingBindingV1Schema } from '../dtos/AccountingBindingDto';
import type { AccountingBindingV1, EventBinding } from '../dtos/AccountingBindingDto';
import type { ChartAccountSnapshot } from '../dtos/CompileBindingDto';
import type { AccountingBindingStatus } from '../models/accountingBindingStatus';
import type { BindingValidationResult } from '../models/validationResult';
import type { BindingScope, IAccountingBindingRepository } from '../repositories/IAccountingBindingRepository';
import type { IAccountingBindingPolicy } from '../policies/IAccountingBindingPolicy';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — porta que o compilador consome para rodar o
 * validador determinístico (Corpo B, itens 6-8 do BRIEF). Definida AQUI (não em `models/types.ts`,
 * arquivo de Fase 0 que este corpo não possui) porque é o CONSUMIDOR quem define a interface que
 * precisa (Dependency Inversion) — a classe concreta do Corpo B implementa esta forma por
 * tipagem estrutural, sem precisar importar este arquivo. Único método: `validate(binding)`, sem
 * `ChartLookupPort`/`ArchetypeCatalog` explícitos na assinatura — esses ports são responsabilidade
 * de fiação do PRÓPRIO validador (Fase B), não deste compilador (item 9 do BRIEF: "chama
 * BindingValidationService (injetado por construtor, interface)" — uma dependência, um método).
 */
export interface IBindingValidationService {
  validate(binding: AccountingBindingV1): Promise<BindingValidationResult>;
}

/**
 * A Prensa (item 15 do BRIEF, Fase B) — porta de audit trail do compilador. Mesmo padrão de
 * Dependency Inversion de `IBindingValidationService` acima: definida AQUI porque é o CONSUMIDOR
 * quem precisa da forma, não importada de `features/accounting` (`AuditService`/`AccountingScope`
 * NÃO estão na lista de contratos públicos permitidos pelo teste de fronteira do item 13, Corpo D)
 * — a Fase B fornece o adaptador concreto sobre `AuditService` real em `lib/factory.ts`, fora dos
 * dois módulos, então nem `features/accountingBinding` nem `features/accounting` precisam se
 * importar um ao outro para isto existir.
 *
 * Os 3 eventTypes emitidos por `BindingCompileService.compile()` (`binding.compiled`,
 * `binding.activated`, `binding.validation_failed`) entram na allowlist de
 * `features/accounting/audit/auditCanonical.ts` NA MESMA mudança (item 15 do BRIEF) — disciplina
 * de PII: só ids/versão/sectorKey/status, nunca nome/label.
 */
export interface IBindingAuditPort {
  append(
    tx: Prisma.TransactionClient,
    scope: BindingScope,
    event: {
      eventType: 'binding.compiled' | 'binding.activated' | 'binding.validation_failed';
      targetId: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void>;
}

/** Entrada de `compile()`/`validateOnly()` — "schema operacional + chart do tenant + escolhas
 *  papel→conta" (BRIEF item 9). `eventBindings` já carrega os `roleSlots[].accountCode` literais
 *  (F-P1-5a: a escolha papel→conta acontece ANTES de chegar aqui; este service não resolve
 *  papel→conta, só valida o que foi escolhido via `IBindingValidationService`). */
export interface CompileBindingInput {
  sectorKey: string;
  /** Schema operacional do preset instalado — canonicalizado para `compiledFromHash`. */
  operationalSchema: Record<string, unknown>;
  /** Snapshot do plano de contas usado nesta compilação — idem, insumo do hash de staleness. */
  chart: ChartAccountSnapshot[];
  eventBindings: EventBinding[];
}

export interface CompileBindingResult {
  binding: AccountingBinding;
  validation: BindingValidationResult;
  /** Gate de cobertura de evento (BE-INCR-P2-VERTICAL-CLINICA, comportamento 5) — ver `computeEventCoverage`. */
  coverage: BindingCoverageReport;
  status: AccountingBindingStatus;
}

/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco II, comportamento 5 (contrato §4.4 do BRIEF). Achado que
 * origina este gate: o dispatcher lança `ValidationError` quando não acha mapper para um evento
 * (`AccountingSyncService.ts`), mas a ponte CAPTURA esse erro e só loga — a venda grava, nenhum
 * lançamento nasce, o HTTP devolve 200. Um binding de setor a que falte um `eventKey` que a
 * operação instalada emite produz uma ECD silenciosamente incompleta: o arquivo é gerado, passa os
 * gates internos, e falta receita/CMV/o que for. **Ratificado (F-P2-6, segunda metade): o gate vive
 * na GERAÇÃO do sistema (aqui, em `compile()`) — um binding incompleto nunca chega a virar `Active`**,
 * em vez de derrubar o processo depois, em runtime.
 *
 * **Nota de nomenclatura (review independente PR #282, achado 4):** a ratificação do dono
 * (ADR-P2 F-P2-6) descreve o gate como vivendo "no alimentador" — nome que aponta para
 * `AccountingBindingFeederService`, a classe batizada pelo BE-INCR-BINDING-FEEDER. Este gate mora
 * em `BindingCompileService.compile()`, não naquela classe. É o mesmo EFEITO ratificado (gate na
 * GERAÇÃO, não no boot; binding incompleto nunca vira `Active`) por um componente com outro nome:
 * `compile()` é o único caminho de geração de um `AccountingBinding` — tanto
 * `POST /accounting-binding/compile` quanto o CLI de ativação (`activateAccountingBindingCli.ts`)
 * passam por aqui — e `AccountingBindingFeederService` é estritamente um leitor de bindings JÁ
 * `Active` no boot (`buildActiveMapperRegistrations()`), sem acesso a `operationalSchema`/
 * `eventBindings` candidatos para comparar. Colocar o gate lá exigiria mover a comparação para
 * DEPOIS da ativação — o oposto do que a ratificação pede. Divergência de nome do componente
 * citado no texto do dono, não de efeito.
 *
 * `emittableEventKeys` é `Object.keys(input.operationalSchema)` — o MESMO campo que já alimentava só
 * o hash de staleness (`compiledFromHash`) passa a ter um SEGUNDO papel: quem monta o
 * `operationalSchema` (o CLI de ativação, F-P2-7) é responsável por listar, sob essa chave, TODO
 * `eventKey` que a operação instalada do setor pode emitir — nenhum DTO novo, nenhum campo novo
 * (BRIEF §4.3: "se este incremento precisar alterar qualquer um dos três DTOs do módulo, isso é
 * sinal de falha da prensa").
 *
 * `missing` (emitível \ vinculado) é BLOQUEANTE — é exatamente o caso do achado acima. `orphan`
 * (vinculado \ emitível — o binding referencia um evento que a operação instalada não emite) é só
 * informativo: um binding "generoso" não corrompe nada, e não é o modo de falha que este gate existe
 * para pegar.
 *
 * **Resíduo aberto, registrado no ADR (não resolvido aqui):** o CLI de ativação
 * (`activateAccountingBindingCli.ts`) é um SEGUNDO caminho de escrita de `AccountingBinding` — este
 * gate roda dentro de `compile()`, que o CLI também chama (mesmo caminho de
 * `POST /accounting-binding/compile`), então ele COBRE o CLI. O que ele não cobre é qualquer futura
 * via de escrita que bypasse `BindingCompileService.compile()` inteiramente (ex.: migração de dado
 * direta) — decisão fora do escopo deste incremento.
 */
export interface BindingCoverageReport {
  unitId: string;
  sectorKey: string;
  boundEventKeys: string[];
  emittableEventKeys: string[];
  /** `emittable \ bound` — não-vazio = reprova (ECD ficaria incompleta em silêncio). */
  missing: string[];
  /** `bound \ emittable` — informativo, não bloqueia. */
  orphan: string[];
}

export function computeEventCoverage(
  unitId: string,
  sectorKey: string,
  operationalSchema: Record<string, unknown>,
  eventBindings: EventBinding[],
): BindingCoverageReport {
  const emittableEventKeys = Object.keys(operationalSchema).sort();
  const boundEventKeys = eventBindings.map((eb) => eb.eventKey).sort();
  const emittableSet = new Set(emittableEventKeys);
  const boundSet = new Set(boundEventKeys);
  return {
    unitId,
    sectorKey,
    boundEventKeys,
    emittableEventKeys,
    missing: emittableEventKeys.filter((k) => !boundSet.has(k)),
    orphan: boundEventKeys.filter((k) => !emittableSet.has(k)),
  };
}

export interface ValidateBindingResult {
  /** Prévia do candidato — NÃO persistido (item 15: "roda validador sem persistir"). */
  candidate: AccountingBindingV1;
  validation: BindingValidationResult;
}

/**
 * `BindingCompileService` — Corpo C, item 9 do BRIEF. Compila `(schema + chart + escolhas
 * papel→conta)` num `AccountingBindingV1` validado e persistido:
 *
 *   SEM bloqueante ⇒ auto-ativa (F-BP-2b, RATIFICADA): a nova versão nasce `Active` e a versão
 *   `Active` anterior (se houver) vira `Superseded` ATOMICAMENTE na MESMA `runTransaction` — o
 *   gate (qual é a versão Active vigente) é RE-LIDO com o handle da tx, nunca com um valor lido
 *   antes de abrir a transação (T6, `authoritative-gate-inside-tx`).
 *
 *   COM bloqueante ⇒ persiste `Draft` com o `BindingValidationResult` (devolvido na resposta —
 *   o schema da tabela não tem coluna própria para o resultado; ver `IAccountingBindingRepository`
 *   e o comentário do model em `schema.prisma:1163-1166`).
 *
 * `bindingVersion` é monotônico por (userId,unitId,sectorKey) e NUNCA edita uma linha existente
 * (invariante 4 do ADR) — toda chamada de `compile()`, com ou sem bloqueante, nasce uma linha
 * NOVA com `bindingVersion = max()+1`, lido DENTRO da mesma tx que escreve (mesmo motivo do T6
 * acima: duas compilações "concorrentes" no SQLite do projeto serializam no lock de escrita —
 * `windows-serializa-sqlite-ci-linux-nao` — então a leitura tem que acontecer depois de adquirir
 * o lock, nunca antes).
 */
export class BindingCompileService {
  constructor(
    private readonly repo: IAccountingBindingRepository,
    private readonly policy: IAccountingBindingPolicy,
    private readonly validationService: IBindingValidationService,
    private readonly auditPort: IBindingAuditPort,
  ) {}

  /** Compila e persiste (Draft ou auto-ativa Active — ver header da classe). */
  async compile(scope: BindingScope, input: CompileBindingInput): Promise<CompileBindingResult> {
    if (!this.policy.canCompile(scope)) {
      throw new ForbiddenError('Você não tem permissão para compilar bindings contábeis.');
    }
    const compiledAt = new Date();
    const compiledFromHash = computeCompiledFromHash(input.operationalSchema, input.chart);

    return this.repo.runTransaction(async (tx) => {
      // T6 — versão lida DENTRO da tx, imediatamente antes de escrever.
      const currentMax = await this.repo.findMaxVersion(scope, input.sectorKey, tx);
      const nextVersion = currentMax + 1;

      const candidate = this.buildCandidate(input, nextVersion, compiledAt, compiledFromHash);
      const validation = await this.validationService.validate(candidate);
      // Gate de cobertura de evento (BE-INCR-P2-VERTICAL-CLINICA, comportamento 5) — roda SEMPRE,
      // independente do validador estrutural: um binding pode passar nas 9 checagens do validador
      // (todo eventBinding presente é válido) e AINDA assim faltar um eventBinding inteiro que a
      // operação instalada emite. `missing` não-vazio reprova a ativação — ver `computeEventCoverage`.
      const coverage = computeEventCoverage(scope.unitId, input.sectorKey, input.operationalSchema, input.eventBindings);
      const status: AccountingBindingStatus = validation.ok && coverage.missing.length === 0 ? 'Active' : 'Draft';

      const created = await this.repo.create(
        scope,
        {
          sectorKey: input.sectorKey,
          bindingVersion: nextVersion,
          compiledAt,
          compiledFromHash,
          payload: JSON.stringify(candidate),
          status,
          createdById: scope.actorUserId,
        },
        tx,
      );

      // Audit (item 15 do BRIEF): SEMPRE registra a compilação, NA MESMA tx que a escreveu — ids/
      // versão/sectorKey/status apenas (disciplina de PII, nunca nome/label — ver PAYLOAD_ALLOWLIST
      // de `auditCanonical.ts`).
      await this.auditPort.append(tx, scope, {
        eventType: 'binding.compiled',
        targetId: created.id,
        payload: { bindingId: created.id, sectorKey: input.sectorKey, bindingVersion: nextVersion, status },
      });

      if (status === 'Active') {
        await this.activateAtomically(scope, input.sectorKey, created, tx);
        await this.auditPort.append(tx, scope, {
          eventType: 'binding.activated',
          targetId: created.id,
          payload: { bindingId: created.id, sectorKey: input.sectorKey, bindingVersion: nextVersion },
        });
      } else {
        // `blockingCount` soma os bloqueantes estruturais do validador COM os `missing` do gate de
        // cobertura — as duas são razões independentes de reprovar a ativação (comportamento 5).
        await this.auditPort.append(tx, scope, {
          eventType: 'binding.validation_failed',
          targetId: created.id,
          payload: {
            bindingId: created.id,
            sectorKey: input.sectorKey,
            bindingVersion: nextVersion,
            blockingCount: validation.blocking.length + coverage.missing.length,
          },
        });
      }

      return { binding: created, validation, coverage, status };
    });
  }

  /** Roda o validador determinístico sem persistir (item 15: `/accounting-binding/validate`). */
  async validateOnly(scope: BindingScope, input: CompileBindingInput): Promise<ValidateBindingResult> {
    if (!this.policy.canValidate(scope)) {
      throw new ForbiddenError('Você não tem permissão para validar bindings contábeis.');
    }
    // Leitura de PRÉVIA, fora de tx — não reserva/consome nenhuma versão real (nada é escrito).
    const currentMax = await this.repo.findMaxVersion(scope, input.sectorKey);
    const compiledFromHash = computeCompiledFromHash(input.operationalSchema, input.chart);
    const candidate = this.buildCandidate(input, currentMax + 1, new Date(), compiledFromHash);
    const validation = await this.validationService.validate(candidate);
    return { candidate, validation };
  }

  /** `GET /accounting-binding` — lista as versões (vivas) do escopo. */
  async list(
    scope: BindingScope,
    filters: { sectorKey?: string; status?: AccountingBindingStatus },
  ): Promise<AccountingBinding[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler bindings contábeis.');
    }
    return this.repo.findMany(scope, filters);
  }

  // ---------------------------------------------------------------------------
  // Privado
  // ---------------------------------------------------------------------------

  private buildCandidate(
    input: CompileBindingInput,
    bindingVersion: number,
    compiledAt: Date,
    compiledFromHash: string,
  ): AccountingBindingV1 {
    const raw = {
      sectorKey: input.sectorKey,
      bindingVersion,
      compiledAt: compiledAt.toISOString(),
      compiledFromHash,
      eventBindings: input.eventBindings,
    };
    const parsed = AccountingBindingV1Schema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Binding candidato malformado.', parsed.error.flatten());
    }
    return parsed.data;
  }

  /**
   * Auto-ativação atômica (F-BP-2b): supersede a Active vigente (se houver) e deixa a linha
   * recém-criada como a única Active — tudo dentro da MESMA tx que já criou `created`. A leitura
   * de "qual é a Active vigente" acontece com o MESMO handle `tx`, então enxerga qualquer escrita
   * anterior desta própria transação e nunca um snapshot fora dela (T6).
   */
  private async activateAtomically(
    scope: BindingScope,
    sectorKey: string,
    created: AccountingBinding,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const currentActive = await this.repo.findActive(scope, sectorKey, tx);
    if (!currentActive || currentActive.id === created.id) return;
    // CAS: 0 linhas afetadas significa que a versão antiga já não estava Active (outra escrita
    // chegou primeiro nesta mesma tx/lock) — não é erro, é o próprio ponto do CAS: a linha nova
    // que ESTE compile() criou já é a única Active pela leitura acima, então o resultado final
    // (1 Active) se sustenta de qualquer forma.
    await this.repo.supersedeIfActive(scope, currentActive.id, tx);
  }
}

/**
 * `compiledFromHash = sha256(schema + chart canônicos)` (BRIEF item 9). Canonicaliza (ordena
 * chaves de objeto recursivamente; ordena o array do chart por `code`) antes de serializar, para
 * que o MESMO conteúdo semântico sempre produza o MESMO hash independente da ordem de inserção —
 * senão o hash "detecta staleness" por acidente de ordenação, não por mudança real de dado.
 */
export function computeCompiledFromHash(
  operationalSchema: Record<string, unknown>,
  chart: ChartAccountSnapshot[],
): string {
  const canonicalSchema = canonicalize(operationalSchema);
  const canonicalChart = [...chart]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => canonicalize(a));
  const digest = createHash('sha256')
    .update(JSON.stringify({ operationalSchema: canonicalSchema, chart: canonicalChart }))
    .digest('hex');
  return `sha256:${digest}`;
}

/** Ordena chaves de objeto recursivamente (arrays preservam ordem — só o chart acima é reordenado
 *  explicitamente, por semântica de conjunto). */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, canonicalize(v)]));
  }
  return value;
}
