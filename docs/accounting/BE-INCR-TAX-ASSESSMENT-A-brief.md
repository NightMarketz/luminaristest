# BRIEF — BE-INCR-TAX-ASSESSMENT Fase A (apuração trimestral de IRPJ/CSLL: Presumido e Real) — nó X7

> Produzido em `sessao-planejamento` em 02/10/2026, sobre `origin/main` `4dd8fcb4`. Herda o esqueleto da §5 (Fase A,
> itens A1–A10) do [`ADR-INCR-TAX-ASSESSMENT`](../adr/ADR-INCR-TAX-ASSESSMENT.md), que está **Accepted** desde 02/10
> (14/14 forks ratificados: [`D-2026-10-02-X7-TAX-ASSESSMENT-FORKS`](../plano/decisoes/D-2026-10-02-X7-TAX-ASSESSMENT-FORKS.md)).
> **Este documento NÃO escreve código.** Ele traz checklist, contratos esboçados e forks **F-TA-1..10, todos com
> RATIFICAÇÃO PENDENTE**. Nenhum item vira código sem "executa" do dono (ORCH-006).
>
> **Alcance, dito antes de tudo:** o 1º cliente é **Simples**, e para ele esta fase vale **zero** (D12: o X7 responde
> 400). O X7 é régua (Presumido/Real). O número que ele produz **só tem oráculo** quando o H1 (Presumido) ou o X5
> (Real) conciliam X7 × PVA (F-X7-2 → a). Até lá, um teste verde prova a aritmética contra a tabela, não contra a lei.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó [`X7`](../plano/nos/X7.md), ADR §5 "Fase A — apuração trimestral (Presumido e Real): vem
  primeiro", itens A1–A10.
- **Autorização:** dono, chat, 02/10/2026: *"Autorizo: … (2) depois, planejar o BRIEF da Fase A do X7 e decidir se
  X8/X9 fundem nele (dono, 02/10) — sem 'executa'"*. Instrução do mesmo pedido: *"X9 já está reduzido a DCTFWeb + MIT
  (F-X7-9 → b); proponha fusão ou BRIEF separado como fork, com recomendação."*
  - **Cobre exatamente:** este BRIEF (Fase A) mais o fork da fusão X8/X9 (**F-TA-1**).
  - **Não cobre:** código; as Fases B e C; o ADR do X9 ou do X8; ratificar os forks deste BRIEF.
  - **Divergência do passo 1:** nenhuma. O "decidir se X8/X9 fundem" é atendido como fork com recomendação, como a
    própria instrução pede. A decisão continua com o dono.
- **Fatos consumados que o BRIEF respeita** (lidos em `4dd8fcb4`, grau V):
  - `CompanyFiscalProfile` (`server/prisma/schema.prisma:1373-1407`): chave `@@unique([userId, anoCalendario])`;
    `regime`, `ecfIndAliqCsll` (`'1'` 9% / `'4'` 15%), `ecfIndRecReceita` (`'1'` caixa / `'2'` competência) e
    `regimeTravadoEm`. O service já recusa trocar o `regime` depois da trava (`CompanyFiscalProfileService.ts:117`).
  - `FiscalProfile` (`schema.prisma:1320`) é **por unidade** e guarda FKs de conta com checagem de natureza
    (`icmsRecuperavelAccountId` + `assertAssetAccount`, `FiscalProfileService.ts:147`). É o molde da conta configurada.
  - Segregação da receita do Presumido: hoje fica **inline** em `SpedEcfGenerationService.generate`
    (`SpedEcfGenerationService.ts:24-26,83-128`), com o mapa 3.1 serviço / 3.3 revenda e o gate de exaustividade da
    receita.
  - e-Lalur: `LalurEntry` tem `quarter String` e `@@unique([userId, unitId, year, quarter, livro, codigo])`
    (`schema.prisma:1947-1974`); o fechamento da Parte B é `LalurParteBClosing`, um por (unidade, ano, trimestre)
    (`schema.prisma:2056-2071`). O tipo de cada linha vem do fixture `ecf-l12-linhas.json` (`findLinha`). Nas abas
    M300A e M350A as linhas de entrada são `E/A` (adição), `E/E` (exclusão) e `E/P` (compensação, **só** as linhas
    173 e 174 em cada aba). As linhas 2/169/171/175 (`CNA/L`) e a linha 9 da M300A (`CA/A`, "CSLL") são **fórmula do
    PVA** (contagem lida no fixture em 02/10). Isso **resolve o insumo ausente §10.3 do ADR**: a compensação que o D6
    limita é exatamente a soma das linhas `P`.
  - `PostingService.postEntry` é **idempotente por `sourceId`** (`PostingService.ts:287,307-308,449-461`, sobre a
    `@@unique([userId, unitId, sourceType, sourceId])`) e abre a própria tx raiz. O molde dos 2 commits é
    `DepreciationService.ts:1-13` (cabeçalho `atomicUntil`).
  - DRE: `AccountingReportService.incomeStatement` exclui o lançamento de encerramento (`CLOSING_SOURCE_TYPE`,
    `models/closing.ts:9`) via `getAccountBalances(…, [CLOSING_SOURCE_TYPE])` + `computeDreNet`
    (`AccountingReportService.ts:734-770`). As duas são privadas.
  - Policy: `IAccountingPolicy` tem pares `canRead*/canManage*` por recurso (ex.: `canManageLalur`/`canReadLalur`,
    `:78-81`). **O GOV-CONTADOR não foi executado** (nota [GOV-CONTADOR](../plano/nos/GOV-CONTADOR.md): BRIEF de 29/09,
    sem "executa"). Vale a policy vigente de dado contábil (ADR §7).
