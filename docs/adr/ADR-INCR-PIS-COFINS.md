# ADR-INCR-PIS-COFINS — Apuração mensal de PIS/COFINS (cumulativo do Presumido, não cumulativo do Real), créditos, alíquota zero na revenda, e onde o número aparece (DCTFWeb via X9 × EFD-Contribuições) — nó X8

- **Data:** 2026-10-02
- **Status:** **Accepted (02/10/2026).** F-X8-1..8 (§8) **ratificados pelo dono em 02/10**, todos na recomendação (a), por
  questionário: [`D-2026-10-02-X8-PIS-COFINS-FORKS`](../plano/decisoes/D-2026-10-02-X8-PIS-COFINS-FORKS.md). **Nenhum
  código escrito, nenhum autorizado:** o BRIEF é [`BE-INCR-PIS-COFINS-brief.md`](../accounting/BE-INCR-PIS-COFINS-brief.md);
  código exige "executa" (ORCH-006). **Escopo após F-X8-1 → (a): apuração sem gerador de EFD-Contribuições.**
- **Autor:** `sessao-planejamento` (agente). Base `origin/main` `dafe594e`.
- **Autorização (ORCH-006), citada:**
  1. **F-M2** (dono, 03/09): o escopo fiscal inclui *"apuração de tributos (IRPJ/CSLL, PIS/COFINS, ISS) + EFD-Contribuições
     + DCTF/DCTFWeb"* ([cédula 03/09](../accounting/CEDULA-DECISAO-2026-09-03-modulos.md), linha 33). No nó:
     `autorizacao: "F-M2 (2026-09-03) — só ADR"` ([X8](../plano/nos/X8.md)).
  2. **F-X7-13 → (a)** e **F-TA-1 → (a)** (dono, 02/10): PIS/COFINS fica no X8, separado do X7
     ([D-2026-10-02-X7-TAX-ASSESSMENT-FORKS](../plano/decisoes/D-2026-10-02-X7-TAX-ASSESSMENT-FORKS.md)).
  3. **Dono, chat, 02/10/2026:** *"Autorizo: (1) abrir o ADR do X8 (PIS/COFINS) e ratificar os forks dele por questionário
     comigo agora; (2) depois, planejar o BRIEF do X8 (dono, 02/10) — sem 'executa'."*
  - **Passo 1 (cobertura):** cobre este ADR, a rodada de ratificação dos forks dele e o BRIEF `BE-INCR-PIS-COFINS`. Não
    cobre código. A cédula 03/09 E.3 nomeia o X8 **"deliberadamente raso … por último"**; este ADR respeita isso.
- **Related:** `ADR-INCR-TAX-ASSESSMENT` (X7: `TaxAssessment`, contrato C1, F-X7-4/7/11, F-TA-2) · `ADR-INCR-NFE` §D3 +
  BRIEF `BE-INCR-NFE-COST-REGIME` (X6: crédito na entrada) · BRIEF `BE-INCR-ITEM-DESTINATION` (insumo do serviço) ·
  `ADR-FISCAL-OBLIGATION-PROFILE-regime-porte` (X13) · `ADR-C01` (bridge pós-commit) · decisão
  `D-2026-09-25-FASE1-PIS-COFINS` (F-PC-1/2, IPI fora da base) · rejeitadas `R-motor-regras` / `R-motor-dominio`.

## TLDR (2 linhas)

O sistema já **credita** PIS/COFINS na compra (NF-e, X6), mas não calcula o **débito** nem apura o mês: este ADR desenha a apuração mensal (cumulativo 0,65%/3% no Presumido; não cumulativo 1,65%/7,6% menos créditos no Real) sobre o razão, persistida e com a saída para o X9 (DCTFWeb/MIT).
**Risco principal:** PIS/COFINS são **revogados em 01/01/2027** (LC 214 art. 542) e o 1º cliente é Simples — o X8 tem ~3 meses de fato gerador e nenhum cliente hoje; o F-X8-1 decide se constrói, e quanto.

---

## 1. Contexto e objetivo

- **O que existe (V, lido em `dafe594e`):** crédito de PIS/COFINS **na entrada** da NF-e, por item, só no regime
  `NAO_CUMULATIVO` (`server/src/lib/nfeCost.ts:117-180`), com tabela de NCM monofásico/alíquota zero
  (`features/accounting/models/pisCofinsMonofasicoNcm.ts`) e lançamento numa conta "PIS/COFINS a recuperar" do
  `FiscalProfile` da unidade (`NfeImportService.ts:195-201`).
