import { ACCOUNT_ROLES } from '../models/types';
import type {
  AccountRole,
  ArchetypeCatalog,
  ArchetypeSlotSpec,
  ChartLookupPort,
  LancamentoArchetype,
  PostingValidatePort,
} from '../models/types';
import type { BindingValidationIssue, BindingValidationResult } from '../models/validationResult';
import type { AccountingBindingV1, EventBinding, FieldSlot } from '../dtos/AccountingBindingDto';
import { interpret } from '../interpreter/interpret';
import type { AccountingEventLike } from '../interpreter/interpret';

/**
 * BindingValidationService — validador determinístico da Prensa (BE-INCR-BINDING-PRESS, F-P1-6,
 * Corpo B do BRIEF, item 6). Fonte: `docs/accounting/P1-DOSSIER-validador.md` §1 (checklist de 9
 * checagens) + §3.2 (contrato de saída, já materializado em `../models/validationResult.ts`).
 *
 * Consome `ArchetypeCatalog` e `ChartLookupPort` (ambos de `../models/types.ts`, Fase 0) — NUNCA
 * importa `features/accounting` diretamente (invariante 6 do ADR-P1-binding-press.md; a fronteira
 * de import é verificada pelo teste de item 13 do BRIEF, fora do escopo deste corpo).
 *
 * Checagem 9 do dossiê ("resolução papel→conta é determinística") COLAPSA em F-P1-5(a), RATIFICADA:
 * como `roleSlots[].accountCode` é SEMPRE literal (resolvido na compilação, nunca em runtime), as
 * checagens #3–#6 já rodam contra esse `accountCode` literal — não existe checagem #9 separada
 * nesta implementação (dossiê §1, linha da checagem 9: "proposto, condicional ao fork" — o fork
 * fechou em (a), então a condição nunca dispara o ramo (b) que exigiria uma checagem própria).
 *
 * Checagem 5 ("conta ativa") COLAPSA na checagem #3 por desenho do `ChartLookupPort` (mesmo padrão
 * anti-enumeração de `ReferentialMappingService`): uma conta soft-deleted simplesmente não é
 * encontrada — `findLeafAccountByCode` devolve `null` tanto para "não existe" quanto para "existe
 * mas está inativa", e as duas situações emitem o MESMO `ACCOUNT_NOT_FOUND` (dossiê §1, checagem 5:
 * "mesma mensagem de #3 — indistinguível de propósito, anti-enumeração").
 *
 * DRY-RUN (F-P1-6b1, ativado nesta versão) — para cada `eventBinding` classe-1 (`postEntry`) SEM
 * bloqueante estrutural (checagens #1-#7 acima), o validador monta 1 `AccountingEventLike` sintético
 * (valores mínimos válidos por slot — nunca decisão sobre conteúdo de evento real, ver
 * `buildSyntheticEvent`), chama o `interpret()` REAL do intérprete (mesma função que roda em
 * produção — reuso, não reimplementação da forma do payload) e passa o `PostEntryInput` resultante
 * para `postingValidatePort.validateOnly(...)`. Qualquer erro — do `interpret()` (ex. papel
 * `caixa-por-metodo` sem sub-chave mapeada) ou do `validateOnly` (ex. período fechado, conta
 * inativa que passou pelo `ChartLookupPort` mas falha no núcleo por outro motivo) — vira um
 * `DRY_RUN_FAILED` bloqueante: sob F-BP-2(b) (auto-ativação pós-validador), este é o ÚNICO gate
 * antes do caminho do dinheiro, então a simulação TEM de estar viva, não só fiada.
 * Classe-2 (`createSubledgerRecord`) fica FORA do dry-run — não existe um `validateOnly` de
 * subledger (o port só cobre `PostEntryInput`).
 */