- **Nós vizinhos:** consome [`X13`](../plano/nos/X13.md) (perfil da PJ por ano), o e-Lalur (FE-LALUR / ECF Fase 3) e
  o razão. É consumido por [`X9`](../plano/nos/X9.md) (contrato C1, Fase C, ADR próprio pelo F-X7-8 → a), pelo pacote
  do contador (C6b item 3.4, Fase C) e pelos runbooks H1/X5 (conciliação, F-X7-2 → a).

## Fontes legais desta fase (só primária; seção citada)

| Regra | Fonte | Grau |
|---|---|---|
| LC 224: acréscimo de 10% nos percentuais de presunção do Presumido (art. 14); só sobre a receita que exceder R$ 5 mi no ano (art. 15 caput); limite distribuído por trimestre, com ajuste nos trimestres seguintes, e acréscimo proporcional por atividade (§ 1º I–II); **R$ 1.250.000,00 por trimestre**, verificado na receita do trimestre (§ 2º); acréscimo sobre a parcela que excede o limite do trimestre (§ 3º); sobra de trimestre abaixo do limite vai para os seguintes (§ 4º); acerto no último trimestre (§ 5º I–III); proporção por atividade (§ 6º); excedente restituível/compensável (§ 7º) com Selic (§ 8º); limite proporcional aos trimestres em atividade (§ 9º) | IN RFB 2.305/2025, art. 14 e art. 15 §§ 1º–9º, **texto vigente** (redação da IN 2.306/2026) | V-fonte, **relido em 02/10** na API do Sijut (ato 148694, segmentos não tachados) |
| Vigência: IRPJ desde **01/01/2026**; demais tributos (CSLL) desde **01/04/2026** | IN RFB 2.305/2025 art. 3º I–II | V-fonte, 02/10 |
| A LC 224 conta o Presumido como benefício (art. 4º § 2º II a) e fixa o acréscimo e o limite (art. 4º §§ 4º VII e 5º) | LC 224/2025 | V-fonte (29/09, ADR §15) |
| Percentuais-base: IRPJ 8% (revenda) e 32% (serviço em geral); CSLL 12% e 32% | Lei 9.249/95 arts. 15 § 1º III a e 20; IN 1.700 art. 33 / art. 215 (`IN-RFB-1700-2017.txt:3947`) | V-fonte (29/09) + V-corpus |
| Presumido: receita bruta do art. 26 por atividade, por trimestre, deduzida de devoluções, vendas canceladas e descontos incondicionais | IN 1.700 art. 215 caput (`:3947`) | V-corpus |
| Regime de caixa no Presumido exige livro Caixa com a nota de cada recebimento | IN 1.700 art. 223 (`:4141`) | V-corpus |
| IRPJ 15% + adicional de 10% sobre o que exceder R$ 20.000 × meses do período | IN 1.700 art. 29 caput e §§ 1º–2º (`:468-473`) | V-corpus |
| Compensação de prejuízo / base negativa ≤ 30% do lucro ajustado | IN 1.700 art. 64 (`:1245-1247`) | V-corpus |
| CSLL 9% (inciso III) / 15% (inciso I) | Lei 7.689/88 art. 3º | V-fonte (29/09) |
| Códigos de receita: IRPJ Presumido **2089/01**; Real trimestral **0220/01** (obrigada) ou **3373/01** (optante); CSLL Presumido **2372/01**; Real trimestral **6012/01** | Receita, "DCTF — Tabelas de códigos" IRPJ e CSLL (12/03/2024) | V-fonte (29/09, ADR §3). Que o MIT use a mesma tabela é **I** |
| DCTFWeb: prazo no último dia útil do mês seguinte (art. 6º); IRPJ, CSLL, PIS e Cofins entram pelo MIT (art. 8º I, V, VI, VII; art. 9º caput); os **retidos na fonte** vão para a EFD-Reinf (art. 9º § 1º I) | IN RFB 2.237/2024, texto vigente | V-fonte, **relido em 02/10** (ato 141910) — usado no F-TA-1 |
| MIT importa JSON no leiaute 1.0; a apuração cai "Em Edição" e o usuário encerra | Manual do MIT jan/2025 §§ 8.3 e 9, pp. 24–26; leiaute JSON 1.0 (20/02/2025) | V-fonte (29/09, ADR §15, sha `49da7ca21177` / `4e840b311cca`) — usado no F-TA-1 |

## Definição de pronto

Este documento contém: (1) checklist numerado e testável (§1); (2) contratos em forma materializável (§2); (3) forks
com caminhos, recomendação e **RATIFICAÇÃO PENDENTE** (§3); (4) pendências de validação externa (§4); (5) insumos
ausentes (§5); (6) achados fora de escopo (§6). O BRIEF fica pronto quando os forks estão **listados**, não quando
estão decididos.

---

## 1. Checklist de comportamentos

Notação: **[D]** = direto (ADR ou lei já decidem); **[F-TA-n]** = depende de fork pendente; **[P-n]** = depende de
pendência externa (§4), e a implementação usa o valor marcado como default, parametrizado.

### Perfil e parâmetros

1. **[D] Perfil: campos aditivos** (A1). Migração aditiva e nullable em `CompanyFiscalProfile`:
   `formaApuracaoIrpjCsll String?`, `formaApuracaoTravadaEm DateTime?` e `lucroRealObrigatorio Boolean?`.
   - Regras do D1 no DTO/service:
     - `PRESUMIDO` + `ANUAL` ⇒ 400;
     - `SIMPLES`/`MEI` com a forma preenchida ⇒ 400;
     - `REAL` com a forma nula ⇒ efetivo `TRIMESTRAL`.
   - **Nesta fase `ANUAL` ⇒ 400** (*"forma anual é da Fase B"*). O B1 libera.
   - **Trava (D2, F-X7-5 → a):** com `formaApuracaoTravadaEm` preenchido, `upsert` e `remove` recusam (400) trocar
     `formaApuracaoIrpjCsll`, `regime` ou `lucroRealObrigatorio`.
   - A trava do `regime` é **consistência interna**: as apurações confirmadas copiam o regime (item 12). A base legal
     da irretratabilidade do Presumido não foi relida nesta sessão (P-10).
   - Audit `company_fiscal_profile.updated`: os 3 campos entram na allowlist do `auditCanonical.ts:150`, na mesma
     mudança.
