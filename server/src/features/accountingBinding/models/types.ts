/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — tipos do catálogo de arquétipos e os PORTS que os
 * corpos paralelos (validador, compilador, intérprete) consomem sem importar `features/accounting`
 * (invariante 6 do ADR-P1-binding-press.md — o pipeline de geração nunca importa o módulo contábil).
 *
 * Fonte: `docs/accounting/P1-DOSSIER-arquetipos.md` §4 (esboço de tipo, linhas 292-387) — este
 * arquivo materializa o esboço, já com os forks do ADR-P1 ratificados 2026-08-21:
 *   - F-P1-1(b): a union `Archetype` tem os DOIS membros (postEntry + comando de subrazão), não 1.
 *   - F-BP-3(a): `AccountRole` está CONGELADA nesta fase (9 papéis, ponto de partida do dossiê §4).
 *   - F-P1-5(a): papel→conta resolve na COMPILAÇÃO — por isso o `accountCode` do binding é sempre
 *     literal (ver `AccountingBindingDto.ts`), não um lookup em runtime; nada neste arquivo muda por
 *     causa disso (o esboço já registrava que F-P1-5 não muda o shape do `Archetype`, só onde o
 *     `accountCode` literal vive).
 */

// ---------------------------------------------------------------------------------------------
// AccountRole — união FECHADA (F-BP-3a). Os 9 papéis extraídos do corpus real de mappers
// (P1-DOSSIER-arquetipos.md:298-307). Nenhum arquétipo pode referenciar um papel fora desta lista;
// o catálogo em código NUNCA guarda o código de conta do salão como constante — só o PAPEL. O
// código concreto (`accountCode`) só existe no binding compilado (F-P1-5a), nunca aqui.
// ---------------------------------------------------------------------------------------------
export type AccountRole =
  | 'controle-recebível'
  | 'receita-serviço'
  | 'receita-revenda'
  | 'caixa-por-metodo' // resolve por sub-chave (paymentMethod) — não é 1 conta fixa
  | 'contra-receita'
  | 'passivo-diferido'
  | 'passivo-adiantamento'
  | 'custo-mercadoria-vendida'
  | 'estoque';

/** Lista em runtime da union acima — única fonte de verdade para checagens de pertinência
 *  (ex.: "todo `role` usado pelos arquétipos pertence à union", teste do item 3 do BRIEF). */
export const ACCOUNT_ROLES: readonly AccountRole[] = [
  'controle-recebível',
  'receita-serviço',
  'receita-revenda',
  'caixa-por-metodo',
  'contra-receita',
  'passivo-diferido',
  'passivo-adiantamento',
  'custo-mercadoria-vendida',
  'estoque',
] as const;

// ---------------------------------------------------------------------------------------------
// SlotType — as duas classes de slot monetário observadas no corpus (§2.5 do dossiê é a única do
// 2º tipo hoje), mais os tipos não-monetários que os arquétipos usam.
// ---------------------------------------------------------------------------------------------
export type SlotType =
  | 'moneyReais' // float reais → cents pelo INTÉRPRETE (guards: isFinite, round, isSafeInteger, >0)
  | 'moneyCentsExact' // já inteiro — só revalida teto (guards: isSafeInteger, >0, <=MAX_CENTS)
  | 'revenueByNatureReais' // par {serviceReais, productReais} — alimenta o splitter canônico
  | 'enumLookup' // ex.: paymentMethod — resolve por tabela fixa, sem default silencioso
  | 'dateISO'
  | 'string';

/** Slot de dado que um arquétipo expõe — o binding preenche, nunca define. */
export interface ArchetypeSlotSpec {
  name: string;
  type: SlotType;
  /** Nomeados, não implementados aqui — o intérprete fixo (não o binding) os aplica (F-P1-4a). */
  guards: string[];
}

/** Uma perna (linha) de um lançamento balanceado por construção. */
export interface ArchetypeLine {
  role: AccountRole;
  side: 'debit' | 'credit';
  /** Nome do slot (ou do resultado do splitter) que preenche esta linha. */
  amountSlot: string;
  /** true só para linhas que o splitter pode omitir quando o valor cai a zero (ex.: receita-revenda). */
  optional?: boolean;
}