/**
 * Tabela papel→naturezas permitidas — a checagem #6 (o gap central que a Prensa introduz; dossiê
 * §1, linha 49: "nenhum service hoje valida nature contra o papel/slot"). Construída por leitura
 * REAL dos 5 mappers de produção (evidência, não memória — `ADR-P1-binding-press.md:44-51` +
 * `P1-DOSSIER-arquetipos.md` §2), não por invenção:
 *
 *  - `controle-recebível`         → Asset   (`1.1.2`, `SaleFinalizedMapper.ts:22`)
 *  - `receita-serviço`            → Revenue (`3.1`, `revenueSplit.ts:22`)
 *  - `receita-revenda`            → Revenue (`3.3`, `revenueSplit.ts:23`)
 *  - `contra-receita`             → Revenue (`3.2` é Revenue na `ChartOfAccountsFixture.ts` — a
 *                                    linha É de débito, mas a CONTA em si tem natureza Revenue,
 *                                    "Devoluções de Vendas")
 *  - `passivo-diferido`           → Liability (`2.1.1`, `SalePackageSoldMapper.ts:22`)
 *  - `custo-mercadoria-vendida`   → Expense (`4.2`, `SaleCogsMapper.ts:29`)
 *  - `estoque`                    → Asset   (`1.1.6`, `SaleCogsMapper.ts:30`)
 *  - `caixa-por-metodo`           → Asset **E** Liability — NÃO é 1:1. `SaleSettledMapper.ts`
 *                                    resolve por sub-chave de `paymentMethod`: Cash/Pix/Card caem em
 *                                    contas Asset (`1.1.1`/`1.1.3`/`1.1.4`), mas 'Package Balance'
 *                                    resolve para `2.1.1` (Liability, "Pacotes Pré-pagos") —
 *                                    `SaleSettledMapper.ts:16-20,85-89` (guard nomeado, D1-Q10:
 *                                    "Package Balance → 2.1.1, Liability ← NEVER cash"). Preservado
 *                                    verbatim por decorrência do fork F-BP-5 (ADR-P1 §11, "guard
 *                                    permitido no intérprete, verbatim" — a mesma divergência de
 *                                    natureza que o guard do mapper já tolera hoje tem que
 *                                    continuar tolerada aqui, senão o validador rejeitaria um
 *                                    binding que reproduz o comportamento ATUAL do salão).
 *  - `passivo-adiantamento`       → Liability. Papel congelado (F-BP-3a) mas SEM uso em nenhum dos
 *                                    5 arquétipos do corpus v1 (não aparece em `P1-DOSSIER-
 *                                    arquetipos.md` §2) — natureza atribuída pelo PREFIXO do nome
 *                                    ("passivo") e pela mesma família semântica de
 *                                    `passivo-diferido`; nenhum binding do corpus v1 deveria
 *                                    referenciá-lo, mas a tabela cobre a union INTEIRA (F-BP-3a) —
 *                                    não deixar um papel congelado sem entrada aqui seria a mesma
 *                                    classe de bug que `AccountRole.test.ts` (Fase 0) já varre
 *                                    por exaustividade type-level do lado do catálogo de papéis.
 */
const ROLE_ALLOWED_NATURES: Readonly<Record<AccountRole, readonly string[]>> = {
  'controle-recebível': ['Asset'],
  'receita-serviço': ['Revenue'],
  'receita-revenda': ['Revenue'],
  'caixa-por-metodo': ['Asset', 'Liability'], // F-BP-5 — Package Balance guard, verbatim
  'contra-receita': ['Revenue'],
  'passivo-diferido': ['Liability'],
  'passivo-adiantamento': ['Liability'],
  'custo-mercadoria-vendida': ['Expense'],
  estoque: ['Asset'],
};

/**
 * CORREÇÃO (review independente, finding high) — extrai o papel-base de um `roleSlot.role` que
 * pode carregar sub-chave embutida na convenção `"<papel>:<subChave>"`. Hoje só o papel
 * `caixa-por-metodo` usa essa convenção (`SaleSettledMapper.ts:36-42`, resolvido por
 * `paymentMethod`) — documentada em `dtos/CompileBindingDto.ts:16-22` ("decisão local... não um
 * fork do ADR") e ESPELHADA por `interpreter/interpret.ts:166-171,179-190`, que já consome
 * exatamente essa convenção (`roleToAccount.get('caixa-por-metodo:' + methodValue)`). O binding
 * real do salão (`fixtures/saleBinding.ts:105-109`) grava uma `roleSlot` por sub-chave
 * (`'caixa-por-metodo:Cash'`, `'caixa-por-metodo:Pix'`, ...) — o validador precisa reconhecer essas
 * entradas como o MESMO papel `caixa-por-metodo` do arquétipo (`SettlementArchetype.ts:47`), senão
 * rejeita o próprio binding de referência com `SLOT_UNFILLED`/`SLOT_ORPHAN` falsos-positivos e a
 * checagem #6 (natureza×papel) nunca dispara para essas entradas (lookup por string composta
 * sempre `undefined` em `ROLE_ALLOWED_NATURES`). Sem ':' no role, devolve o próprio role
 * inalterado — nenhum outro papel do catálogo v1 usa esta convenção.
 */