2. **[F-TA-4] Início e encerramento de atividade no ano** (IN 2.305 art. 15 § 9º), no perfil. Recomendação:
   `inicioAtividadeEm String?` e `encerramentoAtividadeEm String?`, ambos date-only com validação de calendário. O
   regex sozinho não basta (classe `date-only-regex-nao-valida-calendario`).
3. **[F-TA-6] Contas da provisão em `FiscalProfile` (unidade).** Recomendação: 4 FKs nullable
   (`irpjDespesaAccountId`, `csllDespesaAccountId`: natureza `Expense`; `irpjRecolherAccountId`,
   `csllRecolherAccountId`: natureza `Liability`), checadas como `assertAssetAccount`. O código das contas vem do
   contador (P-5). Allowlist de `fiscal_profile.updated` (`auditCanonical.ts:140`) na mesma mudança.
4. **[D] Tabela de parâmetros versionada** (A2, D3): arquivo novo `features/accounting/models/taxAssessmentParams.ts`,
   no molde `obrigacoesPorRegime.ts`. Cada linha tem `fonte` (obrigatória, não vazia) e `vigenteDesde`.
   - **Linhas:**
     - `IRPJ_ALIQ` 1500 bp e `IRPJ_ADIC_ALIQ` 1000 bp (art. 29);
     - `IRPJ_ADIC_LIMITE_MES_CENTS` 2.000.000 (art. 29 § 1º);
     - `PRESUNCAO_IRPJ` SERVICO 3200 / REVENDA 800 e `PRESUNCAO_CSLL` SERVICO 3200 / REVENDA 1200 (Lei 9.249 arts. 15
       e 20);
     - `COMPENSACAO_TETO` 3000 bp (art. 64);
     - `LC224_ACRESCIMO_IRPJ` 1000 bp `vigenteDesde 2026-01-01` e `LC224_ACRESCIMO_CSLL` 1000 bp
       `vigenteDesde 2026-04-01` (IN 2.305 art. 3º e art. 14);
     - `LC224_LIMITE_TRIMESTRE_CENTS` 125.000.000 (art. 15 § 2º).
   - **Lookup puro:** `parametroVigente(chave, dataFimDoPeriodo, atividade?)`. Sem linha vigente ⇒ o acréscimo vale 0.
   - **Tabela de códigos de receita**, constante com fonte: `IRPJ/PRESUMIDO 208901`,
     `IRPJ/REAL_TRIMESTRAL obrigada 022001 / optante 337301`, `CSLL/PRESUMIDO 237201`, `CSLL/REAL_TRIMESTRAL 601201`.
   - **Teste:** toda linha tem `fonte` ≠ `''`; o lookup em 2026-03-31 dá o acréscimo da CSLL = 0 e em 2026-06-30
     dá 1000.
5. **[D] Uma só função de arredondamento** [F-TA-2] para toda multiplicação por bp sobre centavos (`BigInt`). Cada linha da
   memória guarda o valor já arredondado. Nenhum outro arredondamento no fluxo.

### Leitura da base (reuso, sem segunda implementação)

6. **[D] Segregação da receita compartilhada** (D5). Extrair de `SpedEcfGenerationService.generate` (`:83-128`) uma
   função `receitaBrutaPorAtividade(scope, from, to)`, com o **mesmo** gate de exaustividade (400 com
   `unmappedRevenueAccounts`). Ela devolve `{ servicoCents, revendaCents }`.
   - O gerador da ECF passa a chamá-la. **Mudança sem efeito de comportamento:** os testes da ECF Presumido passam sem
     edição; se algum precisar mudar, o executor para e reporta.
7. **[D] Resultado antes de IRPJ/CSLL na janela** (D4). Método público novo em `AccountingReportService`:
   `resultadoAntesIrpjCsll(scope, from, to, excluirAccountIds)`, montado sobre `getAccountBalances(…, [CLOSING_SOURCE_TYPE])`
   + `computeDreNet`.
   - Ele exclui o lançamento de encerramento. Sem isso, o T04 de um exercício encerrado em 31/12 dá zero, a mesma
     armadilha que a DRE já trata.
   - Ele exclui também as contas de despesa da provisão do item 3. Essa é a **guarda de circularidade**.
   - Se as contas não estiverem configuradas, a memória registra *"guarda de circularidade sem contas configuradas"*,
     e a confirmação segue a regra do F-TA-7.

### Cálculo (funções puras: `(entrada, tabela vigente) → memória`)

8. **[D] Presumido trimestral** (A4).
   - Base por atividade = receita × percentual + parcela do acréscimo da LC 224 (item 9).
   - IRPJ = 15% × base + 10% × max(0, base − 20.000,00 × 3).
   - CSLL = alíquota do perfil (D8) × base da CSLL.
   - Recusas (400):
     - `ecfIndAliqCsll` nulo (D8);
     - `ecfIndRecReceita = '1'` (caixa): a segregação lê o razão por competência, e o regime de caixa
       (IN 1.700 art. 223) fica fora da Fase A (§6 item 2);
     - receita fora de 3.1/3.3, pelo gate do item 6 (P-6, P-7).
