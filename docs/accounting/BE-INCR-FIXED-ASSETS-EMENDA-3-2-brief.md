# BE-INCR-FIXED-ASSETS — Emenda 3.2 (nó C8) — BRIEF

> Sessão: `sessao-planejamento` · 2026-09-29 · base `origin/main` `9dd690b3`. **Sem código.**
> Saída desta sessão = este documento + a linha em `docs/plano/nos/C8.md` §Docs. Nenhum fork é ratificado aqui.

## 0. Contexto fixo

- **Item:** Fase 3.2 de [`PLANO-POS-CONTADOR-2026-09-23.md:103`](PLANO-POS-CONTADOR-2026-09-23.md) — emenda do nó
  [`C8`](../plano/nos/C8.md) (`estado: done`; emenda aberta no `estado_detalhe`).
- **Autorização (citável):** decisão 16 de `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`
  (PR #440, lida de `origin/claude/docs-decisoes-2026-09-29` — **ainda não está em `main`**): *"Planejar
  autorizado para as 4 emendas: … 3.2 [[C8]] (R$1.200 por unidade funcional + benfeitoria + retomada do Bloco F)"*.
  A linha 17 do mesmo doc limita: *"'Planejar' autoriza BRIEF/ADR; código continua exigindo 'executa'"*.
  **Cobertura:** exata — as três partes deste BRIEF são as três nomeadas na decisão. Execução: **não autorizada**.
- **Evidência:** `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §8, linha "3.2 C8" (mesmo PR #440).
- **Insumos consumados (fato, não rediscutir):** `ADR-INCR-FIXED-ASSETS.md`; `BE-INCR-FIXED-ASSETS-brief.md`
  (itens 1-37; Bloco F = itens 23-25); `BE-INCR-FIXED-ASSETS-execution-plan.md` (A3, A6, passo 15); PRs #354-#356,
  #366, #368; corpo do commit `0548d19a` (pausa do Bloco F).
- **Nós vizinhos:** consome [[D3b]] (Anexo III), X4/e-Lalur (`LalurService.closeParteB`, `:825`), NF-e modo 4
  (`NfeImportService`); é consumido por [[FE-INCR-FIXED-ASSETS]] (FE fora deste BRIEF — casa separa BE/FE).

## 0.1 Fontes legais lidas nesta sessão (3ª passada, 29/09 — pedido do dono: "pesquise a lei e baseie-se nela")

| # | Fonte | Onde / integridade | O que fixa |
|---|---|---|---|
| L1 | **RIR/2018** (Decreto 9.580) arts. 301, 313, 317, 321, 330, 331, 333 — texto oficial | `planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm` (baixado 29/09, sha256 `c9d72e667a52…`; trechos `<strike>` removidos) | 313 § 1º I "valor unitário não superior a R$ 1.200,00"; § 2º conjunto; § 3º ativar o que dura > 1 ano. 331 III benfeitoria em bem de terceiro é amortizável **"quando não houver direito ao recebimento de seu valor"**. 333 taxa "tendo em vista o número de anos restantes de existência do direito". 330 § 3º saldo não amortizado vira encargo quando o uso termina. 321 = contábil < fiscal → exclusão; § único → adição quando o fiscal atinge o custo. 301 § 3º tributos recuperáveis fora do custo (texto sobre **mercadorias**) |
| L2 | **IN RFB 1.700/2017** arts. 120, 121 § 3º, 123, 124 §§ 4º-5º, 310 § 2º | corpus `fontes-oficiais/IN-RFB-1700-2017.txt:2493-2571` e art. 310 | 124 § 4º: contábil < fiscal → exclusão **"com registro na Parte B do e-Lalur e do e-Lacs"** (logo IRPJ **e** CSLL); § 5º adição + baixa. 123: quota fiscal = taxa × **custo de aquisição** (sem residual). 310 § 2º I a 2: ajuste da Parte A com **"identificação das contas analíticas … e indicação discriminada por lançamento … quando presentes"** |
| L3 | **Tabelas Dinâmicas ECF Leiaute 12** — abas `PARTEB_PADRAO`, `PARTEB_PARTEA`, `M300A`, `M350A` | `sped.rfb.gov.br/arquivo/download/8002`, sha256 `366b8d9030a0…` = **idêntico ao MANIFEST** do corpus | `1071` e `2210`, tributo **`A` (ambos)**. Relacionamento PG em Geral (qualif 01): **1071 ↔ {86, 161, 260}**; **2210 ↔ {86, 161, 335, 265.01, 91.01}**; 3130 ↔ {91.85, 166.85} (IN 1.778, petróleo). 86/161/91.01 existem em M300A **e** M350A |
| L4 | **Manual ECF L12** — tabela de sinais do M300/M305 e `REGRA_RELACAO_INEXISTENTE` | transcrição do corpus `BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md:167,190` | Adição com Parte B devedora = "constituição de saldo para posterior exclusão"; exclusão com Parte B credora = "constituição de saldo para posterior adição". `indRelacao` 1 = só Parte B (M305); 3 = Parte B + conta contábil (M305 + M310) |
| L5 | **PN CST 210/1973** e **PN CST 104/1975** | **fonte secundária** (normasbrasil.com.br; normaslegais.com.br) — a página oficial do SIJUT não foi alcançada | 210/73: com direito a indenização (inclusive **por silêncio do contrato**, CC da época) **não** amortiza — **deprecia às taxas normais** até o fim do contrato, resultado apurado na indenização. 104/75: não amortizável também quando a **locação é por prazo indeterminado**; vida útil ≤ 1 exercício ou mera conservação → **despesa direta**. **Nenhum dos dois estabelece "min(contrato, vida útil)"** |

| L6 | **CPC 27** itens 16(a), 17(c), 56(d); **Lei 8.245/91** arts. 35-36; **CC/2002** arts. 96, 1.219; **Súmula 335 STJ**; **IN 1.700** art. 131 §§ 7º-8º; SC Cosit 349/2017 (cita os PN 210/73 e 104/75) | PDF oficial CVM; planalto.gov.br; processo.stj.jus.br; normasinternet2.receita.fazenda.gov.br — **lidos na fonte oficial em 02/10** (pesquisa delegada). PN 210/73 e 104/75 **não indexados no SIJUT** (busca por tipo/número/ano: "Nenhum ato encontrado") | 16(a): custo com "impostos não recuperáveis … depois de deduzidos os descontos"; 17(c): frete e manuseio no custo; 56(d): vida útil limitada pelo "término dos contratos de arrendamento"; art. 35: "salvo expressa disposição contratual em contrário", benfeitoria necessária (mesmo sem autorização) e útil autorizada **são indenizáveis**; Súmula 335: renúncia contratual é válida; art. 131 § 7º: imposto pago na aquisição do imobilizado pode ir a custo ou despesa, à escolha |

**Consequências para este BRIEF** (aplicadas abaixo): (i) a regra "min" **sai** — não existe nas normas lidas;
(ii) benfeitoria ganha um pré-requisito legal novo: **sem direito a indenização e prazo determinado**; (iii) o sentido
de 1071/2210 passa de "inferido" para **inferido com 3 fontes oficiais concordantes** (L2 § 4º, L3 relacionamento,
L4 tabela de sinais); (iv) CSLL entra (**V**); (v) o F-EM-9 recomendado na 1ª versão estava **errado** (contagem
dupla — ver E17).

## 1. Estado medido do código (V = lido nesta sessão)

| # | Fato | Onde | Grau |
|---|---|---|---|
| S1 | Todo item CFOP 1551/2551 vai para `fixedAssetItems`, sem limite de valor; sem `classId` → 400 | `NfeImportService.ts:64,267-297` | V |
| S2 | `fixedAssetItem` do DTO: `classId, cProd, costCents, ncm?, qty?, nItem?` — nenhum campo de "expensar" | `PayableDto.ts:84-96` | V |
| S3 | `costCents` do item é o custo da **linha** (rateio D3), não unitário; `qty` vem de `qCom` | `NfeImportService.ts:283-293` | V |
| S4 | `FixedAssetClass` não tem prazo/`leaseEndDate`/tipo de amortização | `schema.prisma:1621-1642` | V |
| S5 | `FixedAsset` idem; quota = cumulativa por `bookAnnualRateBp ?? annualRateBp` | `schema.prisma:1687-1733`; `DepreciationService.ts:177-180` | V |
| S6 | Uma única `depreciationExpenseAccountId` por escopo (amortização de benfeitoria cai na mesma conta) | `schema.prisma:1592` | V |
| S7 | `depreciationParteBAccountId` existe e é gravado/exposto por `AccountingScopeSettingsService.ts:53,90-97` (valida que a conta M010 existe), mas **nenhum consumidor de negócio o lê** (Lalur/Depreciation não o referenciam) | `schema.prisma:1598`; grep em `server/src` | V |
| S8 | Linhas do L12 já no catálogo: `86` (adição, lalur e lacs), `161` (exclusão), `91.01` (baixa/alienação) | `fixtures/ecf-l12-linhas.json:1593,1625,2817,4547` | V |
| S9 | `LalurEntry` é **única por `(escopo, ano, trimestre, livro, codigo)`**; tem `parteBId` (indRelacao 1/3) e `journalLinks` (M312, indRelacao 2/3) | `schema.prisma:1944-1971` | V |
| S10 | `LalurParteBMovement` não tem vínculo a lançamento contábil; `origem ∈ {user, system}` | `schema.prisma:2019-2041` | V |
| S11 | `closeParteB` já deriva movimentos `system` (PF/BC) dentro da tx e escolhe conta por `codPbRfb` | `LalurService.ts:825-870` | V |
| S12 | Nenhuma ocorrência de `1071`/`2210` no código contábil | grep | V |
| S13 | Nota multi-item **não aceita** `expenseAccountId` no topo (modos XOR); o modo 4 só combina com o modo 3 | `PayableDto.ts:129-166` | V |
| S14 | O detalhamento do modo 4 **não** mora no `Payable`: vai para `SourceDocument.rawJson` como `{fixedAssetItems}`; os débitos são agrupados por `accountCode` (`groupFixedAssetDebits`); `redriveMissingDrafts` relê esse JSON e cria rascunho para **todo** item nele | `PayableService.ts:1005-1045,1118-1130,1171` | V |
| S15 | `resolveFixedAssetLines` resolve, antes da tx, a conta da classe **e a taxa por NCM** de cada item | `PayableService.ts:182-187,1202-1244` | V |
| S16 | O mapeamento do import é por item: `productRef` XOR `classId`, e o CFOP 1551/2551 **exige** `classId` | `NfeDto.ts:24-39` | V |

## 2. Checklist de comportamentos

Numeração `E` = emenda. Cada item é testável isolado. Itens com fork dependem da ratificação indicada.

### Parte 1 — bem de até R$1.200 direto na despesa

Artefato: RIR/2018 art. 313 § 1º I e § 2º; IN RFB 1.700/2017 art. 120 caput e § 1º
(`fontes-oficiais/IN-RFB-1700-2017.txt:2493-2495`); PN CST 100/1978 itens 13, 14, 20 (via dossiê §8).

- **E1.** Constante `FIXED_ASSET_EXPENSE_LIMIT_CENTS = 120000n` num único módulo (`models/fixedAssetLimits.ts`),
  com comentário citando art. 120. Teste: valor = 120000.
- **E2.** Critério = **valor unitário da utilidade funcional autônoma**: `unitCostCents = ceil(costCents / qty)` da linha
  (F-EM-2 → **b**, ratificado 02/10: teto da divisão inteira em BigInt; equivale a `costCents ≤ limite × qty`). Nunca o total da nota nem o da linha. Teste: linha de 3 cadeiras × R$900 (total R$2.700)
  → elegível; 1 item × R$1.300 → inelegível; nota com 2 linhas somando R$2.000, cada uma ≤ R$1.200 → ambas elegíveis;
  borda: `costCents = 360001, qty = 3` → `unitCostCents = 120001` → inelegível; `360000/3` → `120000` → elegível.
- **E3.** A escolha é **explícita por item, no lançamento da aquisição** (PN 100/78 item 13): o mapeamento do import
  e o `fixedAssetItem` ganham `treatment: 'CAPITALIZE' | 'EXPENSE'` (default e forma do mapeamento: F-EM-1).
  `EXPENSE` exige `expenseAccountId` **por item** (conta de resultado, analítica, ativa — mesmas guardas do
  `expenseAccountId` do payable) e **não** exige `classId`. A regra XOR de S13 no topo do DTO **não muda**: a conta
  mora no item, não no topo. Mudanças forçadas: (i) ~~o gate de S16 passa a aceitar `classId` **ou**
  `{treatment:'EXPENSE', expenseAccountId}` para 1551/2551~~ — **ajuste 02/10:** a emenda do ITEM-DESTINATION
  (itens 22-23, 29/09) trocou o roteamento por CFOP pela destinação declarada (`classId` ⇒ `IMOBILIZADO`;
  `IMOBILIZADO` sem `classId` → 400). O item `EXPENSE` é declarado pelo operador no mesmo mapeamento e não leva
  `classId`; a forma exata de convivência com o enum de destinação (`IMOBILIZADO` + `treatment` ou destinação
  própria) é decidida na `sessao-feature` contra o código que o ITEM-DESTINATION PR-1 deixar em `main` — sem
  mudar F-EM-1 (a): default ativar, despesa só explícita, por item; (ii) `resolveFixedAssetLines` (S15) **pula** a resolução
  de taxa/classe de item EXPENSE (senão um NCM sem taxa derruba uma compra que nem vai ao ativo).
- **E4.** `EXPENSE` com `unitCostCents > limite` (E2) **e sem** `usefulLifeUpToOneYear = true` (E4b) → `ValidationError`
  400 citando art. 120.
- **E4b.** (F-EM-3 → **b**, ratificado 02/10.) 2ª hipótese do caput do art. 120: o item ganha a declaração
  `usefulLifeUpToOneYear: boolean` (opcional, default ausente = `false`). Com `true`, `EXPENSE` é aceito **acima** do
  limite. Só vale com `treatment = 'EXPENSE'` (com `CAPITALIZE` → 400) e é incompatível com `setDeclared` (conjunto
  → ativa). A declaração entra na trilha do E8. Testes: R$5.000 `EXPENSE` sem a flag → 400; com a flag → aceito,
  sem rascunho; flag com `CAPITALIZE` → 400.
- **E5.** Item `EXPENSE` debita `expenseAccountId` no mesmo lançamento do payable (mesma tx, mesma fórmula D3 de custo
  líquido) e **não** cria `FixedAsset` nem rascunho. O débito entra pelo mesmo agrupamento por `accountCode` (S14).
  O `rawJson` guarda os itens EXPENSE **com** `treatment` (trilha da escolha, PN 100/78 item 13) e o
  `redriveMissingDrafts` **filtra** `treatment==='EXPENSE'` antes de `createDraftFromPayable` — hoje ele rascunha
  tudo que está no JSON (S14), então sem o filtro o reconcile ativaria o que o usuário expensou. Teste: payable com
  1 CAPITALIZE + 1 EXPENSE → reconcile cria 1 rascunho; 2º run cria 0. JSON legado sem `treatment` = CAPITALIZE.
- **E6.** Irreversibilidade (PN 100/78 item 20): **não existe** comando "expensar ativo existente". Teste negativo
  documental: nenhum endpoint novo sobre `FixedAsset` além dos do BRIEF-mãe **e do comando de junção do E7b**
  (guard de path-count do openapi: +1 path, só o da junção).
- **E7.** Exceção de conjunto (IN 1.700 art. 120 § 1º): o sistema **não decide** — é declaração do usuário
  (F-EM-4 → **e**, ratificado 02/10). Na entrada, a linha marcada `setDeclared = true` ("faz parte de um conjunto")
  é forçada a `CAPITALIZE` e vira rascunho normalmente; o limite de R$1.200 deixa de ser checado nela, porque quem
  decide é o conjunto (E7b). Peça já expensada **não** entra em conjunto (E6: escolha irreversível).
- **E7b. [ADR escrito 02/10 — `ADR-INCR-FIXED-ASSETS-EMENDA-JUNCAO.md` (Proposed, forks F-JL decididos por delegação);
  checklist J1–J12 lá; entra como PR **P4** depois do P1]** Junção geral de linhas (modelo Oracle *merge mass additions* /
  NetSuite *parent proposal*, pesquisa de 02/10 na cédula): o usuário junta N rascunhos `PENDING_ACTIVATION` do
  **mesmo escopo**, de **qualquer** nota, num único ativo-conjunto antes da ativação; custo = Σ custos; a taxa e a
  classe são escolhidas na junção. Troca a chave `@@unique([payableId, sourceItemRef])` do BRIEF-mãe (item 22) por
  uma relação ativo ↔ N itens de origem e mexe no `redriveMissingDrafts` (S14: o reconcile não pode recriar o
  rascunho de um item já juntado). Pela governança T12 (PLAN→ADR→BRIEF), o desenho sai de um **ADR de emenda do
  `ADR-INCR-FIXED-ASSETS`** em `sessao-planejamento`; este BRIEF só fixa o requisito. A pesquisa não verificou
  ERPs brasileiros além de Senior/Protheus (secundária) — registrar no ADR.
- **E8.** Trilha: o lançamento do payable registra no `AuditEvent` existente os itens `EXPENSE` com `unitCostCents`
  (E2) e `usefulLifeUpToOneYear` quando presente (E4b) (sem eventType novo, se o payload do evento atual comporta — senão eventType novo entra na allowlist
  `auditCanonical.ts` na mesma mudança).

### Parte 2 — benfeitoria em imóvel de terceiro

Artefato: RIR/2018 arts. 330 § 3º, 331 III, 333 (L1, oficial); PN CST 210/73 e 104/75 (L5, secundária). A regra
"min(prazo do contrato, vida útil)" **não existe** nas normas fiscais lidas; entra **só no livro contábil** (CPC 27
item 56(d)) — F-EM-5 → b revisto em 02/10 por delegação; o fiscal segue o RIR 333.

- **E8b.** Pré-requisito legal da amortização (RIR 331 III + PN 210/73 + PN 104/75): o ativo só pode ser
  `AMORTIZATION_LEASEHOLD` se `leaseIndemnifiable = false` **e** o contrato tem prazo determinado (`leaseEndDate`
  presente). `leaseIndemnifiable = true` ou prazo indeterminado → 400 orientando a classe `DEPRECIATION` (taxa
  normal, Anexo III — edificação/instalação). O campo é **declaração obrigatória** do usuário (sem default): o
  silêncio do contrato gera direito a indenização (PN 210/73 item 4), então "não sei" não pode virar `false`.
  Teste: `leaseIndemnifiable` ausente → 400; `true` → 400 com a orientação; `false` + `leaseEndDate` → aceita.

- **E9.** `FixedAssetClass.kind: 'DEPRECIATION' | 'AMORTIZATION_LEASEHOLD'` (default `DEPRECIATION`; linhas
  existentes migram para o default). Onde mora o prazo: F-EM-6.
- **E10.** Ativo de classe `AMORTIZATION_LEASEHOLD` exige `leaseEndDate` (date-only, validado de calendário — não só
  regex; memória `date-only-regex-nao-valida-calendario`) **>** `activatedAt`; ausente → 400.
- **E11.** Quota mensal linear (F-EM-5 → **b** só no contábil, revisto 02/10): **contábil** `nBook = min(nContrato,
  nVida)`; **fiscal** `nFiscal = nContrato` (RIR 333) — o lançamento no razão usa `nBook`; `nFiscal` só alimenta o
  Bloco F (E15). Com `nContrato = meses de activatedAt a leaseEndDate` (inclusivo, mesma
  `monthsBetweenInclusive`) e `nVida = ceil(12 × 10000 / annualRateBp)` (taxa da classe/NCM do Anexo III; ex.:
  instalações 10% → 120 meses); cumulativa `cumK = min(base × k / n, base)` com resíduo no último mês
  (cumulativa, como o item 12 do BRIEF-mãe — nunca soma de quotas arredondadas). `annualRateBp` fica como snapshot
  informativo **e** fonte de `nVida`. Teste: base 12.000, contrato de 24 meses, taxa 10% → n = 24 → 500/mês, Σ = 12.000
  exato no mês 24; base 10.000 / 3 meses → 3.333, 3.333, 3.334; contrato de 15 anos com taxa 10% → `nBook = 120`
  (vida útil vence), `nFiscal = 180`. Sem `annualRateBp` resolvível → 400 (não há `nVida`).
- **E12.** Lançamento: D conta de amortização (F-EM-7) / C `accumulatedDepreciationAccountId` da classe (reuso do
  campo — conta "amortização acumulada" é escolha do plano de contas do cliente). `sourceType` igual ao da depreciação
  (reuso de idempotência `asset:yyyy-mm`).
- **E13.** Alteração de `leaseEndDate` depois de ativado (renovação/rescisão): F-EM-8 → **a** (ratificado 02/10):
  **imutável** após `activate` (400); rescisão = E14.
- **E14.** Contrato encerrado com saldo (rescisão antecipada): baixa pelo `dispose` já existente (valor residual
  vira perda) — sem comando novo. Teste: dispose antes de `leaseEndDate` baixa o líquido.

### Parte 3 — retomada do Bloco F (itens 23-25 do BRIEF-mãe)

Artefato: IN 1.700 art. 124 §§ 4º-5º e 310 § 2º (L2); RIR 321 (L1); Tabelas Dinâmicas L12 `PARTEB_PARTEA` (L3);
Manual L12 tabela de sinais (L4). Leitura: **`1071` = saldo nascido de ADIÇÃO** (contábil > fiscal; Parte B devedora,
excluída depois); **`2210` = saldo nascido de EXCLUSÃO** (contábil < fiscal, RIR 321/IN 124 § 4º; Parte B credora,
adicionada depois — § 5º). Grau: **inferido com 3 fontes oficiais concordantes** (nenhuma diz o sentido em uma
frase; L3 só lista os relacionamentos). `3130` = IN 1.778 (petróleo/gás) — nunca para salão.

- **E15.** `IFixedAssetReader.listForParteB(scope, year, quarter)` (interface, execution-plan A6) injetada via factory
  no `LalurService`; devolve só ativos com `bookAnnualRateBp ≠ null` **ou** `residualValueCents > 0` **ou**
  `AMORTIZATION_LEASEHOLD` com `nBook < nFiscal` (E11; quota fiscal = cumulativa `base × k / nFiscal`, não taxa × custo), status
  `ACTIVE | FULLY_DEPRECIATED | DISPOSED-no-trimestre`, com quota contábil postada e quota fiscal teórica do trimestre.
- **E16.** Diferença trimestral por ativo = Σ(quota fiscal − quota contábil) — fórmula do item 23 inalterada;
  por ativo, a linha e a conta da Parte B saem do relacionamento L3:

  | Situação no trimestre | Linha (M300 **e** M350) | Conta Parte B | Grau |
  |---|---|---|---|
  | contábil > fiscal (constitui) | `86` adição | `1071` (devedora) | L3+L4 |
  | contábil acabou, fiscal continua (realiza 1071) | `161` exclusão | `1071` (baixa) | L3+L4 |
  | contábil < fiscal (constitui) | `161` exclusão | `2210` (credora) | L2 § 4º + L3 |
  | fiscal atingiu `costCents` (§ 5º), realiza 2210 | `86` adição | `2210` (baixa) | L2 § 5º + L3 |
  | baixa/alienação com saldo 2210 | `91.01` adição | `2210` | L3 (91.01 só se relaciona com 2210) |
  | baixa/alienação com saldo 1071 | `161` exclusão | `1071` | L3 (1071 não se relaciona com 91.01) |

  Quota fiscal = taxa × `costCents` **sem** residual (IN 123, V) — confirma a fórmula do item 23.
- **E16b.** Tudo em dobro: IRPJ (livro `lalur`, conta M010 `I`) **e** CSLL (livro `lacs`, conta M010 `C`) — IN 124 § 4º
  "e-Lalur e do e-Lacs" + tributo `A` (L2/L3, **V**). Teste: 1 ativo com override → 2 lançamentos por trimestre.
- **E17.** Registro (resolve a pausa do PR-3): **só** `LalurEntry` Parte A `origem`-sistema com `parteBId` (M305),
  **nenhum** `LalurParteBMovement` — o saldo da Parte B já anda pelo M305 (`lalurParteBBalances.ts:13`, L4); gravar os
  dois contaria em dobro. `indRelacao` por linha (IN 310 § 2º I a 2, "quando presentes"): **adição** (86/91.01)
  reflete despesa contábil que **existe** → `'3'` + `accountId` = `depreciationExpenseAccountId` + M312
  (`journalLinks`) = lançamentos de quota do trimestre — **era o que o item 24 original pedia**, e o schema já
  comporta (S9); **exclusão** (161) é valor só fiscal → `'1'`, sem M310/M312. Substituído a cada refechamento na
  mesma tx (padrão `:838`). Grau: indRelacao por linha = **inferido** da IN 310 + L4; o PVA é o oráculo.
- **E18.** Conta da Parte B escolhida por `codPbRfb` + `codTributo` (como o PF/BC em `LalurService.ts:~850`):
  diferença ≠ 0 sem conta → `ValidationError` nomeando o código esperado (`1071` ou `2210`) e o tributo. Forma da
  configuração: F-EM-10 → **b** (ratificado 02/10) — sem campo novo em settings.
- **E19.** Guard: `codPbRfb = '3130'` nunca é escolhido automaticamente (teste: escopo só com conta 3130 → 400, não usa).
- **E20.** Default (sem override, residual 0, sem benfeitoria) → diferença **exatamente 0** → **0** `LalurEntry`/
  movimentos `system` novos (item 25 do BRIEF-mãe).
- **E21.** Benfeitoria (F-EM-11 → **b**, revisto 02/10 por consequência do F-EM-5): com `nBook = nFiscal` a diferença
  é 0 e nada é gravado (E20); com `nBook < nFiscal` o contábil corre à frente → linhas 1 e 2 da tabela do E16
  (`86`/`1071` enquanto contábil > fiscal; `161` realizando `1071` depois que o contábil termina). Teste: contrato 15
  anos, taxa 10%, base 18.000 → trimestre 1: contábil 450, fiscal 300 → adição 150 em `86`/`1071`, IRPJ e CSLL.
  ~~Texto anterior: contábil e fiscal usam o mesmo prazo, `min(contrato, vida útil)` (E11, F-EM-5 → b nos dois livros) → diferença 0 por construção. `listForParteB` exclui
  `AMORTIZATION_LEASEHOLD`. (Se o dono quiser amortização contábil por outro critério, isso reabre — F-EM-11.)
- **E21b.** Uma linha pode precisar de **duas** contas da Parte B no mesmo trimestre (ex.: `161` realizando 1071 de
  um ativo e constituindo 2210 de outro), mas `LalurEntry` tem **um** `parteBId` e é única por código/período (S9).
  Forma: F-EM-14 → **a** (ratificado 02/10): tabela filha `LalurEntryParteBLink` (M305 1:N); o `parteBId` único da
  `LalurEntry` deixa de ser a fonte do M305 para linhas `origem='system'`.
- **E22.** Colisão com `@@unique(... livro, codigo)` (S9): se já existe `LalurEntry` **do usuário** com `86`/`161`
  no período → F-EM-12 → **a** (ratificado 02/10, junto com F-ENC-6 da 3.3): **400** no fechamento nomeando a linha
  manual que colide.

### Gates da mudança (pertencem ao checklist)

- **E23.** Snapshot de shape dos DTOs Zod atualizado (`PayableDto`, `FixedAssetClassDto`, `FixedAssetDto`, settings).
- **E24.** Migração única (ver §3.3), colunas **no fim**, `smoke:migration` com abort simulado; `resetDb()` já cobre
  as tabelas (sem tabela nova).
- **E25.** Paridade i18n pt/en das mensagens novas; openapi `docs:generate` sem path novo (E6).
- **E26.** `tsc --noEmit` limpo; `npm run test:integration` para `closeParteB` com ativo override.

## 3. Contratos (esboço materializável)

### 3.1 `PayableDto.ts` — `fixedAssetItem`

```ts
const fixedAssetItem = z
  .object({
    treatment: z.enum(['CAPITALIZE', 'EXPENSE']).default('CAPITALIZE'), // F-EM-1
    classId: z.string().min(1).optional(),          // obrigatório se CAPITALIZE
    expenseAccountId: z.string().min(1).optional(), // obrigatório se EXPENSE
    setDeclared: z.boolean().optional(),            // F-EM-4 → e — "faz parte de um conjunto": força CAPITALIZE (E7); a junção é E7b (ADR)
    usefulLifeUpToOneYear: z.boolean().optional(),  // F-EM-3 → b — libera EXPENSE acima do limite (E4b)
    cProd: z.string().min(1),
    costCents: cents,
    ncm: z.string().min(1).optional(),
    qty: z.number().int().positive().optional(),
    nItem: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.treatment === 'CAPITALIZE' && !v.classId) ctx.addIssue({ code: 'custom', path: ['classId'], message: 'classId obrigatório para CAPITALIZE' });
    if (v.treatment === 'EXPENSE' && !v.expenseAccountId) ctx.addIssue({ code: 'custom', path: ['expenseAccountId'], message: 'expenseAccountId obrigatório para EXPENSE' });
    if (v.treatment === 'EXPENSE' && v.classId) ctx.addIssue({ code: 'custom', path: ['classId'], message: 'EXPENSE não leva classId' });
    if (v.treatment === 'EXPENSE' && v.setDeclared) ctx.addIssue({ code: 'custom', path: ['setDeclared'], message: 'conjunto declarado exige CAPITALIZE (IN 1.700 art. 120 § 1º)' });
    if (v.usefulLifeUpToOneYear && v.treatment !== 'EXPENSE') ctx.addIssue({ code: 'custom', path: ['usefulLifeUpToOneYear'], message: 'vida útil ≤ 1 ano só se aplica a EXPENSE (IN 1.700 art. 120)' });
  });