- **O que não existe (V, grep `pis|cofins` em `server/src`: 18 arquivos fora de teste, 3 deles falso-positivo de "piso"):** débito sobre a receita, apuração
  mensal, aproveitamento do crédito contra o débito, guia, EFD-Contribuições. `obrigacoesPorRegime.ts:6-7` deixa a
  EFD-Contribuições **fora** da matriz *"até ter fonte"*.
- **Vida útil:** PIS e Cofins são revogados a partir de **01/01/2027** (LC 214/2025 art. 542; efeito pelo art. 544 III, na
  redação da LC 227/2026 — V-fonte, lido em 29/09 pelo ADR do X7, §3/§15). Restam out–dez/2026 de fato gerador, mais
  retificações e o 1º semestre de 2026 de quem chegar com o ano aberto.
- **Para quem:** Presumido e Real (régua). **O 1º cliente é Simples** e o X8 não o atende (o Simples recolhe no DAS:
  `FiscalProfileDto.ts:66-71`, LC 123 art. 23).
- **Objetivo:** fixar o cálculo, a fonte de cada número, o que persiste e vira lançamento, o que sai para o X9 e se a
  EFD-Contribuições entra — e listar os forks.

## 2. Evidência de código (CBM-001 — confirmada por leitura em `dafe594e`; caminhos sob `server/`)

| Ponto | O que está lá | Arquivo:linha | Grau |
|---|---|---|---|
| Crédito na entrada | `PIS_CREDIT_BP = 165`, `COFINS_CREDIT_BP = 760`; crédito só se `pisCofinsRegime = NAO_CUMULATIVO`; `creditoPisCofins = bp(base,165) + bp(base,760)` **por item, somado** | `src/lib/nfeCost.ts:34-35,121,158` | V |
| Base do crédito | `baseCreditoPisCofinsCents` existe no retorno do cálculo e no preview, **não é persistido** | `nfeCost.ts:193`; `NfePreviewService.ts:86-87` | V |
| O que persiste | `Payable.recoverableTaxLines` (JSON) `{accountId, amountCents, kind: 'ICMS' \| 'PIS_COFINS'}` — **PIS e COFINS somados numa linha** | `prisma/schema.prisma:956`; `PayableDto.ts:80`; `NfeImportService.ts:201` | V |
| Monofásico na entrada | NCM na tabela ⇒ sem crédito qualquer que seja o CST (Lei 10.833 art. 3º § 2º II) | `pisCofinsMonofasicoNcm.ts` (`classifyPisCofinsItem`) | V |
| Regime de PIS/COFINS | `FiscalProfile.pisCofinsRegime ∈ {SIMPLES, CUMULATIVO, NAO_CUMULATIVO}`, **por unidade**; o DTO só amarra o Simples. **`PRESUMIDO` + `NAO_CUMULATIVO` passa** (e credita na NF-e) | `FiscalProfileDto.ts:21,35,66-78`; `schema.prisma:1327` | V |
| Regime da PJ por ano | `CompanyFiscalProfile.regime` (`@@unique([userId, anoCalendario])`), outra fonte do mesmo fato | `schema.prisma:1370-1400` (ADR X7 §2) | V |
| Receita por atividade | contas **exatas** `3.1` serviço / `3.3` revenda + gate de exaustividade (receita fora ⇒ 400); o X7 Fase A item 6 extrai `receitaBrutaPorAtividade` | `SpedEcfGenerationService.ts:20-28,96-121` | V |
| Venda sem NCM | nenhum modelo de venda/receita carrega NCM; NCM só existe na entrada (NF-e) e no imobilizado | grep `ncm` em `src/` (19 arquivos fora de teste, todos de NF-e de compra, custo, C8 ou docs/factory) | V |
| Salão-parceiro | nenhum conceito de cota-parte / profissional-parceiro | grep `parceiro\|cotaParte\|13.352` em `src/`: 0 hit | V |
| Apuração persistida | `TaxAssessment` desenhado no X7 (`tributo String`, "X8/onda 3 alargam sem migração"); **ainda não existe** em código (BRIEF da Fase A, sem "executa") | `ADR-INCR-TAX-ASSESSMENT.md` §6; `BE-INCR-TAX-ASSESSMENT-A-brief.md` §2 | V (doc) |

## 3. Fonte legal (com grau)

**V-fonte** = lido na fonte primária nesta sessão (02/10); como e onde, §15. **V-X7** = verificado na fonte pelo ADR do
X7 (29/09). **I** = inferido.