9. **[D, F-X7-10 → b] Acréscimo da LC 224 no Presumido.** Função pura `parcelaExcedenteLc224(trimestre, receitas do
   ano até o trimestre, memórias confirmadas anteriores)`, linha a linha da IN 2.305 art. 15:
   - limite do trimestre = R$ 1.250.000,00 (§ 2º) + a sobra não usada dos trimestres anteriores (§ 4º);
   - parcela excedente = max(0, receita do trimestre − limite do trimestre) (§ 3º);
   - repartição por atividade na proporção da receita de cada uma no trimestre (§§ 1º II e 6º);
   - percentual acrescido = percentual × (1 + acréscimo), sobre a parcela excedente só (§ 3º). A leitura
     multiplicativa é **I** (P-1);
   - **T04 (§ 5º):** limite anual = 4 × 1.250.000 ou o proporcional do § 9º (F-TA-4). Três ramos:
     - **I:** receita acumulada abaixo do limite anual ⇒ sem acréscimo no T04, e a diferença dos trimestres
       anteriores (recálculo sem o acréscimo × valor confirmado) é deduzida do devido no T04;
     - **II:** acumulada acima, com a parcela excedente anual menor que a soma das excedentes anteriores ⇒ sem
       acréscimo no T04, com rateio da excedente anual pela razão do item 1 e recálculo/dedução pelo item 3;
     - **III:** excedente anual maior ⇒ a excedente do T04 fica limitada à diferença;
   - o "poderá" dos ramos I-b e II-b vira **sempre aplicar a dedução** (P-3);
   - dedução maior que o devido do T04 ⇒ excedente para restituição/compensação (§ 7º), registrado como
     `saldoNegativoCents` com a linha da memória *"§ 7º — pedido fora do sistema"*;
   - CSLL com `vigenteDesde 2026-04-01`: o acréscimo da CSLL é 0 nos trimestres anteriores a abril de 2026, e o
     limite é contado do mesmo jeito que no IRPJ (P-2);
   - **Teste-tabela:** um caso por parágrafo (§§ 3º, 4º, 5º I, 5º II, 5º III, 6º, 9º), com a conta feita à mão no
     comentário do teste e a citação do parágrafo.
10. **[D] Real trimestral** (A5).
    - **Pré-condição:** existe `LalurParteBClosing` da unidade × ano × trimestre, senão 400. É a mesma pré-condição da
      ECF (`SpedEcfRealGenerationService.ts:190-203`).
    - **IRPJ:** lucro ajustado L = resultado do item 7 + Σ linhas `A` − Σ linhas `E` do livro `lalur` no trimestre. O
      resultado já vem **antes da CSLL**, então a linha 9 da M300A (`CA`, CSLL adicionada) **não** se soma de novo.
      Compensação C = Σ linhas `P`.
    - **CSLL:** o mesmo cálculo com o livro `lacs`.
    - **D6:** se L > 0 e C > arred(30% × L), ou se L ≤ 0 e C > 0 ⇒ **400** por tributo, nomeando a linha `P` e o teto.
    - Lucro real = L − C. Se for ≤ 0, imposto 0 (o prejuízo é da Parte B). IRPJ = 15% + adicional (D7, 3 meses);
      CSLL = alíquota do perfil.
    - **Código de receita do IRPJ:** sai de `lucroRealObrigatorio`, que nulo dá 400 *"perfil incompleto"* (mesma
      regra do D8).
11. **[D, F-X7-11 → a] Deduções** (A6). Vêm do payload (`IRRF` → IRPJ; `CSLL_RETIDA` → CSLL; `OUTRA` exige
    `documento`); cada uma vira linha da memória. a pagar = max(0, devido − deduções − dedução do § 5º).
    O excedente segue o [F-TA-9]. Incentivos (PAT etc.) ficam fora, declarados.

### Persistência e fluxo

12. **[D, F-X7-3 → a] Model `TaxAssessment`** (A3): migração aditiva, repo, interface e factory, no contrato da §2.
    O `periodo` desta fase é só `T01..T04`. Tem `codigoReceita` (6 dígitos) e soft-delete pelo padrão da casa
    (`deletedAt`).
13. **[D] `POST /accounting/tax-assessments/preview`** calcula IRPJ e CSLL juntos (art. 31 § 7º) e não persiste.
    Recusas (400):
    - regime `SIMPLES`/`MEI` (D12, *"DAS é da onda 3"*);
    - forma `ANUAL` (Fase B);
    - perfil do ano ausente;
    - **outra unidade da PJ com movimento no período** (F-X7-7 → a), listando as unidades.

    A resposta traz `provisaoContasConfiguradas: boolean` e os avisos.
14. **[D] `POST /accounting/tax-assessments` (confirmação), commit 1.** Recalcula fora da tx e abre **uma**
    `runTransaction` com todos os gates autoritativos dentro dela:
    - CAS: `expectedAPagarCents` diferente do recalculado ⇒ 409;
    - um só `CONFIRMED` por (PJ, ano, tributo, período): se já existe e não veio `supersedesIds` que o nomeie ⇒ 409;
      `supersedesIds` nomeando um id que não é o `CONFIRMED` vivo do período ⇒ 409;
    - ordem dos trimestres [F-TA-3];
    - regime igual ao das confirmações anteriores do ano ⇒ senão 409;
    - **trava da forma** (F-X7-5 → a): grava `formaApuracaoTravadaEm` se estiver nulo, **na mesma tx** (gate
      autoritativo dentro da tx);
    - marca as substituídas como `SUPERSEDED`;
    - grava as 2 linhas (IRPJ, CSLL);
    - audita `tax.assessment.confirmed` e, se houver substituição, `tax.assessment.superseded`.
15. **[D, F-X7-4 → a] Provisão, commit 2** (A8): bridge explícita depois do commit 1.
    - Para cada linha `CONFIRMED`, `postEntry(sourceType='tax.assessment.provision', sourceId=<id da apuração>)` no
      último dia do trimestre: D despesa / C a recolher, valor = `devidoCents`.
    - **Commit 3:** grava `provisaoEntryId` com CAS (`where provisaoEntryId is null`).
    - Substituição: `reverseEntry` da provisão da substituída (se existir) + `postEntry` da nova.
    - Falha em qualquer passo (período fechado, conta não configurada [F-TA-7]) ⇒ a confirmação fica, com
      `provisaoPendente = true` e o motivo no log. **Não desfaz o commit 1.**
    - Cabeçalho `atomicUntil` no service (Contrato AC-2.3-2), no molde `DepreciationService.ts:1-13`, citando o
      teste de cada commit.