function baseRole(role: string): string {
  const separatorIndex = role.indexOf(':');
  return separatorIndex === -1 ? role : role.slice(0, separatorIndex);
}

export class BindingValidationService {
  constructor(
    private readonly catalog: ArchetypeCatalog,
    private readonly chartLookup: ChartLookupPort,
    // Aciona a simulação dry-run F-P1-6(b1) — ver "DRY-RUN" no header do arquivo.
    private readonly postingValidatePort: PostingValidatePort,
  ) {}

  /**
   * Valida um `AccountingBindingV1` já parseado pelo Zod (`AccountingBindingV1Schema`) contra o
   * catálogo de arquétipos e o plano de contas do tenant. `blocking.length === 0` é literalmente a
   * condição de ativação sob F-BP-2(b) (auto-ativação pós-validador, ver `validationResult.ts`).
   *
   * `today` (data-only `YYYY-MM-DD`, injetável) — a data do lançamento sintético do dry-run
   * (F-P1-6b1). Parâmetro, não `new Date()` direto no corpo, para o teste poder fixar um dia com
   * período aberto sem depender do relógio real (mesma classe de bug de
   * `teste-de-hoje-quebra-em-janela-utc`). Default = hoje real, para quem chama em produção.
   */
  async validate(binding: AccountingBindingV1, today: string = todayDateOnly()): Promise<BindingValidationResult> {
    const blocking: BindingValidationIssue[] = [];
    const warnings: BindingValidationIssue[] = [];

    for (const eventBinding of binding.eventBindings) {
      await this.validateEventBinding(eventBinding, blocking, today);
    }

    // Checagem #8 (metade estrutural — a metade "já ativo nesta versão" exige comparar contra o
    // histórico de bindings persistidos, que este serviço não enxerga por desenho: não importa
    // nenhum repositório de `accountingBinding`, essa comparação é responsabilidade do compilador,
    // Corpo C do BRIEF, item 9, que decide se um binding candidato vira a PRÓXIMA versão ou não).
    // `AccountingBindingV1Schema` já garante `bindingVersion` inteiro positivo na FORMA — esta
    // checagem é defesa em profundidade para quem chama `validate()` sem ter passado pelo Zod
    // (ex.: um binding montado programaticamente pelo compilador antes do round-trip de parse).
    if (!Number.isInteger(binding.bindingVersion) || binding.bindingVersion < 1) {
      blocking.push({
        code: 'VERSION_INVALID',
        message: `Versão de binding '${binding.bindingVersion}' inválida — recompile para gerar uma versão positiva.`,
      });
    }

    return { ok: blocking.length === 0, blocking, warnings };
  }