/**
 * Classe 1 do corpus — evento → `PostEntryInput` balanceado. Cobre os 5 arquétipos de
 * `P1-DOSSIER-arquetipos.md` §2 (reconhecimento-receita, liquidação, estorno-origem,
 * passivo-performance, cmv). Sempre no catálogo v1.
 */
export interface LancamentoArchetype {
  kind: 'postEntry';
  name: string;
  sourceType: string;
  slots: ArchetypeSlotSpec[];
  lines: ArchetypeLine[]; // balanceia por construção — Σdebit === Σcredit simbolicamente, no arquétipo
  invariants: string[]; // tags livres: 'revenue-split-by-nature' | 'T5-no-edit' | 'already-cents' | ...
}

/**
 * Classe 2 (F-P1-1b, RATIFICADA) — evento → comando de subrazão. Efeito de runtime DIFERENTE: não
 * produz `PostEntryInput`, produz um comando que o ciclo do subledger (ex.: `ReceivableService`)
 * consome. Extraída do `CrmReceivableBridge` (`P1-DOSSIER-arquetipos.md` §3).
 */
export interface SubledgerCommandArchetype {
  kind: 'createSubledgerRecord';
  name: string; // ex.: 'criacao-titulo-receber'
  sourceType: string;
  targetSubledger: 'receivable' | 'payable';
  slots: ArchetypeSlotSpec[];
  /** ex.: padrão 'documentNumber' observado em CrmReceivableBridge. Os 3 guards de idempotência em
   *  si (chave por documentNumber, lookup tombstone-aware, cancelado nunca ressuscita) ficam em
   *  CÓDIGO do arquétipo classe-2 — nunca em dado do binding (ADR §11, registro da ratificação
   *  F-P1-1b — cerca anti-§4 do master map). Este campo só nomeia a chave, não implementa o guard. */
  idempotencyKey: string;
  invariants: string[]; // ex.: 'legacy-sourcetype-guard', 'twin-race-converge', 'period-preflight-nonauthoritative'
}

/** F-P1-1(b) RATIFICADA — union de 2 membros (efeito `postEntry` × efeito `subledger-command`). */
export type Archetype = LancamentoArchetype | SubledgerCommandArchetype;

/** Catálogo de arquétipos em código testado — implementado pelo Corpo A (item 4/5 do BRIEF). */
export interface ArchetypeCatalog {
  get(key: string): Archetype | undefined;
  all(): Archetype[];
}

// ---------------------------------------------------------------------------------------------
// PORTS — a fronteira que o validador/compilador/intérprete (Corpos B/C/D) consomem SEM importar
// `features/accounting` (Contrato §2.1, invariante 6 do ADR-P1). A implementação concreta destes
// ports (ex.: um adaptador sobre `AccountRepository`/`PostingService`) é fiação da Fase B — este
// arquivo só declara o contrato que os corpos paralelos programam contra.
// ---------------------------------------------------------------------------------------------

/** Shape mínimo de uma conta do plano de contas que o validador precisa enxergar — espelha os
 *  campos de `Account` (Prisma) usados por `PostingService.resolveLeafAccount`/`AccountRepository`,
 *  sem importar o tipo Prisma do módulo `features/accounting`. */
export interface ChartAccountLookup {
  code: string;
  nature: string;
  acceptsEntries: boolean;
}

/**
 * Porta de leitura do plano de contas do tenant. Espelha `AccountRepository.findByCode` (já filtra
 * `deletedAt: null` do lado da implementação — este contrato não expõe conta soft-deleted, ela
 * simplesmente não é encontrada, mesmo padrão anti-enumeração de `ReferentialMappingService`).
 */
export interface ChartLookupPort {
  findLeafAccountByCode(code: string): Promise<ChartAccountLookup | null>;
}

/**
 * Porta do modo validate-only do `PostingService.postEntry` (F-P1-6b1, emenda §8 do ADR — a ÚNICA
 * refatoração interna permitida no núcleo imutável). Roda todas as validações do lançamento
 * (balanceamento, resolução de conta, natureza, etc.) e NÃO persiste — nem linha, nem evento de
 * audit. Rejeita (throw) na primeira violação; sucesso = resolve sem valor. A implementação
 * concreta (dentro de `PostingService`) é do Corpo B (item 7 do BRIEF), não deste arquivo.
 */
export interface PostingValidatePort {
  validateOnly(input: unknown): Promise<void>;
}