16. **[D] `POST /accounting/tax-assessments/:id/provisao` (reconcile)**: completa o que faltar dos commits 2 e 3 e é
    idempotente (o `postEntry` já é idempotente por `sourceId`). **O teste chama 2× e assere a segunda chamada**
    (sem lançamento novo, mesmo `provisaoEntryId`; ADR §13 item 11).
17. **[D] Leitura** (A9): `GET /accounting/tax-assessments?anoCalendario=&periodo=&status=` e `GET …/:id`, com memória
    e `provisaoPendente`.
18. **[F-TA-8] Encerramento × provisão pendente.** Recomendação: `ExerciseClosingService` recusa (400) encerrar o ano
    se houver apuração `CONFIRMED` do ano com provisão pendente, listando os ids.
19. **[D] Policy:** `canReadTaxAssessment`/`canManageTaxAssessment` em `IAccountingPolicy`, com o mesmo predicado de
    `canReadLalur`/`canManageLalur`. Confirmar, substituir e reconciliar pedem `manage`; preview e GET pedem `read`.
    Quando o GOV-CONTADOR for executado, ele troca o predicado.

### Gates que o diff aciona (A10)

20. **[D]** Rotas em 2 toques (`routes/accounting.ts` + `routes/docs.paths.ts`) e guard de path-count do openapi
    (+4 paths: preview, coleção, `:id`, `:id/provisao`).
21. **[D]** Snapshot de shape dos DTOs novos (`dtoShapeSnapshot`). Refine e transform não aparecem no snapshot; os
    testes do item 23 cobrem a lógica.
22. **[D]** Allowlist do `auditCanonical.ts`:
    - `tax.assessment.confirmed`: `['assessmentId', 'tributo', 'periodo', 'anoCalendario', 'aPagarCents', 'devidoCents', 'tabelaVersao']`;
    - `tax.assessment.superseded`: `['assessmentId', 'supersededById', 'tributo', 'periodo', 'anoCalendario']`;
    - só ids e centavos como string, sem PII.

    Mensagens de erro novas em pt/en com paridade i18n, se o módulo usar chave i18n; no padrão atual do accounting
    (texto pt no `ValidationError`), segue o padrão.
23. **[D] Testes de invariante** (ADR §13 itens 1–6, 10, 11, mais estes):
    - (a) a base do Real é a mesma antes e depois da provisão (calcula → confirma e provisiona → recalcula; guarda
      de circularidade);
    - (b) T04 de exercício já encerrado = mesmo resultado que antes do encerramento;
    - (c) adicional: base exatamente em 60.000,00 ⇒ 0; um centavo acima ⇒ adicional sobre um centavo,
      arredondado pelo F-TA-2;
    - (d) compensação de exatamente arred(30% × L) passa; um centavo acima ⇒ 400, por tributo;
    - (e) a trava nasce na tx: confirmação com falha forçada depois de gravar a trava ⇒ nem apuração nem trava;
    - (f) `SIMPLES` ⇒ 400 no preview e na confirmação;
    - (g) multiunidade com movimento ⇒ 400;
    - (h) a refatoração do item 6 deixa os testes da ECF Presumido verdes, sem edição.

## 2. Contratos esboçados

```prisma
// CompanyFiscalProfile — aditivo (itens 1–2)
formaApuracaoIrpjCsll   String?   // TRIMESTRAL | ANUAL — Fase A aceita só TRIMESTRAL (ANUAL ⇒ 400 "Fase B")
formaApuracaoTravadaEm  DateTime? // gravado na tx da 1ª confirmação do ano (F-X7-5 a)
lucroRealObrigatorio    Boolean?  // só REAL: 0220 (obrigada) × 3373 (optante)
inicioAtividadeEm       String?   // F-TA-4 (b) — YYYY-MM-DD, calendário validado
encerramentoAtividadeEm String?   // F-TA-4 (b)

// FiscalProfile (unidade) — aditivo (item 3, F-TA-6 a)
irpjDespesaAccountId  String?  // Expense
csllDespesaAccountId  String?  // Expense
irpjRecolherAccountId String?  // Liability
csllRecolherAccountId String?  // Liability
// + 4 relations Account onDelete: Restrict (molde icmsRecuperavelAccount)

model TaxAssessment {
  id                 String    @id @default(cuid())
  userId             String    // a PJ (R8)
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId             String    // unidade lida (proveniência, F-X7-7 a)
  anoCalendario      Int
  tributo            String    // IRPJ | CSLL
  regime             String    // PRESUMIDO | REAL — cópia do perfil
  forma              String    // TRIMESTRAL (Fase A)
  periodo            String    // T01..T04 (Fase A)
  modo               String    // PRESUMIDO | REAL_TRIMESTRAL (Fase A)
  codigoReceita      String    // 6 dígitos: 208901 | 022001 | 337301 | 237201 | 601201
  baseCents          BigInt
  devidoCents        BigInt
  deducoesCents      BigInt
  aPagarCents        BigInt
  saldoNegativoCents BigInt    @default(0) // F-TA-9 (a) e § 7º da IN 2.305
  memoria            Json      // MemoriaLinha[] — MemoriaCalculoSchema
  tabelaVersao       String
  status             String    // CONFIRMED | SUPERSEDED
  supersedesId       String?
  provisaoEntryId    String?
  confirmedById      String
  confirmedAt        DateTime
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?

  @@index([userId, anoCalendario, tributo, periodo])
  @@map("tax_assessments")
}
// "um só CONFIRMED por (PJ, ano, tributo, período)" = gate dentro da tx (item 14), NÃO @@unique
// (classe unique-de-idempotencia × soft-delete; a substituição precisa de 2 linhas no mesmo período).
```