| Regra | Fonte | Grau |
|---|---|---|
| Presumido (ou arbitrado) ⇒ **regime cumulativo** | IN RFB 2.121/2022 art. 122 (Lei 10.637 art. 8º II; Lei 10.833 art. 10 II) | V-fonte |
| Quem não está nos arts. 122/123/125 ⇒ **não cumulativo** (o Real, em regra) | IN 2.121 art. 145 | V-fonte |
| Mesmo no não cumulativo, as receitas do art. 126 (I–XXIII: ex. hospital/clínica médica, educação, telecom, software…) ficam no cumulativo | IN 2.121 arts. 124, 126, 148 | V-fonte |
| Cumulativo: **0,65% (PIS) e 3% (Cofins)** | IN 2.121 art. 128; Lei 9.718 art. 8º (Cofins 3%) | V-fonte |
| Não cumulativo: **1,65% e 7,6%** | IN 2.121 art. 150; Lei 10.637 art. 2º; Lei 10.833 art. 2º | V-fonte |
| Base cumulativa = **faturamento** = receita bruta (venda de bens, serviços, conta alheia, objeto principal) | IN 2.121 art. 25 II e § 2º; Lei 9.718 art. 3º (DL 1.598 art. 12) | V-fonte |
| Base não cumulativa = **totalidade das receitas** | IN 2.121 art. 25 I e § 1º | V-fonte |
| Exclusões gerais: vendas canceladas; devoluções (cumulativo); descontos incondicionais; reversões; venda de ativo não circulante; ICMS destacado (XII) etc. | IN 2.121 art. 26 I–XIII; Lei 9.718 art. 3º § 2º | V-fonte |
| Receitas financeiras no não cumulativo: alíquotas próprias (art. 789, Decreto 8.426/2015) | IN 2.121 arts. 156, 789 | V-fonte (a regra); fora do raso (D3) |
| **Regime de caixa** do Presumido só se o mesmo critério valer para IRPJ/CSLL | IN 2.121 art. 127 (MP 2.158-35 art. 20) | V-fonte |
| Créditos do não cumulativo: revenda (I), insumo de serviço (II), energia (III), aluguel de prédio/máquina **pago a PJ** (IV), arrendamento (V), depreciação de imobilizado (VI/VII), devolução (VIII), frete na venda (IX), intangível (XI) | Lei 10.833 art. 3º caput (e Lei 10.637 art. 3º) | V-fonte |
| Crédito de I/II no mês da **aquisição**; III–V/IX **incorridos** no mês; VI/VII/XI pelos **encargos de depreciação** do mês | Lei 10.833 art. 3º § 1º I–III | V-fonte |
| Sem crédito: mão de obra de PF; bem não sujeito ao pagamento (alíquota zero/monofásico); ICMS da aquisição | Lei 10.833 art. 3º § 2º I–III | V-fonte |
| Crédito só de PJ domiciliada no País | Lei 10.833 art. 3º § 3º | V-fonte |
| **Crédito não aproveitado no mês passa aos meses seguintes** | Lei 10.833 art. 3º § 4º | V-fonte |
| O crédito não é receita | Lei 10.833 art. 3º § 10 | V-fonte |
| **Alíquota zero na revenda** de perfumaria/higiene/farmacêuticos por quem não é industrial nem importador (o salão que vende shampoo) | Lei 10.147/2000 art. 2º; IN 2.121 arts. 457 e 487 | V-fonte |
| Apuração e pagamento **centralizados na matriz** | IN 2.121 art. 119 (Lei 9.779 art. 15 III) | V-fonte |
| Pagamento **até o dia 25 do mês seguinte** | IN 2.121 art. 114 (Lei 10.637 art. 10; Lei 10.833 art. 11) | V-fonte |
| Retenção sofrida deduz do valor a pagar | IN 2.121 art. 120 | V-fonte |
| **Salão-parceiro:** a cota-parte do profissional-parceiro **não entra na receita bruta** do salão, mesmo com nota unificada; o contrato de parceria é escrito e homologado (§ 8º) | Lei 12.592/2012 art. 1º-A §§ 2º, 3º, 5º e 8º (incl. Lei 13.352/2016) | V-fonte |
| Códigos de débito (6 dígitos, DCTF): **PIS cumulativo 8109/02**, **Cofins cumulativa 2172/01**, **PIS não cumulativo 6912/01**, **Cofins não cumulativa 5856/01** | Receita, "DCTF — Tabelas de códigos/extensões", PIS/Pasep (atualizada 27/02/2024) e Cofins (27/07/2023) | V-fonte (atenção: o PIS cumulativo é **/02**, não /01). **Confirmado no MIT** pelo `ADR-INCR-DCTFWEB-MIT` §3 (Manual do MIT §10.1: PIS `8109-02`/`6912-01`, Cofins `2172-01`/`5856-01`) — V-fonte, lido pela sessão do X9 |
| DCTFWeb: PIS e Cofins entram pelo **MIT** (arts. 8º–9º); prazo no último dia útil do mês seguinte (art. 6º) | IN RFB 2.237/2024 | V-X7 (relido 02/10 no BRIEF X7-A) |
| EFD-Contribuições: **mensal**, gerada **centralizada na matriz**, até o **10º dia útil do 2º mês subsequente**; obrigatória no Real desde 2012 e no Presumido desde 2013; Simples dispensado; o código do M205/M605 é o de 6 dígitos da DCTF | Guia Prático da EFD-Contribuições v1.35 (jun/2021), Seção 3 e Registros M205/M605, citando a IN RFB 1.252/2012 | V-fonte (o Guia; a IN 1.252 **não** foi aberta) |
| EFD do Presumido por competência pode consolidar a receita por CST no **F550** (sem documento a documento) | Guia v1.35, Registro F550 | V-fonte |
| PIS/Cofins revogados a partir de 01/01/2027 | LC 214/2025 art. 542; art. 544 III (red. LC 227/2026) | V-X7 |

