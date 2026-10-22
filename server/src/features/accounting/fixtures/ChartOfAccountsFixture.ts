/**
 * ChartOfAccountsFixture — the canonical plano de contas seeded into the `contas`
 * table by the posting engine.
 *
 * "Job-generator / não hardcode no service": the account definitions live HERE as a
 * declarative fixture; PostingService.ensureChartOfAccounts only ENSURES them
 * idempotently (create-if-missing by `code`). Hierarchy is by coded key (no
 * parentId, Contract §2.1) — `acceptsEntries: false` on the roots/branches,
 * `true` only on the leaves that receive ledger lines (`partidas`).
 */
export type AccountNature = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface CanonicalAccount {
  code: string;
  name: string;
  nature: AccountNature;
  acceptsEntries: boolean;
}

export const CANONICAL_ACCOUNTS: ReadonlyArray<CanonicalAccount> = [
  // ── Patrimonial em 4 níveis (BE-INCR-PLANO-4-NIVEIS, L8 do RUNBOOK-H1; ADR-PLANO-CONTAS-4-NIVEIS) ──
  // Manual da ECD L9 (maio/2026) p. 120, REGRA_VALIDA_NIVEL_CONTAS: analítica de natureza 01/02/03 (ativo, passivo,
  // PL) com NIVEL >= 4; o nível do I050 é a profundidade do código. Grupos pelo art. 178 da Lei 6.404/1976 (redação
  // da Lei 11.941/2009): ativo circulante; passivo circulante; patrimônio líquido (F-L8-2 a). Os códigos analíticos de
  // antes (1.1.1…2.3.1) foram renomeados no lugar, por id (F-L8-1 a; tabela `RENOMEACAO_CANONICA_L8` abaixo, que a
  // migração de dado também lê) — o código antigo pode reaparecer como sintética (F-L8-3 a).
  { code: '1', name: 'Ativo', nature: 'Asset', acceptsEntries: false },
  { code: '1.1', name: 'Ativo Circulante', nature: 'Asset', acceptsEntries: false },
  { code: '1.1.1', name: 'Disponível', nature: 'Asset', acceptsEntries: false },
  { code: '1.1.1.01', name: 'Banco', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.1.02', name: 'Caixa', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.2', name: 'Créditos', nature: 'Asset', acceptsEntries: false },
  // A Receber (POS do salão; a ponte do salão debita aqui).
  { code: '1.1.2.01', name: 'A Receber', nature: 'Asset', acceptsEntries: true },
  // Settlement debit leaf (Incremento D / D1-QMAP): card payments land here (the acquirer owes
  // us until the deposit clears) — gross, NOT net; the acquirer fee is a separate Incremento F.
  { code: '1.1.2.02', name: 'A Receber Cartão / Adquirente', nature: 'Asset', acceptsEntries: true },
  // Contas a Receber (INCR-AR / ADR-INCR-AR F7): the DEDICATED control account of the AR-formal
  // subledger. The recognition of a customer invoice debits this Asset leaf; the receipt credits it.
  // Deliberately DISTINCT from `A Receber` (POS do salão) so Σ open Receivable rows == saldo(Clientes a
  // Receber) — a subledger↔GL tie-out a shared leaf would break. BP maps it automatically (nature-only).
  { code: '1.1.2.03', name: 'Clientes a Receber', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.3', name: 'Estoques', nature: 'Asset', acceptsEntries: false },
  // Estoques (INCR-INVENTORY / ADR-INCR-INVENTORY F-INV0 → a): the DEDICATED control account of the
  // perpetual inventory subledger. An INBOUND (seed or AP purchase) debits this Asset leaf; a sale's
  // CMV credits it. Σ InventoryItem.totalValueCents == saldo(leaf) is the tie-out (mirrors AR).
  { code: '1.1.3.01', name: 'Mercadorias para Revenda', nature: 'Asset', acceptsEntries: true },
  // Liability tower (Incremento D / D1-Q10): a Package Balance settlement debits the prepaid
  // liability (service delivered against an advance), NEVER cash. `2` is the synthetic root.
  { code: '2', name: 'Passivo', nature: 'Liability', acceptsEntries: false },
  { code: '2.1', name: 'Passivo Circulante', nature: 'Liability', acceptsEntries: false },
  { code: '2.1.1', name: 'Obrigações com Clientes', nature: 'Liability', acceptsEntries: false },
  { code: '2.1.1.01', name: 'Pacotes Pré-pagos', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.2', name: 'Fornecedores', nature: 'Liability', acceptsEntries: false },
  // Contas a Pagar (INCR-AP / ADR-INCR-AP D2): the recognition of a supplier obligation credits
  // this Liability leaf; the settlement debits it. BP maps it automatically (nature-only).
  { code: '2.1.2.01', name: 'Fornecedores a Pagar', nature: 'Liability', acceptsEntries: true },
  // BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 6, F-IRD-15; dono 21/10: "2.1.7 e 2.1.3.05, plano padrão" → "(a) com 2.1.7.03" —
  // o 2.1.3 é a sintética "Obrigações Tributárias" dos kits v6). Passivo do sócio (L11) e o IRRF retido na distribuição.
  { code: '2.1.7', name: 'Obrigações com Sócios', nature: 'Liability', acceptsEntries: false },
  { code: '2.1.7.01', name: 'Dividendos a Pagar', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.7.02', name: 'Juros sobre o Capital Próprio a Pagar', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.7.03', name: 'IRRF a Recolher', nature: 'Liability', acceptsEntries: true },
  // IBS-CBS-2027 PR-2 (item 12, F-IBS-8 c; dono 21/10: "2.1.8.01 / 2.1.8.02" — fora do 2.1.3 "Obrigações Tributárias" dos
  // kits v6, que colidiu no IRRF): o passivo da reclassificação mensal receita → IBS/CBS a recolher.
  { code: '2.1.8', name: 'Tributos sobre o Consumo a Recolher', nature: 'Liability', acceptsEntries: false },
  { code: '2.1.8.01', name: 'IBS a Recolher', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.8.02', name: 'CBS a Recolher', nature: 'Liability', acceptsEntries: true },
  // Patrimônio Líquido (BE-INCR-SPED-APURACAO / D4): the closing entry (encerramento do
  // resultado) posts the exercise's net result here. `2.3` is the synthetic PL branch under the
  // `2` Passivo group (COD_NAT is per-account in I050, so a PL leaf under Passivo is conforme).
  { code: '2.3', name: 'Patrimônio Líquido', nature: 'Equity', acceptsEntries: false },
  { code: '2.3.1', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity', acceptsEntries: false },
  { code: '2.3.1.01', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity', acceptsEntries: true },
  // BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 6): contas do PL que a base do JCP lê (IN 1.700 art. 75 I e IV).
  { code: '2.3.2', name: 'Capital Social', nature: 'Equity', acceptsEntries: false },
  { code: '2.3.2.01', name: 'Capital Social Integralizado', nature: 'Equity', acceptsEntries: true },
  { code: '2.3.3', name: 'Reservas de Lucros', nature: 'Equity', acceptsEntries: false },
  { code: '2.3.3.01', name: 'Reserva Legal', nature: 'Equity', acceptsEntries: true },
  // ── Resultado: fora da REGRA_VALIDA_NIVEL_CONTAS (COD_NAT 04) — inalterado ──
  { code: '3', name: 'Receita', nature: 'Revenue', acceptsEntries: false },
  // Revenue split by NATURE (ADR-INCR-REVENUE-SPLIT): the ECF-Presumido Bloco P applies a
  // per-activity presumption (services 32/32 vs resale 8/12), so revenue MUST be booked to
  // distinct leaves. `3.1` keeps its stable code and is the SERVICES leaf; `3.3` is the resale leaf.
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue', acceptsEntries: true },
  // Contra-revenue (Incremento D / D2-Q5a): a return debits this Revenue-nature leaf, so
  // net revenue (Σ crédito − débito over Revenue accounts) is REDUCED by returns.
  { code: '3.2', name: 'Devoluções de Vendas', nature: 'Revenue', acceptsEntries: true },
  { code: '3.3', name: 'Receita de Revenda de Mercadorias', nature: 'Revenue', acceptsEntries: true },
  // Receita por não uso (BE-INCR-PACOTE-VALIDADE, F-PV-4 a): the remaining prepaid balance of an expired
  // package is released from Pacotes Pré-pagos into this Revenue leaf. Kept SEPARATE from 3.1 so the
  // accountant's answer changes only the mapping, never reclassifies history.
  { code: '3.4', name: 'Receita de Pacotes Não Utilizados', nature: 'Revenue', acceptsEntries: true },
  // Emenda 3.3 (BE-INCR-ENCARGOS-DESCONTOS, PR-1, E1; F-ENC-1 a, dono 09/10): receita financeira dos encargos
  // recebidos e do desconto condicional obtido (IN 1.700 art. 144; RIR/2018 art. 397). Grupo próprio `3.5` (o `3.4` é
  // do PACOTE-VALIDADE). DRE → seção `financialResult` (F-ENC-9 a, dono 13/10). Zero migração (create-if-missing).
  { code: '3.5', name: 'Receitas Financeiras', nature: 'Revenue', acceptsEntries: false },
  { code: '3.5.1', name: 'Juros de Mora Recebidos', nature: 'Revenue', acceptsEntries: true },
  { code: '3.5.2', name: 'Multas de Mora Recebidas', nature: 'Revenue', acceptsEntries: true },
  { code: '3.5.3', name: 'Descontos Financeiros Obtidos', nature: 'Revenue', acceptsEntries: true },
  { code: '4', name: 'Despesa', nature: 'Expense', acceptsEntries: false },
  { code: '4.1', name: 'Despesas Operacionais', nature: 'Expense', acceptsEntries: true },
  // Custo das Mercadorias Vendidas (INCR-INVENTORY / ADR-INCR-INVENTORY F-INV0 → a, D7): the CMV leaf.
  // A sale's cost recognition debits this Expense leaf. Mapped EXPLICITLY into the DRE `costOfGoodsSold`
  // section (StatementMappingFixture dre.cogs, order 250 < dre.expenses 300).
  { code: '4.2', name: 'Custo das Mercadorias Vendidas', nature: 'Expense', acceptsEntries: true },
  // Emenda 3.3 (PR-1, E1; F-ENC-1 a): despesa financeira (juros e multa de mora pagos — dedutíveis, a multa de mora é a
  // "compensatória" da IN 1.700 art. 132 — e desconto condicional concedido) → DRE `financialResult` (F-ENC-9 a).
  { code: '4.3', name: 'Despesas Financeiras', nature: 'Expense', acceptsEntries: false },
  { code: '4.3.1', name: 'Juros de Mora Pagos', nature: 'Expense', acceptsEntries: true },
  { code: '4.3.2', name: 'Multas de Mora Pagas', nature: 'Expense', acceptsEntries: true },
  { code: '4.3.3', name: 'Descontos Financeiros Concedidos', nature: 'Expense', acceptsEntries: true },
  // BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 6): despesa de JCP (forma DESPESA, F-IRD-11; Lei 9.249 art. 9º).
  { code: '4.3.4', name: 'Juros sobre o Capital Próprio', nature: 'Expense', acceptsEntries: true },
  // Multas indedutíveis (IN 1.700 arts. 132 e 133; Lei 8.981 art. 41 § 5º; RIR/2018 art. 352 § 5º): ficam em `expenses`
  // pela regra só por natureza; a adição na Parte A é o PR-4 (X4). Nome e grupo provisórios até o contador (BRIEF §6.2).
  { code: '4.4', name: 'Multas Indedutíveis', nature: 'Expense', acceptsEntries: false },
  { code: '4.4.1', name: 'Multas Fiscais Punitivas (de Ofício)', nature: 'Expense', acceptsEntries: true },
  { code: '4.4.2', name: 'Multas de Natureza Não Tributária', nature: 'Expense', acceptsEntries: true },
  // Tarifa bancária/de gateway (EMENDA T, E26; F-ENC-1 a): despesa operacional, fora do resultado financeiro e do e-Lalur
  // (L9). Folha `4.6`, não `4.5`: o kit v3 (KIT-SETOR F-KE-1 a) já usa 4.5.1/4.5.2 para IRPJ/CSLL (dono, 13/10).
  { code: '4.6', name: 'Tarifas Bancárias e de Intermediação', nature: 'Expense', acceptsEntries: true },
];

/**
 * BE-INCR-PLANO-4-NIVEIS (L8): de-para dos códigos analíticos patrimoniais do plano de 3 níveis para o de 4. Fonte
 * única — a migração de dado (`jobs/migratePlano4NiveisCli.ts`), os bindings V2 e o kit v3 derivam daqui. Nunca
 * edite uma linha publicada: a migração já rodou em tenant com ela.
 */
export const RENOMEACAO_CANONICA_L8: ReadonlyArray<{ de: string; para: string }> = [
  { de: '1.1.1', para: '1.1.1.01' }, // Banco
  { de: '1.1.3', para: '1.1.1.02' }, // Caixa
  { de: '1.1.2', para: '1.1.2.01' }, // A Receber
  { de: '1.1.4', para: '1.1.2.02' }, // A Receber Cartão / Adquirente
  { de: '1.1.5', para: '1.1.2.03' }, // Clientes a Receber
  { de: '1.1.6', para: '1.1.3.01' }, // Estoques → Mercadorias para Revenda
  { de: '2.1.1', para: '2.1.1.01' }, // Pacotes Pré-pagos
  { de: '2.1.2', para: '2.1.2.01' }, // Fornecedores a Pagar
  { de: '2.3.1', para: '2.3.1.01' }, // Lucros ou Prejuízos Acumulados
];

/**
 * O plano canônico de 3 níveis como era ANTES da L8 — congelado. Só valida os kits publicados naquele plano
 * (F-L8-9 a, dono 13/10: cada versão de kit é validada contra o plano da sua época). Nunca instala nada.
 */
export const CANONICAL_ACCOUNTS_PRE_L8: ReadonlyArray<CanonicalAccount> = [
  { code: '1', name: 'Ativo', nature: 'Asset', acceptsEntries: false },
  { code: '1.1.1', name: 'Banco', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.2', name: 'A Receber', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.3', name: 'Caixa', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.4', name: 'A Receber Cartão / Adquirente', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.5', name: 'Clientes a Receber', nature: 'Asset', acceptsEntries: true },
  { code: '1.1.6', name: 'Estoques', nature: 'Asset', acceptsEntries: true },
  { code: '2', name: 'Passivo', nature: 'Liability', acceptsEntries: false },
  { code: '2.1.1', name: 'Pacotes Pré-pagos', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.2', name: 'Fornecedores a Pagar', nature: 'Liability', acceptsEntries: true },
  { code: '2.3', name: 'Patrimônio Líquido', nature: 'Equity', acceptsEntries: false },
  { code: '2.3.1', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity', acceptsEntries: true },
  { code: '3', name: 'Receita', nature: 'Revenue', acceptsEntries: false },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue', acceptsEntries: true },
  { code: '3.2', name: 'Devoluções de Vendas', nature: 'Revenue', acceptsEntries: true },
  { code: '3.3', name: 'Receita de Revenda de Mercadorias', nature: 'Revenue', acceptsEntries: true },
  { code: '3.4', name: 'Receita de Pacotes Não Utilizados', nature: 'Revenue', acceptsEntries: true },
  // Emenda 3.3 (#656) entrou em main antes da L8: o plano da época dos kits v5 já tem as 9 folhas.
  { code: '3.5', name: 'Receitas Financeiras', nature: 'Revenue', acceptsEntries: false },
  { code: '3.5.1', name: 'Juros de Mora Recebidos', nature: 'Revenue', acceptsEntries: true },
  { code: '3.5.2', name: 'Multas de Mora Recebidas', nature: 'Revenue', acceptsEntries: true },
  { code: '3.5.3', name: 'Descontos Financeiros Obtidos', nature: 'Revenue', acceptsEntries: true },
  { code: '4', name: 'Despesa', nature: 'Expense', acceptsEntries: false },
  { code: '4.1', name: 'Despesas Operacionais', nature: 'Expense', acceptsEntries: true },
  { code: '4.2', name: 'Custo das Mercadorias Vendidas', nature: 'Expense', acceptsEntries: true },
  { code: '4.3', name: 'Despesas Financeiras', nature: 'Expense', acceptsEntries: false },
  { code: '4.3.1', name: 'Juros de Mora Pagos', nature: 'Expense', acceptsEntries: true },
  { code: '4.3.2', name: 'Multas de Mora Pagas', nature: 'Expense', acceptsEntries: true },
  { code: '4.3.3', name: 'Descontos Financeiros Concedidos', nature: 'Expense', acceptsEntries: true },
  { code: '4.4', name: 'Multas Indedutíveis', nature: 'Expense', acceptsEntries: false },
  { code: '4.4.1', name: 'Multas Fiscais Punitivas (de Ofício)', nature: 'Expense', acceptsEntries: true },
  { code: '4.4.2', name: 'Multas de Natureza Não Tributária', nature: 'Expense', acceptsEntries: true },
  { code: '4.6', name: 'Tarifas Bancárias e de Intermediação', nature: 'Expense', acceptsEntries: true },
];

/** Código novo de um código antigo do de-para L8 (ou o próprio código, se não está na tabela). */
export function codigoPosL8(code: string): string {
  return RENOMEACAO_CANONICA_L8.find((r) => r.de === code)?.para ?? code;
}

/** Natureza que entra na REGRA_VALIDA_NIVEL_CONTAS (Manual ECD L9 p. 120): COD_NAT 01/02/03. */
export const PATRIMONIAL_NATURES: ReadonlyArray<AccountNature> = ['Asset', 'Liability', 'Equity'];

/** Nível mínimo da analítica patrimonial (Manual ECD L9 p. 120 — a mensagem do PVA cita a Res. CFC 1.299/2010). */
export const NIVEL_MINIMO_ANALITICA_PATRIMONIAL = 4;

/**
 * Canonical retained-earnings leaf (Lucros ou Prejuízos Acumulados). The year-end closing
 * entry (BE-INCR-SPED-APURACAO) posts the net result of the exercise against this account.
 * Resolved by CODE (stable), never by name.
 */
export const RETAINED_EARNINGS_CODE = '2.3.1.01';

/**
 * Canonical "Fornecedores a Pagar" leaf (INCR-AP). The AP recognition credits this account and
 * the settlement debits it. Resolved by CODE (stable), never by name.
 */
export const FORNECEDORES_A_PAGAR_CODE = '2.1.2.01';

/**
 * Canonical "Clientes a Receber" leaf (INCR-AR, F7). The AR recognition debits this account and the
 * receipt credits it. DEDICATED to the AR-formal subledger (distinct from `A_RECEBER_CODE` used by the salon)
 * so the subledger ties out to the GL. Resolved by CODE (stable), never by name.
 */
export const CLIENTES_A_RECEBER_CODE = '1.1.2.03';

/**
 * Canonical "Estoques" control leaf (INCR-INVENTORY, F-INV0). An inventory INBOUND debits this account
 * and a sale's CMV credits it; Σ InventoryItem.totalValueCents ties out to saldo(1.1.6). Resolved by
 * CODE (stable), never by name.
 */
export const ESTOQUES_CODE = '1.1.3.01';

/**
 * Canonical "Custo das Mercadorias Vendidas" leaf (INCR-INVENTORY, F-INV0/D7). The CMV recognition
 * debits this Expense account (D 4.2 / C 1.1.6). Mapped into the DRE costOfGoodsSold section. Resolved
 * by CODE (stable), never by name.
 */
export const CMV_CODE = '4.2';

/**
 * "Receita de Pacotes Não Utilizados" leaf (BE-INCR-PACOTE-VALIDADE, F-PV-4 a). The package-expiry posting
 * credits it (D 2.1.1 / C 3.4). DRE section provisional until the accountant (PE-1). Resolved by CODE.
 */
export const RECEITA_NAO_USO_CODE = '3.4';

/** Banco (BE-INCR-PLANO-4-NIVEIS): caixa por método Pix/TED/Boleto. Resolved by CODE. */
export const BANCO_CODE = '1.1.1.01';
/** Caixa (BE-INCR-PLANO-4-NIVEIS): caixa por método Cash. Resolved by CODE. */
export const CAIXA_CODE = '1.1.1.02';
/** A Receber do POS do salão (BE-INCR-PLANO-4-NIVEIS). Resolved by CODE. */
export const A_RECEBER_CODE = '1.1.2.01';
/** A Receber Cartão / Adquirente (BE-INCR-PLANO-4-NIVEIS): liquidação em cartão. Resolved by CODE. */
export const CARTAO_ADQUIRENTE_CODE = '1.1.2.02';
/** Pacotes Pré-pagos (BE-INCR-PLANO-4-NIVEIS): passivo diferido do pacote. Resolved by CODE. */
export const PACOTES_PRE_PAGOS_CODE = '2.1.1.01';
/** Disponível (sintética que agrega Banco e Caixa) — o prefixo do caixa do DFC. */
export const DISPONIVEL_CODE = '1.1.1';
/**
 * Emenda 3.3 (BE-INCR-ENCARGOS-DESCONTOS, PR-1, E1/E26). Folhas resolvidas por CÓDIGO (F-ENC-1 a); quem as usa re-lê a
 * conta e confere natureza e `acceptsEntries` (E2, `resolveFinancialAccountCode` em `BankSettlement.model.ts`).
 */
export const JUROS_MORA_RECEBIDOS_CODE = '3.5.1';
export const MULTAS_MORA_RECEBIDAS_CODE = '3.5.2';
export const DESCONTOS_OBTIDOS_CODE = '3.5.3';
export const JUROS_MORA_PAGOS_CODE = '4.3.1';
export const MULTAS_MORA_PAGAS_CODE = '4.3.2';
export const DESCONTOS_CONCEDIDOS_CODE = '4.3.3';
export const MULTAS_OFICIO_CODE = '4.4.1';
export const MULTAS_NAO_TRIBUTARIAS_CODE = '4.4.2';
/** Tarifa bancária/de intermediação (E26). `4.6` por decisão do dono de 13/10 (o `4.5` é do kit fiscal). */
export const BANK_FEE_CODE = '4.6';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 6; dono 21/10, opção (b): "mapear as contas do plano padrão fora dos kits") —
 * referencial RFB das folhas novas do plano padrão, gravado em todo escopo por
 * `ReferentialMappingService.ensureCanonicalMappings` (os kits v6 publicados não se editam). Mesmos códigos em Presumido
 * (P100A/P150A) e Real (L100A/L300A), conferidos na tabela dinâmica oficial da ECF (leiaute 12, AC 2025; dossiê
 * pesquisas-legais/irrf-referencial-sped [D01]). PROVISÓRIO por decisão do dono (21/10): a revisar com usuários e
 * contador depois do app completo. Lacuna conhecida: capital de sócio no exterior (2.03.01.02.01) pede a subconta
 * 2.3.2.01.02 quando houver empresa-alvo com sócio estrangeiro / RDE-IED.
 */
export const REFERENCIAL_PLANO_PADRAO: ReadonlyArray<{ accountCode: string; referentialCode: string; label: string }> = [
  { accountCode: '2.1.7.01', referentialCode: '2.01.01.17.13.10', label: 'Dividendos a Pagar – Circulante - Brasil' },
  { accountCode: '2.1.7.02', referentialCode: '2.01.01.17.12.10', label: 'Juros sobre o Capital Próprio a Pagar - Circulante - Brasil' },
  { accountCode: '2.1.7.03', referentialCode: '2.01.01.09.01', label: 'IRRF a Recolher – Circulante' },
  { accountCode: '2.3.2.01', referentialCode: '2.03.01.01.01', label: 'Capital Subscrito de Domiciliados e Residentes no País' },
  { accountCode: '2.3.3.01', referentialCode: '2.03.02.03.01', label: 'Reserva Legal' },
  { accountCode: '4.3.4', referentialCode: '3.01.01.09.01.04', label: '(-) Despesas de Juros sobre o Capital Próprio' },
  // IBS-CBS-2027 PR-2 (item 12; dono 21/10: "usa 2.01.01.09.28 para IBS e CBS a recolher"): a tabela da ECF (AC 2025) não tem
  // conta própria de IBS/CBS (dossiê pesquisas-legais/ibs-cbs-referencial-sped [D01]). PROVISÓRIO por decisão do dono: revisar
  // quando a RFB publicar a tabela do ano-calendário 2027.
  { accountCode: '2.1.8.01', referentialCode: '2.01.01.09.28', label: 'Outros Tributos a Recolher – Circulante' },
  { accountCode: '2.1.8.02', referentialCode: '2.01.01.09.28', label: 'Outros Tributos a Recolher – Circulante' },
];

/**
 * Lacuna #826-1 (dono 21/10, opção (a): "preencher pelo plano padrão, como o ensureCanonicalMappings faz com o referencial") —
 * papéis do perfil fiscal que os kits v6 publicados não trazem, preenchidos pelas folhas do plano padrão por
 * `FiscalProfileService.ensureCanonicalAccounts` (só campo nulo; unidade sem a folha fica manual).
 */
export const PERFIL_FISCAL_PLANO_PADRAO: ReadonlyArray<{ field: 'ibsRecolherAccountId' | 'cbsRecolherAccountId'; accountCode: string }> = [
  { field: 'ibsRecolherAccountId', accountCode: '2.1.8.01' },
  { field: 'cbsRecolherAccountId', accountCode: '2.1.8.02' },
];
