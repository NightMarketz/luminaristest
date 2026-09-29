# BE-INCR-ENCARGOS-DESCONTOS — Emenda 3.3 (nós F7 + X4) — BRIEF

> Sessão: `sessao-planejamento` · 2026-09-29 · base `origin/main` `9dd690b3`. **Sem código.**
> Saída: este documento + uma linha em §Docs de `docs/plano/nos/F7.md` e `docs/plano/nos/X4.md`.
> **Nenhum fork é ratificado aqui.** Todos os forks estão em §5 com recomendação e status RATIFICAÇÃO PENDENTE.

## 0. Contexto fixo

- **Item:** Fase 3.3 de [`PLANO-POS-CONTADOR-2026-09-23.md:104`](PLANO-POS-CONTADOR-2026-09-23.md): emenda dos nós
  [`F7`](../plano/nos/F7.md) (baixa por retorno bancário, `done`) e [`X4`](../plano/nos/X4.md) (e-Lalur/e-Lacs, `done`).
  As duas notas registram a emenda como aberta no `estado_detalhe`.
- **Autorização (citável):** decisão 16 de `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`.
  O arquivo está no PR #440 e ainda **não está em `main`**; foi lido de `origin/claude/docs-decisoes-2026-09-29`.
  Texto: *"Planejar autorizado para as 4 emendas: … 3.3 [[F7]]/[[X4]] (4 classes de encargo + descontos)"*.
  A abertura do mesmo documento limita o escopo: *"'Planejar' autoriza BRIEF/ADR; código continua exigindo 'executa'"*.
  O pedido desta sessão (dono, chat, 29/09) acrescenta: *"forks (adição automática só no Lucro Real)"*.
- **Cobertura:** exata. O BRIEF cobre as 4 classes de encargo, o desconto e a adição automática do X4. Os itens de DRE/J150
  (E3, E4) não abrem frente nova: sem eles, a receita financeira que esta emenda cria sai do resultado que alimenta a base
  do e-Lalur (S9, S10). Por isso entram no escopo. **Execução: não autorizada.**