## 4. Decisões fixadas (sem fork: a lei, um precedente ratificado ou o critério de reuso já decide)

**D1 — Período mensal; PIS e Cofins sempre juntos.** Período `M01..M12` do ano-calendário (pagamento mensal, IN 2.121
art. 114). Cada apuração grava duas linhas (PIS, COFINS), como o X7 grava IRPJ e CSLL.

**D2 — O regime da PJ decide a modalidade.** `PRESUMIDO` ⇒ `CUMULATIVO` (art. 122); `REAL` ⇒ `NAO_CUMULATIVO`
(art. 145). `SIMPLES`/`MEI` ⇒ 400 (*"recolhido no DAS"*). As receitas do art. 126 sob o Real (cumulativas mesmo no Real)
ficam **fora** (400 se o operador declarar uma) — nenhum cliente-alvo tem essas receitas (I); a clínica do P2 só
entraria se for "clínica médica" do art. 126 IX a, e isso é pergunta do contador (P-5). **Qual campo** carrega o regime
é o F-X8-3.

**D3 — A base vem do razão e reusa a segregação do X7** (`receitaBrutaPorAtividade`, X7-A item 6) com o **mesmo** gate
de exaustividade: receita fora de `3.1`/`3.3` ⇒ 400. Consequência declarada: **receitas financeiras não entram** (no
Presumido não são faturamento, art. 25 II; no Real teriam a alíquota do art. 789 — fora do raso, P-2). As exclusões do
art. 26 entram **só como já refletidas no razão** (cancelamento/devolução estornados na própria conta de receita) — I,
P-2.

**D4 — Crédito: mês de aquisição, saldo credor transportado.** O crédito de revenda/insumo é o do mês da aquisição (Lei
10.833 art. 3º § 1º I), lido das NF-e importadas no mês (fonte e separação PIS × Cofins: F-X8-7). Crédito > débito ⇒
a pagar 0 e **saldo credor** que entra na apuração do mês seguinte (§ 4º), por tributo. Ressarcimento e compensação
(PER/DCOMP) ficam fora.

**D5 — Centralização na matriz** (IN 2.121 art. 119) + precedente **F-X7-7 → (a)**: grava na chave da PJ, lê o razão de
**uma** unidade e responde 400 se outra unidade da PJ tiver movimento no mês.

**D6 — Sem regime de caixa.** A IN 2.121 art. 127 exige o mesmo critério do IRPJ/CSLL, e a Fase A do X7 recusa caixa
(X7-A item 8). `CompanyFiscalProfile.ecfIndRecReceita = '1'` ⇒ 400.

**D7 — Retenções sofridas** (art. 120): o operador informa, com documento opcional — precedente **F-X7-11 → (a)**.

**D8 — Arredondamento:** half-up por linha da memória — precedente **F-TA-2 → (a)**.

**D9 — Parâmetros como dado versionado** (precedente D3 do X7): alíquotas (65/300/165/760 bp) e códigos de receita com
`fonte` e `vigenteDesde`, e **`vigenteAte = 2026-12-31`**. Período a partir de `2027-01` ⇒ 400 *"PIS/Cofins revogados
(LC 214 art. 542) — CBS é da onda 3"*.

**D10 — Códigos de receita** da tabela DCTF (§3): `810902`, `217201`, `691201`, `585601`, gravados na apuração (como o
`codigoReceita` do X7-A). O X9 os consome no contrato C1.