```ts
// DTOs (Zod .strict(); centavos como string de dígitos)
const Cents = z.string().regex(/^\d+$/);
export const TaxAssessmentPreviewSchema = z.object({
  unitId: z.string().min(1),
  anoCalendario: z.number().int().min(2025),
  periodo: z.enum(['T01', 'T02', 'T03', 'T04']),
  deducoes: z.array(z.object({
    tributo: z.enum(['IRPJ', 'CSLL']),
    tipo: z.enum(['IRRF', 'CSLL_RETIDA', 'OUTRA']),
    valorCents: Cents,
    documento: z.string().max(120).optional(),
  }).strict().refine((d) => d.tipo !== 'OUTRA' || !!d.documento, { message: 'OUTRA exige documento' })
    .refine((d) => (d.tipo === 'IRRF') === (d.tributo === 'IRPJ') || d.tipo === 'OUTRA', { message: 'IRRF↔IRPJ, CSLL_RETIDA↔CSLL' }))
    .max(50).default([]),
}).strict();

export const TaxAssessmentConfirmSchema = TaxAssessmentPreviewSchema.extend({
  expectedAPagarCents: z.object({ IRPJ: Cents, CSLL: Cents }).strict(),
  supersedesIds: z.array(z.string().min(1)).max(2).optional(),
}).strict();

export const TaxAssessmentListQuerySchema = z.object({
  anoCalendario: z.coerce.number().int(),
  periodo: z.enum(['T01', 'T02', 'T03', 'T04']).optional(),
  status: z.enum(['CONFIRMED', 'SUPERSEDED']).optional(),
}).strict();   // sem boolean em query string (classe z.coerce.boolean)

// Saída
type MemoriaLinha = { codigo: string; descricao: string; valorCents: string; fonte: string };
// codigo estável p/ teste e p/ o pacote do contador: RECEITA_SERVICO, RECEITA_REVENDA, PRESUNCAO_SERVICO,
// LC224_LIMITE_TRIMESTRE, LC224_SOBRA_ANTERIOR, LC224_EXCEDENTE, LC224_ACERTO_T04, LAIR, ADICOES, EXCLUSOES,
// LUCRO_AJUSTADO, COMPENSACAO, COMPENSACAO_TETO, BASE, ALIQUOTA, ADICIONAL, DEVIDO, DEDUCAO_<i>, A_PAGAR, SALDO_NEGATIVO
type TaxAssessmentView = {
  id: string; tributo: 'IRPJ' | 'CSLL'; periodo: string; modo: string; codigoReceita: string;
  baseCents: string; devidoCents: string; deducoesCents: string; aPagarCents: string; saldoNegativoCents: string;
  status: 'CONFIRMED' | 'SUPERSEDED'; supersedesId: string | null; provisaoPendente: boolean;
  tabelaVersao: string; memoria: MemoriaLinha[]; confirmedAt: string;
};
type TaxAssessmentPreviewView = {
  irpj: Omit<TaxAssessmentView, 'id' | 'status' | 'supersedesId' | 'provisaoPendente' | 'confirmedAt'>;
  csll: Omit<TaxAssessmentView, 'id' | 'status' | 'supersedesId' | 'provisaoPendente' | 'confirmedAt'>;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
};
```

```ts
// Parâmetros (item 4)
type ParametroApuracao = {
  chave: 'IRPJ_ALIQ' | 'IRPJ_ADIC_ALIQ' | 'IRPJ_ADIC_LIMITE_MES_CENTS' | 'PRESUNCAO_IRPJ' | 'PRESUNCAO_CSLL'
       | 'COMPENSACAO_TETO' | 'LC224_ACRESCIMO_IRPJ' | 'LC224_ACRESCIMO_CSLL' | 'LC224_LIMITE_TRIMESTRE_CENTS';
  atividade?: 'SERVICO' | 'REVENDA';
  valor: number;          // bp, ou centavos nos *_CENTS
  fonte: string;          // ex.: "IN RFB 2.305/2025 art. 15 § 2º"
  vigenteDesde: string;   // YYYY-MM-DD
};
```

| Rota | Policy | Efeito |
|---|---|---|
| `POST /api/accounting/tax-assessments/preview` | read | calcula; não persiste |
| `POST /api/accounting/tax-assessments` | manage | commit 1 (+ 2/3 best-effort) |
| `POST /api/accounting/tax-assessments/:id/provisao` | manage | reconcile idempotente |
| `GET /api/accounting/tax-assessments` · `GET …/:id` | read | lista / detalhe com memória |