  private async validateEventBinding(
    eventBinding: EventBinding,
    blocking: BindingValidationIssue[],
    today: string,
  ): Promise<void> {
    // Marca d'água para medir, no fim da função, se ESTE eventBinding (não os outros do binding, o
    // array `blocking` é compartilhado) acumulou algum bloqueante estrutural — só um eventBinding
    // limpo tem o que simular no dry-run (rodar `interpret()` sobre um binding com SLOT_UNFILLED,
    // por exemplo, joga um erro de forma que não é o defeito real: o defeito real já foi reportado).
    const blockingCountBeforeThisEventBinding = blocking.length;

    // Checagem #1 — arquétipo existe. CONTRATO CRUZADO com o Corpo A: `ArchetypeCatalog.get()` é
    // chamado com o MESMO `archetypeKey` do DTO (`revenue_recognition` | 'settlement' | ... |
    // 'subledger_command', `AccountingBindingDto.ts` `ArchetypeKeySchema`) — o catálogo de código
    // (Corpo A) precisa registrar cada arquétipo sob essa MESMA chave para esta checagem ter
    // sentido; o `Archetype.name` (`'reconhecimento-receita'`, PT-BR) é um rótulo humano
    // independente, não a chave de lookup.
    const archetype = this.catalog.get(eventBinding.archetypeKey);
    if (!archetype) {
      blocking.push({
        code: 'ARCHETYPE_UNKNOWN',
        message: `Arquétipo '${eventBinding.archetypeKey}' não existe no catálogo da prensa.`,
      });
      return; // sem arquétipo resolvido, nenhuma outra checagem deste eventBinding tem o que comparar
    }

    // Checagem #7 (metade field-slot) — slot órfão: todo fieldSlot do binding precisa existir no
    // arquétipo.
    const declaredFieldSlotNames = new Set(archetype.slots.map((s) => s.name));
    for (const fieldSlot of eventBinding.fieldSlots) {
      if (!declaredFieldSlotNames.has(fieldSlot.slotName)) {
        blocking.push({
          code: 'SLOT_ORPHAN',
          slot: fieldSlot.slotName,
          message: `Binding referencia o slot '${fieldSlot.slotName}', que não existe no arquétipo '${eventBinding.archetypeKey}'.`,
        });
      }
    }

    // Checagem #2 (metade field-slot) — todo slot obrigatório do arquétipo está preenchido.
    const providedFieldSlotNames = new Set(eventBinding.fieldSlots.map((s) => s.slotName));
    for (const declaredSlot of archetype.slots) {
      if (!providedFieldSlotNames.has(declaredSlot.name)) {
        blocking.push({
          code: 'SLOT_UNFILLED',
          slot: declaredSlot.name,
          message: `Slot obrigatório '${declaredSlot.name}' do arquétipo '${eventBinding.archetypeKey}' não foi preenchido no binding.`,
        });
      }
    }

    // Papéis exigidos pelo arquétipo — só arquétipos `kind: 'postEntry'` declaram papel (via
    // `lines[].role`); `createSubledgerRecord` não tem `lines` no shape congelado da Fase 0
    // (`models/types.ts`), então não há papel "exigido" a cruzar para essa classe.
    const requiredRoles: readonly AccountRole[] =
      archetype.kind === 'postEntry' ? Array.from(new Set(archetype.lines.map((l) => l.role))) : [];

    // Checagem #2 (metade papel) + #7 (metade papel) — todo papel exigido está presente E nenhum
    // roleSlot referencia um papel que o arquétipo não usa (só verificável para 'postEntry', que é
    // a única classe com uma lista de papéis exigidos para comparar). Comparação por PAPEL-BASE
    // (`baseRole`, ver definição acima) — `caixa-por-metodo:Cash` conta como o papel
    // `caixa-por-metodo` exigido pela linha do arquétipo, não como um papel desconhecido.
    const providedRoles = new Set(eventBinding.roleSlots.map((r) => baseRole(r.role)));
    if (archetype.kind === 'postEntry') {
      for (const role of requiredRoles) {
        if (!providedRoles.has(role)) {
          blocking.push({
            code: 'SLOT_UNFILLED',
            slot: role,
            message: `Slot obrigatório '${role}' (papel) do arquétipo '${eventBinding.archetypeKey}' não foi preenchido no binding.`,
          });
        }
      }
      for (const roleSlot of eventBinding.roleSlots) {
        if (!requiredRoles.includes(baseRole(roleSlot.role) as AccountRole)) {
          blocking.push({
            code: 'SLOT_ORPHAN',
            slot: roleSlot.role,
            message: `Binding referencia o papel '${roleSlot.role}', que não é usado pelo arquétipo '${eventBinding.archetypeKey}'.`,
          });
        }
      }
    } else {
      // CORREÇÃO (review independente, finding medium) — 'createSubledgerRecord' não declara
      // `lines`, então não há lista de papéis exigidos para cruzar (por isso o ramo acima nem
      // roda para esta classe). Sem checagem própria aqui, um `role` inventado/malformado (ou uma
      // string fora da union congelada `AccountRole`, F-BP-3a) passava batido: nem o slot órfão
      // (gated a 'postEntry' acima) nem a checagem #6 abaixo (lookup em `ROLE_ALLOWED_NATURES`
      // silenciosamente `undefined` para papel desconhecido, guard `if (allowedNatures && ...)`
      // vira no-op) pegavam o caso. Verifica só a PERTINÊNCIA do papel-base à union — não há
      // "papel usado pelo arquétipo" para comparar nesta classe, então SLOT_ORPHAN aqui significa
      // "papel fora do catálogo", não "papel não usado por este arquétipo específico".
      for (const roleSlot of eventBinding.roleSlots) {
        if (!ACCOUNT_ROLES.includes(baseRole(roleSlot.role) as AccountRole)) {
          blocking.push({
            code: 'SLOT_ORPHAN',
            slot: roleSlot.role,
            message: `Binding referencia o papel '${roleSlot.role}', que não pertence ao catálogo de papéis (AccountRole).`,
          });
        }
      }
    }

    // Checagens #3/#4/#5/#6 — rodam contra o accountCode LITERAL de cada roleSlot presente
    // (F-P1-5a: o binding sempre carrega o código já resolvido na compilação).
    for (const roleSlot of eventBinding.roleSlots) {
      const account = await this.chartLookup.findLeafAccountByCode(roleSlot.accountCode);

      // Checagem #3 (+ #5, colapsada — ver header do arquivo).
      if (!account) {
        blocking.push({
          code: 'ACCOUNT_NOT_FOUND',
          slot: roleSlot.role,
          accountCode: roleSlot.accountCode,
          message: `Conta '${roleSlot.accountCode}' referenciada no slot '${roleSlot.role}' não existe no plano de contas.`,
        });
        continue; // sem conta resolvida, #4/#6 não têm o que comparar para este roleSlot
      }

      // Checagem #4 — conta aceita lançamento (é folha).
      if (!account.acceptsEntries) {
        blocking.push({
          code: 'ACCOUNT_NOT_LEAF',
          slot: roleSlot.role,
          accountCode: roleSlot.accountCode,
          message: `Conta '${roleSlot.accountCode}' é sintética (não aceita partidas); o slot '${roleSlot.role}' exige conta-folha.`,
        });
      }

      // Checagem #6 — natureza compatível com o papel (o GAP CENTRAL que a Prensa introduz — ver
      // ROLE_ALLOWED_NATURES acima). Lookup por PAPEL-BASE (`baseRole`): `caixa-por-metodo:Cash`
      // resolve para a mesma entrada `caixa-por-metodo` (Asset|Liability, guard do Package Balance
      // F-BP-5) — sem isso o lookup por string composta era sempre `undefined` e a checagem nunca
      // disparava para o arquétipo `settlement` (o caso de produção que ela existe para proteger).
      // Papel-base fora da union congelada (F-BP-3a) não tem entrada na tabela: a checagem
      // simplesmente não dispara para ele — mas agora isso só acontece para papel já bloqueado por
      // outra checagem (slot órfão para 'postEntry', ou a checagem de pertinência acima para
      // 'createSubledgerRecord'), nunca mais silenciosamente para um papel válido.
      const allowedNatures = ROLE_ALLOWED_NATURES[baseRole(roleSlot.role) as AccountRole];
      if (allowedNatures && !allowedNatures.includes(account.nature)) {
        blocking.push({
          code: 'NATURE_MISMATCH',
          slot: roleSlot.role,
          accountCode: roleSlot.accountCode,
          message: `Conta '${roleSlot.accountCode}' (natureza ${account.nature}) não é compatível com o papel '${roleSlot.role}' (esperado: ${allowedNatures.join(' ou ')}).`,
        });
      }
    }

    // DRY-RUN (F-P1-6b1) — só para classe-1 (`postEntry`; classe-2 não tem `validateOnly` de
    // subledger, ver header do arquivo) E só quando este eventBinding específico não acumulou
    // NENHUM bloqueante estrutural acima (`blockingCountBeforeThisEventBinding`): rodar o
    // intérprete sobre um binding já comprovadamente quebrado (slot órfão, papel não preenchido,
    // conta inexistente) produziria um erro de FORMA (`interpret()`/`resolveLineAccountCode`
    // jogando por falta de dado), não o defeito real já reportado — ruído, não sinal novo.
    if (archetype.kind === 'postEntry' && blocking.length === blockingCountBeforeThisEventBinding) {
      await this.runDryRun(archetype, eventBinding, today, blocking);
    }
  }