**D11 — Monofásico na entrada já está resolvido** (X6/ITEM-DESTINATION): o X8 lê o crédito que a importação calculou e
não reclassifica item. A **saída** com alíquota zero (Lei 10.147 art. 2º) é o F-X8-5.

**D12 — Onde o número aparece:** (i) **DCTFWeb**, pelo MIT, via X9 (contrato C1 alargado com PIS/Cofins — o F-X7-8 já
previa *"consome o contrato C1 e os valores do X8"*); (ii) **EFD-Contribuições**, escrituração própria com PVA próprio —
se o sistema a gera é o F-X8-1; (iii) **o razão** (provisão, F-X8-4), que alimenta DRE/ECD.

## 5. Esqueleto de comportamentos (o BRIEF herda; isto não é o BRIEF)

| # | Comportamento | Fork |
|---|---|---|
| P1 | Perfil/regime: derivação do D2 e coerência com `FiscalProfile.pisCofinsRegime` | F-X8-3 |
| P2 | Tabela de parâmetros (alíquotas, códigos, `vigenteAte`) | — (D9, D10) |
| P3 | Persistência da apuração mensal | F-X8-2 |
| P4 | Débito: receita do mês (D3) − ajustes informados × alíquota | F-X8-5, F-X8-6 |
| P5 | Créditos da NF-e do mês, separados PIS × Cofins | F-X8-7 |
| P6 | Outros créditos do art. 3º | F-X8-8 |
| P7 | Saldo credor transportado (D4) e retenções (D7) | — |
| P8 | Prévia → confirmação → substituição (molde X7) | F-X8-2 |
| P9 | Provisão contábil | F-X8-4 |
| P10 | Leitura + contrato C1 para o X9 | — (D10, D12) |
| P11 | EFD-Contribuições | F-X8-1 |
| P12 | Gates do diff: snapshot de DTO, allowlist do `auditCanonical.ts`, openapi path-count, rota em 2 toques, `atomicUntil` se F-X8-4 → (a) | — |

## 6. Contratos esboçados (forma materializável; o BRIEF fecha)

```ts
// Entrada da prévia/confirmação (Zod .strict(); centavos como string de dígitos)
const Cents = z.string().regex(/^\d+$/);
export const PisCofinsPreviewSchema = z.object({
  unitId: z.string().min(1),
  anoCalendario: z.number().int().min(2025).max(2026),            // D9: 2027+ ⇒ revogado
  periodo: z.enum(['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12']),
  ajustesBase: z.array(z.object({                                // F-X8-5 / F-X8-6 (se a)
    tipo: z.enum(['ALIQUOTA_ZERO_REVENDA', 'COTA_PARTE_PARCEIRO']),
    valorCents: Cents,
    documento: z.string().max(120).optional(),
  }).strict()).max(50).default([]),
  outrosCreditos: z.array(z.object({                             // F-X8-8 (se a); só NAO_CUMULATIVO
    inciso: z.enum(['III_ENERGIA', 'IV_ALUGUEL_PJ', 'V_ARRENDAMENTO', 'VI_VII_DEPRECIACAO', 'IX_FRETE_VENDA']),
    baseCents: Cents,
    documento: z.string().max(120).optional(),
  }).strict()).max(50).default([]),
  retencoes: z.array(z.object({ tributo: z.enum(['PIS','COFINS']), valorCents: Cents, documento: z.string().max(120).optional() }).strict()).max(50).default([]), // D7
}).strict();
// Confirmação = Preview + expectedAPagarCents {PIS, COFINS} (CAS, 409) + supersedesIds? — molde X7 §6.
```

```prisma
// F-X8-2 (a): reuso do TaxAssessment do X7 — nenhum model novo. Valores novos nas colunas String:
//   tributo  PIS | COFINS          forma  MENSAL          periodo  M01..M12
//   modo     PIS_COFINS_CUMULATIVO | PIS_COFINS_NAO_CUMULATIVO
//   codigoReceita 810902 | 217201 | 691201 | 585601
//   saldoNegativoCents ⇒ aqui = saldo credor a transportar (D4)
```

## 7. Fronteira com os vizinhos

| Vizinho | Relação |
|---|---|
| **X7** (IRPJ/CSLL) | Fornece `TaxAssessment`, `receitaBrutaPorAtividade`, o fluxo prévia/confirmação/provisão e os precedentes F-X7-7/11, F-TA-2. **O X8 só começa depois do PR-1 do X7** (model) — se F-X8-2 → (a) |
| **X6 / ITEM-DESTINATION** | Fonte do crédito da NF-e; F-X8-7 decide se a importação passa a gravar PIS e Cofins separados |
| **C8** (imobilizado) | Encargo de depreciação do mês é crédito VI/VII (F-X8-8) |
| **X9** (DCTFWeb + MIT) | Consome a apuração confirmada (C1 alargado: PIS/Cofins com os códigos do D10). Adaptador = F-X7-9 (b), herdado |
| **X10/X10a** (emissão) | Documento emitido com NCM por item seria a fonte da alíquota zero na saída (F-X8-5 c) — só quando a emissão existir |
| **PRE-ADR IBS/CBS 2027** (onda 3) | Sucessor; não se decide aqui |