## 3. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-TA-1** X8/X9 fundem no BRIEF da Fase A? (pedido do dono) | **(a)** BRIEFs separados: a Fase A entrega apurações confirmadas com `codigoReceita` (o insumo que o C1 consome sem migrar). O X9 segue para o **ADR próprio** (F-X7-8 → a), que herda o F-X7-9 → b (arquivo JSON do MIT); o X8 segue para o ADR dele (F-X7-13 → a) · **(b)** fundir o X9 (contrato C1 + gerador do JSON do MIT) nesta fase · **(c)** fundir o X8 e o X9 | **(a).** (1) O dono ratificou hoje o F-X7-8 → (a) (ADR próprio do X9) e o F-X7-13 → (a) (PIS/COFINS no X8). Fundir no BRIEF reabre os dois sem ADR. (2) A autorização do X8 e do X9 é *"F-M2 — só ADR"* e nenhum dos dois tem ADR: um BRIEF fundido planejaria código sobre desenho não ratificado. (3) O MIT recebe também PIS, Cofins e IRRF (IN 2.237 art. 8º I, II, VI, VII e art. 9º caput), e o arquivo do X9 não fecha só com IRPJ/CSLL. (4) Os retidos vão para a EFD-Reinf, não para o MIT (art. 9º § 1º I), outra fronteira que o ADR do X9 precisa desenhar. (5) Para o 1º cliente (Simples) o MIT não recebe o que está no DAS (art. 8º § 4º, V-fonte 29/09), então fundir não antecipa valor ao cliente. **O que (a) já garante:** o `codigoReceita` gravado por linha deixa o X9 a uma leitura de distância. **Caso adversarial tentado:** *"o prazo da DCTFWeb (último dia útil do mês seguinte, art. 6º) torna o X9 urgente assim que o X7 confirmar"*. Não se sustenta para o público atual: não há tenant Presumido/Real em produção, e a ficha manual cobre o intervalo | baixo em (a); médio em (b)/(c) (planeja sobre ADR inexistente) |
| **F-TA-2** Arredondamento das frações de centavo | **(a)** meia unidade para cima (half-up) ao centavo em **cada** linha da memória, numa função única · (b) truncar (desprezar a fração) · (c) arredondar só o total | **(a).** Não achei regra primária de arredondamento para a base ou o imposto (nem na IN 1.700 do corpus nem nas fontes desta fase; P-4). O PVA usa `ARRED(…)` nas regras da Tabela Dinâmica (regra 360, citada no ADR D6). Linha a linha deixa a memória conferível contra as linhas do PVA. Oráculo: H1/X5 | baixo: diferença de centavos, que a conciliação acha |
| **F-TA-3** Ordem dos trimestres e fonte do "valor apurado anteriormente" | **(a)** confirmação sequencial (Tq exige T(q−1) `CONFIRMED` no mesmo ano, salvo q = T01 ou trimestre anterior ao início de atividade). A sobra do § 4º e o acerto do § 5º leem a **memória confirmada** dos trimestres anteriores, não o razão de novo · (b) qualquer ordem, relendo o razão | **(a).** O § 5º fala em diferença em relação aos *"valores apurados anteriormente"* / *"valores devidos efetivamente apurados"*; reler o razão depois de um lançamento retroativo mudaria o que foi confessado (mesma razão do F-X7-3). Corrigir trimestre anterior = substituição explícita, que força reconfirmar os seguintes (409 com a lista) | médio em (b): T04 com acerto errado |
| **F-TA-4** Início/encerramento de atividade no ano (IN 2.305 § 9º) | (a) `trimestresEmAtividade Int?` (1–4, nulo = 4) no perfil · **(b)** `inicioAtividadeEm` / `encerramentoAtividadeEm` date-only no perfil; os trimestres saem das datas · (c) não tratar: limite anual sempre 4 × 1,25 mi | **(b).** É o dado de verdade, serve também a Fase B (art. 54 § 2º: a opção no início de atividade) e a ordem do F-TA-3 (o 1º trimestre em atividade não exige anterior). (c) aplica o acréscimo a menos para quem começa no meio do ano | médio em (c): paga a menos |
| **F-TA-5** Chave por cliente para desligar o acréscimo (liminar; ADR §9 item 1) | (a) boolean `lc224AcrescimoSuspenso` no perfil, com documento · **(b)** não construir agora | **(b).** Sem a chave, o cliente com liminar paga **a mais** (recuperável). Nenhum cliente-alvo declarou liminar, e cautelar do STF (ADIs 7936/7944) desliga para todos pela tabela versionada (D3), sem código. Reabrir quando o contador responder P-11 | baixo |
| **F-TA-6** Onde moram as contas da provisão | **(a)** 4 FKs no `FiscalProfile` (unidade): despesa IRPJ, despesa CSLL, IRPJ a recolher, CSLL a recolher · (b) 2 FKs (uma despesa, um passivo) · (c) no `CompanyFiscalProfile` (PJ × ano) | **(a).** `Account` é por unidade e o lançamento cai no razão da unidade lida (F-X7-7 a), então a conta tem de ser da unidade, como as do ICMS/PIS a recuperar. Separar por tributo segue a separação usual do plano referencial (**I**, o código é do contador, P-5). (c) amarra FK de conta de unidade a uma linha por ano da PJ | baixo |
| **F-TA-7** Confirmar sem as contas da provisão configuradas | **(a)** confirma; a provisão fica pendente (`provisaoPendente`, motivo *"contas não configuradas"*) até configurar + reconcile (item 16) · (b) a confirmação recusa (400) | **(a).** O valor confirmado serve à guia e à DCTFWeb, que têm prazo; travar a confissão pela falta de uma conta contábil inverte a prioridade. O F-TA-8 (a) impede que a pendência passe do encerramento | médio em (a) sem o F-TA-8 |
| **F-TA-8** Encerramento do exercício × provisão pendente | **(a)** `ExerciseClosingService` recusa (400) encerrar o ano com apuração `CONFIRMED` sem provisão, listando os ids · (b) só aviso no GET | **(a).** O ADR §7 põe a provisão **antes** do encerramento, e sem isso a DRE e a ECD do ano saem sem IRPJ/CSLL (F-Z0). Toca o serviço de outro item (C11/encerramento), por isso é fork, não item direto | médio em (b): DRE sem imposto |
| **F-TA-9** Dedução maior que o devido (retenção > imposto) | **(a)** a pagar = 0; o excedente vai para `saldoNegativoCents`, com a linha da memória *"restituição/compensação fora do sistema"* · (b) 400 se dedução > devido | **(a).** Retenção acima do devido acontece de fato (tomador PJ grande, trimestre fraco). Recusar impediria apurar. O tratamento (PER/DCOMP) não é deste nó; a regra exata do saldo negativo trimestral não foi relida (P-12) | baixo |
| **F-TA-10** Fatiamento | **(a)** 3 PRs seriais: **PR-1** perfil + parâmetros + funções puras (itens 1–11), sem rota · **PR-2** model + preview/confirmação/leitura (12–14, 17, 19–22) · **PR-3** provisão + reconcile + encerramento (15, 16, 18) · (b) 1 PR | **(a).** O PR-1 é verificável só com teste de tabela (o maior risco é a aritmética da LC 224); o PR-3 concentra o padrão de 2 commits. É o molde ratificado no F-EM-13 (C8) | baixo |