  /**
   * Executa a simulação dry-run de UM eventBinding classe-1: monta o evento sintético, chama o
   * `interpret()` REAL (mesma função de produção) e passa o `PostEntryInput` resultante para
   * `PostingValidatePort.validateOnly`. `interpret()` é síncrono e pode lançar `ValidationError`
   * (ex. papel `caixa-por-metodo` sem sub-chave mapeada, splitter de receita com papel não
   * declarado) — o mesmo catch cobre os dois pontos de falha porque, do ponto de vista do
   * validador, ambos significam a mesma coisa: "este binding não produz um lançamento que o núcleo
   * aceitaria".
   */
  private async runDryRun(
    archetype: LancamentoArchetype,
    eventBinding: EventBinding,
    today: string,
    blocking: BindingValidationIssue[],
  ): Promise<void> {
    try {
      const syntheticEvent = buildSyntheticEvent(archetype, eventBinding, today);
      const syntheticInput = interpret({ archetype, binding: eventBinding, event: syntheticEvent });
      await this.postingValidatePort.validateOnly(syntheticInput);
    } catch (err) {
      blocking.push({
        code: 'DRY_RUN_FAILED',
        message: `Simulação dry-run do evento '${eventBinding.eventKey}' (arquétipo '${eventBinding.archetypeKey}') falhou: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  }
}

/** `YYYY-MM-DD` de hoje, UTC — mesmo formato `isValidDateOnly` que `PostEntrySchema.date` exige
 *  (`PostingDto.ts`). Default real de `validate()`; testes injetam um `today` fixo (ver doc do
 *  parâmetro em `validate()`). */
function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Monta o `AccountingEventLike` sintético que alimenta o `interpret()` real no dry-run — valores
 * MÍNIMOS VÁLIDOS por `slot.type`/`fieldSlot.transform`, nunca dado que simule um evento real (não
 * é isso que o dry-run prova: prova que a FORMA do binding produz um lançamento aceitável, não que
 * um evento específico aconteceu). `sourceId`/`unitId`/`label` levam o marcador `dry-run-synthetic`
 * — nunca colidem com idempotência real e não deixam rastro (`validateOnly` não persiste).
 */
function buildSyntheticEvent(
  archetype: LancamentoArchetype,
  eventBinding: EventBinding,
  today: string,
): AccountingEventLike {
  // CONVENÇÃO `caixa-por-metodo:<método>` (ver interpret.ts:166-171) — usa a PRIMEIRA sub-chave já
  // declarada nos `roleSlots` do próprio binding para o valor do slot `enumLookup`, para que
  // `resolveLineAccountCode` encontre a conta que o binding realmente mapeou, em vez de inventar um
  // método que ele não mapeou (o que seria um DRY_RUN_FAILED falso-positivo).
  const enumSubKey = eventBinding.roleSlots
    .map((r) => r.role)
    .find((role) => role.includes(':'))
    ?.split(':')[1];

  const fields: Record<string, unknown> = {
    sourceType: archetype.sourceType,
    sourceId: `dry-run-synthetic:${eventBinding.eventKey}`,
    unitId: 'dry-run-synthetic-unit',
    amount: 1,
    currency: 'BRL',
    occurredAt: today,
    label: `[SIMULAÇÃO DRY-RUN] ${archetype.name}`,
  };

  for (const fieldSlot of eventBinding.fieldSlots) {
    const slotSpec = archetype.slots.find((s) => s.name === fieldSlot.slotName);
    if (!slotSpec) continue; // slot órfão já é SLOT_ORPHAN bloqueante — dry-run nem chega a rodar para este eventBinding
    const key = fieldSlot.sourceField.startsWith('event.')
      ? fieldSlot.sourceField.slice('event.'.length)
      : fieldSlot.sourceField;
    fields[key] = syntheticSlotValue(slotSpec, fieldSlot, today, enumSubKey);
  }

  return fields as unknown as AccountingEventLike;
}

/** Valor mínimo válido para UM slot, por `slot.type`/`fieldSlot.transform` — mesmas 2 variantes de
 *  guard monetário que `interpreter/money.ts` documenta (`cents_from_reais` vs. já-em-centavos). */
function syntheticSlotValue(
  slot: ArchetypeSlotSpec,
  fieldSlot: FieldSlot,
  today: string,
  enumSubKey: string | undefined,
): unknown {
  if (fieldSlot.transform === 'cents_from_reais') return 1; // 1,00 real → 100 centavos pelo intérprete
  switch (slot.type) {
    case 'moneyCentsExact':
      return 100; // já inteiro, mínimo positivo válido
    case 'revenueByNatureReais':
      return { serviceReais: 1, productReais: 0 };
    case 'enumLookup':
      // Sem sub-chave nenhuma declarada no binding: string vazia — resolveLineAccountCode bloqueia
      // isso de propósito ("papel exige um slot enumLookup resolvido"), corretamente reportado como
      // DRY_RUN_FAILED (o binding realmente não sabe resolver caixa-por-metodo sem uma sub-chave).
      return enumSubKey ?? '';
    case 'dateISO':
      return today;
    case 'string':
    default:
      return ''; // dimension e afins — vazio é ausência válida (resolveDimensions trata como não-mapeado)
  }
}