## 8. FORKS — RATIFICADOS (02/10, [D-2026-10-02-X8-PIS-COFINS-FORKS](../plano/decisoes/D-2026-10-02-X8-PIS-COFINS-FORKS.md))

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-X8-1** Escopo diante da revogação em 01/01/2027 | **(a)** apuração mensal persistida + provisão + saída para o X9; **sem** gerador de EFD-Contribuições (o contador escritura no software dele a partir da memória de cálculo) · (b) (a) + gerador de EFD-Contribuições (Presumido: 0000/0110/F550/M200-M610/9999; Real: C170 por nota + F100/F120/F130 + M) com PVA próprio · (c) não construir: X8 fecha como diferido por perda de objeto | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O número tem valor além da guia: a DRE e a ECD de 2026 de qualquer cliente Presumido/Real que entrar precisam da provisão (F-Z0), e o X9 precisa do valor para o MIT. O gerador de EFD é a parte mais cara (um arquivo por mês, PVA próprio = **mais um gate humano**, com o Bloco A já em 4/4 oráculos abertos) para ~3 meses de fato gerador e **zero** cliente hoje. (c) deixa a DRE de 2026 sem PIS/Cofins | alto em (b): custo sem uso; médio em (c) |
| **F-X8-2** Onde a apuração persiste | **(a)** reusa o `TaxAssessment` do X7 (`tributo` = PIS/COFINS, `forma` = MENSAL) · (b) model próprio `PisCofinsAssessment` | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** Mesmo objeto de domínio (apuração de tributo federal confirmada, imutável, com substituição, memória, provisão por bridge) — critério de reuso etapa 1. A etapa 2 ("vivo dos dois lados") ainda não vale, porque o model não existe: o X8 fica **sequenciado depois do PR-1 do X7** | baixo |
| **F-X8-3** Qual campo carrega o regime de PIS/Cofins | **(a)** o `CompanyFiscalProfile.regime` do ano decide (D2); `FiscalProfile.pisCofinsRegime` da unidade passa a ser **conferido**: divergente ⇒ 400 na prévia, e o DTO do `FiscalProfile` passa a recusar `PRESUMIDO + NAO_CUMULATIVO` (hoje aceito, e credita na NF-e — ilegal pelo art. 122) · (b) o campo da unidade decide · (c) só aviso | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O regime é da PJ por ano (R8, X13); duas fontes livres divergem em silêncio, e o caso `PRESUMIDO + NAO_CUMULATIVO` já gera crédito indevido na entrada hoje (V, §2). Mexe no DTO do X6 (blast pequeno: 1 refine) | alto em (b)/(c): crédito indevido |
| **F-X8-4** Provisão contábil | **(a)** a confirmação gera o lançamento por bridge (molde F-X7-4): D PIS/Cofins sobre receita (dedução) / C a recolher, e no não cumulativo baixa o crédito aproveitado (C "PIS/COFINS a recuperar"); 2 commits + reconcile idempotente; contas novas no `FiscalProfile` · (b) o contador provisiona à mão | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** Coerência com F-X7-4 e F-Z0 (o Luminaris é a escrituração). As contas vêm do contador (P-1) | médio: duplica provisão de quem lança à mão |
| **F-X8-5** Receita de revenda com **alíquota zero** (salão que revende shampoo, Lei 10.147 art. 2º) | **(a)** o operador informa no mês o valor da receita com alíquota zero (`ajustesBase`, com documento); sem informar ⇒ tributa tudo · (b) conta de receita própria (ex. `3.3.x`) classificada como alíquota zero — exige mexer no mapa `3.1/3.3` da ECF · (c) derivar dos itens das notas emitidas (NCM) — só quando a emissão (X10) existir · (d) não tratar: tributa toda revenda | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** A venda não carrega NCM hoje (V, §2); (b) alarga o blast para a ECF; (c) depende de nó que não existe. (a) paga a mais por padrão e nunca a menos | baixo: sobrepreço recuperável |
| **F-X8-6** **Salão-parceiro** (cota-parte do profissional fora da receita bruta, Lei 12.592 art. 1º-A § 5º) | **(a)** o operador informa a cota-parte do mês como ajuste da base (`COTA_PARTE_PARCEIRO`, documento = contrato) · (b) corrigir na origem: a venda lança a cota-parte do profissional como passivo (repasse), não receita — frente nova (achado §11), e o X8 só lê o razão · (c) não tratar (base superestimada) | ✅ **RATIFICADO (a) — dono, 02/10.** **(a)** agora, com **(b) registrado como achado**. A lei é clara e o salão é o vertical-âncora; (b) é o certo contabilmente, mas é frente nova (ORCH-006) e afeta X7 e Simples também. Risco de (a)+(b) juntos: exclusão em dobro — o BRIEF põe uma guarda | médio em (c): paga a mais em todo mês de todo salão-parceiro |
| **F-X8-7** Crédito da NF-e: separar PIS × Cofins | **(a)** a importação passa a gravar `baseCents`, `pisCents` e `cofinsCents` na linha `PIS_COFINS` do `recoverableTaxLines` (JSON, sem migração); notas anteriores sem o detalhe ⇒ divisão proporcional 165:760 com resíduo na Cofins, marcada `DERIVADO` na memória · (b) sempre a divisão proporcional · (c) o operador informa o crédito do mês | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O soma-depois-separa perde até 1 centavo por item e a EFD/DCTFWeb pedem os dois exatos; gravar o que o cálculo já tem custa 3 campos no JSON. (b) é o fallback das notas antigas só | baixo |
| **F-X8-8** Outros créditos do art. 3º (energia, aluguel PJ, arrendamento, depreciação, frete) | **(a)** o operador informa por linha (inciso, base, documento) na apuração · (b) derivar do AP por conta de despesa mapeada + encargos do C8 · (c) só os créditos da NF-e | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** "Raso" (cédula E.3): (b) pede mapa conta→inciso e regra de "pago a PJ" (§ 3º) para 3 meses de uso; (c) paga a mais. O crédito de aluguel/energia é o P8 do salão | baixo |