- **Evidência:** `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §8, linha "3.3 F7/X4" (mesmo PR #440). Triagem do contador
  `TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md:70` (item 6).
- **Fato consumado (não rediscutir):** [`BE-INCR-BANK-SETTLEMENT-brief.md`](BE-INCR-BANK-SETTLEMENT-brief.md) (F-F7-1..5 → a,
  15/09; tabela irmã R9; `AccountingScopeSettings` por decisão do dono de 15/09); PR #326. BRIEFs ECF 3B/3C
  ([`…FASE3B…`](BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md), [`…FASE3C…`](BE-INCR-SPED-ECF-FASE3C-parte-b-brief.md)):
  chave única da Parte A (D-M2), F-3C-2 a (`origem='system'` no M410, derivado no fechamento), item 14 (quando o M312 é
  obrigatório). `ADR-INCR-PARTIAL-SETTLEMENT.md:370`: *"Não cobre juros/multa/desconto"*.
- **Nós vizinhos:**
  - Consome: [[D1]] (contador: códigos do referencial, item 0.8b) e [[X13]] (`CompanyFiscalProfile.regime`).
  - É consumido por: [[FE-INCR-BANK-SETTLEMENT]] (`BankSettlementPanel.tsx` chama `confirm`), [[H1b]] (ECF Real) e o ADR do
    apuração de PIS/COFINS. Pelo `ADR-INCR-TAX-ASSESSMENT` (X7, PR #446, aberto), F-X7-13 (a), pendente, o PIS/COFINS fica no
    [[X8]], não no [[X7]]. O FE fica fora deste BRIEF: a casa separa BE de FE.
- **Coordenação com a sessão irmã:** a emenda 3.2 do C8 está no PR #441 (`BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md`,
  aberto em 29/09). Ela propõe a **mesma coluna** `lalur_entries.origem` (F-EM-9 a, §3.3 dela). Também propõe derivar
  `LalurEntry` com `origem='system'` dentro do `closeParteB` (E17 dela) e trata a colisão com o lançamento manual em F-EM-12.
  Este BRIEF usa a mesma DDL e o mesmo momento de derivação. O fork de colisão (F-ENC-6) tem a mesma recomendação e deve
  ser ratificado **junto** com o F-EM-12: é a mesma regra para toda linha derivada da Parte A.
- **Coordenação com o PACOTE-VALIDADE** (PR #445, `BE-INCR-PACOTE-VALIDADE-brief.md`, aberto em 29/09): ele reserva a folha
  **`3.4 Receita de Pacotes Não Utilizados`** e sobe o mapeamento para **`statement-mapping.v4`**. Por isso a receita
  financeira deste BRIEF usa o grupo **`3.5`**, e a versão do mapeamento fica "a próxima livre" (E3). Os dois PRs mexem em
  `ChartOfAccountsFixture.ts` e em `StatementMappingFixture.ts`: o segundo a entrar rebaseia sobre o primeiro, sem regra nova.

## 1. Estado medido do código

Grau: **V** = lido nesta sessão · **I** = inferido da leitura (só o teste prova).

| # | Fato | Onde | Grau |
|---|---|---|---|
| S1 | Encargo único: `chargeCents = max(0, \|linha\| − saldo)`, calculado no scan e re-derivado no pré-cheque | `BankSettlementService.ts:121,431-433`; `BankSettlement.model.ts:97-99` | V |
| S2 | `bank.charge` = 1 lançamento com 2 linhas, conta única por lado (`bankChargeExpenseAccountId` / `bankChargeIncomeAccountId`) | `BankSettlementService.ts:324-346,454-466` | V |
| S3 | `\|linha\| < saldo` vira baixa **parcial**, sem desconto; o resíduo fica aberto | `BankSettlement.model.ts:63-70` | V |
| S4 | Candidatura: teto do encargo em 20% do saldo (`BANK_SETTLEMENT_CHARGE_CAP_BP = 2000`) | `BankSettlement.model.ts:25` | V |
| S5 | Chart canônico sem conta de juros, multa, desconto ou receita financeira (3.1/3.2/3.3/4.1/4.2) | `ChartOfAccountsFixture.ts:21-76` | V |
| S6 | `ensureChartOfAccounts` pula código já existente **sem conferir nome nem natureza** | `PostingService.ts:159-161` | V |
| S7 | `AccountingScopeSettingsService` valida a natureza (Expense/Revenue) das 2 contas de encargo. Nenhum seed as preenche | `AccountingScopeSettingsService.ts:71,75`; grep | V |
| S8 | DRE: regras só para 3.1, 3.3, 3.2 e 4.2, mais uma regra só por natureza para Expense. **Não existe regra só por natureza para Revenue** | `StatementMappingFixture.ts:14-31` | V |
| S9 | Conta sem regra de DRE **sai do total** (`if (!rule) continue`); `netCents` = soma das 4 seções | `AccountingReportService.ts:256-257,270` | V |
| S10 | A base do e-Lalur começa em `netResult` da DRE (`resultadoDoTrimestre`) | `LalurService.ts:796-802` | V |
| S11 | O BP confere a identidade `ativo = passivo + PL + netResult`. Com uma receita fora do mapa, o BP deixa de fechar | `AccountingReportService.ts:131` | I |
| S12 | J150 (ECD) é montado seção a seção; seção não empurrada **some da ECD** (precedente do CMV) | `SpedGenerationService.ts:591-626` | V |
| S13 | ECF Presumido recusa qualquer conta Revenue com movimento fora de {3.1, 3.3} | `SpedEcfGenerationService.ts:25-27,103-121` | V |
| S14 | `LalurEntry`: `valorCents` sempre digitado, sem `origem`; chave `(escopo, ano, trimestre, livro, codigo)`; 1 `accountId` (M310) por linha | `schema.prisma:1944-1971` | V |
| S15 | `Account` não tem marca de indedutível | `schema.prisma:438-472` | V |
| S16 | Precedente de derivação: `closeParteB` deriva PF/BC `origem='system'` em tx, antes das bases. O manual vivo destrava a ambiguidade | `LalurService.ts:825-890` | V |
| S17 | M310 emite 1 filho por linha, com `VL_CTA = valor do ajuste` ("adicionar quando um ajuste precisar de mais de uma conta") | `ecfReal.ts:244-251,408-420` | V |
| S18 | ECF Real exige os 4 trimestres fechados e recusa divergência pelo `diagnoseYear` | `SpedEcfRealGenerationService.ts:198-212` | V |
| S19 | Catálogo L12: `8.60` "Multas por infrações fiscais" e `8.65` "Multas impostas por transgressões de leis de natureza não tributária", `tipoLanc=A`, `dtIni=2017-01-01`, sem `dtFim`, **em M300A e em M350A** | `fixtures/ecf-l12-linhas.json:201,209,3283,3291` | V |
| S20 | O AP registra a baixa com SUM-CAS em `paidCents`; a conta de crédito vem do mapa fechado de `method`; o reconcile re-posta pela linha de pagamento | `PayableService.ts:496-600,939`; `Payable.model.ts:102-117` | V |
| S21 | `PayablePayment`/`ReceivableReceipt` não têm tipo (toda linha é dinheiro) | `schema.prisma:999-1016,1068-1085` | V |
| S22 | Desconto **incondicional** já é tratado na origem: venda com desconto no cabeçalho reconhece a receita **líquida**; compra: custo = `vProd − vDesc + …` | `revenueSplit.ts:13-14`; `NfeImportService.ts:26,176` | V (comentário e fórmula) |
| S23 | Regime por ano: `CompanyFiscalProfile.regime` (MEI/SIMPLES/PRESUMIDO/REAL). Por unidade: `FiscalProfile.regimeTributario` (marcado "informativo") e `pisCofinsRegime` | `schema.prisma:1319-1330,1370-1377` | V |
| S24 | Parser CNAB só lê extrato (Segmento E); não existe retorno T/U com `vlJuros`/`vlMulta` | BRIEF F7 §0.1 | V (BRIEF F7) |

## 2. Lei aplicada

Grau: **V-local** = relido nesta sessão no corpus `fontes-oficiais/` · **V-dono** = verificado pelo dono e pelo dossiê
em 29/09 (fonte fora do corpus local) · **P** = pendente (§6).

| # | Regra | Fonte | Grau |
|---|---|---|---|
| L1 | Multa por infração fiscal é indedutível no lucro real **e no resultado ajustado (CSLL)**, "salvo as de natureza compensatória e as impostas por infrações de que não resultem falta ou insuficiência de pagamento de tributo" | IN RFB 1.700 art. 132 (`IN-RFB-1700-2017.txt:2652`); Lei 8.981 art. 41 § 5º; RIR/2018 art. 352 § 5º | V-local (IN) · V-dono (Lei, RIR) |
| L2 | Multa por transgressão de lei não tributária é indedutível "como custo ou despesas operacionais". **O texto não menciona o resultado ajustado** | IN 1.700 art. 133 (`:2654`) | V-local; efeito na CSLL = **P** |
| L3 | Juros e multa de mora pagos são despesa financeira dedutível; a multa de mora é a "compensatória" de L1 | L1 (ressalva); P&R PJ 2021 Q034–Q037; triagem item 6 | V-dono |
| L4 | Juros e desconto ganhos entram no lucro operacional como receita financeira | IN 1.700 art. 144 (`:2786`); RIR/2018 art. 397 | V-local · V-dono |
| L5 | Desconto incondicional = consta da nota na emissão; reduz a receita bruta | RIR/2018 art. 208 § 1º II; IN 1.700 arts. 33, 215 ("deduzida … dos descontos incondicionais") | V-dono · V-local |
| L6 | PIS/COFINS de 0,65%/4% sobre receita financeira só no regime não cumulativo | Decreto 8.426/2015 | V-dono |
| L7 | PIS/COFINS se extinguem em 31/12/2026 | LC 214 art. 542 | V-dono |
| L8 | No Presumido, as "demais receitas" entram inteiras na base | IN 1.700 art. 215 § 3º I (`:3953-3967`) | V-local (só motiva o achado §8.1) |

## 3. Checklist de comportamentos

Legenda: **[direto]** sem fork · **[cond:F-ENC-n]** depende do fork *n* · **[coord]** depende do PR irmão #441.
Fatiamento conforme F-ENC-10 (recomendação: 4 PRs seriais, com a migração no PR-1).

### PR-1 — Fundação (contas, DRE/J150, migração)

- **E1 [cond:F-ENC-1]** Folhas canônicas novas no `ChartOfAccountsFixture`:
  - grupos `3.5 Receitas Financeiras`, `4.3 Despesas Financeiras` e `4.4 Multas Indedutíveis` (`acceptsEntries: false`);
  - folhas `3.5.1 Juros de Mora Recebidos`, `3.5.2 Multas de Mora Recebidas`, `3.5.3 Descontos Financeiros Obtidos`;
  - folhas `4.3.1 Juros de Mora Pagos`, `4.3.2 Multas de Mora Pagas`, `4.3.3 Descontos Financeiros Concedidos`;
  - folhas `4.4.1 Multas Fiscais Punitivas (de Ofício)`, `4.4.2 Multas de Natureza Não Tributária`.

  Os códigos são exportados como constantes, como `CMV_CODE`. Zero migração: o `ensureChartOfAccounts` cria o que falta.
  Os nomes são provisórios (§6.2). Teste: um escopo novo tem as 11 contas com natureza e `acceptsEntries` esperados.
- **E2 [direto]** A resolução classe → conta é uma função pura no model: `resolveFinancialAccountCode(side, kind)` (§4.1).
  No uso (pré-cheque do F7 e derivação do X4), a conta resolvida é **re-lida**. Ela precisa existir, estar viva, aceitar
  lançamento e ter a natureza esperada; senão, 400 `financial_account_invalid` com o código. Isso fecha S6: um tenant que já
  tinha um `4.3` próprio com outra natureza não recebe lançamento errado. Teste: escopo com `4.3.1` de natureza Revenue →
  `confirm` com juros de AP = 400, sem efeito.
- **E3 [cond:F-ENC-9]** Regras da DRE para `3.5` (crédito positivo) e `4.3` (débito negativo) na seção `financialResult`.
  `STATEMENT_MAPPING_VERSION` sobe uma versão: a **próxima livre** quando o PR-1 abrir, porque o PR #445 também reserva a
  `v4` (ver §0, coordenação). As duas regras ficam **antes** da regra só por natureza
  `dre.expenses` (lição do CMV, `StatementMappingFixture.ts:26-30`); `4.4` continua em `expenses` por essa regra.
  `netCents` passa a somar `financialResult`. Testes:
  - com 3.5, 4.3 e 4.4 movimentados, `netResult` é igual a menos a soma dos saldos de todas as contas de resultado;
  - o diagnóstico da DRE não mostra conta sem mapa;
  - o BP fecha (S11).
- **E4 [cond:F-ENC-9]** O `buildJ150` empurra a seção nova, no padrão do CMV (`SpedGenerationService.ts:623-626`). Teste:
  ECD com movimento em 3.5 → o J150 tem a linha, e I355 e J150 batem no encerramento.
- **E5 [direto]** Migração **única** com as colunas e a tabela dos 4 PRs (§4.3), no precedente F-FA14 b / F-EM-13 b:
  - colunas no fim;
  - prólogo idempotente onde o SQLite permite (memória `migracao-sqlite-nao-e-transacional`);
  - `npm run smoke:migration` numa cópia do `dev.db`;
  - `resetDb()` passa a limpar `bank_settlement_charge_parts`.

### PR-2 — F7: as 4 classes de encargo

- **E6 [cond:F-ENC-2]** `ConfirmBankSettlementSchema` ganha `charges?: Array<{ kind, cents }>` (§4.2). Pré-cheque:
  - com `chargeCents > 0`, `charges` é obrigatório (400 `charge_breakdown_required`);
  - a soma de `cents` é igual ao `chargeCents` do item (400 `charge_breakdown_mismatch`);
  - `kind` não se repete, e cada `cents` é maior que zero;
  - `kind` pertence às classes do lado: PAYABLE aceita as 4, RECEIVABLE aceita `JUROS_MORA` e `MULTA_MORA` (triagem item 6:
    "recebidos = receita financeira"); fora disso, 400 `charge_kind_not_allowed`;
  - com `chargeCents = 0`, `charges` é proibido (400; classe `param-aceito-e-ignorado-e-bug`).
- **E7 [direto]** A decomposição é gravada em `bank_settlement_charge_parts` (§4.3), numa tx logo depois do pré-cheque e
  **antes** da etapa (i). Enquanto `chargeEntryId` for nulo, o conjunto pode ser substituído. Depois da etapa (ii), fica
  imutável. O `retry` lê a decomposição do item, e `RetryBankSettlementSchema` não muda. Quando o pré-cheque falha e o item
  volta a PENDING, o conjunto é apagado na mesma tx. Teste: um FAILED em (iii) retoma com as mesmas partes e não posta de novo.
- **E8 [direto]** `bank.charge` passa a ter N linhas, uma por classe.
  - AP: débito em cada conta de classe, crédito de `chargeCents` no banco.
  - AR: débito de `chargeCents` no banco, crédito em cada conta de classe.
  - A idempotência `(sourceType, sourceId = item.id)` não muda. O `manualMatch` não muda: continua com uma perna de banco.
  - A descrição da linha nomeia a classe.

  Teste: AP com juros de 300 e multa de ofício de 700 → um lançamento, 3 postings (4.3.1 D 300, 4.4.1 D 700, banco C 1000),
  e a linha de extrato conciliada exata.
- **E9 [cond:F-ENC-1]** Destino de `bankChargeExpenseAccountId` e `bankChargeIncomeAccountId`, conforme o fork. Em
  **nenhum** caminho um campo aceito pelo PUT de settings é ignorado pelo F7 (classe `param-aceito-e-ignorado-e-bug`).
- **E10 [direto]** A view do item (`BankSettlementItemView`) passa a expor `chargeParts`, `shortfallCents`,
  `shortfallTreatment` e `discountSettlementId`. Um item CONFIRMED antes desta emenda mostra `chargeParts: []`; o histórico
  não é migrado.

### PR-3 — F7: desconto condicional

- **E11 [direto]** O scan grava `shortfallCents = max(0, saldo − |linha|)`. A candidatura não muda: linha menor que o saldo
  segue candidata a parcial. O controle de drift (`:121` e `:431-433`) passa a re-derivar também `shortfallCents`, com
  igualdade exata. Se o saldo mudou, o item fica STALE.
- **E12 [cond:F-ENC-4]** `confirm` aceita `shortfallTreatment?: 'PARTIAL' | 'DISCOUNT'`, com default `PARTIAL` (o
  comportamento de hoje). Com `DISCOUNT`, o pré-cheque exige:
  - `shortfallCents > 0`;
  - `shortfallCents ≤ teto` (sub-fork de F-ENC-4);
  - conta de desconto resolvida pelo E2.

  Depois da etapa (i), uma etapa nova **(i-d)** registra a baixa de tipo `DISCOUNT` no AP/AR:
  - AP: débito em 2.1.2, crédito em 3.5.3;
  - AR: débito em 4.3.3, crédito em 1.1.5.

  O título vai a PAID/RECEIVED. A etapa grava `discountSettlementId` e, se falhar, `failedStep = 'DISCOUNT'`. A etapa (iii)
  não muda, porque o desconto não tem perna de banco. Teste: AP de 1000 com linha de 980 e DISCOUNT → pagamento de 980 mais
  desconto de 20; título PAID; soma dos títulos abertos igual ao saldo da 2.1.2; linha conciliada exata em 980.
- **E13 [cond:F-ENC-4]** Mudanças no AP/AR:
  - coluna `kind` (`'PAYMENT' | 'DISCOUNT'`, default `'PAYMENT'`) em `payable_payments` e `receivable_receipts`;
  - `registerPayment`/`registerReceipt` ganham `kind` como **parâmetro interno do serviço**, fora do DTO público (a rota de
    desconto fora do extrato é o achado §8.3). A SUM-CAS e o protocolo claim → book → finalize são os mesmos;
  - `buildSettlementInput`/`FromRow` escolhem a contrapartida pelo `kind`; o `method` continua obrigatório só em `PAYMENT`;
  - o reconcile (`PayableService.ts:939`) re-posta pelo `kind` gravado;
  - `cancelPayment` de uma linha DISCOUNT estorna o lançamento do desconto;
  - `findOrphanSettlement` (`BankSettlementService.ts:472-491`) ignora linhas DISCOUNT;
  - os outros leitores das duas tabelas (aging, fluxo de caixa, KPIs) têm de ser listados por `trace_path` e conferidos,
    todos (§7.2).

  Pré-requisito: a EMENDA ao `ADR-INCR-PARTIAL-SETTLEMENT` (§7.1).
- **E14 [direto]** Auditoria:
  - `bank_settlement.confirmed` ganha `chargeParts` (string `KIND:cents;…`), `shortfallTreatment`, `discountCents` e
    `discountSettlementId`;
  - `payable.settlement_registered` e `receivable.settlement_registered` ganham `kind`;
  - tudo entra na allowlist de `features/accounting/audit/auditCanonical.ts` (`:62,66`) **na mesma mudança**, sem PII
    (memória `accounting-audit-allowlist-guards`).

### PR-4 — X4: adição automática da multa indedutível

- **E15 [coord]** Coluna `lalur_entries.origem TEXT NOT NULL DEFAULT 'user'`, com os valores de `LALUR_ORIGENS`
  (`Lalur.model.ts:69`). A DDL é **a mesma** do PR #441 (F-EM-9 a); só o PR que chegar primeiro a cria. Regras:
  - `createEntry` e `updateEntry` gravam ou mantêm `'user'`;
  - o DTO **não** aceita `origem` (`.strict()`);
  - PATCH de `valorCents`, `codigo` ou `accountId` numa linha `system` → 400 (padrão `LalurService.ts:656`, M410);
  - arquivar uma linha `system` é permitido; ela volta no próximo fechamento se o razão ainda a justificar.
- **E16 [cond:F-ENC-5, F-ENC-7]** O `closeParteB` deriva as adições **antes** de calcular as bases, lendo as entradas em tx
  (S16). A tabela é fechada (§4.1):

  | Classe | Conta (E2) | Livro | Código |
  |---|---|---|---|
  | `MULTA_OFICIO` | 4.4.1 | `lalur` | `8.60` |
  | `MULTA_NAO_TRIBUTARIA` | 4.4.2 | `lalur` | `8.65` |
  | `MULTA_OFICIO` | 4.4.1 | `lacs` | `8.60` (L1: "resultado ajustado") |

  O par `(lacs, 8.65)` **não** é derivado: está em §6.3.

  O valor de cada linha é o **saldo devedor líquido do trimestre** da conta: soma dos débitos menos soma dos créditos, em
  `LEDGER_STATUSES`, janela `quarterWindows`. O razão é lido fora da tx, como o resultado (D-P4; o fechamento não escreve no
  razão). A linha é gravada com:
  - `origem = 'system'`, `indRelacao = '2'`, `accountId` = conta;
  - `histLancamento` fixo, em constante nomeada;
  - `journalLinks` vazio: com `VL_CTA` igual ao saldo do período, o M312 é dispensado (BRIEF 3C item 14).

  A cada refechamento, a linha é substituída (padrão PF/BC, `:856-890`). Valor ≤ 0 → nenhuma linha, e a linha `system`
  que existia é arquivada; o caso negativo tem aviso (§6.5).

  Testes:
  - AP reconhecido com despesa 4.4.1 de 1000 em T02 → no fechamento de T02 há 2 linhas `system` (lalur 8.60 e lacs 8.60),
    cada uma com `valorCents` 1000, e a base de cada tributo sobe 1000;
  - refechar sem movimento novo → idempotente.
- **E17 [cond:F-ENC-6]** Colisão da chave (S14): se existe linha `user` viva no mesmo `(ano, trimestre, livro, código)` de
  uma derivação com valor maior que zero, o comportamento é o do fork. Enquanto o fork não for ratificado, 400 que nomeia
  a linha manual.
- **E18 [cond:F-ENC-7]** A derivação só roda com regime **REAL** no ano, pela fonte que o fork fixar. Em outro regime:
  nenhuma derivação, e as linhas `system` que existiam são arquivadas.
- **E19 [direto]** `diagnoseYear` passa a re-derivar as linhas `system` e acusa divergência entre materializado e
  recomputado. A ECF Real recusa a geração com 400 "refeche o período" (padrão de `SpedEcfRealGenerationService.ts:205-211`).
  Teste: lançamento em 4.4.1 depois do fechamento → a geração dá 400 com a linha 8.60.
- **E20 [direto]** O serializer não muda: a linha `system` é uma M300/M350 com `IND_RELACAO=2` e um M310/M360 (S17). Teste:
  arquivo ECF de um escopo com adição derivada tem `M300|8.60|…|A|…|2|…` e `M310|4.4.1|…`.
- **E21 [direto]** Auditoria: `lalur.parte_b_closed` (allowlist `auditCanonical.ts:207`) ganha `autoAdditions`
  (string `livro:codigo:cents;…`), sem valor por conta além disso. A allowlist muda na mesma mudança.

### Gates da mudança (pertencem ao checklist)

- **E22** O snapshot de shape (`__dto-shapes__.json`) é regenerado para `ConfirmBankSettlementSchema` e para
  `UpdateAccountingScopeSettingsSchema`, se F-ENC-1 mexer nele, sempre por regeneração explícita. Os tipos gerados do FE
  (`my-app/types/contracts/**.gen.ts`, [[FE-CONTRACT-TYPES]]) são regenerados no mesmo PR.
- **E23** OpenAPI: nenhum path novo, porque a derivação é no `close` (F-ENC-5 a). O `docs.paths.ts` atualiza o schema do
  `confirm` e da view. `npm run docs:generate` sai com diff vazio. O guard de path-count não muda.
- **E24** `cd server && npx tsc --noEmit` limpo. `npm run test:integration` (`--runInBand`) cobre E6–E8, E11–E13 e
  E15–E19. O teste de concorrência do `confirm` com DISCOUNT tem a CI Linux como oráculo (memória `windows-serializa-sqlite`).
- **E25** Paridade i18n pt/en: só se o PR tocar chave do FE (o BE responde em pt). Não há chave nova prevista.

## 4. Contratos (esboço materializável)

### 4.1 Constantes de domínio (`models/BankSettlement.model.ts`, `models/Lalur.model.ts`)

```ts
export const BANK_CHARGE_KINDS = ['JUROS_MORA', 'MULTA_MORA', 'MULTA_OFICIO', 'MULTA_NAO_TRIBUTARIA'] as const;
export type BankChargeKind = (typeof BANK_CHARGE_KINDS)[number];
export const BANK_CHARGE_KINDS_BY_SIDE: Record<BankSettlementTitleType, readonly BankChargeKind[]> = {
  PAYABLE: BANK_CHARGE_KINDS,                      // L1–L3
  RECEIVABLE: ['JUROS_MORA', 'MULTA_MORA'],        // triagem item 6: recebidos = receita financeira
};
export const SHORTFALL_TREATMENTS = ['PARTIAL', 'DISCOUNT'] as const;
export const SETTLEMENT_KINDS = ['PAYMENT', 'DISCOUNT'] as const;   // payable_payments / receivable_receipts
export const BANK_SETTLEMENT_STEPS = ['SETTLE', 'DISCOUNT', 'CHARGE', 'MATCH'] as const; // + 'DISCOUNT'

// F-ENC-1 (a): classe → código canônico (E1). Resolvido por CÓDIGO, conferido na leitura (E2).
export const FINANCIAL_ACCOUNT_CODES = {
  PAYABLE:    { JUROS_MORA: '4.3.1', MULTA_MORA: '4.3.2', MULTA_OFICIO: '4.4.1', MULTA_NAO_TRIBUTARIA: '4.4.2', DISCOUNT: '3.5.3' },
  RECEIVABLE: { JUROS_MORA: '3.5.1', MULTA_MORA: '3.5.2', DISCOUNT: '4.3.3' },
} as const;

// Lalur.model.ts — E16. Códigos verificados no catálogo (S19). (lacs, 8.65) fora até §6.3.
export const LALUR_AUTO_ADDITIONS = [
  { kind: 'MULTA_OFICIO',         livro: 'lalur', codigo: '8.60' },
  { kind: 'MULTA_NAO_TRIBUTARIA', livro: 'lalur', codigo: '8.65' },
  { kind: 'MULTA_OFICIO',         livro: 'lacs',  codigo: '8.60' },
] as const;
```

### 4.2 DTO (`BankSettlementDto.ts`, `.strict()`)

```ts
const ChargePartSchema = z.object({
  kind: z.enum(BANK_CHARGE_KINDS),
  cents: z.number().int().positive(), // ≤ MAX_CENTS (política, memória max-cents-e-politica-nao-persistencia)
}).strict();

export const ConfirmBankSettlementSchema = z.object({
  unitId: z.string().min(1),
  method: z.enum(PAYMENT_METHODS),
  charges: z.array(ChargePartSchema).min(1).max(BANK_CHARGE_KINDS.length).optional(),   // E6 — regras no serviço
  shortfallTreatment: z.enum(SHORTFALL_TREATMENTS).optional(),                          // E12 — default PARTIAL no serviço
}).strict();
// RetryBankSettlementSchema: inalterado (E7 — retry lê as partes gravadas).
```

Os defaults ficam no serviço e não no schema: `.default()` dentro de `.partial()` reseta campo no update (memória
`zod4-partial-aplica-default-reseta-campo`).

### 4.3 Prisma e migração (única, `YYYYMMDDhhmmss_encargos_descontos_emenda_3_3`)

```prisma
model BankSettlementItem {
  // … campos existentes …
  shortfallCents       BigInt   @default(0) // E11 — max(0, saldo − |linha|) no scan; re-derivado no pré-cheque
  shortfallTreatment   String?             // E12 — 'PARTIAL' | 'DISCOUNT', gravado no confirm
  discountSettlementId String?             // E12 — payable_payments.id | receivable_receipts.id (kind DISCOUNT)
  chargeParts          BankSettlementChargePart[]
}

// E7 — value-object do item (precedente PostingDimension / LalurProcess): sem deletedAt; substituível até a etapa (ii).
model BankSettlementChargePart {
  id     String             @id @default(cuid())
  itemId String
  item   BankSettlementItem @relation(fields: [itemId], references: [id], onDelete: Restrict)
  kind   String             // BANK_CHARGE_KINDS
  cents  BigInt
  @@unique([itemId, kind])
  @@map("bank_settlement_charge_parts")
}

model PayablePayment    { /* … */ kind String @default("PAYMENT") } // E13 — 'PAYMENT' | 'DISCOUNT'
model ReceivableReceipt { /* … */ kind String @default("PAYMENT") }
model LalurEntry        { /* … */ origem String @default("user") }  // E15 — MESMA DDL do PR #441
```

```sql
-- sem IF NOT EXISTS para ADD COLUMN no SQLite: o prólogo do CREATE TABLE usa DROP IF EXISTS; as colunas vão no fim
DROP TABLE IF EXISTS "bank_settlement_charge_parts";
CREATE TABLE "bank_settlement_charge_parts" (
  "id" TEXT NOT NULL PRIMARY KEY, "itemId" TEXT NOT NULL, "kind" TEXT NOT NULL, "cents" BIGINT NOT NULL,
  CONSTRAINT "bsc_item_fkey" FOREIGN KEY ("itemId") REFERENCES "bank_settlement_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "bank_settlement_charge_parts_itemId_kind_key" ON "bank_settlement_charge_parts"("itemId", "kind");
ALTER TABLE "bank_settlement_items" ADD COLUMN "shortfallCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "bank_settlement_items" ADD COLUMN "shortfallTreatment" TEXT;
ALTER TABLE "bank_settlement_items" ADD COLUMN "discountSettlementId" TEXT;
ALTER TABLE "payable_payments"      ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PAYMENT';
ALTER TABLE "receivable_receipts"   ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PAYMENT';
-- [coord] só se o PR #441 ainda não a criou:
ALTER TABLE "lalur_entries"         ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'user';
-- condicional a F-ENC-1 (b): 8 colunas FK em accounting_scope_settings (ver §5)
```

Backfill: nenhum. Os itens PENDING que já existem ficam com `shortfallCents = 0` até o próximo scan, que os re-deriva
(drift → STALE → PENDING, `:117-128`).

### 4.4 Lançamentos

```
bank.charge (E8), sourceId = item.id — AP com partes {JUROS_MORA 300, MULTA_OFICIO 700}:
  D 4.3.1 Juros de Mora Pagos            300
  D 4.4.1 Multas Fiscais Punitivas       700
  C <statement.glAccountId>             1000
AR com partes {JUROS_MORA 50, MULTA_MORA 20}:
  D <statement.glAccountId>               70
  C 3.5.1 Juros de Mora Recebidos         50
  C 3.5.2 Multas de Mora Recebidas        20

Desconto (E12), sourceType da baixa do AP/AR, sourceId = paymentId (linha kind DISCOUNT):
  AP: D 2.1.2 Fornecedores a Pagar   / C 3.5.3 Descontos Financeiros Obtidos
  AR: D 4.3.3 Descontos Fin. Concedidos / C 1.1.5 Clientes a Receber
```

### 4.5 Resposta (`BankSettlementItemView`, acréscimos)

```ts
chargeParts: Array<{ kind: BankChargeKind; cents: number }>;
shortfallCents: number;
shortfallTreatment: 'PARTIAL' | 'DISCOUNT' | null;
discountSettlementId: string | null;
```

## 5. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-ENC-1** | Onde moram as contas por classe | **(a)** Folhas canônicas no fixture (E1), resolvidas por código (E2). Os 2 campos legados saem do DTO de settings; a coluna fica até um fold · **(b)** Folhas canônicas mais 8 colunas de override por classe em `AccountingScopeSettings`; os 2 campos legados passam a ser override de `JUROS_MORA` · **(c)** Só configuração, sem conta canônica; 400 até o tenant configurar (como hoje) | **(a).** O contador respondeu *"mapeio no seu plano"* (triagem :70): ele mapeia o **nosso** plano no referencial, e o plano precisa ter as contas. O que falta dele é o `ReferentialMapping` (§6.1), não a conta. Com (c), o F7 continua travado em `charge_account_not_configured`. Com (b), vêm 8 FKs sem consumidor pedido. Custo de (a): tirar 2 campos do DTO muda o contrato (E22). Nenhum seed e nenhuma tela de settings os usa (grep em `my-app`: só o tipo gerado) |
| **F-ENC-2** | Como o encargo único vira 4 classes | **(a)** `charges[]` obrigatório quando `chargeCents > 0` (E6), gravado em tabela-filha (E7); a alternativa de guardar é uma coluna por classe no item · **(b)** Sem `charges`, tudo vira `JUROS_MORA` · **(c)** Regra fixa (multa até 2% e o resto como juros) | **(a).** A classe tem efeito fiscal: o default (b) grava multa punitiva como dedutível e sub-adiciona no X4. O extrato não separa os componentes (S24), então só o humano sabe. A tela pode pré-preencher. (c) não tem fonte para salão |
| **F-ENC-4** | Desconto condicional na baixa (linha menor que o saldo) | **(a)** Baixa de `kind = DISCOUNT` no protocolo do AP/AR (E13), com EMENDA ao ADR-PARTIAL-SETTLEMENT · **(b)** Lançamento avulso de desconto, com o título ainda PARTIALLY_*; isso quebra "soma dos abertos = saldo 2.1.2/1.1.5" · **(c)** Fora desta emenda (só PARTIAL). **Sub-fork do teto:** (a1) mesmo teto de 20% do encargo (F-F7-5) · (a2) sem teto | **(a) + (a1).** Só (a) mantém o subrazão amarrado ao razão. O teto repete o motivo do F-F7-5: sem ele, um clique transforma parcial de 10% em desconto de 90%. Acima do teto, o humano faz a parcial e ajusta à mão |
| **F-ENC-5** | Quando a adição automática nasce | **(a)** Dentro do `closeParteB`, antes das bases (E16; padrão PF/BC e E17 do PR #441) · **(b)** Endpoint próprio de derivação, consumido pelo `close` · **(c)** Só na geração da ECF, sem persistir | **(a).** É o momento que já materializa a Parte B. A ECF exige os 4 trimestres fechados (S18), então a linha sempre existe na geração. Reabrir e refechar dá a prévia. (b) acrescenta path e guard sem ganho. (c) esconde a adição da tela e da base do M500 |
| **F-ENC-6** | Colisão com linha manual do mesmo `(ano, trimestre, livro, código)` | **(a)** 400 no fechamento, nomeando a linha manual · **(b)** O manual vence: não deriva e só avisa (precedente PF/BC, review M2) · **(c)** Chave com `origem`, e o serializer funde num M300 com 2 filhos | **(a)**, ratificado **junto com F-EM-12** (PR #441, mesma recomendação). (b) perde a multa em silêncio quando o manual cobria outra coisa. (c) mexe na invariante D-M2 e no M310 de filho único (S17) |
| **F-ENC-7** | De onde vem "só no Lucro Real" | **(a)** `CompanyFiscalProfile(ano).regime === 'REAL'` (X13, por ano). Sem perfil: 400 **só se** houver movimento em 4.4.x no trimestre · **(b)** `FiscalProfile.regimeTributario` (por unidade, "informativo", S23) · **(c)** Sem gate: e-Lalur já pressupõe o Real | **(a).** É a fonte por ano que decide as obrigações SPED. O 400 condicional não trava o fechamento de quem não tem multa. (b) é declarado informativo no próprio schema. (c) contraria o pedido do dono |
| **F-ENC-8** | O que a emenda faz com PIS/COFINS de 0,65%/4% | **(a)** Só segrega a receita financeira em conta própria (3.5.x) e entrega alíquota e vigência (L6, L7) como insumo da apuração de PIS/COFINS: o X8, se F-X7-13 (a) for ratificado (PR #446) · **(b)** Provisiona o débito de PIS/COFINS no `confirm` | **(a).** Calcular débito é apuração. Ela fica no X8 pelo F-X7-13 (a), ou no X7, cuja autorização é "só ADR" (F-M2); nos dois casos, fora deste nó. A vigência termina em 31/12/2026 (L7): o código que fosse escrito agora morreria em 3 meses |
| **F-ENC-9** | Como a receita financeira aparece na DRE | **(a)** Seção nova `financialResult` (E3, E4), com versão nova do mapeamento; o shape da resposta da DRE muda (FE, J150) · **(b)** Sem seção nova: 3.5 entra em `expenses` como redutor (Lei 6.404 art. 187 III, *"despesas financeiras, deduzidas das receitas"*) · **(c)** Nada: 3.5 some do resultado (S9) | **(a).** (c) quebra a base do e-Lalur (S10) e o BP (S11, grau I). (b) evita mudar o shape, mas põe conta de receita num grupo de despesa no J150, e o leiaute disso não foi lido (§7.5). (a) segue o precedente do CMV |
| **F-ENC-10** | Fatiamento | **(a)** 1 PR · **(b)** 4 PRs seriais (§3: fundação → encargos → desconto → X4), migração única no PR-1 | **(b).** As partes se testam isoladas. O PR-3 espera a EMENDA do ADR (§7.1) e o PR-4 coordena com o #441. O PR-2 destrava o F7 sozinho |

Não entram como fork (decididos por artefato). **F-ENC-3 não existe**: seria o primeiro item desta lista, e o número foi
mantido para não renumerar as referências do §3.
- Classes do AR: a triagem, item 6, diz *"recebidos = receita financeira"*.
- Uma linha por classe no mesmo `bank.charge` (E8): é o único desenho que mantém a idempotência por `item.id` e uma perna de
  banco no `manualMatch`.
- M312 vazio (E16): BRIEF 3C, item 14.

## 6. Pendente de validação externa (não entra no checklist como decidido)

1. **Códigos do referencial RFB** (`ReferentialMapping`) das 8 folhas novas: contador, follow-up 0.8b ([[D1]]). Sem eles, o
   I051 da ECD e o referencial da ECF dessas contas ficam em branco. O efeito no gerador da ECD é o §7.3.
2. **Nome e grupo das folhas:** a multa de mora é despesa financeira ou outra despesa operacional? "4.4 Multas Indedutíveis"
   é um grupo aceito? Os **códigos internos são nossos**; nome e grupo contábil são do contador.
3. **CSLL × multa não tributária (`lacs 8.65`):** o art. 133 fala só de "custo ou despesas operacionais" (L2). O art. 132
   fala de "resultado ajustado" (L1). O M350A tem a linha 8.65 (S19), mas linha de leiaute não é obrigação. O Anexo I da
   IN 1.700 (lista de adições com a coluna CSLL) está no MANIFEST só em PDF; o `.txt` versionado não o contém
   (`IN-RFB-1700-2017.txt:5682-5686`). Até resolver: nenhuma derivação, e o fechamento avisa que o `lacs 8.65` não foi
   derivado, para o contador lançar à mão se couber.
4. **Multa por obrigação acessória sem falta de pagamento** (atraso de DCTF/ECF): pela parte final do art. 132 (L1) é
   **dedutível**. Pergunta ao contador: em que conta e em que classe ela entra? O desenho aceita, porque ela não vai para
   4.4.x.
5. **Saldo negativo no trimestre** (multa adicionada antes e cancelada ou estornada agora): vira exclusão? Em que linha?
   Enquanto não houver resposta: nenhuma linha `system` e um aviso.
6. **Multa recebida (AR)** como receita financeira, para PIS/COFINS não cumulativo: a triagem (item 6) diz que sim, com grau
   "lembrado". Confirmar no mesmo follow-up.
7. **Relevância para o 1º cliente (Simples):** se a receita financeira fica fora da receita bruta do DAS, separá-la da 3.1
   evita tributar juros como serviço. Grau **I**: confirmar no PRE-ADR do Simples (onda 3, decisão 8).

## 7. Insumos ausentes (pausados, não varridos — regra 2)

1. **EMENDA ao `ADR-INCR-PARTIAL-SETTLEMENT`** (`:370`, "não cobre juros/multa/desconto"). É pré-requisito do PR-3
   (F-ENC-4 a) e cabe em "planejar" (decisão 16). Não foi escrita aqui.
2. **Todos os leitores de `payable_payments`/`receivable_receipts`** além dos lidos (reconcile, `cancelPayment`,
   `findOrphanSettlement`). Aging, fluxo de caixa e KPIs precisam tratar `kind = DISCOUNT` como não-caixa. Levantar por
   `trace_path` na sessão de feature e confirmar lendo cada arquivo (CBM-001). Isso inclui o export do aging conciliado
   da emenda 3.4 do C6b (PR #447, aberto).
3. **ECD e mapeamento referencial:** o `SpedGenerationService` recusa conta movimentada sem I051? Se recusar, o PR-1 só pode
   ir a produção com o §6.1 respondido. Não lido.
4. **SEED-MY / H1b:** o seed do Lucro Real cria `CompanyFiscalProfile` com `regime = 'REAL'`? Define se o F-ENC-7 (a) muda o
   fechamento do H1b. Não lido.
5. **Leiaute do J150** para a seção nova (grupo e indicador de linha). Necessário para E4 e F-ENC-9. Não lido.
6. **RIR/2018 (arts. 208, 352, 397), Lei 8.981 art. 41 e P&R PJ 2021 Q034–Q037:** citados pelo dono e pelo dossiê como
   verificados em 29/09. Não estão no corpus versionado (o HTML do RIR não entra no git, `LEIA-ME.md`). Grau **V-dono**,
   não V-local.

## 8. Achados fora de escopo (não planejados — exigem autorização própria)

1. **ECF Presumido × receita financeira:** movimento em 3.5 derruba a geração pelo gate de exaustividade (S13). O bloqueio é
   correto, porque falha fechado. O conserto são as linhas de "demais receitas" do P200/P400 (L8). A mesma classe **já vale
   hoje** para a 3.2 Devoluções, que é Revenue fora de {3.1, 3.3}. Frente do nó da ECF Presumido. Risco para o [[H1]]: só se o
   seed movimentar 3.5.
2. **Conta Revenue fora do mapa** (qualquer código, não só 3.5) sai do `netResult` (S9) e desequilibra o BP (S11, grau I).
   Remédio geral: uma regra só por natureza para Revenue. Muda números de dados que já existem, por isso é frente própria.
3. **Rota pública de desconto no AP/AR** (pagamento manual com desconto, fora do extrato). O serviço ganha o `kind` no PR-3;
   a rota não.
4. **Retorno com componentes explícitos:** o provedor do F5 (Mercado Pago, decisão 7) ou o CNAB T/U (`vlJuros`/`vlMulta`/
   `vlDesconto`) pré-preencheriam `charges[]`. Precisa de `origin` nova, reservada desde o F-F7-1.
5. **Desconto incondicional na venda:** hoje a receita é reconhecida líquida (S22), sem conta redutora 3.2.x. A base não
   muda; a apresentação bruta com dedução seria frente do bridge de venda.
6. **`ensureChartOfAccounts`** aceita código que já existe com outra natureza e não avisa (S6). É classe geral; o E2 só
   protege as contas desta emenda.
7. **FE:** `charges[]`, a escolha PARTIAL/DISCOUNT no `BankSettlementPanel` e a exibição da seção `financialResult` são
   crescimento do [[FE-INCR-BANK-SETTLEMENT]] e das telas de relatório. Sem esse FE, o PR-2 faz o confirm com encargo, que
   hoje já dá 400 `charge_account_not_configured`, voltar 400 `charge_breakdown_required`.
8. **Várias contas por código** na adição automática (M310 1:N, S17), para tenant com mais de uma conta de multa.
9. **Insumo da apuração de PIS/COFINS** (X8, se F-X7-13 a; PR #446): 0,65%/4% sobre receita financeira, só no não
   cumulativo, até 31/12/2026, lida das folhas 3.5.x (F-ENC-8 a).

## 9. Ordem sugerida para a `sessao-feature` (se F-ENC-10 → b)

Os 4 PRs, em série:
1. **PR-1:** E1–E5 (migração inteira, contas, DRE/J150).
2. **PR-2:** E6–E10 e E14 (parte de encargo). Destrava o F7 sem esperar ninguém.
3. **PR-3:** E11–E13 e E14 (parte de desconto). Só depois da EMENDA do ADR (§7.1).
4. **PR-4:** E15–E21. Coordena a coluna `origem` com o #441. Pode andar em paralelo ao PR-3.

Os gates E22–E25 valem em cada PR. **Nenhum PR começa sem "executa" do dono** (ORCH-006).

## 10. Riscos e vieses declarados (T8)

- **Viés de leitura de código:** as regras L1–L8 com grau V-dono não foram relidas aqui. Se o P&R Q034–Q037 disser algo
  diferente da triagem para a multa de mora, a classe `MULTA_MORA` muda de conta, mas o desenho fica.
- **Viés de escopo:** E3/E4 (DRE/J150) aumentam o PR-1. A justificativa (S9, S10) é leitura de código de grau V. A quebra do
  BP (S11) é grau I e só o teste do E3 prova.
- **Risco de coordenação:** dois BRIEFs (#441 e este) propõem a mesma coluna e a mesma regra de colisão. Se o dono ratificar
  F-EM-12 e F-ENC-6 de formas diferentes, o `closeParteB` passa a ter duas políticas de colisão. Com o #445, a colisão de
  código (`3.4`) e de versão (`v4`) foi evitada aqui, mas as sessões paralelas de 29/09 abriram 8 BRIEFs ao mesmo tempo, e só
  conferi os códigos de conta e a versão do mapeamento contra eles, não cada contrato.
- **Risco de dado:** um tenant com contas próprias nos códigos 3.5/4.3/4.4 (S6) tem a DRE nova somando essas contas por
  prefixo (E3), antes que o E2 proteja o lançamento. Teste do E3: escopo com `4.3` próprio de natureza Expense → a DRE o
  põe em `financialResult`. O efeito é visível, não silencioso.