## 4. Pendente de validação externa (não entra no checklist como decidido)

| # | O quê | Por que está aqui | Quem fecha |
|---|---|---|---|
| P-1 | "Percentual acrescido em 10%" = percentual × 1,10 (32% → 35,2%), não +10 p.p. | IN 2.305 arts. 13–15 dizem "acréscimo de 10% nos percentuais"; a leitura multiplicativa é **I** | contador |
| P-2 | CSLL em 2026: acréscimo 0 até 31/03 e limite contado no ano inteiro, como no IRPJ | art. 3º II dá a data, mas a IN não diz como o limite anual se conta para a CSLL no ano da transição (**I**) | contador |
| P-3 | Os ramos "poderá" do § 5º I-b e II-b aplicados sempre | é opção do contribuinte; aplicar sempre só reduz o devido (**I**) | contador |
| P-4 | Regra de arredondamento (F-TA-2) | sem fonte primária encontrada | PVA (H1/X5) + contador |
| P-5 | Contas de provisão, código referencial e o lançamento que baixa as retenções contra o "a recolher" | ADR §9 item 3; a provisão desta fase é pelo **devido** bruto | contador |
| P-6 | "Demais receitas" do Presumido (Lei 9.430 art. 25 II; IN 1.700 art. 216) | o mapa só cobre 3.1/3.3; o gate continua recusando (400) | contador |
| P-7 | Serviço com percentual diferente de 32% (hospitalar, transporte etc.) | a conta 3.1 assume "serviço em geral" (Lei 9.249 art. 15 § 1º III a) | contador, por cliente |
| P-8 | O MIT aceita a tabela de códigos da DCTF | ADR §9 item 2 (**I**) | 1ª importação no MIT (X9) |
| P-9 | Oráculo do número: 1ª apuração X7 × PVA × contador | gate humano (RUNBOOK-FORMAT). O agente prepara o passo em branco no runbook H1/X5; não preenche, não marca desfecho, não assina | dono |
| P-10 | Irretratabilidade do regime Presumido no ano | a trava do item 1 é consistência interna; a lei que a sustenta não foi relida nesta sessão | contador |
| P-11 | O cliente tem liminar contra a LC 224? | ADR §9 item 1; decide o F-TA-5 | contador / jurídico do cliente |
| P-12 | Regra do saldo negativo trimestral (retenção > devido) | o F-TA-9 registra o valor e não o trata | contador |

## 5. Insumos ausentes

1. ~~Compensação no e-Lalur em detalhe (ADR §10 item 3)~~ — **resolvido** acima: são só as linhas `E/P` 173/174 de
   M300A e M350A (fixture, 02/10).
2. **Comportamento do `reverseEntry` em período fechado** na substituição (item 15). Não li o corpo
   (`PostingService.ts:521`). Se o estorno cair no período da original e ele estiver fechado, a substituição fica com
   provisão pendente. O executor confirma lendo o código, e o teste do item 16 cobre o caminho.
3. **Comparação "outra unidade da PJ com movimento"** (item 13): o repositório que lista as unidades de um
   `ownerUserId` não foi localizado nesta sessão. O executor localiza pelo cbm e confirma lendo.

## 6. Achados fora de escopo (registrados, não planejados)

1. **IRPJ/CSLL trimestral em 3 quotas** com juros (regra conhecida da Lei 9.430 art. 5º; **não relida nesta
   sessão**, grau I). O devido não muda; muda a guia e a DCTFWeb. É do X9 / da guia.
2. **Presumido pelo regime de caixa** (IN 1.700 art. 223): exige a receita pelo recebimento. A Fase A recusa (item 8).
3. **Adicional da CSLL da Lei 15.079/2024** (IN 2.237 art. 8º V): é tributação mínima global de multinacionais, fora
   do público-alvo.
4. **ISS (F-X7-12 → a)** e memória no pacote do contador (C3) são da Fase C.

## 7. Gates de envio [OPS-001]

1. **Objetivo:** o dono quer a Fase A executável sem invenção, e a fusão X8/X9 decidida por ele. O checklist §1
   cobre A1–A10, e o F-TA-1 traz a fusão com recomendação.
2. **Grau:** cada fonte legal carrega V-fonte, V-corpus ou I (tabela de fontes e §4). Cada fato de código carrega
   `arquivo:linha` lido em `4dd8fcb4`.
3. **Caso adversarial:** contra o F-TA-1 (a), *"a urgência do prazo da DCTFWeb"*, descartado com o motivo dado no
   fork. Contra a reutilização da DRE, *"o encerramento zera o T04"*, que virou o item 7 e o teste 23(b).
4. **Checagem que teria falhado:** a contagem das linhas `P` no fixture (2 por aba). Se houvesse outra fonte de
   compensação, o D6 limitaria a coisa errada. A releitura da IN 2.305 no texto vigente pegou que a versão
   multivigente da API intercala parágrafos revogados (tachados). O BRIEF cita só os não tachados.
5. **Duas primeiras linhas:** o cabeçalho diz que não há código nem forks ratificados, e a frase de alcance diz que
   o valor para o 1º cliente é zero e que o número não tem oráculo antes do H1/X5.

**Vieses (T8):**
- **Completude:** 10 forks a mais sobre 14 já ratificados. Os que mudam desenho são F-TA-1, 3, 7 e 8; os outros
  podem ir em lote.
- **Fonte legível:** a LC 224 entrou com leitura detalhada porque a IN estava acessível. A regra de quotas e a do
  saldo negativo trimestral ficaram como I, porque não as reli.