## 9. Pendente de validação externa (nada disso entra no checklist como decidido)

1. **Contas** da provisão (despesa PIS/Cofins, PIS/Cofins a recolher) e o referencial — contador (F-X8-4).
2. **Exclusões e receitas financeiras:** se o razão do cliente estorna cancelamento/devolução na própria conta de receita
   (D3) e se há receita financeira relevante no Real (art. 789) — contador.
3. ~~Código no MIT~~ — **resolvido** em 03/10: o `ADR-INCR-DCTFWEB-MIT` §3 leu os 4 códigos na tabela do Manual do MIT §10.1.
4. **Oráculo do número:** a 1ª apuração real conferida pelo contador e, se F-X8-1 → (b), pelo PVA da EFD-Contribuições.
   Gate humano (RUNBOOK-FORMAT): o agente prepara em branco; não preenche, não marca desfecho, não assina.
5. **Art. 126 sob o Real:** se a clínica do P2 é "clínica médica" (art. 126 IX a) — contador.
6. **Salão-parceiro:** o contrato homologado (Lei 12.592 art. 1º-A § 8º) é condição da exclusão; quem confere é o contador.

## 10. Insumos ausentes

1. **IN RFB 1.252/2012** não foi aberta; a obrigatoriedade e o prazo da EFD vêm do Guia v1.35 que a transcreve (§3). Só
   importa se F-X8-1 → (b).
2. **Leiaute completo da EFD** (blocos C/F/M para o Real) — só se F-X8-1 → (b).

## 11. Achados fora de escopo (registrados, não planejados)

1. **Salão-parceiro na origem** (F-X8-6 b): a cota-parte do profissional é receita de terceiro. Afeta também a base do
   **X7 Presumido** e o **Simples** (onda 3). Frente nova, exige autorização.
2. **Pneus e câmaras (TIPI 40.11/40.13)** têm alíquota zero na revenda (IN 2.121 art. 444; Lei 10.485 art. 5º p.ú.) e
   **não estão** em `pisCofinsMonofasicoNcm.ts` (grep `4011`/`4013`: 0 hit). Fora do vertical; registro para o X6.
3. **CBS/IBS de 2026 (ano-teste)** não são tratados aqui.

## 12. Riscos e vieses (T8)

- **Risco — valor de uso ~zero hoje.** Nenhum cliente Presumido/Real; ~3 meses de fato gerador. O F-X8-1 existe por isso.
- **Risco — sem oráculo interno.** Teste verde prova a aritmética contra a tabela, não contra a lei (P-4).
- **Risco — base superestimada por padrão** (F-X8-5/6/8 em (a) dependem do operador informar). Escolha consciente:
  paga a mais, nunca a menos.
