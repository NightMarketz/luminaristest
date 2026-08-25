import { NoActiveAccountingBindingsError } from '../../../lib/errors';
import type { IAccountingEventMapper } from '../../accounting/sync/mappers/IAccountingEventMapper';
import { AccountingBindingV1Schema } from '../dtos/AccountingBindingDto';
import { InterpretedEventMapper } from '../interpreter/InterpretedEventMapper';
import type { ArchetypeCatalog } from '../models/types';
import type { IAccountingBindingRepository } from '../repositories/IAccountingBindingRepository';

/**
 * Uma entrada de registro unit-scoped, forma equivalente a `ScopedAccountingMapperEntry`
 * (`features/accounting/sync/AccountingSyncService.ts`) — DUPLICADA de propósito, não importada:
 * o teste de fronteira `accountingBinding/__tests__/importBoundary.test.ts` (item 13 do BRIEF do
 * P1) só permite importar `IAccountingEventMapper`/`PostEntryInput`/`revenueSplit`/`MAX_CENTS` de
 * `features/accounting` — um tipo do módulo `sync` não está na lista. Mesmo precedente já
 * registrado no header de `IAccountingBindingRepository.ts` para `BindingScope`/`AccountingScope`:
 * "divergência de POSSE (módulo dono diferente), não de shape, é fork sancionado pelo critério de
 * reuso" (`_REUSE-CRITERION.md`). As duas formas são estruturalmente idênticas — TypeScript aceita
 * um valor deste tipo onde `ScopedAccountingMapperEntry` é esperado (Fatia B, fora deste arquivo).
 */
export interface AccountingBindingMapperRegistration {
  readonly unitId: string;
  readonly mapper: IAccountingEventMapper;
}

/**
 * BE-INCR-BINDING-FEEDER (FATIA A, núcleo do alimentador) — o passo que faltava depois de
 * `BE-INCR-BINDING-PRESS` (ADR-P1, PR #211): monta o array de `IAccountingEventMapper` que
 * alimenta `AccountingSyncService` a partir dos `AccountingBinding` `Active` **persistidos no
 * banco**, em vez do import estático `SALON_BINDING_V1` que `lib/factory.ts`
 * (`buildSalonAccountingMappers()`) usa hoje.
 *
 * Onde esta classe vive — decisão de camada (Contrato §2/§3, `_ARCHITECTURE-CONTRACT.md:57`):
 * "Injeção de dependências via Factory. Service recebe repo + policy por construtor... Registrar
 * em `lib/factory.ts` (repo/policy antes do service) + getter". Ler do banco e resolver
 * `archetypeKey→Archetype` é LÓGICA DE NEGÓCIO, não fiação — não pertence a `lib/factory.ts`
 * (composition root, só constrói/registra). Vive aqui, em `accountingBinding` (o módulo DONO do
 * `AccountingBinding`), com o repo e o catálogo injetados por construtor, no padrão de
 * `BindingCompileService`. Isto também é o que fecha F-FEEDER-2 (factory.ts DENTRO do perímetro
 * zero-diff da prova de saída do P2): com a lógica aqui, `lib/factory.ts` chama sempre o MESMO
 * método, goste o vertical que for — nenhuma edição por vertical.
 *
 * Nós vizinhos, intocados por este arquivo: `IAccountingBindingRepository`/`BindingScope`
 * (só uma leitura NOVA — `findAllActive` — foi adicionada à interface, nenhum método existente
 * mudou), `archetypeCatalog` (Corpo A), `InterpretedEventMapper` (Corpo D — só quem o instancia
 * muda, a classe em si segue intocada).
 *
 * FORA DE ESCOPO desta fatia (Fatia B): ninguém chama este serviço ainda. `lib/factory.ts`
 * continua construindo `AccountingSyncService` com `buildSalonAccountingMappers()` (o import
 * estático) — trocar essa chamada por este serviço é o timing de boot (F-FEEDER-5, pré-boot em
 * `server.ts`), que é da Fatia B, não desta.
 */
export class AccountingBindingFeederService {
  constructor(
    private readonly repo: IAccountingBindingRepository,
    private readonly archetypeCatalog: ArchetypeCatalog,
  ) {}

  /**
   * Lê TODOS os `AccountingBinding` `Active` do banco — leitura GLOBAL, sem `BindingScope`
   * (F-FEEDER-3 → (c), RATIFICADO: nenhum parâmetro de escopo) — e resolve cada `eventBinding` de
   * cada linha para um `IAccountingEventMapper`, unit-scoped pelo `unitId` da própria linha
   * (`AccountingBinding.unitId`, coluna de primeira classe — não algo extraído do payload).
   *
   * Modos de falha (nomeados, distinguíveis em log — F-FEEDER-4):
   *   - Zero linhas `Active`: `NoActiveAccountingBindingsError` — falha ALTA, nunca array vazio
   *     silencioso (comportamento 4 do BRIEF: "sobe mudo e falha só por evento" é o modo vetado).
   *   - `archetypeKey` sem correspondente no catálogo: `Error` simples (mesmo padrão de
   *     `buildSalonAccountingMappers()`, `lib/factory.ts` — "fiação da Fase B quebrada"; não é um
   *     dos dois erros nomeados desta fatia, é fiação, igual ao código que já existe).
   *
   * Colisão de `eventKey` (F-FEEDER-3/comportamento 3) NÃO é detectada aqui — é
   * `AccountingSyncService`'s constructor, ao montar o `Map` chaveado por `unitId:sourceType`
   * sobre as entradas devolvidas por este método, que é a autoridade única da colisão
   * (`AccountingEventMapperCollisionError`). Este serviço só achata `Active[] → registrations[]`.
   */
  public async buildActiveMapperRegistrations(): Promise<AccountingBindingMapperRegistration[]> {
    const bindings = await this.repo.findAllActive();
    if (bindings.length === 0) {
      throw new NoActiveAccountingBindingsError();
    }

    const registrations: AccountingBindingMapperRegistration[] = [];
    for (const row of bindings) {
      const payload = AccountingBindingV1Schema.parse(JSON.parse(row.payload));
      for (const binding of payload.eventBindings) {
        const archetype = this.archetypeCatalog.get(binding.archetypeKey);
        if (!archetype) {
          throw new Error(
            `Binding ativo (unidade '${row.unitId}', setor '${row.sectorKey}') referencia o ` +
              `arquétipo '${binding.archetypeKey}' (eventKey '${binding.eventKey}'), ausente do ` +
              `catálogo — fiação da Fase B quebrada.`,
          );
        }
        registrations.push({ unitId: row.unitId, mapper: new InterpretedEventMapper(archetype, binding) });
      }
    }
    return registrations;
  }
}