// Limite (E4) é regra de SERVIÇO (precisa de qty resolvida do qCom), não do DTO.
```

> Zod 4: `.default()` dentro de `.partial()` reaplica o default (memória `zod4-partial-aplica-default-reseta-campo`)
> — este schema não é usado em update parcial; conferir na execução.

Mapeamento do import (NF-e): o mapa `cProd → classId` passa a aceitar `cProd → { treatment, classId? | expenseAccountId? }`
(forma exata do DTO de mapeamento depende de F-EM-1).

### 3.2 Classe / ativo / settings

```ts
// FixedAssetClassDto (create/update)
kind: z.enum(['DEPRECIATION', 'AMORTIZATION_LEASEHOLD']).default('DEPRECIATION'),
amortizationExpenseAccountId: z.string().min(1).optional(), // só se F-EM-7 → b

// FixedAssetDto (create) — só se F-EM-6 → a (prazo no ativo)
leaseEndDate: dateOnly('leaseEndDate').optional(), // obrigatório (serviço) quando class.kind = AMORTIZATION_LEASEHOLD
leaseIndemnifiable: z.boolean().optional(),        // E8b — obrigatório (serviço) com AMORTIZATION_LEASEHOLD; true → 400

// AccountingScopeSettingsDto — F-EM-10 (b recomendado): nenhum campo novo; depreciationParteBAccountId
// é DEPRECADO de leitura (resolve por codPbRfb). Se F-EM-10 → a: 4 FKs {1071,2210} × {I,C}.
```

### 3.3 Migração (única, `YYYYMMDDhhmmss_c8_emenda_3_2`)

```sql
-- sem tabela nova; só colunas, no fim (SQLite ADD COLUMN não tem IF NOT EXISTS — memória migracao-sqlite-nao-e-transacional)
ALTER TABLE fixed_asset_classes ADD COLUMN kind TEXT NOT NULL DEFAULT 'DEPRECIATION';
ALTER TABLE fixed_assets        ADD COLUMN leaseEndDate DATETIME;           -- F-EM-6 a
ALTER TABLE fixed_assets        ADD COLUMN leaseIndemnifiable BOOLEAN;      -- E8b (NULL = não declarado)
-- F-EM-14 → a (ratificado 02/10): CREATE TABLE IF NOT EXISTS lalur_entry_parte_b_links (... ) ANTES das colunas
-- F-EM-4 → e (E7b): a relação ativo ↔ N itens de origem NÃO entra aqui — sai do ADR de emenda (migração própria)
-- condicional a F-EM-7 b:
ALTER TABLE fixed_asset_classes ADD COLUMN amortizationExpenseAccountId TEXT REFERENCES accounts(id) ON DELETE RESTRICT;
-- E17: coluna de origem em lalur_entries (hoje não existe — S9)
ALTER TABLE lalur_entries       ADD COLUMN origem TEXT NOT NULL DEFAULT 'user';
```

Payable: **nenhuma coluna** — o item EXPENSE vive no `SourceDocument.rawJson` junto com os de imobilizado (S14).

### 3.4 Leitor do Bloco F

```ts
export interface IFixedAssetReader {
  listForParteB(scope: AccountingScope, year: number, quarter: LalurQuarter): Promise<Array<{
    assetId: string;
    fiscalQuotaCents: bigint;   // cumulativa com annualRateBp, base = costCents
    bookQuotaCents: bigint;     // soma das quotas postadas no trimestre
    disposedInQuarter: boolean; // → 91.01
    fiscalAccumCents: bigint;   // p/ art. 124 § 5
  }>>;
}
```

## 4. Forks — ratificação por questionário em curso (sessão de 2026-10-02)

> Cédulas: [`D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS`](../plano/decisoes/D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS.md).
> Ratificar fork **não** é "executa" (ORCH-006).


| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-EM-1** | Default do `treatment` e onde o usuário escolhe | (a) default `CAPITALIZE`; EXPENSE só explícito, por item, no mapeamento do import · (b) sugerir `EXPENSE` automaticamente quando unitário ≤ limite · (c) default `EXPENSE` abaixo do limite | **(a)** — PN 100/78 item 13 põe a escolha no lançamento; auto-sugestão (b) é FE, não muda o contrato; (c) decide pelo contribuinte · ✅ **RATIFICADO 2026-10-02 → (a)** — dono: *"(a) Padrão ativo (Recomendado)"*. Nota: a emenda do ITEM-DESTINATION (itens 22-23, 29/09) tirou o roteamento por CFOP; o texto do E3 (i) foi ajustado abaixo |
| **F-EM-2** | `unitCostCents` quando `costCents` não divide por `qty` | (a) comparar `costCents ≤ limite × qty` (sem divisão) · (b) teto da divisão | ~~(a)~~ — exato em inteiros, sem arredondamento. **Base comparada = custo líquido do item** (rateio D3 com frete, sem os créditos recuperáveis — S3); que o "valor unitário" do art. 120 seja o custo de aquisição nesse sentido é **inferido** (RIR art. 301 não lido nesta sessão) → §5 item 5 · ✅ **RATIFICADO 2026-10-02 → (b)** (diverge da recomendação) — dono: *"(b) Arredondar para cima"*; reconfirmado depois da correção de que (a) e (b) dão sempre o mesmo resultado (limite é inteiro em centavos: `ceil(c/q) ≤ L ⇔ c ≤ L·q`): *"Mantém (b)"*. Itens afetados: **E2, E4, E8**. Base: CPC 27 16(a)/17(c) (FLAG-3.2-A fechada 02/10) |
| **F-EM-3** | Hipótese "vida útil ≤ 1 ano" (2ª do caput do art. 120) | (a) fora desta emenda · (b) flag `usefulLifeUpToOneYear` que libera EXPENSE acima do limite | ~~(a)~~ — a decisão 16 nomeia só o R$1.200; (b) vira achado fora de escopo · ✅ **RATIFICADO 2026-10-02 → (b)** (diverge da recomendação; **amplia o escopo** da decisão 16 de 29/09 — a resposta do dono é a autorização citável da ampliação, só de planejamento) — dono: *"(b) Incluir a flag"*. Itens afetados: **E4, E4b (novo), §3.1, §7** |
| **F-EM-4** | Exceção de conjunto (§ 1º) | (a) só declarativa: `setDeclared` força CAPITALIZE, sem heurística · (b) heurística por NCM/qty · (c) ignorar | ~~(a)~~ — a lei fala da atividade, que o sistema não conhece · ✅ **RATIFICADO 2026-10-02 → (e) junção geral de linhas** (caminho novo do dono; diverge da recomendação) — 1ª resposta: *"Aqui o sistema deveria ter uma forma de criar uma peça que represente esse conjunto de peças"*; no detalhe (d1/d2/d3): *"Vamos pesquisar qual o padrão do mercaado, pq ambos podem ser feitos"*; depois da pesquisa (mínimo de mercado = linha→ativo; Oracle/NetSuite juntam linhas de qualquer nota; nenhum ERP faz "só da mesma nota"): *"Junção geral de linhas"*. Troca a chave 1-ativo-por-linha do BRIEF-mãe (item 22) → **exige ADR antes** (T12). Itens afetados: **E6, E7, E7b (novo), §3.1, §3.3, §7, F-EM-13** |
| **F-EM-5** | Prazo da benfeitoria | (a) prazo restante do contrato (RIR 333, **V**) · ~~(b) min(contrato, vida útil)~~ | ~~(a)~~ — (b) **retirado**: PN 210/73 e 104/75 (L5) não trazem a regra; o que trazem é a condição de E8b · ✅ **RATIFICADO 2026-10-02 → (b) min(contrato, vida útil), nos livros contábil E fiscal** (diverge da recomendação) — dono: *"(b) min(contrato, vida útil)"*; perguntado "vale para qual livro?" com o aviso de que no fiscal contradiz o RIR 333 (texto oficial lido): *"(b) Contábil e fiscal"*. ~~Risco legal registrado → FLAG-3.2-D~~. 🔁 **REVISTO 2026-10-02 por delegação do dono** (*"Toma a decisão logica aqui entao e feche as pendencia"*, sobre a lista em que o agente mostrou o conflito com o RIR 333) → **(b) só no livro CONTÁBIL** (CPC 27 item 56(d): a vida útil considera o término do contrato de arrendamento); **fiscal pelo prazo restante do contrato (RIR 333)**. Quando a vida útil < contrato, a diferença vai ao Bloco F (F-EM-11 → b, E21). FLAG-3.2-D **fechada** (o fiscal deixa de contrariar a lei). Itens afetados: **E11, E15, E21, §2 Parte 2, §5.1, F-EM-11** |
| **F-EM-6** | Onde mora o prazo | (a) `leaseEndDate` no **ativo** · (b) na classe | **(a)** — contratos diferentes por imóvel; a classe diz só o *tipo* · ✅ **RATIFICADO 2026-10-02 → (a)** — dono: *"(a) No ativo (Recomendado)"* |
| **F-EM-7** | Conta de despesa da amortização | (a) reusa `depreciationExpenseAccountId` · (b) `amortizationExpenseAccountId` na classe | **(b)** — DRE/referencial separa depreciação de amortização; confirmar código referencial com o contador (§5) · ✅ **RATIFICADO 2026-10-02 → (b)** — dono: *"(b) Conta própria (Recomendado)"*. Código referencial **fechado 02/10** (delegação): `3.01.01.07.01.24` "(-) Encargos de Amortização" (analítica, atividade geral), irmã da `.23` "(-) Encargos de Depreciação"; amortização acumulada `1.02.03.01.31` — catálogo RFB 2025 importado no X2 (gate `done`, assinado 24/09; lido na tabela `referential_accounts`). Confirmação do contador vira validação, não bloqueio |
| **F-EM-8** | Renovação/rescisão do contrato | (a) imutável após ativação; rescisão = dispose · (b) comando `extendLease` com recálculo prospectivo | **(a)** nesta emenda; (b) quando o 1º cliente tiver contrato renovado · ✅ **RATIFICADO 2026-10-02 → (a)** — dono: *"(a) Imóvel; rescisão = baixa (Recomendado)"* |
| **F-EM-9** | Forma do registro Bloco F (a pausa do PR-3) | (a) `LalurEntry` Parte A (86/161/91.01, `indRelacao='1'`, `parteBId`) + `LalurParteBMovement system` · (b) só `LalurParteBMovement` · (c) (a) + M312 ligando os lançamentos de quota | ~~(a)~~ **retirada na 3ª passada** — gravaria M305 **e** M410 para o mesmo valor (contagem dupla, L4). **Nova recomendação (d):** só Parte A com M305; `indRelacao='3'` + M310/M312 na adição, `'1'` na exclusão (E17, IN 310 § 2º) · ✅ **RATIFICADO 2026-10-02 → (d)** — 1ª resposta do dono: *"(c) (a) + M312"*; o agente mostrou que (c) herda a contagem dupla M305 + M410 de (a) e combina `indRelacao='1'` com M312, que o leiaute só aceita com 2/3 (S9); confirmação: *"Troca para (d) (Recomendado)"*. E17 vale como está |
| **F-EM-10** | Configuração da conta Parte B | (a) 4 FKs em settings (`1071`/`2210` × IRPJ/CSLL) · (b) resolver por `codPbRfb`+`codTributo` nas contas M010 do exercício, como o PF/BC (S11) | **(b)** — reuso do padrão existente; a coluna S7 (já exposta na API de settings) fica deprecada — remoção = mudança de contrato, fold posterior · ✅ **RATIFICADO 2026-10-02 → (b)** — dono: *"(b) Pelo código RFB (Recomendado)"* |
| **F-EM-11** | Benfeitoria tem diferença contábil × fiscal? | (a) não — contábil = fiscal pelo prazo · (b) sim | **(a)** — RIR 333 é a regra fiscal e E11 usa o mesmo prazo (E21) · ✅ RATIFICADO 2026-10-02 → (a) — dono: *"(a) Não (Recomendado)"* (premissa: F-EM-5 nos dois livros) · 🔁 **REVISTO 2026-10-02 → (b), por consequência** da revisão delegada do F-EM-5 (contábil ≠ fiscal quando a vida útil < contrato; o próprio texto da pergunta dizia que (b) só faz sentido nesse caso) |
| **F-EM-14** | Linha 86/161 que precisa de 2 contas da Parte B (E21b) | (a) tabela filha `LalurEntryParteBLink` (M305 1:N, migração) · (b) 400 no fechamento quando ocorrer · (c) quebrar em 2 `LalurEntry` (proibido pela unique) | **(a)** — o leiaute permite vários M305 por M300 (`REGRA_VALOR_DETALHADO` soma M305); (b) trava fechamento legítimo · ✅ **RATIFICADO 2026-10-02 → (a)** — dono: *"(a) Tabela filha (Recomendado)"*. Migração ganha a `CREATE TABLE IF NOT EXISTS lalur_entry_parte_b_links` (§3.3) |
| **F-EM-12** | Colisão com LalurEntry manual 86/161 | (a) 400 · (b) somar sistema ao manual numa linha só · (c) mudar a unique para incluir `origem` | **(a)** — explícito; (c) mexe em invariante do e-Lalur · ✅ **RATIFICADO 2026-10-02 → (a)**, numa única pergunta junto com o **F-ENC-6** da emenda 3.3 (mesma regra para toda linha derivada da Parte A) — dono: *"(a) 400 no fechamento (Recomendado)"* |
| **F-EM-13** | Fatiamento | (a) 1 PR · (b) 3 PRs seriais (P1 R$1.200 → P2 benfeitoria → P3 Bloco F), migração no P1 com todas as colunas | **(b)** — partes independentes; P3 não depende mais do contador (§5 item 1 resolvido por lei), só do PVA como oráculo · ✅ **RATIFICADO 2026-10-02 → (b)** — dono: *"(b) 3 PRs seriais (Recomendado)"*. P1 = R$1.200 + E4b (vida útil ≤ 1 ano) + E7 (`setDeclared`), migração completa; **E7b (junção)** = PR **P4** depois do P1, pelo ADR de emenda (F-JL-6 → b) |

## 5. Pendente de validação externa (não entra no checklist como decidido)

Pesquisa de lei feita antes (§0.1). O que **resolveu** saiu daqui; o que resta:

1. ~~Sentido de 1071/2210~~ → **resolvido por lei** a grau "inferido com 3 fontes oficiais concordantes" (§0.1, E16).
   Oráculo final = PVA (a `REGRA_PARTE_B_PARTE_A` valida o par conta×linha, não o sentido). **Não bloqueia mais P3.**
2. ~~PN CST 210/73 e 104/75~~ → **lidos** (fonte secundária, L5); **não indexados no SIJUT** (02/10, L6). O E8b se
   apoia agora no RIR 331 III + 333 (oficial) — FLAG-3.2-C fechada.
3. ~~**Código do plano referencial** para a despesa de amortização~~ → **resolvido 02/10** pelo catálogo oficial RFB
   2025 (X2): `3.01.01.07.01.24` "(-) Encargos de Amortização"; acumulada `1.02.03.01.31`. O contador confirma no
   pacote de validação (não bloqueia).
4. ~~CSLL~~ → **resolvido (V)**: IN 124 § 4º + tributo `A` + linhas em M350A. E16b.
5. ~~**Base do limite de R$1.200**~~ → **resolvido 02/10** pelo CPC 27 itens 16(a)/17(c) (L6, V) — FLAG-3.2-A fechada.
6. ~~**Direito à indenização no Código Civil vigente**~~ → **resolvido 02/10**: Lei 8.245/91 art. 35, CC/2002 art.
   1.219, Súmula 335 STJ (L6, V) — FLAG-3.2-B fechada; E8b confirmado.

### 5.1 FLAGS — abertas pelo dono em 29/09 ("deixe uma flag, não tem como resolver agora"); **todas fechadas em 02/10** por delegação ("Toma a decisão logica aqui entao e feche as pendencia")

Estado **aceito como está**. Não bloqueiam a execução; o executor **não** tenta resolver, só preserva o comportamento
indicado. Quem fechar uma flag risca a linha e cita a fonte.

| Flag | O que fica em aberto | Comportamento até fechar |
|---|---|---|
| ~~**FLAG-3.2-A**~~ | **Fechada 02/10 (delegação):** a base é o custo de aquisição do **CPC 27 item 16(a)/17(c)** (L6, V) — sem imposto recuperável, com frete; nenhuma norma fiscal lida contradiz (o RIR 301 § 3º é de mercadorias; a IN 1.700 art. 131 § 7º só permite levar a despesa o imposto **pago**). Teto declarado: se o contribuinte optar pelo § 7º (imposto pago como despesa), o custo cai e um item poderia ficar abaixo do limite — o sistema **não** oferece essa opção e mantém o imposto não recuperável no custo (base maior = menos itens expensados, lado conservador) | F-EM-2 (b) sobre o custo líquido do item (rateio D3), como está |
| ~~**FLAG-3.2-B**~~ | **Fechada 02/10 (delegação):** Lei 8.245/91 art. 35 + Súmula 335 STJ (L6, V) — no silêncio do contrato a benfeitoria necessária e a útil autorizada **são indenizáveis**; só cláusula expressa de renúncia afasta (voluptuária nunca é, art. 36). Confirma o desenho: "não sei" ≠ `false` | E8b: declaração explícita, sem default; a mensagem do 400 cita art. 35 e a Súmula 335 ("só marque 'sem direito a indenização' se o contrato tiver cláusula expressa de renúncia") |
| ~~**FLAG-3.2-C**~~ | **Fechada 02/10 (delegação), por troca de fundamento:** os PNs não estão indexados no SIJUT (existência V pela SC Cosit 349/2017; conteúdo só secundário). O E8b passa a se apoiar no texto oficial do RIR: art. 331 III (amortiza só "quando não houver direito ao recebimento de seu valor") e art. 333 (taxa pelos "anos restantes de existência do direito" — sem prazo determinado não há anos restantes). Os PNs ficam como reforço, não como base | Desenho atual (E8b); não muda |
| ~~**FLAG-3.2-D**~~ | ~~F-EM-5 → (b) no fiscal contradiz o RIR 333~~ — **fechada 02/10**: F-EM-5 revisto por delegação para (b) só no contábil; fiscal pelo RIR 333 | E11 com `nBook`/`nFiscal` |

## 6. Insumos ausentes (pausados, não varridos — regra 2)

- Nenhum restante: os dois ausentes da 1ª versão (persistência dos itens; DTO do mapeamento) foram lidos na
  2ª passada → S14/S16.

## 7. Achados fora de escopo

- ~~Hipótese "vida útil ≤ 1 ano" do art. 120 (F-EM-3 b) — frente própria se o dono quiser.~~ → entrou como E4b (F-EM-3 → b, 02/10).
- Remoção da coluna `depreciationParteBAccountId` se F-EM-10 → (b) — fold posterior.
- FE (mapeamento com `treatment`, `leaseEndDate` no form do ativo) — nó [[FE-INCR-FIXED-ASSETS]].
- ~~**ADR de emenda do `ADR-INCR-FIXED-ASSETS` para a junção geral de linhas**~~ → escrito 02/10:
  [`ADR-INCR-FIXED-ASSETS-EMENDA-JUNCAO.md`](../adr/ADR-INCR-FIXED-ASSETS-EMENDA-JUNCAO.md). Ponto aberto para o ADR: o (d3) "bem principal + componentes/
  acréscimos" (SAP subnúmero, Senior F670EBA, Protheus ATFA012) **não** foi escolhido — a junção é antes da ativação.
