# BRIEF — BE-INCR-PIS-COFINS (apuração mensal de PIS/Cofins: cumulativo do Presumido, não cumulativo do Real) — nó X8

> Produzido em `sessao-planejamento` em 02/10/2026, sobre `origin/main` `dafe594e`. Herda o esqueleto da §5 (P1–P12) do
> [`ADR-INCR-PIS-COFINS`](../adr/ADR-INCR-PIS-COFINS.md), **Accepted** em 02/10 (8/8 forks ratificados, todos (a):
> [`D-2026-10-02-X8-PIS-COFINS-FORKS`](../plano/decisoes/D-2026-10-02-X8-PIS-COFINS-FORKS.md)).
> **Este documento NÃO escreve código.** Traz checklist, contratos esboçados e forks **F-PCB-1..5, ✅ RATIFICADOS em
> 02/10** por questionário (4 na recomendação; **F-PCB-1 → (b), divergente**: as contas de PIS/Cofins da provisão são
> `Expense`, e nenhum gate da ECF muda). Registro:
> [`D-2026-10-02-X8-PIS-COFINS-FORKS`](../plano/decisoes/D-2026-10-02-X8-PIS-COFINS-FORKS.md), rodadas 3–4. Nenhum item
> vira código sem "executa" do dono (ORCH-006).
>
> **Alcance, dito antes de tudo:** PIS/Cofins são revogados em **01/01/2027** (LC 214 art. 542) e o 1º cliente é
> **Simples** (400 aqui). O X8 é régua de ~3 meses de fato gerador. Pelo F-X8-1 → (a), **não há gerador de
> EFD-Contribuições**: a saída é a apuração persistida, a provisão no razão e o valor para o X9. Um teste verde prova a
> aritmética contra a tabela, não contra a lei — o oráculo é o contador (ADR §9 item 4).
>
> **EMENDA 06/10 (§7):** 8 leituras estritas do PR-2 ratificadas pelo dono; o PR-2 (#554) só entra em `main` junto com o
> PR-3 (risco D6). [D-2026-10-06-X8-PR2-LACUNAS-E-MERGE](../plano/decisoes/D-2026-10-06-X8-PR2-LACUNAS-E-MERGE.md).
>
> **EMENDA 06/10 (§8):** lacunas L-1..L-3 do PR-3 decididas; L-2 muda o item 17 (o saldo credor anterior consumido
> também é baixado do "a recuperar"). [D-2026-10-06-X8-PR3-LACUNAS](../plano/decisoes/D-2026-10-06-X8-PR3-LACUNAS.md).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó [`X8`](../plano/nos/X8.md), ADR §5 itens P1–P10 e P12 (o P11, EFD, saiu pelo F-X8-1 → a).
- **Autorização:** dono, chat, 02/10/2026: *"… (2) depois, planejar o BRIEF do X8 (dono, 02/10) — sem 'executa'."*
  - **Cobre exatamente:** este BRIEF (os F-PCB-n foram ratificados depois, por autorização própria: *"Ratifica os
    F-PCB-1..5 por questionário agora"*, 02/10). **Não cobre:** código; o gerador de EFD (diferido pelo
    F-X8-1); a correção na origem do salão-parceiro (ADR §11 item 1).
  - **Divergência do passo 1:** nenhuma. A nota do nó dizia "só ADR"; a mensagem de 02/10 amplia para o BRIEF.
- **Fatos consumados que o BRIEF respeita** (lidos em `dafe594e`, grau V; caminhos sob `server/`):
  - Crédito na entrada: `acquisitionCost` (`src/lib/nfeCost.ts:117-207`) calcula por item `bp(base,165)+bp(base,760)` e
    devolve `baseCreditoPisCofinsCents`; a importação grava **uma** linha `{accountId, amountCents, kind:'PIS_COFINS'}`
    em `Payable.recoverableTaxLines` (`NfeImportService.ts:195-201`; `prisma/schema.prisma:956`). `Payable.issueDate`
    = `dhEmi` da nota (`NfeImportService.ts:136`).
  - `FiscalProfile` (unidade): `pisCofinsRegime` livre entre `CUMULATIVO`/`NAO_CUMULATIVO` fora do Simples
    (`FiscalProfileDto.ts:35,66-78`); o service já recusa `regimeTributario` da unidade divergente do regime da empresa
    no ano (`FiscalProfileService.ts:158-161`, `regimeUnidadeEsperado`). Contas checadas por natureza com
    `assertAssetAccount`/`assertExpenseAccount` (`FiscalProfileService.ts:202-220`).
  - DRE: a seção `revenueDeductions` é `nature = Revenue` com `codePrefix '3.2'` (`StatementMappingFixture.ts:25`;
    `AccountingReportService.computeDreNet`, `:243-271`).
  - **Conflito achado nesta sessão (V):** o gate de exaustividade da ECF Presumido recusa (400) **qualquer** conta
    `Revenue` folha com movimento no ano fora de `3.1`/`3.3` (`SpedEcfGenerationService.ts:96-121`). Uma provisão de
    PIS/Cofins em `3.2.x` (dedução) faria a ECF Presumido falhar. **Resolvido pelo F-PCB-1 → (b):** as contas são
    `Expense`, fora do gate.
  - X7 (dependência): `TaxAssessment`, `receitaBrutaPorAtividade` (item 6), o fluxo prévia/confirmação (itens 13–14), a
    provisão por bridge (item 15) e o reconcile (item 16) estão no BRIEF da Fase A (F-TA-10 → a: **PR-1** perfil +
    parâmetros + funções puras; **PR-2** model + rotas; **PR-3** provisão). **Nada disso existe em código ainda.**
- **Nós vizinhos:** consome [`X7`](../plano/nos/X7.md) (model e fluxo), X6/ITEM-DESTINATION (crédito da NF-e),
  [`X13`](../plano/nos/X13.md) (regime da PJ por ano), C8 (encargo de depreciação, só como base informada). É consumido
  por [`X9`](../plano/nos/X9.md) (contrato C1 com PIS/Cofins) e pela DRE/ECD (provisão).

## Fontes legais desta fase (só primária; seção citada — detalhe e hashes no ADR §3/§15)

| Regra | Fonte | Grau |
|---|---|---|
| Presumido ⇒ cumulativo 0,65%/3%; base = faturamento (receita bruta) | IN 2.121 arts. 122, 128, 25 II § 2º; Lei 9.718 arts. 3º e 8º | V-fonte |
| Real ⇒ não cumulativo 1,65%/7,6%; base = totalidade das receitas | IN 2.121 arts. 145, 150, 25 I; Leis 10.637/10.833 art. 2º | V-fonte |
| Exclusões gerais da base | IN 2.121 art. 26 | V-fonte |
| Créditos: revenda/insumo no mês da aquisição; III–V/IX incorridos; VI/VII/XI por encargo de depreciação; § 2º sem crédito; § 3º só de PJ no País; § 4º saldo transportado | Lei 10.833 art. 3º | V-fonte |
| Alíquota zero na revenda por não industrial/importador | Lei 10.147 art. 2º; IN 2.121 art. 487 | V-fonte |
| Cota-parte do profissional-parceiro fora da receita bruta do salão | Lei 12.592 art. 1º-A § 5º | V-fonte |
| Centralização na matriz; pagamento até o dia 25; retenção deduz | IN 2.121 arts. 119, 114, 120 | V-fonte |
| Regime de caixa só com o mesmo critério do IRPJ/CSLL | IN 2.121 art. 127 | V-fonte |
| Códigos DCTF: 810902, 217201, 691201, 585601 | Tabelas DCTF da Receita (PIS 27/02/2024; Cofins 27/07/2023) | V-fonte |
| Revogação a partir de 01/01/2027 | LC 214 art. 542; art. 544 III | V-X7 |

## Definição de pronto

(1) checklist numerado e testável (§1); (2) contratos materializáveis (§2); (3) forks com caminhos, recomendação e
**RATIFICAÇÃO PENDENTE** (§3 — ratificados em 02/10); (4) pendências externas (§4); (5) insumos ausentes (§5); (6) achados fora de escopo (§6).

---

## 1. Checklist de comportamentos

Notação: **[D]** = direto (ADR, lei ou precedente decidem); **[F-PCB-n]** = depende de fork pendente; **[P-n]** = depende
de pendência externa (§4).

### Perfil, regime e parâmetros (PR-1 — independe do X7)

1. **[D, F-X8-3 → a] Regime coerente na unidade.** `UpsertFiscalProfileSchema.superRefine` ganha a regra
   `regimeTributario = 'PRESUMIDO'` ∧ `pisCofinsRegime = 'NAO_CUMULATIVO'` ⇒ 400 (path `pisCofinsRegime`, mensagem
   citando IN 2.121 art. 122). `REAL` + `CUMULATIVO` continua aceito no DTO (receitas do art. 126 existem no Real), mas
   o X8 recusa na prévia (item 9).
   - **Teste:** o par ilegal ⇒ 400; `PRESUMIDO`+`CUMULATIVO` e `REAL`+`NAO_CUMULATIVO` passam; snapshot de shape sem
     mudança (o refine é invisível ao snapshot — o teste é este).
1b. **[D, F-PCB-5 → a] Linhas já gravadas com o par ilegal.** `FiscalProfileService.requireCostRegime` (`:135`, consumido
   pela importação e pelo preview da NF-e) passa a responder 400 nomeado para `PRESUMIDO`+`NAO_CUMULATIVO`, em vez de
   creditar.
2. **[D, F-TA-6 por analogia, F-X8-4 → a, F-PCB-1 → b] Contas da provisão** em `FiscalProfile` (unidade), 4 FKs
   nullable: `pisDespesaAccountId`, `cofinsDespesaAccountId` (**`Expense`**, checadas pelo `assertExpenseAccount` que já
   existe, `FiscalProfileService.ts:213`), `pisRecolherAccountId`, `cofinsRecolherAccountId` (`Liability`, novo
   `assertLiabilityAccount` no mesmo molde). Na DRE, `Expense` fora de `4.2` cai em "despesas"
   (`StatementMappingFixture.ts`, regra `dre.expenses`), não em "deduções da receita" — consequência aceita no F-PCB-1.
   Códigos = contador (P-1). Allowlist de `fiscal_profile.updated` (`auditCanonical.ts:140`) na mesma mudança.
3. **[D, D9/D10] Tabela de parâmetros** `features/accounting/models/pisCofinsParams.ts`, no molde `obrigacoesPorRegime.ts`
   e da `taxAssessmentParams.ts` do X7:
   - `PIS_CUMULATIVO_BP 65`, `COFINS_CUMULATIVO_BP 300` (IN 2.121 art. 128); `PIS_NAO_CUMULATIVO_BP 165`,
     `COFINS_NAO_CUMULATIVO_BP 760` (art. 150) — reusa as constantes `PIS_CREDIT_BP`/`COFINS_CREDIT_BP` de
     `nfeCost.ts:34-35` (mesmo número, mesma lei: importa, não duplica);
   - códigos `PIS/CUMULATIVO 810902`, `COFINS/CUMULATIVO 217201`, `PIS/NAO_CUMULATIVO 691201`,
     `COFINS/NAO_CUMULATIVO 585601`;
   - toda linha com `fonte` ≠ `''`, `vigenteDesde` e **`vigenteAte: '2026-12-31'`**.
   - **Teste:** lookup em `2026-12` resolve; em `2027-01` não resolve (⇒ item 9 responde 400 *"revogados — LC 214 art.
     542"*); toda `fonte` não vazia.
4. **[D, F-TA-2 → a] Arredondamento** = a mesma função half-up do X7 (item 5 dele), importada. Cada linha da memória
   guarda o valor já arredondado.

### Crédito da NF-e separado (PIS-1 — independe do X7)

5. **[D, F-X8-7 → a] A importação grava PIS e Cofins separados.** `acquisitionCost` passa a devolver também
   `creditoPisCents` e `creditoCofinsCents` (Σ por item de `bp(base,165)` e `bp(base,760)` — a soma dos dois é
   **exatamente** o `creditoPisCofinsCents` de hoje). `recoverableLines` grava na linha `PIS_COFINS` os campos opcionais
   `baseCents`, `pisCents`, `cofinsCents` (JSON, sem migração). `PayableDto.ts:80` aceita os campos opcionais.
   - **Invariante (teste):** `pisCents + cofinsCents === amountCents` em toda nota nova; o entry contábil não muda
     (mesmo `amountCents`, mesma conta) — os testes do X6/ITEM-DESTINATION passam **sem edição**; se algum precisar
     mudar, o executor para e reporta.
   - Audit `payable.created`: a allowlist (`auditCanonical.ts:58`) já tem `recoverablePisCofinsCents`; nada novo.
6. **[D] Leitura do crédito do mês** (função de repo nova, só leitura): `Payable` da unidade com `issueDate` no mês,
   `status ≠ CANCELLED`, `deletedAt` nulo, com linha `PIS_COFINS`. Linha com `pisCents`/`cofinsCents` ⇒ usa; sem ⇒
   divide `amountCents` por 165:760 (PIS = arred. half-up de `amount × 165/925`, Cofins = resto) e marca a linha da
   memória como `DERIVADO` (F-X8-7 a). "Mês da aquisição" = `issueDate` (= `dhEmi`) — P-3.

### Cálculo (funções puras: `(entrada, tabela vigente) → memória`)

7. **[D, D3] Débito.** Receita do mês = `receitaBrutaPorAtividade(scope, from, to)` do X7 (mesmo gate de exaustividade,
   **sem mudança** — F-PCB-1 → b). `base = servico + revenda − Σ ajustesBase`; débito = `bp(base, alíquota)` por tributo.
   - `ajustesBase` (F-X8-5 a / F-X8-6 a): `ALIQUOTA_ZERO_REVENDA` ≤ revenda do mês, `COTA_PARTE_PARCEIRO` ≤ serviço do
     mês — senão 400 nomeando o tipo. Cada ajuste é uma linha da memória com a fonte (Lei 10.147 art. 2º / Lei 12.592
     art. 1º-A § 5º) e o documento.
   - `COTA_PARTE_PARCEIRO` sem `documento` ⇒ 400 *"informe o contrato de parceria"* (§ 8º exige contrato escrito; P-6).
   - A receita com alíquota zero continua na memória (base 0, linha própria): a EFD do contador precisa dela (CST 06).
8. **[D, D4] Créditos (só `NAO_CUMULATIVO`).** Crédito do mês por tributo = item 6 + Σ `outrosCreditos` × alíquota
   (F-X8-8 a; cada linha com inciso, base, documento e a fonte "Lei 10.833 art. 3º <inciso>") + **saldo credor
   anterior** (item 11). `CUMULATIVO` com `outrosCreditos` não vazio ⇒ 400 (*"cumulativo não tem crédito"*).
   - a pagar = `max(0, débito − crédito − retenções)` por tributo; `saldoCredor = max(0, crédito − débito)`; retenção
     maior que o devido depois do crédito segue o precedente F-TA-9 (a): a pagar 0, excedente na memória
     (*"compensação fora do sistema"*).
9. **[D] Recusas da prévia (400):** regime da PJ `SIMPLES`/`MEI` (*"recolhido no DAS"*); período ≥ `2027-01` (item 3);
   perfil da PJ do ano ausente; `ecfIndRecReceita = '1'` (D6, caixa); `FiscalProfile.pisCofinsRegime` divergente da
   modalidade derivada do regime da PJ (F-X8-3 a; inclui `REAL`+`CUMULATIVO`); outra unidade da PJ com movimento no mês
   (D5, listando as unidades).
10. **[D, D7] Retenções** vêm do payload (`tributo`, `valorCents`, `documento?`), uma linha da memória cada.
11. **[D, D4 + F-PCB-2 → a] Saldo credor transportado.** A prévia de `Mxx` lê o `saldoNegativoCents` da apuração
    `CONFIRMED` de `Mxx−1` do mesmo tributo (no `TaxAssessment` ele é o saldo credor — ADR §6). Ordem **sequencial**
    (precedente F-TA-3 → a): `Mxx` com `Mxx−1` do mesmo ano não confirmado ⇒ 409, salvo o 1º mês apurado no sistema,
    cujo saldo credor anterior o operador informa (`saldoCredorAnterior`; em qualquer outro mês o campo ⇒ 400). Janeiro lê dezembro do ano anterior se existir.

### Persistência e fluxo (PR-2 — depois do PR-2 do X7)

12. **[D, F-X8-2 → a] Reuso do `TaxAssessment`**, sem migração: `tributo ∈ {PIS, COFINS}`, `forma = 'MENSAL'`,
    `periodo = M01..M12`, `modo ∈ {PIS_COFINS_CUMULATIVO, PIS_COFINS_NAO_CUMULATIVO}`, `codigoReceita` do item 3,
    `saldoNegativoCents` = saldo credor. O DTO de leitura do X7 aceita os valores novos (enum alargado; snapshot de
    shape atualizado **na mesma mudança**).
13. **[D] `POST /accounting/tax-assessments/pis-cofins/preview`** — calcula PIS e Cofins juntos (D1), não persiste,
    traz `provisaoContasConfiguradas` e os avisos (inclui *"ajustes não informados: a base tributa toda a receita"*
    quando `ajustesBase` vem vazio e há revenda no mês).
14. **[D] `POST /accounting/tax-assessments/pis-cofins` (confirmação), commit 1** — mesmo molde do X7 item 14: recalcula
    fora da tx; numa `runTransaction`: CAS `expectedAPagarCents {PIS, COFINS}` ⇒ 409; um só `CONFIRMED` por (PJ, ano,
    tributo, período) com `supersedesIds` ⇒ 409; ordem do item 11 ⇒ 409; marca substituídas; grava as 2 linhas; audita
    `tax.assessment.confirmed` (e `.superseded`) — **os mesmos eventType do X7**, com `tributo` = PIS/COFINS. **Sem
    trava de forma** (PIS/Cofins não tem opção própria: segue o regime da PJ, já travado pelo X13/X7).
    - Substituir `Mxx` quando `Mxx+1` já está confirmado ⇒ 409 *"substitua de trás para frente"* (o saldo credor de
      `Mxx+1` leu o `Mxx` antigo).
15. **[D] Policy:** reusa `canReadTaxAssessment`/`canManageTaxAssessment` do X7 (mesmo recurso).
16. **[D] Leitura:** os GET do X7 (`/accounting/tax-assessments?…` e `/:id`) já servem; o filtro `tributo` aceita
    PIS/COFINS. Nenhuma rota GET nova.

### Provisão (PR-3 — depois do PR-3 do X7)

17. **[D, F-X8-4 → a + F-PCB-1 → b + F-PCB-3 → a] Provisão, commit 2**, bridge no molde do X7 item 15, `sourceType =
    'tax.assessment.provision'`, `sourceId` = id da linha, data = último dia do mês:
    - D despesa (`pis|cofinsDespesaAccountId`, `Expense`) / C a recolher (`pis|cofinsRecolherAccountId`), valor = débito bruto;
    - **não cumulativo:** + D a recolher / C `pisCofinsRecuperavelAccountId`, valor = crédito **da NF-e** aproveitado no
      mês (a parte do item 6 efetivamente usada; o saldo credor fica no ativo);
    - outros créditos e retenções: **não lançados** (F-PCB-3 → a) — ficam na memória, e a linha `A_RECOLHER_X_DARF`
      mostra a diferença para o contador;
    - falha (conta faltando, período fechado) ⇒ `provisaoPendente = true`, commit 1 intacto; commit 3 grava
      `provisaoEntryId` com CAS; substituição = `reverseEntry` + `postEntry`. Cabeçalho `atomicUntil` (AC-2.3-2).
18. **[D] Reconcile** = a rota do X7 (`POST …/:id/provisao`) serve as linhas PIS/COFINS; **o teste chama 2× e assere a
    segunda chamada** (sem lançamento novo, mesmo `provisaoEntryId`).
19. **[D] Encerramento × provisão pendente:** precedente F-TA-8 (a) — o `ExerciseClosingService` já recusará apuração
    `CONFIRMED` com provisão pendente (X7 item 18); o teste cobre uma linha PIS.

### Gates que o diff aciona (P12)

20. **[D]** Rotas em 2 toques (`routes/accounting.ts` + `docs.paths.ts`): **+2 paths** (preview, confirmação); guard de
    path-count do openapi.
21. **[D]** Snapshot de shape: `PisCofinsPreviewSchema`, `PisCofinsConfirmSchema`, o `PayableDto` (item 5) e o DTO de
    leitura do `TaxAssessment` alargado (item 12).
22. **[D]** Allowlist do `auditCanonical.ts`: nenhum eventType novo (itens 14 e 17 reusam os do X7); `fiscal_profile.updated`
    ganha as 4 contas (item 2). Só ids e centavos como string.
23. **[D] Testes de invariante** (ADR §13 + estes):
    - (a) Presumido: 100.000,00 de receita ⇒ PIS 650,00 / Cofins 3.000,00; Real: débito 1.650,00 / 7.600,00 menos
      créditos;
    - (b) crédito > débito ⇒ a pagar 0 + saldo credor; o mês seguinte o consome (sequência M01 → M02);
    - (c) `pisCents + cofinsCents = amountCents` em nota nova; nota antiga ⇒ `DERIVADO` com a mesma soma;
    - (d) `ajustesBase` maior que a receita da atividade ⇒ 400;
    - (e) `2027-01` ⇒ 400; `SIMPLES` ⇒ 400; caixa ⇒ 400; unidade divergente ⇒ 400; multiunidade ⇒ 400;
    - (f) a ECF Presumido de um ano com provisão de PIS/Cofins lançada **gera** (prova do F-PCB-1 → b: conta `Expense`,
      gate intocado);
    - (g) a base do Real do X7 (item 7 dele) **inclui** a despesa de PIS/Cofins provisionada (dedutível; não entra na
      guarda de circularidade do X7, que exclui só as contas de IRPJ/CSLL).

## 2. Contratos esboçados

```ts
// DTOs (Zod .strict(); centavos como string de dígitos) — features/accounting/dtos/PisCofinsDto.ts
const Cents = z.string().regex(/^\d+$/);
const MESES = ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12'] as const;

export const PisCofinsPreviewSchema = z.object({
  unitId: z.string().min(1),
  anoCalendario: z.number().int().min(2025).max(2026),
  periodo: z.enum(MESES),
  ajustesBase: z.array(z.object({
    tipo: z.enum(['ALIQUOTA_ZERO_REVENDA', 'COTA_PARTE_PARCEIRO']),
    valorCents: Cents,
    documento: z.string().max(120).optional(),     // obrigatório em COTA_PARTE_PARCEIRO (service, item 7)
  }).strict()).max(50).default([]),
  outrosCreditos: z.array(z.object({
    inciso: z.enum(['III_ENERGIA', 'IV_ALUGUEL_PJ', 'V_ARRENDAMENTO', 'VI_VII_DEPRECIACAO', 'IX_FRETE_VENDA']),
    baseCents: Cents,
    documento: z.string().max(120).optional(),
  }).strict()).max(50).default([]),
  retencoes: z.array(z.object({
    tributo: z.enum(['PIS', 'COFINS']), valorCents: Cents, documento: z.string().max(120).optional(),
  }).strict()).max(50).default([]),
  saldoCredorAnterior: z.object({ PIS: Cents, COFINS: Cents }).strict().optional(), // F-PCB-2 (a): só no 1º mês apurado
}).strict();

export const PisCofinsConfirmSchema = PisCofinsPreviewSchema.extend({
  expectedAPagarCents: z.object({ PIS: Cents, COFINS: Cents }).strict(), // CAS ⇒ 409
  supersedesIds: z.array(z.string()).max(2).optional(),
}).strict();

// Memória (MemoriaLinha do X7): codigo ∈ RECEITA_SERVICO | RECEITA_REVENDA | AJUSTE_ALIQUOTA_ZERO | AJUSTE_COTA_PARTE
//   | BASE | DEBITO | CREDITO_NFE (| _DERIVADO) | CREDITO_<INCISO> | SALDO_CREDOR_ANTERIOR | RETENCAO | A_PAGAR | SALDO_CREDOR
```

```ts
// Payable.recoverableTaxLines — linha PIS_COFINS alargada (JSON; sem migração) — item 5
type RecoverableTaxLine =
  | { accountId: string; amountCents: number; kind: 'ICMS' }
  | { accountId: string; amountCents: number; kind: 'PIS_COFINS'; baseCents?: number; pisCents?: number; cofinsCents?: number };
// invariante: pisCents + cofinsCents === amountCents quando presentes
```

```prisma
// FiscalProfile (unidade) — aditivo (item 2)
pisDespesaAccountId    String?  // Expense — F-PCB-1 (b)
cofinsDespesaAccountId String?  // Expense
pisRecolherAccountId   String?  // Liability
cofinsRecolherAccountId String? // Liability
// + 4 relations Account onDelete: Restrict (molde icmsRecuperavelAccount)
// TaxAssessment: NENHUMA mudança de schema (F-X8-2 a) — só valores novos nas colunas String
```

**Rotas:** `POST /accounting/tax-assessments/pis-cofins/preview` · `POST /accounting/tax-assessments/pis-cofins` (+ os GET
e o reconcile do X7, reusados).

## 3. Forks — RATIFICADOS (02/10, [D-2026-10-02-X8-PIS-COFINS-FORKS](../plano/decisoes/D-2026-10-02-X8-PIS-COFINS-FORKS.md), rodadas 3–4)

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-PCB-1** Natureza da conta de dedução × gate da ECF | **(a)** `Revenue` sob `3.2` (aparece em "Deduções da receita" na DRE, `StatementMappingFixture.ts:25`) **e** o gate de exaustividade de `receitaBrutaPorAtividade` passa a ignorar **exatamente** as contas `pis/cofinsDeducaoAccountId` configuradas · (b) natureza `Expense` (nenhum gate muda; a DRE mostra PIS/Cofins como despesa, não dedução) · (c) o gate ignora todo o prefixo `3.2` | ✅ **RATIFICADO (b) — dono, 02/10, DIVERGENTE da recomendação.** Efeito: contas `Expense`, nenhum gate muda, PIS/Cofins aparecem como despesa na DRE. *Recomendação original:* **(a).** A DRE certa sem abrir o gate: só as duas contas configuradas saem dele. (c) deixaria passar devolução/cancelamento lançados em `3.2`, que **são** ajuste da receita bruta. A mudança toca a função que o X7 extrai (item 6 dele): o teste (f) prova que a ECF continua gerando | alto em (c): receita some da base em silêncio; médio em (b): DRE errada |
| **F-PCB-2** Saldo credor anterior ao 1º mês apurado no sistema | **(a)** o operador informa (`saldoCredorAnterior`, por tributo) **só** no 1º mês apurado do PJ; nos demais o campo ⇒ 400 · (b) sempre zero | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O cliente que entra no meio do ano traz saldo credor real (art. 3º § 4º); (b) faz pagar a mais. Uma linha da memória, marcada *"informado"* | baixo |
| **F-PCB-3** Outros créditos e retenções no lançamento | **(a)** a provisão **não** os lança (como o X7 item 15, que provisiona o devido e deixa as deduções na memória): o "a recolher" fica maior que o DARF nesse valor, e a memória lista a diferença para o contador · (b) 5ª conta (`pisCofinsCreditoOutrosAccountId`, redutora) e lançamento D a recolher / C redutora | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** Coerência com o X7 e com o "raso"; o crédito de energia/aluguel nunca passou pelo ativo "a recuperar", então não há o que baixar dele. Declarado na memória | médio: razão diverge do DARF até o contador ajustar |
| **F-PCB-4** Fatiamento | **(a)** 3 PRs seriais: **PR-1** itens 1–6 (DTO, contas, parâmetros, crédito separado — **independe do X7**, pode ir já) · **PR-2** itens 7–16, 20–23 (depois do PR-2 do X7) · **PR-3** itens 17–19 (depois do PR-3 do X7) · (b) 1 PR depois do X7 inteiro | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O PR-1 fecha já o crédito indevido do `PRESUMIDO + NAO_CUMULATIVO` (item 1/1b) e começa a gravar o crédito separado — cada mês sem ele vira mais uma nota `DERIVADO`. Mesmo molde do F-TA-10 | baixo |
| **F-PCB-5** Perfis já gravados com `PRESUMIDO + NAO_CUMULATIVO` | **(a)** a importação e o preview da NF-e recusam (400 nomeado) até o perfil ser corrigido · (b) só o DTO muda; linhas antigas seguem creditando | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O par é ilegal (art. 122) e gera crédito indevido; a correção é um `PUT` do perfil. Custo: um check em `requireCostRegime` | alto em (b): crédito indevido silencioso |

## 4. Pendente de validação externa

1. **P-1 Contas** de dedução e de recolher (códigos e referencial) — contador.
2. **P-2 Exclusões do art. 26** refletidas no razão (cancelamento/devolução estornados na receita?) e **receitas
   financeiras** no Real (art. 789) — contador. Hoje o gate do item 7 recusa receita fora de `3.1`/`3.3`.
3. **P-3 "Mês da aquisição"** = `dhEmi` (`Payable.issueDate`) ou data de entrada? A lei diz *"adquiridos no mês"* (art. 3º
   § 1º I). Usa-se `issueDate` (o que existe); o contador confirma.
4. ~~**P-4 Códigos no MIT**~~ — **resolvido** (03/10): o `ADR-INCR-DCTFWEB-MIT` §3 confirma os 4 códigos no Manual do MIT §10.1.
5. **P-5 Oráculo:** 1ª apuração real conferida pelo contador (gate humano, RUNBOOK-FORMAT; o agente não preenche, não
   marca desfecho, não assina).
6. **P-6 Salão-parceiro:** o contrato homologado (Lei 12.592 art. 1º-A § 8º) — o sistema só exige um `documento`; a
   validade é do contador.

## 5. Insumos ausentes

1. O **código real** do `TaxAssessment`, do fluxo de confirmação e da provisão do X7 (não existem). Os itens 12–19
   foram escritos contra o BRIEF do X7; se a implementação do X7 divergir do BRIEF dele, os PR-2/PR-3 do X8 relêem.

## 6. Achados fora de escopo (registrados, não planejados)

1. **Ordem X8 → X7 no Real:** a base do IRPJ/CSLL Real do trimestre (X7 item 7) inclui a dedução de PIS/Cofins só se os
   3 meses já estiverem provisionados. O X7 não avisa disso. Registro para o X7, sem mudança aqui.
2. **Salão-parceiro na origem** (ADR §11 item 1) e **pneus 40.11/40.13** fora da tabela monofásica (ADR §11 item 2).
3. **Gerador de EFD-Contribuições** — diferido pelo F-X8-1 → (a); volta só com autorização nova.

## 7. EMENDA 06/10 — leituras do PR-2 ratificadas e ordem de merge

**Autorização:** dono, chat, 2026-10-06, questionário — ratifica as 8 leituras estritas que o executor do PR-2 (#554) fez
das lacunas desta spec (`.claude/retornos/x8-pis-cofins-pr2.md`, "Lacunas de spec") e decide o risco D6. Registro:
[D-2026-10-06-X8-PR2-LACUNAS-E-MERGE](../plano/decisoes/D-2026-10-06-X8-PR2-LACUNAS-E-MERGE.md). Não reabre F-PCB-1..5.

| # | Lacuna (item) | Leitura ratificada |
|---|---|---|
| 1 | "1º mês apurado" (item 11) | M(x−1) não confirmado **e** nenhum mês anterior confirmado no mesmo ano. Janeiro sem dezembro anterior conta como 1º mês (o operador informa o saldo). Confirmar um mês **anterior** a um já confirmado ⇒ 409 "de trás para frente" (generaliza o item 14) |
| 2 | Ordem (itens 11 e 13) | O 409 de ordem vale também na **prévia**, não só na confirmação (sem M(x−1) não há saldo credor) |
| 3 | Perfil fiscal (item 9) | Perfil fiscal da **unidade** ausente ⇒ 400 (a spec listava só o da PJ) |
| 4 | `provisaoContasConfiguradas` (item 13) | No não cumulativo, exige as 4 contas **e** `pisCofinsRecuperavelAccountId` ("PIS/Cofins a recuperar"), que o PR-3 credita |
| 5 | Crédito anterior no cumulativo (itens 8 e 11) | `saldoCredorAnterior` informado > 0 no cumulativo ⇒ 400; saldo **lido** > 0 no cumulativo (troca de regime entre anos) é ignorado com aviso |
| 6 | Memória (§2) | Linhas `AJUSTE_*_n`, `CREDITO_<INCISO>_n`, `RETENCAO_n`, `RETENCAO_EXCEDENTE`, `CREDITO_NFE` agregado (contagem de notas na descrição); `deducoesCents` = créditos + retenções |
| 7 | Shape da resposta (itens 13–14) | Prévia e confirmação com chaves `pis`/`cofins` (o X7 usa `irpj`/`csll`) |
| 8 | Colunas gravadas (item 12) | `TaxAssessment.regime` = regime da PJ do ano; `tabelaVersao` = `pis-cofins-2026-10-06` |

**Risco D6 e ordem de merge (decisão do dono):** até o PR-3 (itens 17–19), uma apuração confirmada com débito > 0 fica sem
provisão e bloqueia o encerramento do ano (`ExerciseClosingService`), e o reconcile a recusa (guarda D4). Decisão:
*"Mergear PR-2 e PR-3 juntos"* — **o PR-2 (#554) não entra em `main` antes do PR-3 do X8.**

## 8. EMENDA 06/10 — lacunas do PR-3 (item 17) decididas

**Autorização:** dono, chat, 2026-10-06, questionário, sobre as lacunas do executor do PR-3 (#556,
`.claude/retornos/x8-pis-cofins-pr3.md`). Registro: [D-2026-10-06-X8-PR3-LACUNAS](../plano/decisoes/D-2026-10-06-X8-PR3-LACUNAS.md).
Não reabre F-PCB-1..5; a L-2 **altera** o item 17 (antes: só a parte do item 6 era baixada).

| # | Lacuna (item 17) | Decisão |
|---|---|---|
| L-1 | "crédito da NF-e aproveitado no mês" | **(a)** `min(CREDITO_NFE + CREDITO_NFE_DERIVADO, débito)` — a NF-e do mês consome primeiro |
| L-2 | saldo credor anterior consumido no mês | **Baixar também:** + D PIS/COFINS a recolher / C PIS/COFINS a recuperar pelo saldo anterior usado (parcial ⇒ só o usado; sem débito ⇒ 0; só no não cumulativo), para o "a recolher" bater com o DARF |
| L-3 | forma do lançamento | Um lançamento por tributo/mês, até 6 pernas; chave de idempotência = a apuração; reconcile repetido não duplica |

**Aberta (L-4, leitura do executor):** ordem de consumo NF-e do mês → outros créditos do mês → saldo anterior (a ordem da
memória). **Risco (L-5):** a parte "outros" do saldo anterior nunca passou pelo ativo; a baixa pode deixar o "a recuperar"
credor — contador.