- **Viés 1 (completude):** a memória "o dono quer completude" empurra para (b) no F-X8-1. O contrapeso é a revogação
  com data e o gate humano novo; recomendei (a) contra esse viés.
- **Viés 2 (reuso do X7):** acoplar o X8 ao X7 (F-X8-2 a) é barato só se o X7 sair; se o X7 parar, o X8 para junto.
- **Caso adversarial tentado contra "o X8 não precisa de EFD":** a EFD é obrigatória para Presumido/Real (Guia §3) — sem
  ela o cliente fica irregular. Resposta: a obrigação existe, mas **quem** a gera (sistema × contador) é escolha; o
  contador já gera EFD hoje para esses regimes. A tese se sustenta para 2026, não como regra geral.

## 13. Invariantes que a implementação DEVE provar (o BRIEF herda)

1. `SIMPLES`/`MEI` ⇒ 400; período ≥ 2027-01 ⇒ 400 (D9).
2. `PRESUMIDO` aplica 65/300 bp sobre o faturamento; `REAL` aplica 165/760 bp e desconta créditos.
3. Crédito > débito ⇒ a pagar 0 e saldo credor por tributo, lido pela apuração do mês seguinte.
4. Um só `CONFIRMED` por (PJ, ano, tributo, período), gate dentro da tx; CAS divergente ⇒ 409 (molde X7).
5. Σ crédito PIS + Σ crédito Cofins do mês = Σ das linhas `PIS_COFINS` das NF-e do mês (F-X8-7).
6. Outra unidade com movimento ⇒ 400 (D5).
7. Payload de auditoria só com ids e centavos como string (allowlist na mesma mudança).

## 14. Sinal humano — estado do gate

- **F-X8-1..8:** ✅ 02/10, questionário em 2 lotes de 4; todos (a). Cédulas com a resposta literal em
  [`D-2026-10-02-X8-PIS-COFINS-FORKS`](../plano/decisoes/D-2026-10-02-X8-PIS-COFINS-FORKS.md).
- **F-X8-1 → (a)** tira a EFD-Contribuições do X8: o nó passa a ser "apuração PIS/Cofins"; o gerador da EFD fica
  **diferido** (não rejeitado) e volta só com autorização nova. O §10 deixa de importar.
- **Planejamento autorizado (02/10)** → [`BE-INCR-PIS-COFINS-brief.md`](../accounting/BE-INCR-PIS-COFINS-brief.md).
- **`Accepted` em 02/10.**
- **Efeito do BRIEF (02/10, F-PCB-1 → b, divergente):** a provisão do F-X8-4 debita conta de **despesa** (`Expense`),
  não de dedução da receita (`3.2`) — o "(dedução)" do texto do F-X8-4 vale como descrição, não como natureza de conta.
  Motivo: a dedução em `3.2` cairia no gate de exaustividade da ECF Presumido. Os demais F-PCB → (a).

## 15. Verificação na fonte primária (02/10)

Baixado para o scratchpad da sessão (não para o repo nem o corpus):

| Documento | Origem | Bytes | sha256 (12) | Observação |
|---|---|---|---|---|
| Lei 9.718/1998 | planalto.gov.br `leis/l9718.htm` | 196.422 | `782361bcbdc0` | texto sem `<strike>` nem `line-through` |
| Lei 10.637/2002 | planalto `leis/2002/l10637.htm` | 238.160 | `b4c1c523d8f0` | MANIFEST tem `811b878b1ade` (mesmo tamanho; a página do Planalto varia) |
| Lei 10.833/2003 | planalto `leis/2003/l10.833.htm` | 533.449 | `d8f3c2c0e0b3` | MANIFEST: 531.890 / `f89ed8a3ea62` — página mudou desde 15/09 |
| Lei 10.147/2000 | planalto `leis/l10147.htm` | 35.624 | `40d2322f4264` | |
| Lei 12.592/2012 | planalto `_ato2011-2014/2012/lei/l12592.htm` | 21.926 | `c9c4bad7c715` | fora do MANIFEST |
| IN RFB 2.121/2022 (multivigente) | API do Sijut, ato `127905` | 3.530.588 | `ba02b35c395f` | só segmentos `compilado` e não `tachado`; fora do MANIFEST |
| Guia Prático EFD-Contribuições v1.35 | `sped.rfb.gov.br/arquivo/download/5836` | 4.105.830 | `60eace459169` | **igual** ao MANIFEST |
| Tabelas DCTF PIS/Pasep e Cofins | páginas da Receita (gov.br), via WebFetch | — | — | atualizadas em 27/02/2024 e 27/07/2023 |
