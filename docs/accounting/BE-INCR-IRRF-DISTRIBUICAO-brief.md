# BE-INCR-IRRF-DISTRIBUICAO — sócios, IRRF de dividendos (Lei 15.270) e JCP completo (BRIEF)

> **Sessão:** `sessao-planejamento`, sem código. Nenhum fork se auto-ratifica. Os forks foram ratificados pelo dono no
> chat da sessão em 17/10, em seis rodadas de questionário (a sexta depois da pesquisa das pendências) ([[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]]).
> **Autorização (dono, chat, 2026-10-17):** *"Autorizo planejar o BRIEF de <NÓ> — sessao-planejamento, sem
> 'executa'"* e, sobre a escolha do nó, *"Pode decidir vc memso"*. O agente escolheu o **IRRF-DISTRIBUICAO**: das quatro
> notas novas da verificação legal de 17/10 (#754), é a única que já está em vigor (desde 01/01/2026) e não depende de nó
> aberto. Cobre **este BRIEF**. **Não** cobre código: cada PR exige o seu "executa".
> **Nó:** [IRRF-DISTRIBUICAO](../plano/nos/IRRF-DISTRIBUICAO.md). **Base:** `origin/main` (o #754, que criou a nota do nó, entrou em 17/10).
> **Dossiê legal:** [`pesquisas-legais/irrf-distribuicao/relatorio.md`](../../pesquisas-legais/irrf-distribuicao/relatorio.md) (referências [Dnn] abaixo).

## 0. Onde vive: Prisma first-class

Pergunta do `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`: **Prisma first-class** (Model + Service + Repo +
Policy próprios).
- A regra é desenhada pela lei e é igual para todos: Lei 9.250 art. 6º-A [D05], Lei 9.249 arts. 9º–10 [D02] e IN 1.700
  art. 75 [D11]. O usuário não desenha o formulário.
- Exige atomicidade multitabela: evento, soma do mês por CPF na PJ inteira, IRRF, lançamento e, no JCP, linhas do e-Lalur.
- Depois de postado, o registro é imutável. Correção = cancelamento com estorno (F-IRD-8).
- Não é DynamicTable, e nada aqui toca `DynamicTableService`, `RuleContext` ou plugin.

## 1. O que já existe e é reusado (lido no código)

| Peça | Onde | Uso aqui |
|---|---|---|
| `postEntry` idempotente por `sourceType`/`sourceId`, em 2 commits + CAS + reconcile | `services/TaxAssessmentService.ts:4-26, 566-628`; `ReconcilePendingService.ts` | molde do lançamento do evento e do JCP |
| Contas de provisão configuradas no perfil fiscal da unidade (F-TA-7) | `schema.prisma:1572-1586` (`irpjRecolherAccountId`…); `TaxAssessmentService.contaDaProvisao` (`:682`) | contas de IRRF a recolher, dividendos a pagar, JCP a pagar e despesa de JCP |
| Perfil fiscal da PJ por ano (`CompanyFiscalProfile`, regime `PRESUMIDO`/`REAL`/`SIMPLES`, forma do Real) | `dtos/CompanyFiscalProfileDto.ts`; `TaxAssessmentService.calcular` (`:707`) | regime (JCP só no Real) e mapa das contas do PL (F-IRD-15) |
| Tabela de parâmetros legais versionada, com fonte e sha | `features/legalParameters/models/legalParameter.ts:9` (`LEGAL_PARAMETER_TABELAS`) | linhas novas `IRRF_DISTRIBUICAO` e `TJLP` |
| Feriados nacionais | tabela `FERIADO_NACIONAL` (`legalParameter.ts:23`); `packages/models/validity.ts:15-21` | "último dia útil" do vencimento |
| e-Lalur Parte A com `origem: 'system'` e catálogo L12 | `schema.prisma:2361` (`LalurEntry`); `models/Lalur.model.ts:118`; `fixtures/ecf-l12-linhas.json` (adição "20" Excesso de JCP, `:794`/`:3860`; exclusão "166.03" (-) JCP, `:2858`/`:5700`) | exclusão e adição geradas pelo JCP (F-IRD-11) |
| Anexo de documento | `SourceDocument` / `DocumentAttachmentService.ts` | ato de aprovação do lucro da transição (F-IRD-6) |
| Gate de período fechado no `postEntry` | `PeriodService.ts` | evento em período fechado → 409 de hoje |
| Nota do fluxo de caixa: passivo de dividendos tem de ir a Financiamento | `CashFlowReportService.ts:54-67` | item 9 |

**Lacunas confirmadas:** nenhum model de sócio. `Counterparty.type` só tem `SUPPLIER | CUSTOMER` (`schema.prisma`,
model Counterparty). Não há folha de capital social, de reserva de lucros, de dividendos a pagar nem de IRRF a recolher
no plano-semente (`fixtures/ChartOfAccountsFixture.ts:51-63`). Também não há JCP nem distribuição em
`server/src` (`mapa-2026-10-10/dominio-contabil.md:92-95`).

## 2. Regra legal que o checklist implementa

| # | Regra | Fonte | Grau |
|---|---|---|---|
| L1 | Pagamento, creditamento, emprego ou entrega de lucros por **uma mesma PJ** a **uma mesma PF residente** acima de R$ 50.000,00 no mês: IRRF de 10% **sobre o total** | Lei 9.250 art. 6º-A caput [D05]; IN 1.500 art. 23-A [D07] | verificado |
| L2 | Sem dedução da base | art. 6º-A § 1º [D05] | verificado |
| L3 | Mais de um evento no mês: a retenção é recalculada pelo total do mês | art. 6º-A § 2º [D05] | verificado |
| L4 | Fora do imposto: resultado até 2025 **e** aprovação até 31/12/2025 **e** exigível, pago nos termos do ato | art. 6º-A § 3º I–III [D05]; P&R itens 7–9 [D08] | verificado |
| L4a | **O prazo da aprovação foi prorrogado para 31/01/2026** por liminar ad referendum do STF (ADIs 7.912 e 7.914, Min. Nunes Marques, 26/12/2025). O referendo foi destacado em 25/02/2026 e vai ao plenário presencial, sem resultado até 17/10 | notícia oficial do STF [D19]; portal STF, ADI 7.912 (andamentos) | verificado; inferido: a liminar segue em vigor até o plenário |
| L5 | Dividendo a PJ domiciliada no País: sem IRRF | Lei 9.249 art. 10 caput [D02] | verificado |
| L6 | Retém também no Simples (decisão F-IRD-3) | P&R item 10 [D08]; contra: LC 123 art. 14 [D06] e IN 1.500 art. 8º II [D07] | ambíguo, decidido |
| L7 | Capitalizar lucro é "emprego" | P&R item 12 [D08] | verificado (orientação RFB) |
| L8 | DARF 1841, até o último dia útil do 2º decêndio do mês seguinte | P&R itens 6 e 11 [D08]; Lei 11.196 art. 70 I e [D10] | verificado |
| L9 | JCP: IRRF de 17,5% na data do pagamento ou crédito; antecipação para PJ e definitivo para PF | Lei 9.249 art. 9º §§ 2º–3º [D02]; IN 1.700 art. 75 §§ 7º–8º [D11] | verificado |
| L10 | JCP dedutível só no lucro real: TJLP pro rata die sobre as contas do art. 75 I–V; limite = maior entre 50% do lucro do exercício antes dos juros (após CSLL, antes do IRPJ) e 50% de lucros acumulados + reservas de lucros; deduzido no ano a que se refere; no PL, exclusão na Parte A | IN 1.700 art. 75 caput, §§ 1º–6º [D11]; Lei 9.249 art. 9º caput e § 1º [D02] | verificado |
| L11 | JCP "creditado individualizadamente" = contrapartida em passivo exigível do sócio, no ano | IN 1.700 art. 75 § 10 [D11] | verificado |
| L12 | Lucros acumulados na base do JCP: só os do exercício anterior | IN 1.700 art. 75 § 1º VI (red. IN 2.296/2025) [D11] | verificado |
| L13 | Recolhimento do IRRF do JCP: 3º dia útil depois do decêndio do fato gerador | Lei 11.196 art. 70 I b 1 [D10] | verificado |
| L14 | A parcela dedutível vai até a variação pro rata dia da TJLP "desde o início do período de apuração até a data do pagamento ou crédito", deduzida no ano-calendário a que se referem os limites | SC Cosit 45/2018 (vinculante; ementa lida no Sijut em 17/10) | verificado |
| L15 | A variação pro rata dia pode ser calculada por juros simples | SC Cosit 70/2025 [D16] | verificado |
| L16 | DARF do IRRF sobre JCP: **5706** (residente); 9453 (exterior, fora do escopo) | MAFON 2025, p. 58 [D14] (o manual ainda mostra 15%; vale 17,5%, L9) | verificado |
| L17 | TJLP 2026 (taxa mensal publicada pela RFB): jan–mar 0,7658% · abr–jun 0,7608% · jul–set 0,7617% · out–dez 0,7742% | RFB, página da TJLP, atualizada em 30/09/2026 [D12] | verificado |
| L18 | Valor destinado à reserva de incentivos fiscais fica fora da base do JCP, mesmo depois de levado a capital ou a reserva de capital | SC Cosit 131/2026 (acervo, `solucoes-de-consulta/2026`) | verificado |

## 3. Checklist de comportamentos

Cada item tem um teste próprio. "422" = recusa de regra de negócio no padrão do projeto (`ValidationError`/`ConflictError`
conforme o caso já usado no X7). Fatiamento sugerido em §3.5.

### 3.1 PR-1: sócios, parâmetros e plano de contas

1. **Model `Partner` (F-IRD-2, F-IRD-14).** PJ-wide (`userId` = PJ, R8; sem `unitId`). Campos: `nome`, `taxId` (11 ou 14
   dígitos, **com dígito verificador validado**), `tipoPessoa` (`PF`|`PJ`, derivado do tamanho), `residenteBrasil`,
   `participacaoBp` (0..10000), `entradaEm`/`saidaEm` (date-only), autor, timestamps e `deletedAt`. Cadeia completa: Route
   → Controller → Service → Repository → Prisma + Policy, Factory, DTO Zod `.strict()`, soft-delete. Teste: CPF com DV
   errado → 400.
2. **Vigência sem sobreposição por `taxId`.** Duas vigências que se cruzam para o mesmo `taxId` na mesma PJ → 409, com o
   gate **dentro da tx** (memória "gate autoritativo dentro da tx"). Teste: criação concorrente de duas vigências
   sobrepostas → uma 409.
3. **Soma das participações (F-IRD-14).** `GET /accounting/partners?data=YYYY-MM-DD` devolve os sócios vigentes e
   `somaParticipacaoBp`. A soma ≠ 10000 **não** bloqueia o cadastro, mas bloqueia o JCP (item 22). Teste: soma 9000 →
   resposta com `somaParticipacaoBp: 9000` e aviso.
4. **Sócio não residente (F-IRD-7).** O cadastro aceita `residenteBrasil: false`. Os eventos de dividendos e o JCP desse
   sócio são recusados (400 `SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO`). Nada é aceito e ignorado. Teste nos dois fluxos.
5. **Parâmetros legais.** Tabela nova `IRRF_DISTRIBUICAO`: `ALIQUOTA_PF_BP` = 1000, `LIMITE_MENSAL_PF_CENTS` = 5000000,
   `vigenteDesde` 2026-01-01, fonte "Lei 9.250 art. 6º-A (incl. Lei 15.270/2025)" + URL do Planalto [D05] + sha;
   `ALIQUOTA_JCP_BP` = 1750, `vigenteDesde` 2026-01-01, fonte "Lei 9.249 art. 9º § 2º (red. LC 224/2025, art. 14 III)"
   [D02][D04]. `TRANSICAO_APROVACAO_ATE` (`valorTexto` date-only): uma linha `2025-12-31` (fonte: art. 6º-A § 3º II
   [D05]) **substituída** (`supersedesId`) por `2026-01-31` (fonte: liminar das ADIs 7.912/7.914, notícia STF
   [D19]; L4a). Se o plenário cassar a liminar, o admin publica a linha nova e o job de recálculo já existente avisa
   os eventos afetados. Tabela nova `TJLP` (F-IRD-13, F-IRD-18): chave = trimestre (`YYYY-T0n`), `valorInt` = **taxa
   mensal** publicada pela RFB em décimos de milésimo de ponto percentual (0,7742% = 7742), fonte obrigatória.
   **Carga inicial de 2026 no mesmo PR** (L17: 7658 · 7608 · 7617 · 7742, fonte = página da TJLP da RFB [D12] + sha).
   Todas entram em `LEGAL_PARAMETER_TABELAS` e no formato de linha. Teste: sem linha vigente na data → erro
   explícito, nunca zero.
6. **Plano-semente (F-IRD-15).** Folhas novas: `2.1.3` Obrigações com sócios → `2.1.3.01` Dividendos a pagar,
   `2.1.3.02` JCP a pagar; `2.1.4` Tributos retidos → `2.1.4.01` IRRF a recolher; `2.3.2` Capital social → `2.3.2.01`
   Capital social integralizado; `2.3.3` Reservas de lucros → `2.3.3.01` Reserva legal; `4.3.4` Juros sobre o capital
   próprio. Códigos finais a conferir pelo executor contra o fixture e o mapeamento referencial (ECD), sem renumerar
   nada existente. Teste: o seed cria as folhas, e o mapeamento referencial das novas não fica órfão.
7. **Contas configuradas no perfil fiscal da unidade (molde F-TA-7).** `FiscalProfile` ganha
   `dividendosPagarAccountId`, `jcpPagarAccountId`, `irrfRecolherAccountId` (Liability) e `jcpDespesaAccountId` (Expense),
   com FK `Restrict` e checagem de natureza. Conta não configurada → 400 com o rótulo (`contaDaProvisao`).
8. **Mapa das contas do PL (F-IRD-15).** `CompanyFiscalProfile` (PJ, por ano) ganha `jcpBaseContas`: JSON
   `{ CAPITAL_INTEGRALIZADO, RESERVAS_CAPITAL, RESERVAS_LUCROS, ACOES_TESOURARIA, LUCROS_ACUMULADOS: accountId[] }`, todas
   Equity e do escopo. Conta de PL com saldo e fora do mapa aparece como aviso na prévia do JCP. Teste: conta de outra PJ
   → 404, conta não-Equity → 400.
9. **Fluxo de caixa.** O prefixo de `2.1.3` entra em `FINANCING_LIABILITY_CODE_PREFIXES`
   (`CashFlowReportService.ts:64-67`). Teste: liquidar dividendos a pagar cai em Financiamento, não em Operacional.

### 3.2 PR-2: evento de distribuição de lucros com IRRF

10. **Model `ProfitDistributionEvent`.** `userId` (PJ), `unitId` (unidade do lançamento e proveniência), `partnerId` FK,
    `evento` (`CREDITO`|`PAGAMENTO`|`EMPREGO`|`ENTREGA`, F-IRD-4), `dataEvento` (date-only), `competencia` (`YYYY-MM`,
    derivada), `debitoAccountId` (Equity: lucros acumulados ou reserva), `contraAccountId`, `brutoCents`, `irrfCents`,
    `liquidoCents` (BigInt), `origemLucro` (`CORRENTE`|`TRANSICAO`), `anoResultado`, `aprovadoEm`,
    `atoSourceDocumentId`, `memoria` (JSON), `parametrosIds`/`parametrosSha256`, `avisoSaldoLucro`, `status`
    (`PENDING_POST`|`POSTED`|`CANCELLED`), `entryId`, campos de cancelamento, timestamps. Cadeia de camadas completa.
11. **Contrapartida por evento (F-IRD-9).** `CREDITO` → `contraAccountId` = `dividendosPagarAccountId` do perfil (o
    líquido vai ao passivo do sócio). `PAGAMENTO`/`ENTREGA` → folha de Asset escolhida (banco, caixa ou o bem entregue).
    `EMPREGO` → folha de capital social (Equity). Natureza errada → 400. A baixa posterior de um `CREDITO` usa o lançamento
    ou a conciliação bancária de hoje. Não é evento novo e não retém de novo.
12. **Cálculo do mês (L1–L3, F-IRD-6).** Dentro da tx: soma do mês `S` = eventos `POSTED`/`PENDING_POST` do mesmo
    `taxId` em **todas as unidades da PJ** (`userId`), incluindo este e os de `TRANSICAO`. Se `S` ≤ limite, IRRF = 0. Se
    passar, `devidoMes` = 10% × (soma do mês **sem** os eventos `TRANSICAO`), e o IRRF deste evento = `devidoMes` − IRRF já
    retido no mês. A memória grava a lista de eventos, `S`, a base, `devidoMes`, o já retido e o deste evento. Teste
    (tabela): 49k + 2k; 30k + 30k; 60k num só evento; 30k de transição + 30k corrente (retém 3k); três unidades da mesma
    PJ.
13. **Pessoa jurídica beneficiária (L5).** Sócio `tipoPessoa = PJ` residente → IRRF 0, sem somar com ninguém. Teste.
14. **Lucro da transição (L4, L4a, F-IRD-6).** `origemLucro = TRANSICAO` exige `anoResultado` ≤ 2025, `aprovadoEm` ≤
    a linha vigente de `TRANSICAO_APROVACAO_ATE` (hoje 2026-01-31, item 5) e `atoSourceDocumentId` do escopo (o ato de
    aprovação anexado). Falta qualquer um → 400. A memória grava a linha usada. O valor sai da base e conta no limite
    (item 12). Teste: `aprovadoEm` 2026-01-20 aceito; 2026-02-02 → 400; com a linha 2025-12-31 republicada, 2026-01-20
    → 400.
15. **Teto sem retenção (F-IRD-5R).** `POST /accounting/profit-distributions/preview` devolve, sem gravar,
    `tetoSemRetencaoCents` = limite − `S` atual do mês do sócio (mínimo 0), o IRRF que o evento geraria e a sugestão de
    mover o excedente para o mês seguinte quando o evento cruza o limite. Teste: 40k já no mês → teto 10k.
16. **Pagamento que não cobre a retenção (F-IRD-5R).** Se o IRRF deste evento for maior que o bruto do evento, recusa 422
    `RETENCAO_EXCEDE_PAGAMENTO` com `brutoMinimoCents`: o menor bruto que cobre o IRRF do mês, calculado pela regra do item
    12. A PJ nunca assume o imposto. Teste: 49k + 2k → 422 com o mínimo.
17. **Lançamento (L8, F-IRD-9).** Commit 1 grava o evento (`PENDING_POST`). Commit 2 chama `postEntry`
    (`sourceType = 'profit.distribution'`, `sourceId = id`): D `debitoAccountId` bruto / C `contraAccountId` líquido / C
    `irrfRecolherAccountId` IRRF (a perna de IRRF só existe se > 0). Depois, CAS do `entryId`. Crash entre os dois → o
    reconcile reaproveita o lançamento (molde `taxAssessmentProvision.integration.test.ts`, item 15). Período fechado →
    409 de hoje. Teste com o lançamento real (memória "sintético ≠ formato real").
18. **Saldo de lucro (F-IRD-10).** Antes de gravar: se o bruto acumulado de distribuições do ano for maior que o saldo
    credor de lucros acumulados + reservas de lucros mais o resultado do ano até `dataEvento` (balancete), grava
    `avisoSaldoLucro` ("distribuição acima do lucro apurado: risco de devolução ou de tributação; IN 1.500 art. 8º § 1º")
    e **não** bloqueia. Teste: com e sem aviso.
19. **Simples (L6, F-IRD-3).** Nenhum ramo por regime: o Simples retém igual. Teste com perfil `SIMPLES`.
20. **Cancelamento (F-IRD-8).** `POST /accounting/profit-distributions/:id/cancel` só aceita o **último** evento `POSTED`
    do `taxId` naquela `competencia` (por `dataEvento`, depois `createdAt`). Estorna (`reverseEntry`) e marca `CANCELLED`.
    Outro evento → 409 com o id que tem de ser cancelado antes. Gate do "último" dentro da tx. O estorno vem depois do
    gate, e não antes (memória "efeito irreversível antes do gate"). Teste: cancelar o do meio → 409; o último → estorno.
21. **Resumo mensal do DARF (L8).** `GET /accounting/profit-distributions/irrf?competencia=YYYY-MM` devolve, por PJ:
    `codigoReceita: '1841'`, total retido, eventos e `vencimento` = último dia útil do 2º decêndio do mês seguinte, com a
    tabela `FERIADO_NACIONAL`. Teste: competência 2026-03 → vencimento 2026-04-20 (seg); um caso em que o dia 20 cai em
    fim de semana ou feriado recua para o dia útil anterior.

### 3.3 PR-3: JCP, cálculo e prévia

22. **Pré-condições (F-IRD-12, F-IRD-14).** O JCP só existe com perfil `REAL` no ano. Fora dele → 400
    `JCP_SO_NO_LUCRO_REAL` ("sem dedução; 17,5% definitivo ao sócio PF"). Também exige soma das participações vigentes =
    10000 na data do crédito, nenhum sócio não residente (item 4) e TJLP vigente em todos os dias do período (item 5).
23. **Período (F-IRD-17).** Real trimestral: um cálculo por `T01..T04`. Real anual: um por ano (`A00`). A forma vem do
    perfil, como no X7. Um cálculo vivo por (PJ, ano, período). Teste: trimestral pedindo `A00` → 400.
24. **Base pro rata die (L10, L12, L14, L15, F-IRD-15, F-IRD-16, F-IRD-18).** Para cada dia **do início do período de
    apuração até a `dataCredito`** (L14; não até o fim do período): saldo das contas do mapa (item 8) no fim do dia
    anterior, com `ACOES_TESOURARIA` subtraindo e `LUCROS_ACUMULADOS` limitado ao saldo do exercício anterior (§ 1º VI),
    × taxa do dia = taxa mensal da TJLP (item 5) ÷ dias corridos daquele mês, por juros simples (L15, F-IRD-18).
    `jurosMaxTjlpCents` = Σ diária. Teste: mês cheio com saldo constante = saldo × taxa mensal; crédito no dia 15 conta
    só os dias até 15. A memória guarda faixas de dias com o mesmo saldo e a mesma taxa. Teste:
    aumento de capital no dia 45 do trimestre muda a base a partir do dia 46.
25. **Limite dedutível (L10).** `limite50LucroCents` = 50% do lucro do período antes do JCP, após a CSLL e antes do IRPJ
    (§§ 2º I e 3º), lido do razão do período. `limite50ReservasCents` = 50% de (lucros acumulados + reservas de lucros).
    `limiteDedutivelCents` = min(`jurosMaxTjlpCents`, max(as duas metades)). Teste: cada ramo do max.
26. **Prévia.** `POST /accounting/jcp/preview` devolve a base por faixa, os limites, o rateio por sócio pela participação
    (editável por sócio no corpo, desde que a soma bata com o total) e, por sócio, bruto, IRRF de 17,5% (PF e PJ: L9) e
    líquido. Total acima do `limiteDedutivelCents` é aceito e mostra `excessoIndedutivelCents` (F-IRD-11). Nada grava.

### 3.4 PR-4: JCP, confirmação, lançamento e e-Lalur

27. **Models `InterestOnEquityCalculation` e `InterestOnEquityAllocation`.** O cálculo guarda PJ, unidade, ano, período,
    `dataCredito`, `forma` (`DESPESA`|`PL`), memória, limites, total, excesso, parâmetros + sha, status, `entryId`,
    `lalurEntryIds`. A alocação guarda `partnerId`, `participacaoBp`, bruto, IRRF e líquido. A confirmação regrava a
    prévia dentro da tx e recusa com 409 se o resultado mudou (gate autoritativo).
28. **Lançamento (L9, L11, F-IRD-11).** `DESPESA`: D `jcpDespesaAccountId` total / C `jcpPagarAccountId` líquido total /
    C `irrfRecolherAccountId` IRRF total. `PL`: D lucros acumulados ou reserva (conta escolhida, Equity) no lugar da
    despesa. `postEntry` com `sourceType = 'jcp.credit'`, em 2 commits + CAS + reconcile (molde do item 17). O lançamento
    em passivo exigível do sócio é o "crédito individualizado" do § 10.
29. **e-Lalur/e-Lacs (F-IRD-11).** Na mesma confirmação, depois do commit do lançamento, grava as linhas da Parte A
    (`origem: 'system'`) do período, em `lalur` **e** `lacs`. `PL`: exclusão "166.03 (-) Juros sobre o capital próprio"
    pelo menor entre total e limite. Se o total passar do limite: em `DESPESA`, adição "20 Excesso de juros sobre o
    capital próprio" pelo excesso; em `PL`, só o limite é excluído e não há adição. Os códigos vêm do catálogo L12
    vigente no ano (`ecf-l12-linhas.json`), nunca literais no serviço. O vínculo `LalurEntryJournalEntry` aponta o
    lançamento do JCP. Teste: as quatro combinações (forma × com/sem excesso). A soma de despesa líquida de ajustes no
    LALUR = o limite.
30. **Cancelamento do JCP.** Cancela o cálculo do período: estorna o lançamento e arquiva as linhas `system` da Parte A
    na mesma operação de serviço. Período fechado → 409. Um JCP pago (passivo já baixado) → 409.
31. **Resumo do DARF do JCP (L13).** `GET /accounting/jcp/irrf?competencia=YYYY-MM`: total retido e `codigoReceita: '5706'`
    (L16) e `vencimento` = 3º dia útil depois do decêndio da `dataCredito`. Teste do vencimento nos três decêndios.

### 3.5 Gates que o diff aciona (em todo PR que tocar)

32. Snapshot de shape dos DTOs Zod (`dtoShapeSnapshot.test.ts`): só **inserir** as entradas novas, sem reordenar
    (memória "UPDATE do snapshot reordena no Windows").
33. `auditCanonical.ts`: todo `eventType` novo entra na allowlist **na mesma mudança**. O CPF/CNPJ do sócio e o nome
    **não** vão ao payload de auditoria (memória "Allowlist de auditoria (PII)"); vão só o `partnerId` e os valores.
34. Rotas: 2 toques (route + docs `routes/docs/<feature>.paths.ts`, um arquivo por feature desde o #748), mais a guarda
    de path-count do OpenAPI e a regeneração do `public/openapi.json` commitado.
35. `npm run check:arch` sem violação nova; `npx tsc --noEmit` e `tsconfig.test.json` limpos.
36. `resetDb` limpa as tabelas novas (memória "resetDb × contabilidade").

**Fatiamento sugerido:** PR-1 (itens 1–9) → PR-2 (10–21) → PR-3 (22–26) → PR-4 (27–31), empilhados. Os gates 32–36
valem em todos. O FE é nó vizinho (`FE-INCR-IRRF-DISTRIBUICAO`), fora deste BRIEF.

## 4. Contratos (esboço Zod)

```ts
// dtos/PartnerDto.ts
export const CreatePartnerSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  taxId: z.string().regex(/^(\d{11}|\d{14})$/),          // DV validado no refine (CPF/CNPJ)
  residenteBrasil: z.boolean(),
  participacaoBp: z.number().int().min(0).max(10000),
  entradaEm: dateOnly,                                    // isValidDateOnly (calendário real)
  saidaEm: dateOnly.nullable().optional(),
}).strict().superRefine(refineTaxIdDv).superRefine(refineSaidaDepoisDaEntrada);

// dtos/ProfitDistributionDto.ts
export const PROFIT_DISTRIBUTION_EVENTOS = ['CREDITO', 'PAGAMENTO', 'EMPREGO', 'ENTREGA'] as const;
export const ProfitDistributionInputSchema = z.object({
  partnerId: z.string().cuid(),
  evento: z.enum(PROFIT_DISTRIBUTION_EVENTOS),
  dataEvento: dateOnly,
  brutoCents: centsPositive,                              // MAX_CENTS é política do 400
  debitoAccountId: z.string().cuid(),
  contraAccountId: z.string().cuid().optional(),          // obrigatório fora de CREDITO (refine)
  origemLucro: z.enum(['CORRENTE', 'TRANSICAO']),
  anoResultado: z.number().int().optional(),             // obrigatório e ≤ 2025 em TRANSICAO
  aprovadoEm: dateOnly.optional(),                        // obrigatório e ≤ 2025-12-31 em TRANSICAO
  atoSourceDocumentId: z.string().cuid().optional(),      // obrigatório em TRANSICAO
}).strict().superRefine(refineEventoContra).superRefine(refineTransicao);

export const ProfitDistributionPreviewView = z.object({
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  somaMesCents: cents, baseMesCents: cents, devidoMesCents: cents, jaRetidoCents: cents,
  irrfEventoCents: cents, liquidoCents: cents, tetoSemRetencaoCents: cents,
  brutoMinimoCents: cents.nullable(),                     // só quando o evento não cobre o IRRF
  sugestao: z.enum(['NENHUMA', 'MOVER_EXCEDENTE_MES_SEGUINTE', 'AUMENTAR_BRUTO']),
  avisoSaldoLucro: z.string().nullable(),
});

export const IrrfMensalView = z.object({
  competencia: z.string(), codigoReceita: z.literal('1841'),
  totalCents: cents, vencimento: dateOnly, eventos: z.array(z.string().cuid()),
});

// dtos/InterestOnEquityDto.ts
export const JcpPreviewInputSchema = z.object({
  anoCalendario: z.number().int().min(2026),
  periodo: z.enum(['T01', 'T02', 'T03', 'T04', 'A00']),
  dataCredito: dateOnly,
  forma: z.enum(['DESPESA', 'PL']),
  totalCents: centsPositive,
  debitoPlAccountId: z.string().cuid().optional(),       // obrigatório em PL
  rateio: z.array(z.object({ partnerId: z.string().cuid(), brutoCents: cents })).optional(), // default: pela participação
}).strict();

export const JcpPreviewView = z.object({
  faixas: z.array(z.object({ de: dateOnly, ate: dateOnly, baseCents: cents, taxaDiaria: z.string(), jurosCents: cents })),
  jurosMaxTjlpCents: cents, limite50LucroCents: cents, limite50ReservasCents: cents,
  limiteDedutivelCents: cents, excessoIndedutivelCents: cents,
  alocacoes: z.array(z.object({ partnerId: z.string(), participacaoBp: z.number().int(),
    brutoCents: cents, irrfCents: cents, liquidoCents: cents })),
  lalurPrevisto: z.array(z.object({ livro: z.enum(['lalur', 'lacs']), codigo: z.string(), valorCents: cents })),
  avisos: z.array(z.string()),
});
```

Prisma (esboço; nomes finais pelo `GENERATION_CONTRACTS.md`): `Partner` (`@@index([userId, taxId])`),
`ProfitDistributionEvent` (`@@index([userId, competencia])`, `@@index([userId, partnerId, competencia])`),
`InterestOnEquityCalculation` (único vivo por `userId, anoCalendario, periodo` com rename-on-cancel, ver memória
"@@unique de idempotência × soft-delete"), `InterestOnEquityAllocation`. Campos novos em `FiscalProfile` (item 7) e em
`CompanyFiscalProfile` (item 8). Colunas `*Cents` em `BigInt`.

## 5. Forks

Todos **RATIFICADOS** pelo dono em 17/10 (o detalhe e o texto literal estão em [[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]]):
F-IRD-1 JCP completo · F-IRD-2 model próprio de sócios · F-IRD-3 reter sempre no Simples · F-IRD-4 primeiro evento ·
F-IRD-5/5R teto + recusa · F-IRD-6 sai da base, conta no limite · F-IRD-7 recusa o exterior · F-IRD-8 só o último do
mês · F-IRD-9 lançamento próprio · F-IRD-10 aviso · F-IRD-11 despesa ou PL, com e-Lalur · F-IRD-12 JCP só no Real ·
F-IRD-13 TJLP em tabela de plataforma · F-IRD-14 mínimo com % · F-IRD-15 mapa no perfil · F-IRD-16 saldo diário ·
F-IRD-17 por período de apuração · F-IRD-18 (17/10, 2ª rodada) TJLP diária = mensal publicada ÷ dias do mês.

**Pendentes:** nenhum fork do BRIEF. As pendências externas estão no §6.

## 6. Pendente de validação externa

Pesquisa de 17/10, 2ª rodada (dossiê §6): antes de pesquisar, conferi as outras sessões e branches; nenhuma tratava
destes pontos. Sobram P1 e P2 para o contador, e P3 fica como confirmação.

| # | Ponto | Situação | Pergunta exata (contador) | Item afetado |
|---|---|---|---|---|
| P1 | Deliberação lançada em "dividendos a pagar" = creditamento? (F-IRD-4) | **aberto**: nenhum P&R nem Solução de Consulta de 2026 trata disso | "Pela Lei 9.250 art. 6º-A, a deliberação de distribuição lançada em 'dividendos a pagar' individualizado ao sócio (por analogia à IN 1.700 art. 75 § 10) já é o creditamento que dispara a retenção no mês da deliberação, mesmo com pagamento posterior?" | 11, 12 |
| P2 | Lucro da transição conta no limite? (F-IRD-6) | **aberto**: P&R item 7 fala da isenção, não da soma | "Um sócio recebe no mesmo mês R$ 30 mil de lucro de 2025 aprovado até 31/01/2026 (§ 3º + liminar das ADIs 7.912/7.914) e R$ 30 mil de lucro de 2026. Há retenção de 10% sobre os R$ 30 mil de 2026?" | 12, 14 |
| P3 | Período do JCP no Real trimestral (F-IRD-17) | **resolvido** pela SC Cosit 45/2018 (L14): TJLP do início do período de apuração até o crédito; F-IRD-17 confirmado. Fica só a confirmação do limite de 50% por trimestre | "No Real trimestral, o limite de 50% do lucro (IN 1.700 art. 75 § 2º I) usa o lucro do trimestre do crédito?" | 23, 25 |
| P4 | Código DARF do IRRF sobre JCP | **resolvido**: 5706 (L16) | — | 31 |
| P5 | Série da TJLP 2026 | **resolvido**: L17, carga no PR-1 (item 5). 2027 em diante: o admin carrega a cada trimestre | — | 5, 24 |
| P6 | Simples (F-IRD-3) | **reforçado**: STF negou a cautelar da OAB para excluir o Simples (ADI 7.917, 26/12/2025) [D19]. Sem mérito julgado | — | 19 |
| P6b | Prazo da transição | **novo, resolvido no BRIEF**: 31/01/2026 pela liminar das ADIs 7.912/7.914 (L4a, itens 5 e 14). Acompanhar o plenário: se cassar, troca a linha de parâmetro | — | 5, 14 |
| P7 | Divisor da TJLP diária (F-IRD-18) | decidido pelo dono; vale confirmar | "Para o JCP por juros simples (SC Cosit 70/2025), a taxa diária = TJLP mensal publicada pela RFB ÷ dias do mês está correta?" | 24 |

## 7. Insumos ausentes

- ~~Série histórica da TJLP (P5)~~: resolvida em 17/10 (L17). Os trimestres seguintes dependem de carga trimestral pelo admin.
- Declaração da retenção: o IRRF de lucros vai à EFD-Reinf (série R-4000) e daí à DCTFWeb
  (`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md:34, 191-195, 312-320`). Não há Reinf no código. Este BRIEF entrega o DARF
  (valor, código e vencimento), não a declaração.

## 8. Achados fora de escopo (registrados, não planejados)

1. **EFD-Reinf R-4010** para lucros/dividendos e JCP: nó da Reinf (PRE-ADR-PESSOAL), não deste. A SC Cosit
   10.001/2026 confirma que a declaração é obrigatória mesmo sem retenção. Isso pesa na prioridade do nó da Reinf.
9. **Lucro da exploração** (incentivos regionais): o JCP excluído na Parte A conta nele (SC Cosit 138/2024). Não há
   lucro da exploração no código.
2. **Sócio no exterior** (Lei 9.249 art. 10 §§ 4º–5º e art. 10-A): recusa explícita por F-IRD-7. Nó futuro se houver cliente.
3. **PJ imune** como beneficiária de JCP (IN 1.700 art. 75 § 8º-A): sem campo. O JCP retém de toda PJ.
4. **Limite isento do Simples sem escrituração** (LC 123 art. 14 § 1º; PRE-ADR-SIMPLES-NACIONAL-CALCULO §10 item 5): é
   tema da declaração da PF. O art. 6º-A retém igual.
5. **Tributação mínima da PF (art. 16-A/16-B, IRPFM)** e o informe de rendimentos ao sócio: fora (lado da PF).
6. **Quadro societário completo** (capital por sócio, quotas, alterações contratuais): fora por F-IRD-14.
7. **Contradição da RFB**: IN 1.500 art. 8º II × P&R item 10 (dossiê §4.1). Vale registrar ao contador junto com a P6.
8. **FE**: telas de sócios, distribuição, resumo do DARF e JCP → `FE-INCR-IRRF-DISTRIBUICAO`, nó vizinho.
