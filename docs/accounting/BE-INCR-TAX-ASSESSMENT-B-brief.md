# BRIEF — BE-INCR-TAX-ASSESSMENT Fase B (Lucro Real anual: estimativa mensal + balancete de suspensão/redução + ajuste anual) — nó X7

> Produzido em `sessao-planejamento` em 02/10/2026, sobre `origin/main` `dafe594e`. Herda o esqueleto da §5
> (Fase B, itens B1–B9) do [`ADR-INCR-TAX-ASSESSMENT`](../adr/ADR-INCR-TAX-ASSESSMENT.md) (**Accepted** 02/10) e
> **reusa** o contrato e os modelos do [`BRIEF da Fase A`](BE-INCR-TAX-ASSESSMENT-A-brief.md). Neste documento,
> "A-n" é o item n daquele BRIEF. Nenhuma rota, model ou função da Fase A é redesenhada aqui; só os deltas são
> listados.
> **Este documento NÃO escreve código.** Os forks **F-TB-1..7 foram ✅ RATIFICADOS em 02/10** por questionário,
> 6 na recomendação e **F-TB-5 → (b) divergente** (o 16% do prestador exclusivo é modelado; itens 3b e 9). Registro:
> [`D-2026-10-02-X7-FASE-B-FORKS`](../plano/decisoes/D-2026-10-02-X7-FASE-B-FORKS.md). Nenhum item vira código sem
> "executa" do dono (ORCH-006).
> **Emenda 03/10 (fatiamento):** o **F-TB-8 → (a)** substitui as fronteiras do F-TB-7. São **4 PRs seriais**, e o
> `ANUAL` só fica selecionável no último (§3.1;
> [`D-2026-10-03-X7-FASE-B-FATIAMENTO`](../plano/decisoes/D-2026-10-03-X7-FASE-B-FATIAMENTO.md)).
>
> **Alcance e risco, ditos antes de tudo:**
> - A Fase B depende da Fase A **inteira mergeada** (A-PR-1..3), e a Fase A ainda **não tem código**: `formaApuracao`
>   e `TaxAssessment` não existem em `server/` (grep V em `dafe594e`).
> - O 1º cliente é **Simples**, e para ele esta fase vale **zero** (D12).
> - O número que esta fase produz só tem oráculo quando o **X5 (Real anual)** conciliar mês a mês X7 × PVA (N620/N660
>   são fórmula do PVA, F-X7-2 → a). Até lá, um teste verde prova a aritmética contra a tabela, não contra a lei.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó [`X7`](../plano/nos/X7.md), ADR §5, "Fase B — Lucro Real anual por estimativa + balancete
  de suspensão/redução", itens B1–B9.
- **Autorização:** dono, chat, 02/10/2026: *"Autorizo planejar o BRIEF da Fase B do X7 — estimativa mensal com
  balancete de suspensão/redução (dono, 02/10) — sem 'executa'"*. O mesmo pedido traz as instruções: reusar o
  contrato e os modelos da Fase A, sem duplicar; opção irretratável por ano (F-X7-1 a); fonte primária vigente
  (*"Lei 9.430/96 arts. 2º e 35, IN RFB 1.700/2017"*), com a seção citada; forks por AskUserQuestion, em lotes de
  até 4, registrados em `docs/plano/decisoes/`.
  - **Cobre exatamente:** este BRIEF (Fase B) e a ratificação dos forks dele (F-TB-1..7).
  - **Não cobre:** código; a Fase C (X9/MIT, ISS, memória no pacote do contador); editar o ADR.
  - **Divergência do passo 1, na fonte e não no escopo:** o **art. 35 da Lei 9.430/96** trata de *"Retenção de Livros e
    Documentos"* (lido no Planalto em 02/10). O artigo do balancete é o **art. 35 da Lei 8.981/95**, ao qual o
    art. 2º caput da Lei 9.430 remete (*"observado o disposto … nos arts. 30, 32, 34 e 35 da Lei nº 8.981"*). Respondi
    ao objetivo, que é a regra do balancete. O BRIEF cita o art. 35 da Lei 8.981, e a tabela de fontes registra a
    troca.
- **Fatos consumados que o BRIEF respeita** (lidos em `dafe594e`, grau V; caminhos relativos a `server/`):
  - **e-Lalur trimestral:**
    - a constante é `LALUR_QUARTERS = ['T01'..'T04']` e a janela vem de `quarterBounds` (`src/features/accounting/models/Lalur.model.ts:21-34`);
    - os DTOs usam `z.enum(LALUR_QUARTERS)` (`dtos/LalurDto.ts:97,221,342,380,403`);
    - o banco guarda `quarter String` (ADR §2);
    - `LALUR_LIVROS = ['lalur','lacs','n500','n630','n670']` (`Lalur.model.ts:12`).
  - **Parte B:**
    - o fechamento é sequencial por trimestre, com continuidade T04/N → T01/N+1 (`LalurService.ts:825-850`);
    - `chainYear` e `recomputeYear` iteram `LALUR_QUARTERS` (`lalurParteBBalances.ts:115`; `LalurService.ts:781`).
  - **Teto da compensação pela Parte B:** `assertCompensacaoCabe` faz `rec.get(quarter)?.get(parteBId)` e só recusa
    `if (b && b.sdFim < 0n)` (`LalurService.ts:282-290`). **Com `quarter = 'A03'`, `b` é `undefined` e a checagem
    passa em silêncio** (o map só tem chave T0x). Não é bug vivo, porque o DTO hoje recusa `A03`; vira bug no dia em
    que o enum alargar. É o item 12.
  - **M312:** a janela do vínculo com o lançamento vem de `quarterWindows(year).find(...)` (`LalurService.ts:265`).
  - **ECF Real:**
    - `formaApur: z.enum(['T'])` (`dtos/SpedEcfRealDto.ts:46`);
    - `EcfRealPeriod.perApur: 'T01'..'T04'` (`lib/ecfReal.ts:71-77`);
    - `MES_BAL_RED` sempre vazio (`lib/ecf.ts:179`);
    - a geração exige os 4 fechamentos trimestrais (`SpedEcfRealGenerationService.ts:192-203`);
    - o Bloco L sai **sem L100/L300** (Fork 6 → b: o PVA recupera da ECD) (`lib/ecfReal.ts:39-40`);
    - o Bloco N leva só as linhas `E` (`lib/ecfReal.ts:49-51`).
  - **Fixture das Tabelas Dinâmicas:** `ecf-l12-linhas.json` tem as abas `M300A, M350A, N500, N630A, N670`, **sem
    N620/N660**, e foi gerado de `366b8d9030a0` (o ADR leu a planilha mais nova, `2a4c9688df7a`). A lista vem de
    `scripts/ecf-tabelas-dinamicas-to-catalog.mjs:30`.
  - **Períodos contábeis:**
    - `AccountingPeriod` é mensal, por unidade, `FUTURE|OPEN|SOFT_CLOSED|HARD_CLOSED` (`prisma/schema.prisma:346-372`);
    - o `postEntry` só lança em período `OPEN` (`PostingService.ts:120,137`);
    - a regra "mês não semeado conta como aberto" já existe em `monthsCovered` (`models/AccountingDelivery.model.ts:129-137`).
- **Nós vizinhos:**
  - **consome:** a Fase A (A-4..A-19), o [`X13`](../plano/nos/X13.md) (perfil da PJ por ano), o e-Lalur e o razão;
  - **é consumido por:** o gerador da ECF Real (itens 19–24), o [`X9`](../plano/nos/X9.md) (contrato C1, Fase C:
    `BalancoLucroReal` por mês) e o runbook X5 (conciliação, F-X7-2 → a).

## Fontes legais desta fase (primária e vigente; seção citada)

**V-fonte (02/10)** = relido hoje na fonte primária, com o hash do arquivo baixado: Planalto pelo `curl`, com os
trechos tachados (`<strike>`) removidos; Sijut pela API `…/ato/81268/visao/multivigente`, sem os segmentos
`tachado`. **V-fonte (29/09)** = conferido na sessão do ADR (ADR §15). **I** = inferido.

| Regra | Fonte | Grau |
|---|---|---|
| A PJ do Real pode pagar mensalmente sobre base estimada = percentuais do art. 15 da Lei 9.249 × receita bruta do mês, deduzidas devoluções, vendas canceladas e descontos incondicionais, *"observado o disposto … nos arts. 30, 32, 34 e 35 da Lei nº 8.981"* | Lei 9.430/96 art. 2º caput (redação da Lei 12.973/2014) | V-fonte (02/10), `l9430.htm` sha `c6d777f3f5a4` |
| 15% sobre a base (§ 1º); adicional de 10% sobre a parcela **mensal** acima de R$ 20.000 (§ 2º); apuração do lucro real em 31/12 (§ 3º); deduções do saldo: incentivos (I–II), **IR pago ou retido na fonte** sobre receitas computadas (III), **"imposto de renda pago na forma deste artigo"** (IV) | Lei 9.430 art. 2º §§ 1º–4º | V-fonte (02/10) |
| Opção irretratável no ano, manifestada pelo pagamento de janeiro ou do mês de início de atividade | Lei 9.430 art. 3º e parágrafo único | V-fonte (02/10) |
| Estimativa vence no último dia útil do mês seguinte; saldo anual positivo em quota única até o último dia útil de março, com Selic desde 1º/fev; saldo negativo → restituição/compensação (art. 74); a estimativa de dezembro vence em janeiro | Lei 9.430 art. 6º caput e §§ 1º–3º | V-fonte (02/10) |
| **Art. 35 da Lei 9.430 = "Retenção de Livros e Documentos"** (fiscalização). Não é a regra do balancete | Lei 9.430 art. 35 | V-fonte (02/10) |
| Suspensão/redução por balanço ou balancete mensal, *"desde que demonstre … que o valor acumulado **já pago** excede o valor do imposto, inclusive adicional, calculado com base no lucro real do período em curso"*; balancete levantado pelas leis comerciais e fiscais e **transcrito no Diário** (§ 1º a), com efeito só no ano (§ 1º b); prejuízo desde janeiro dispensa o pagamento (§ 2º); janeiro por balancete (§ 3º) | Lei 8.981/95 art. 35 caput e §§ 1º–3º | V-fonte (02/10), `l8981.htm` sha `afa458feed81` |
| Ganhos de capital e demais receitas somam-se à base estimada | Lei 8.981 art. 32; IN 1.700 art. 39 | V-fonte (02/10) |
| Período anual para o Real por estimativa; apuração em 31/12; o período abrange 01/01 (ou o início de atividade) até 31/12; a periodicidade do IRPJ determina a da CSLL | IN 1.700 art. 31 §§ 3º, 4º, 6º e 7º | V-fonte (02/10), `in1700.json` sha `807fbfa7ca2b` |
| Base mensal do IRPJ = percentual × receita bruta do art. 26 (art. 33 caput, § 1º IV j = 32% serviço em geral; caput = 8% revenda); CSLL = 12% / 32% (art. 34 caput e § 1º I); atividades diversificadas, percentual de cada uma (art. 38) | IN 1.700 arts. 33, 34 e 38 | V-fonte (02/10) |
| **16%** para PJ **exclusivamente** prestadora de serviços em geral (alíneas b, c, d, f, g e j do § 1º IV) com receita bruta anual ≤ R$ 120.000 (§ 7º); se a receita acumulada passar do limite, **diferença do imposto postergado** apurada em relação a cada mês transcorrido (§ 8º), paga até o último dia útil do mês seguinte ao do excesso (§ 9º), sem acréscimos no prazo (§ 10) | IN 1.700 art. 33 §§ 7º–10 | V-fonte (02/10) |
| *"A base de cálculo mensal … das pessoas jurídicas prestadoras de serviços em geral, cuja receita bruta anual seja de até R$ 120.000,00, **será** determinada mediante a aplicação do percentual de 16%"*; o parágrafo único exclui serviços hospitalares, de transporte e de profissões legalmente regulamentadas | Lei 9.250/95 art. 40 | V-fonte (02/10), `l9250.htm` sha `6a9f89cf6113` |
| IRPJ devido no mês = alíquotas do art. 29 × base (art. 42); dedução do IR pago ou retido sobre receitas da base (art. 44); CSLL devida = alíquota × base (art. 45), menos a CSLL retida (art. 46) | IN 1.700 arts. 42, 44–46 | V-fonte (02/10) |
| Suspensão/redução: devido no período em curso × **soma do devido por estimativa** nos meses anteriores (art. 47 I–IV); CSLL no mesmo modo do IRPJ (§ 1º); o pago a maior no balancete **não reduz** meses seguintes por receita bruta (§ 2º); novo balancete a cada mês (§ 3º); deduções: estimativas **devidas** anteriores (§ 5º I / § 6º I), retido no mês (II) e retido em meses anteriores ainda não deduzido (III); estimativa anterior não paga, com acréscimos (§ 7º) | IN 1.700 art. 47 | V-fonte (02/10) |
| Janeiro por balancete; prejuízo no mês dispensa o pagamento | IN 1.700 art. 48 | V-fonte (02/10) |
| Período em curso = 01/01 (ou o início de atividade) → último dia do mês (art. 49 I); IRPJ devido = alíquota × lucro real **acrescido do adicional** (II); lucro ajustado por adições, exclusões e compensações (§ 1º) | IN 1.700 art. 49 | V-fonte (02/10) |
| Cada balancete recalcula do zero (art. 50 I); ajustes **só na Parte A**, *"não cabendo nenhum registro na Parte B"* (II) | IN 1.700 art. 50 | V-fonte (02/10) |
| Diário/Lalur não escriturado até a data do pagamento ⇒ balancete desconsiderado e multa de ofício sobre o valor reduzido | IN 1.700 art. 52 §§ 2º e 4º | V-fonte (02/10) |
| Irretratável no ano; a estimativa é manifestada pelo pagamento de janeiro ou pelo balancete de suspensão; no início de atividade, vale o 1º mês | IN 1.700 art. 54 caput, §§ 1º–2º | V-fonte (02/10) |
| Adicional = 10% sobre o que exceder R$ 20.000 × meses do período | IN 1.700 art. 29 § 1º | V-fonte (02/10) |
| Compensação ≤ 30% do lucro ajustado, para IRPJ e CSLL | IN 1.700 art. 64 e parágrafo único | V-fonte (02/10) |
| A ECD supre a transcrição do balancete no Diário | IN RFB 2.003/2021 art. 9º III | V-corpus + V-fonte (29/09), ADR §3 |
| Códigos de receita: estimativa IRPJ **2362/01** (obrigada) ou **5993/01** (optante); CSLL **2484/01**; ajuste anual IRPJ **2430/01** / **2456/01**, CSLL **6773/01**; diferença postergada do 16% **2362/02** / **5993/02** | Receita, "DCTF — Tabelas de códigos" IRPJ e CSLL (12/03/2024) | V-fonte (29/09), ADR §3 |
| ECF: `0010.FORMA_APUR` `[T;A]`; `MES_BAL_RED` com 12 posições `[0;E;B]`; com `FORMA_APUR = "A"`, **L030 e M030** = `A00` + um `A0m` por mês marcado `B` (pp. 222 e 242); **N030** = `A00` + um por mês marcado `B` **ou `E`** (p. 278); N620/N660 só em `A01..A12`, N630/N670 em `A00`/`T0x` (pp. 47–48) | Manual da ECF L12, versão do MANIFEST ("Atualização: maio/2026", sha `7216ec2bd62d`, baixado em 02/10) | V-fonte (02/10). O ADR leu a versão de jul/2026 (`f583475c109b`); as páginas podem diferir em ±1 |

## Definição de pronto

Este documento traz seis seções, mesmo as vazias:

1. checklist numerado e testável (§1);
2. contratos em forma materializável, só os deltas sobre a Fase A (§2);
3. forks com caminhos e recomendação (§3), já ratificados;
4. pendências de validação externa (§4);
5. insumos ausentes (§5);
6. achados fora de escopo (§6).

---

## 1. Checklist de comportamentos

Notação:
- **[D]** = direto (o ADR, a lei ou um fork ratificado da Fase A já decidem);
- **[F-TB-n → x]** = fork desta fase, ratificado;
- **[P-Bn]** = depende de pendência externa (§4). A implementação usa o valor marcado como default, parametrizado.

**Pré-condição [D]:** os 3 PRs da Fase A (F-TA-10 → a) estão mergeados. A Fase B **reusa sem redesenhar**:
- a tabela versionada (A-4) e o arredondamento (A-5);
- `receitaBrutaPorAtividade` (A-6) e `resultadoAntesIrpjCsll` (A-7);
- as deduções (A-11);
- o model `TaxAssessment` (A-12);
- prévia, confirmação e leitura (A-13, A-14, A-17);
- provisão e reconcile (A-15, A-16);
- encerramento × provisão (A-18) e a policy (A-19).

**Nenhuma rota nova:** os endpoints da Fase A aceitam os períodos anuais.

### Perfil e parâmetros

1. **[D, B1] `ANUAL` liberado.** O A-1 deixa de recusar `ANUAL` (*"forma anual é da Fase B"*). Isso só acontece no
   **PR-4** (F-TB-8.1, §3.1); até lá a recusa fica e os testes semeiam o perfil pelo repositório.
   - Continuam valendo:
     - `PRESUMIDO` + `ANUAL` ⇒ 400;
     - `SIMPLES`/`MEI` ⇒ 400;
     - `REAL` com a forma nula ⇒ `TRIMESTRAL`.
   - A trava do A-1 é a mesma: com `formaApuracaoTravadaEm` preenchido, trocar a forma dá 400.
2. **[F-TB-6 → a] Troca de forma com o e-Lalur do ano preenchido** (só antes da trava; depois dela, o item 1 já recusa).
   - Antes de trocar `TRIMESTRAL ↔ ANUAL` em `upsert`, o service procura no ano, nos períodos da forma antiga:
     `LalurEntry` não arquivado, movimento da Parte B não arquivado e `LalurParteBClosing`.
   - Se houver algum ⇒ 400, listando período, livro e quantidade.
3. **[D] Códigos de receita.** A constante de códigos do A-4 ganha:
   - `IRPJ/ESTIMATIVA` obrigada `236201` / optante `599301`;
   - `CSLL/ESTIMATIVA` `248401`;
   - `IRPJ/AJUSTE_ANUAL` obrigada `243001` / optante `245601`;
   - `CSLL/AJUSTE_ANUAL` `677301`;
   - `IRPJ/DIFERENCA_POSTERGADA_16` obrigada `236202` / optante `599302` (ADR §3).

   O mês por balancete com redução usa o código da estimativa (**P-B2**). O obrigada × optante sai de
   `lucroRealObrigatorio` (A-1; nulo ⇒ 400). **Teste:** cada `modo` × `lucroRealObrigatorio` resolve exatamente um
   código.
3b. **[F-TB-5 → b] Perfil e parâmetros do 16%.**
   - **Perfil:** `CompanyFiscalProfile.prestadoraExclusivaServicos Boolean @default(false)`, a declaração da PJ ×
     ano de que se enquadra no § 7º e não cai no parágrafo único da Lei 9.250 art. 40.
   - **Trava:** muda só antes da trava da forma (depois dela, 400). É consistência interna, pela mesma razão do
     `regime` no A-1: os meses confirmados copiam a premissa.
   - **Audit:** o campo entra na allowlist de `company_fiscal_profile.updated` na mesma mudança.
   - **Tabela (A-4), linhas novas:**
     - `PRESUNCAO_IRPJ_REDUZIDA` 1600 bp (IN 1.700 art. 33 § 7º; Lei 9.250 art. 40);
     - `RECEITA_LIMITE_REDUZIDA_ANO_CENTS` 12.000.000 (mesmas fontes).

### Leitura da base (reuso)

4. **[D] Janela de período.** Uma função pura `periodoBounds(ano, periodo, inicioAtividadeEm?)` substitui a busca
   em `quarterWindows` (`LalurService.ts:265`) e o `quarterBounds` (`Lalur.model.ts:30`):
   - `T0x`: igual a hoje;
   - `A0m`: **período em curso**, de 01/01 (ou `inicioAtividadeEm`, F-TA-4 b) ao último dia de m, 23:59:59.999Z
     (IN 1.700 art. 49 I; Manual p.128 *"balanço até o mês"*);
   - `A00`: o ano.

   Uma segunda função, `mesBounds(ano, m)`, dá só o mês m, que é a janela da receita bruta. São duas janelas
   diferentes, e o teste assere as duas para `A03`.
5. **[D] Receita do mês:** `receitaBrutaPorAtividade(scope, mesBounds(ano, m))` (A-6), com o **mesmo** gate de
   exaustividade. Receita fora de 3.1/3.3 continua dando 400; os acréscimos do art. 39 seguem pendentes (P-B7).
6. **[D] LAIR do período em curso:** `resultadoAntesIrpjCsll(scope, periodoBounds(ano, 'A0m'), excluir)` (A-7). A
   guarda de circularidade exclui as contas de despesa da provisão. Isso cobre também o crédito em despesa do ajuste
   negativo do item 16.

### Cálculo (funções puras: `(entrada, tabela vigente, memórias confirmadas) → memória`)

7. **[D, B2] Estimativa por receita bruta** (`A0m`, modo `RECEITA_BRUTA`):
   - base IRPJ = Σ por atividade (receita do mês × `PRESUNCAO_IRPJ`), ou o 16% do item 9 (D10; IN 1.700 arts. 33
     e 38);
   - IRPJ = 15% × base + 10% × max(0, base − 20.000,00 × **1**) (Lei 9.430 art. 2º §§ 1º–2º; IN 1.700 art. 42);
   - CSLL = alíquota do perfil (D8) × Σ (receita × `PRESUNCAO_CSLL`) (IN 1.700 arts. 34 e 45; Lei 9.430 art. 30);
   - **sem acréscimo da LC 224:** a estimativa do Real não está no art. 4º § 2º II a da LC 224 (ADR §3) (**P-B3**);
   - **não lê** o e-Lalur nem os meses anteriores. É a garantia, por construção, do art. 47 § 2º: o excesso pago num
     balancete não reduz o mês seguinte por receita bruta;
   - deduções pelo A-11 (IRRF do mês, art. 44; CSLL retida, art. 46). a pagar = max(0, devido − deduções), e o
     excedente segue o F-TA-9 → a.
8. **[D, B3] Balancete de suspensão/redução** (`A0m`, modo `BALANCETE`):
   - **Pré-condição:** os meses 01..m−1 em atividade estão fechados (item 15, F-TB-4 → b). Não se exige fechamento
     da Parte B: o art. 50 II proíbe registro nela.
   - **IRPJ:** L = LAIR do período em curso (item 6) + Σ linhas `A` − Σ linhas `E` do livro `lalur` com `quarter =
     'A0m'`. C = Σ linhas `P` do mesmo período.
     - D6: C > arred(30% × L), ou C > 0 com L ≤ 0 ⇒ 400, por tributo.
     - C acima do saldo inicial da Parte B ⇒ 400 (item 12).
   - **CSLL:** o mesmo cálculo com o livro `lacs`.
   - **Devido do período em curso:**
     - IRPJ = 15% × max(0, L − C) + 10% × max(0, (L − C) − 20.000,00 × **n**), com n = meses do período em curso
       (m − mês de início + 1; IN 1.700 art. 49 II e art. 29 § 1º; D7) (**P-B4**);
     - CSLL = alíquota × max(0, L − C).
   - **Anteriores** = Σ (`devidoCents` + `diferencaPostergadaCents`) das linhas `CONFIRMED` de `A01..A(m−1)` do mesmo
     tributo. É o **devido**, não o pago (IN 1.700 art. 47 § 5º I / § 6º I; ADR B3) (**P-B1**, **P-B6**).
   - **Devido do mês** = max(0, devido do período − anteriores):
     - ≤ 0 ⇒ **suspensão**: devido 0, e a memória ganha a linha `SUSPENSAO` (art. 47 I/III);
     - > 0 ⇒ **redução** (art. 47 II/IV).
   - **Prejuízo** desde janeiro (L ≤ 0) ⇒ devido 0 (IN 1.700 art. 48 parágrafo único; Lei 8.981 art. 35 § 2º).
   - **Janeiro** por balancete é permitido (art. 48; Lei 8.981 art. 35 § 3º), com anteriores = 0.
   - **Deduções** pelo A-11: o retido no mês (art. 47 § 5º II / § 6º II) e o retido em meses anteriores ainda não
     deduzido (III). O operador informa (F-X7-11 → a).
   - **Memória:** `LAIR_PERIODO_EM_CURSO`, `ADICOES`, `EXCLUSOES`, `COMPENSACAO`, `MESES_PERIODO`,
     `DEVIDO_PERIODO_EM_CURSO`, `DEVIDO_MESES_ANTERIORES` (lista os ids lidos), `SUSPENSAO` | `REDUCAO`.
9. **[F-TB-5 → b] 16% do prestador exclusivo** (IN 1.700 art. 33 §§ 7º–10; Lei 9.250 art. 40). Só o **IRPJ** e só no
   modo `RECEITA_BRUTA`. A CSLL fica em 32%: o § 7º fala só da base do IRPJ, e o art. 34 não tem equivalente.
   - **Recusa (400):** `prestadoraExclusivaServicos = true` com receita de revenda (3.3) > 0 no ano até o mês m, com a
     mensagem *"declarou prestadora exclusiva de serviços, mas há receita de revenda"*. Exclusividade é condição do
     § 7º.
   - **Limite:** receita bruta acumulada do ano até m (Σ dos meses em atividade, todas as atividades, lida pelo item 5
     mês a mês) ≤ `RECEITA_LIMITE_REDUZIDA_ANO_CENTS` ⇒ `PRESUNCAO_IRPJ_REDUZIDA` (16%). Acima ⇒ 32%.
   - **Mês do excesso m\*** (a 1ª vez que a acumulada passa do limite): a linha IRPJ de m\* grava
     `diferencaPostergadaCents`:
     - o valor é Σ, para cada mês k < m\* confirmado em `RECEITA_BRUTA` com 16%, de [IRPJ(k) recalculado a 32%,
       adicional incluído (D7, 1 mês)] − `devidoCents(k)` confirmado (§ 8º: *"em relação a cada mês transcorrido"*);
     - o valor é lido das **memórias confirmadas** (mesma razão do F-TA-3 → a: o que foi confessado não se relê do
       razão);
     - código `236202`/`599302` (item 3). A memória traz uma linha por k e o vencimento informativo (§ 9º: último dia
       útil do mês seguinte a m\*). Acréscimos de mora não são modelados (§ 10).
   - Meses por balancete antes de m\* não entram na diferença, porque a base deles é o lucro real.
   - Depois de m\*, 32% até o fim do ano.
   - **Teste-tabela** (com a conta à mão e o parágrafo citado no comentário):
     - abaixo do limite o ano todo;
     - cruzando em m\* = 7 com os meses 1–6 a 16%;
     - um mês por balancete no meio (fica fora da diferença);
     - declaração + revenda ⇒ 400;
     - CSLL sempre em 32%.
10. **[D, B6] Ajuste anual** (`A00`, modo `AJUSTE_ANUAL`):
    - **Pré-condições:**
      - todos os meses em atividade (`A01..A12`, F-TA-4 b) estão `CONFIRMED`;
      - existe o `LalurParteBClosing` do `A00` (item 12). É a mesma pré-condição do A-10 no trimestral.
    - **Lucro:** L = LAIR do ano + Σ `A` − Σ `E` (livros `lalur`/`lacs`, `quarter = 'A00'`); C = Σ `P`.
      - D6 vale como no item 8. A compensação também não passa do saldo da Parte B, como no A-10.
    - **Devido:** IRPJ = 15% + 10% × max(0, base − 20.000,00 × meses em atividade) (D7, 12 no ano cheio); CSLL =
      alíquota do perfil.
    - **[F-TB-2 → b] Dedução das estimativas** (Lei 9.430 art. 2º § 4º IV, *"pago"*):
      - o payload aceita `estimativasPagas: [{ periodo: 'A01'..'A12', tributo, valorCents }]`, opcional;
      - mês ausente ⇒ assume pago o `aPagarCents + diferencaPostergadaCents` confirmado daquele mês, com a linha de
        memória `ESTIMATIVA_PAGA_ASSUMIDA` (**P-B10**);
      - pago informado menor que o confirmado ⇒ a memória ganha a linha `ESTIMATIVA_NAO_PAGA` (multa isolada de 50%,
        IN 1.700 art. 52; não modelada, §6). A diferença **não** é deduzida.
    - **Retenções** (art. 2º § 4º III):
      - as deduções `IRRF`/`CSLL_RETIDA` já registradas nas memórias mensais confirmadas entram de novo aqui, como
        retido já usado, e nunca em dobro: o total pago mais o retido mensal reconstrói o devido mensal;
      - o retido do ano ainda não deduzido vem do A-11.
    - **Saldo** = devido − deduções:
      - > 0 ⇒ `aPagarCents`. A memória ganha a linha informativa *"quota única até o último dia útil de março,
        Selic desde 1º/fev — Lei 9.430 art. 6º §§ 1º–2º"*;
      - < 0 ⇒ `saldoNegativoCents` (art. 6º § 1º II), com *"restituição/compensação fora do sistema"*.
    - **Teste:** o ano com 12 estimativas por receita bruta e o ajuste igual ao devido dá saldo 0; com um balancete de
      suspensão no meio, o ajuste ignora o "pago a maior" do balancete (art. 47 § 2º só vale no ano em curso, e o
      ajuste é lucro real).

### Persistência e fluxo (deltas sobre A-12..A-19)

11. **[D, F-TB-1 → a] `TaxAssessment` e DTOs.**
    - `periodo` aceita `A00..A12`, o mesmo vocabulário do e-Lalur e da ECF (a coluna já é `String`).
    - `forma` aceita `ANUAL`. `modo` aceita `ESTIMATIVA_RECEITA | BALANCETE_SUSPENSAO_REDUCAO | AJUSTE_ANUAL`, os
      nomes do ADR §6.
    - Coluna nova `diferencaPostergadaCents BigInt @default(0)` (F-TB-5 b), em migração aditiva.
    - **DTO:**
      - `modoMensal: 'RECEITA_BRUTA' | 'BALANCETE'` é **obrigatório em `A01..A12`** e proibido nos demais;
      - `estimativasPagas` só no `A00`.
    - **Service, contra o perfil efetivo do ano:** `Txx` exige `TRIMESTRAL`; `Axx` exige `ANUAL`; senão 400.
    - IRPJ e CSLL são calculados juntos, num modo só (IN 1.700 art. 31 § 7º; art. 47 § 1º). O payload **não** tem modo
      por tributo, então o invariante 9 do ADR vale por construção.
12. **[D, B7] e-Lalur com períodos anuais** (F-X7-6 → a: alarga o `quarter`, sem migração).
    - **Períodos:** constante `LALUR_PERIODOS = [...LALUR_QUARTERS, 'A00', 'A01', …, 'A12']`. Os 5 schemas de
      `LalurDto.ts` passam a usá-la. O nome da coluna `quarter` fica como herança, com um comentário.
    - **Período × forma** (perfil efetivo do ano): `T0x` só em `TRIMESTRAL`; `A0x` só em `ANUAL`; senão 400.
    - **Parte B:**
      - movimento em `A01..A12` ⇒ 400 (IN 1.700 art. 50 II; invariante 7 do ADR);
      - `closeParteB` em `ANUAL` fecha só `A00`; em `A01..A12` ⇒ 400;
      - `chainYear`, `recomputeYear` e `diagnoseYear` iteram os **períodos de Parte B do ano**: `T01..T04` ou `[A00]`;
      - a continuidade entre exercícios (`LalurService.ts:836-841`; REGRA_SALDOS_M010_E020, p.237) passa a ligar o
        último período de N (`T04` ou `A00`) ao primeiro de N+1 (`T01` ou `A00`), também com formas diferentes nos
        dois anos.
    - **Compensação `P` em `A0m`:**
      - o teto é o **saldo da conta da Parte B no início do ano** (`openingBalances`, `LalurService.ts:754`), porque
        a Parte B não se move até o `A00`;
      - o ramo `A0m` de `assertCompensacaoCabe` fica **explícito**. Hoje `b` vem `undefined` e passa (V, §Contexto);
      - **teste:** compensação em `A03` acima do saldo inicial ⇒ 400.
    - **M312:** `validateJournalLinks` usa `periodoBounds` (item 4). A janela de `A0m` é o período em curso.
    - **Livros:**
      - `LALUR_LIVROS` ganha `n620` e `n660` (as linhas `E` de N620/N660: retenções, incentivos), só em `A01..A12`;
      - `n630`/`n670` só em `T0x`/`A00`; `n620` em `T0x` ⇒ 400 (Manual pp.47–48).
13. **[D] Ordem dos meses.**
    - `A0m` exige `A0(m−1)` `CONFIRMED`, salvo o 1º mês em atividade (F-TA-4 b).
    - `A00` exige todos os meses em atividade (item 10).
    - Substituir `A0k` com meses posteriores confirmados ⇒ 409, listando os meses a reconfirmar.
    - É o F-TA-3 → (a) aplicado a meses, pela mesma razão: o balancete deduz o **devido confirmado** dos meses
      anteriores (art. 47 § 5º I) e o ajuste deduz as estimativas. É o invariante 8 do ADR.
14. **[D, F-X7-5 → a] Trava:** na forma `ANUAL`, a 1ª confirmação do ano é a do 1º mês em atividade (normalmente
    `A01`), por receita bruta ou por balancete. Ela grava `formaApuracaoTravadaEm` na mesma tx (A-14), de acordo com
    a IN 1.700 art. 54 §§ 1º–2º e a Lei 9.430 art. 3º parágrafo único.
15. **[F-TB-4 → b] Balancete × fechamento do mês.**
    - Na tx da confirmação de um `BALANCETE` em `A0m` (gate autoritativo dentro da tx): os meses 01..m−1 em atividade
      da unidade lida têm `AccountingPeriod.status ∈ {SOFT_CLOSED, HARD_CLOSED}`, senão 400 listando os abertos.
    - Mês não semeado conta como aberto, a mesma regra de `monthsCovered`.
    - O mês m pode estar aberto, para receber a provisão (o `postEntry` só lança em `OPEN`).
    - A prévia mostra o mesmo como aviso, sem recusar.
16. **[F-TB-3 → a] Provisão** (2 commits + reconcile do A-15/A-16, sem mudar o padrão):
    - **`A0m`:** `postEntry` no último dia de m, D despesa / C a recolher, valor = `devidoCents` (+
      `diferencaPostergadaCents` no IRPJ). A suspensão (devido 0) não lança nada e não deixa provisão pendente.
    - **`A00`:** diferença = devido anual − Σ (`devidoCents` + `diferencaPostergadaCents`) dos meses `CONFIRMED`,
      lançada em 31/12:
      - diferença > 0 ⇒ D despesa / C a recolher;
      - diferença < 0 ⇒ D **saldo negativo a compensar** / C despesa;
      - diferença = 0 ⇒ nada.
    - **Contas:** o `FiscalProfile` (unidade) ganha 2 FKs nullable, `irpjSaldoNegativoAccountId` e
      `csllSaldoNegativoAccountId`, de natureza `Asset` (`assertAssetAccount`, molde do F-TA-6 a). Allowlist de
      `fiscal_profile.updated` na mesma mudança. Os códigos das contas vêm do contador (**P-B8**).
    - **Substituição de um mês:** estorno + novo lançamento (A-15). Os meses seguintes já foram forçados a
      reconfirmar pelo item 13.
    - **Sem conta configurada:** provisão pendente (F-TA-7 → a); o encerramento recusa (F-TA-8 → a). Os dois são
      herdados.
17. **[D] Leitura** (A-17): o filtro `periodo` da lista aceita `A00..A12`. A view mostra `modo` e
    `diferencaPostergadaCents`.

### ECF anual (B8, B9)

18. **[D, B8] Registro 0010.**
    - **`FORMA_APUR`** vem do **perfil efetivo do ano**: `'A'` se `ANUAL`, senão `'T'` (D1: a forma mora no perfil,
      uma fonte só, como o D8 faz com a CSLL). O DTO passa a `formaApur: z.enum(['T','A']).optional()`; informado e
      diferente do perfil ⇒ 400.
    - **`FORMA_TRIB_PER`** no `ANUAL`: `'R'` nos trimestres com algum mês em atividade (o `E` é só do caso REFIS,
      p.73). Os trimestres antes do início de atividade levam `'0'` (**I**; insumo §5.2).
    - **`MES_BAL_RED`** (`lib/ecf.ts:179`): 12 posições a partir dos `modo` confirmados (`ESTIMATIVA_RECEITA` → `E`,
      `BALANCETE_SUSPENSAO_REDUCAO` → `B`, fora de atividade → `0`; p.74).
    - **Pré-condição:** no `ANUAL`, gerar exige os meses em atividade `CONFIRMED`; senão 400 listando os meses. O
      gerador passa a ler o `TaxAssessment` pela interface do repositório (só leitura).
19. **[D, B8] Períodos L/M/N.** `EcfRealPeriod.perApur` aceita `A00..A12` (`lib/ecfReal.ts:71-77`).
    - **L030 e M030:** `A00` + um `A0m` por mês `B` (Manual pp.222 e 242).
    - **N030:** `A00` + um `A0m` por mês `B` **ou** `E` (p.278).
    - **Isto corrige o ADR B8**, que punha os `A01..A12` nos três registros.
    - `dtIni`/`dtFin` de `A0m` seguem o item 4 (período em curso) (**I**; insumo §5.2).
20. **[D, B8] Parte B na ECF.** No `ANUAL`, a geração exige o fechamento `A00`, não os 4 trimestrais
    (`SpedEcfRealGenerationService.ts:198-203`). M410 sai só sob o M030 `A00` (art. 50 II). Para M500/M510 nos meses
    `B`, ver o insumo §5.2.
21. **[D, B8] Coerência e-Lalur × MES_BAL_RED na geração** (400 nos dois casos):
    - linha do e-Lalur (`lalur`/`lacs`) em `A0m` com o mês m fora de `B`: geraria M300 sem M030 (p.242);
    - linha `n620`/`n660` em mês fora de `B`/`E`.
22. **[D, B8] Bloco N.**
    - N620 e N660 levam as linhas `E` dos livros `n620`/`n660` sob o N030 `A0m`; N630/N670 só sob o `A00`.
    - Continua sem alíquota no montador: o PVA computa as `CNA`/`CA` (F-X7-2 → a).
    - **Catálogo:** `ABAS_LINHAS` ganha as abas de N620 e N660 (`scripts/ecf-tabelas-dinamicas-to-catalog.mjs:30`)
      e o fixture é regenerado a partir da planilha vigente.
    - Se a regeneração mudar qualquer linha das abas já existentes (M300A, M350A, N500, N630A, N670), **o executor
      para e reporta**: é outra mudança, e não cabe neste PR.
23. **[D, B8] Bloco L.** O Fork 6 → (b) continua: sem L100/L300 (`lib/ecfReal.ts:39-40`). O ADR B8 diz *"L100/L300
    também nos meses B (p.47)"*. Se o executor confirmar que o PVA **não** recupera da ECD os saldos mensais dos meses
    `B`, ele para: é fork do dono, que reabre o Fork 6 (insumo §5.3).
24. **[D, B9]** Emenda ao [`ADR-INCR-SPED-ECF-FASE3`](../adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md) retirando a
    restrição do F-M8, no mesmo PR dos itens 18–23.

### Gates que o diff aciona

25. **[D]**
    - **Snapshot de shape** dos DTOs alterados.
    - **Allowlist do `auditCanonical.ts`**, na mesma mudança:
      - `tax.assessment.confirmed` ganha `modo` e `diferencaPostergadaCents` (string de centavos);
      - `company_fiscal_profile.updated` ganha `prestadoraExclusivaServicos`;
      - `fiscal_profile.updated` ganha as 2 FKs.
    - **OpenAPI:** **+0 paths** (nenhuma rota nova). Os enums de `docs.paths.ts`/JSDoc (`periodo`, `modo`, `quarter`,
      `livro`) são atualizados.
    - **i18n:** segue o padrão do módulo (A-22).
26. **[D] Testes de invariante** (ADR §13 itens 7, 8 e 9, mais estes):
    - (a) movimento de Parte B em `A05` ⇒ 400;
    - (b) estimativa confirmada não muda com lançamento retroativo. A prévia de `A0(m+1)` lê o devido confirmado,
      não recalcula; e o lançamento em mês fechado já é recusado pelo período (item 15);
    - (c) IRPJ e CSLL sempre no mesmo modo: as 2 linhas de uma confirmação têm o mesmo `modo`;
    - (d) suspensão: devido do período ≤ anteriores ⇒ devido 0 e a pagar 0;
    - (e) art. 47 § 2º: balancete com excesso em `A04`, receita bruta em `A05`; o `A05` é igual ao calculado sem o
      `A04`;
    - (f) adicional do balancete em `A03` = 10% sobre o que passa de 60.000,00 (3 meses), não de 20.000,00;
    - (g) compensação `P` em `A03` acima do saldo inicial da Parte B ⇒ 400 (o caso que hoje passaria em silêncio);
    - (h) a tabela do item 9 (16%);
    - (i) `A00` sem `estimativasPagas` deduz o confirmado e grava o aviso; com pago menor, o saldo a pagar sobe na
      diferença;
    - (j) ECF anual com `MES_BAL_RED = 'EEBEEEBEEEEE'` ⇒ L030 e M030 = `A00` + 2; N030 = `A00` + 12;
    - (k) regressão: a ECF trimestral sai **byte a byte igual** antes e depois do PR-3;
    - (l) troca de forma com e-Lalur do ano ⇒ 400 (item 2);
    - (m) a provisão do ajuste negativo debita o saldo negativo e credita despesa, e o LAIR do item 6 não muda.

## 2. Contratos esboçados (só os deltas sobre a §2 da Fase A)

```prisma
// CompanyFiscalProfile — aditivo (item 3b, F-TB-5 b)
prestadoraExclusivaServicos Boolean @default(false) // IN 1.700 art. 33 § 7º / Lei 9.250 art. 40; trava junto com a forma

// FiscalProfile (unidade) — aditivo (item 16, F-TB-3 a)
irpjSaldoNegativoAccountId String?  // Asset — ajuste anual negativo
csllSaldoNegativoAccountId String?  // Asset
// + 2 relations Account onDelete: Restrict (molde icmsRecuperavelAccount)

// TaxAssessment — aditivo (item 11)
diferencaPostergadaCents BigInt @default(0) // F-TB-5 b — só IRPJ, só no mês do excesso; código 236202 | 599302
// valores novos (colunas String já existentes, sem migração):
//   forma   += ANUAL
//   periodo += A00 | A01..A12                       (F-TB-1 a)
//   modo    += ESTIMATIVA_RECEITA | BALANCETE_SUSPENSAO_REDUCAO | AJUSTE_ANUAL
//   codigoReceita += 236201 | 599301 | 248401 | 243001 | 245601 | 677301 | 236202 | 599302
```

```ts
// e-Lalur (item 12) — models/Lalur.model.ts
export const LALUR_MESES = ['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12'] as const;
export const LALUR_PERIODOS = [...LALUR_QUARTERS, 'A00', ...LALUR_MESES] as const;   // coluna `quarter` (herança, F-X7-6 a)
export const LALUR_LIVROS = ['lalur', 'lacs', 'n500', 'n620', 'n630', 'n660', 'n670'] as const;
export function periodoBounds(year: number, periodo: LalurPeriodo, inicioAtividadeEm?: string): { from: Date; to: Date };
export const periodosParteB = (forma: 'TRIMESTRAL' | 'ANUAL') => (forma === 'ANUAL' ? (['A00'] as const) : LALUR_QUARTERS);

// DTOs da apuração (item 11) — estende os schemas da Fase A, não os duplica
const PERIODOS = [...PERIODOS_TRIMESTRAIS, 'A00', ...LALUR_MESES] as const;
export const TaxAssessmentPreviewSchema = FaseA.TaxAssessmentPreviewSchema.extend({
  periodo: z.enum(PERIODOS),
  modoMensal: z.enum(['RECEITA_BRUTA', 'BALANCETE']).optional(),   // obrigatório ⇔ periodo ∈ A01..A12 (refine)
  estimativasPagas: z.array(z.object({
    periodo: z.enum(LALUR_MESES),
    tributo: z.enum(['IRPJ', 'CSLL']),
    valorCents: Cents,
  }).strict()).max(24).optional(),                                // só em A00 (refine); F-TB-2 b
}).strict();
// TaxAssessmentConfirmSchema e TaxAssessmentListQuerySchema: mesmo extend do `periodo`.
// superRefine no service (contra o perfil do ano): Txx ⇔ TRIMESTRAL; Axx ⇔ ANUAL.

// Tabela de parâmetros (item 3b) — novas chaves no ParametroApuracao da Fase A
// 'PRESUNCAO_IRPJ_REDUZIDA' (1600 bp) | 'RECEITA_LIMITE_REDUZIDA_ANO_CENTS' (12_000_000)

// Memória — códigos novos de linha (estáveis p/ teste e p/ o pacote do contador)
// RECEITA_MES, RECEITA_ACUMULADA_ANO, PRESUNCAO_REDUZIDA_16, DIFERENCA_POSTERGADA_<Akk>, LAIR_PERIODO_EM_CURSO,
// MESES_PERIODO, DEVIDO_PERIODO_EM_CURSO, DEVIDO_MESES_ANTERIORES, SUSPENSAO, REDUCAO, ESTIMATIVA_PAGA_<Akk>,
// ESTIMATIVA_PAGA_ASSUMIDA, ESTIMATIVA_NAO_PAGA, RETIDO_MESES, SALDO_AJUSTE

// ECF (itens 18–19)
// SpedEcfRealDto: formaApur: z.enum(['T','A']).optional()   // derivado do perfil; divergente ⇒ 400
// EcfRealPeriod.perApur: 'T01'|'T02'|'T03'|'T04'|'A00'|'A01'..'A12'
// EcfRealHeaderInput: + mesBalRed: string  // /^[0EB]{12}$/ quando formaApur='A'; '' quando 'T'
```

| Rota | Delta |
|---|---|
| `POST /api/accounting/tax-assessments/preview` · `POST …/tax-assessments` | aceitam `A00..A12`, `modoMensal` e `estimativasPagas` |
| `GET /api/accounting/tax-assessments` · `GET …/:id` | filtro `periodo` alargado; a view ganha `modo` e `diferencaPostergadaCents` |
| `POST …/:id/provisao` | sem mudança (o reconcile cobre o ajuste anual) |
| `…/lalur/*` | `quarter` aceita `A00..A12`; `livro` aceita `n620`/`n660` |
| geração da ECF Real | `formaApur` opcional/derivado |

## 3. Forks — ✅ RATIFICADOS 02/10 ([D-2026-10-02-X7-FASE-B-FORKS](../plano/decisoes/D-2026-10-02-X7-FASE-B-FORKS.md)) e 03/10 (F-TB-8, [D-2026-10-03-X7-FASE-B-FATIAMENTO](../plano/decisoes/D-2026-10-03-X7-FASE-B-FATIAMENTO.md))

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-TB-1** Vocabulário dos períodos anuais | **(a)** `A00..A12` · (b) `M01..M12` + `ANUAL` (esboço do ADR §6) | ✅ **(a), dono 02/10.** É o mesmo vocabulário do e-Lalur (F-X7-6 → a) e da ECF (`PER_APUR`, p.128). Com (b), o gerador e o e-Lalur teriam de traduzir M↔A, e o ADR §6 é esboço (*"o BRIEF fecha"*) | baixo |
| **F-TB-2** Dedução das estimativas no ajuste anual | **(b)** o operador informa o pago por mês (opcional); se faltar, assume o confirmado, com aviso · (a) Σ do devido confirmado | ✅ **(b), dono 02/10.** A Lei 9.430 art. 2º § 4º IV diz *"pago"*. O sistema não vê DARF (a mesma razão do F-X7-5), e estimativa não paga não é dedutível (multa isolada, IN 1.700 art. 52). Custa um array opcional | médio em (a): ajuste subestimado |
| **F-TB-3** Provisão das estimativas | **(a)** cada mês provisiona; o `A00` provisiona a diferença (com saldo negativo no ativo) · (b) antecipação no ativo, despesa só em dezembro · (c) só o ajuste lança | ✅ **(a), dono 02/10.** É o mesmo padrão da Fase A (A-15), e a DRE mensal sai com imposto (F-Z0). Pede 2 contas de ativo (P-B8) | médio: despesa no mês errado |
| **F-TB-4** Balancete × fechamento do mês | **(b)** exige os meses 01..m−1 fechados; o mês m fica aberto para a provisão · (a) só aviso | ✅ **(b), dono 02/10.** O balancete só vale com o Diário escriturado até o pagamento (IN 1.700 art. 52 § 4º). O fechamento impede o lançamento retroativo que descasaria balancete × ECD. Exigir o mês m fechado travaria a provisão (o `postEntry` só lança em `OPEN`) | alto em (a): balancete desconsiderado e multa de ofício |
| **F-TB-5** 16% do prestador exclusivo na estimativa | (a) não modelar; 32%, e o ajuste devolve o excesso · **(b)** modelar a IN 1.700 art. 33 §§ 7º–10 (Lei 9.250 art. 40) | ✅ **(b), dono 02/10 — DIVERGENTE da recomendação (a).** Itens 3b e 9. O argumento do (a) era *"pagar a mais na estimativa é recuperável no ajuste"*, e o salão que vende produto nem se qualifica (o item 9 recusa a declaração com revenda) | baixo em (a); em (b), o risco é a aritmética da diferença postergada (teste-tabela do item 9) |
| **F-TB-6** Trocar a forma com o e-Lalur do ano preenchido | **(a)** o perfil recusa (400), listando · (b) permite | ✅ **(a), dono 02/10.** Evita linha órfã que a ECF recusaria depois (item 21) | baixo |
| **F-TB-7** Fatiamento | **(a)** 3 PRs seriais depois da Fase A: **PR-1** itens 1–10 e 12 (perfil, parâmetros, janelas, e-Lalur, funções puras; sem mudança de rota) · **PR-2** itens 11 e 13–17 (model, DTO, ordem, trava, gate de fechamento, provisão) · **PR-3** itens 18–24 (ECF anual + emenda do ADR da ECF) · (b) 1 PR | ✅ **(a), dono 02/10.** É o molde do F-TA-10. O PR-1 se verifica só com teste-tabela; o PR-3 se isola pela regressão byte a byte (26 k). **Fronteiras substituídas pelo F-TB-8 (03/10)** | baixo |
| **F-TB-8** Fatiamento (emenda o F-TB-7) | **(a)** 4 PRs seriais: PR-1 funções puras, PR-2 e-Lalur anual, PR-3 model/fluxo/provisão, PR-4 ECF anual + liberação do `ANUAL` (§3.1) · (b) os 3 do F-TB-7, só distribuindo os itens 25/26 · (c) 1 PR. **F-TB-8.1:** o `ANUAL` fica selecionável só no último PR · ou no PR-1 | ✅ **(a) + ANUAL no último PR, dono 03/10.** No F-TB-7, o PR-1 juntava as funções puras com o item 12, que muda o e-Lalur, um serviço vivo, e assim deixava de ser verificável só com teste-tabela, como no molde. Os itens 25/26 não tinham PR. Com o `ANUAL` liberado cedo, um `main` intermediário deixaria uma PJ `ANUAL` gerar a ECF `T` (**I**) | baixo: 1 ciclo de PR/CI a mais |

### 3.1 Divisão em PRs (F-TB-8 → a; F-TB-8.1 → último PR)

Pré-condição de todos: os 3 PRs da Fase A estão mergeados (F-TA-10 → a; instrução do dono, 03/10). A série é
serial, porque cada PR consome o anterior. Cada PR exige o seu próprio "executa" (ORCH-006). O item 25 vai em cada
PR, na parte que o diff daquele PR aciona.

| PR | Itens | Testes do item 26 | Gates do item 25 acionados | Verificável por |
|---|---|---|---|---|
| **PR-1** parâmetros + janelas + funções puras, sem rota e sem mudança de serviço vivo | 3, 3b (campo do perfil + migração aditiva + trava), 4, 7, 8 (cálculo; o gate de fechamento é do item 15), 9, 10 (cálculo, com `estimativasPagas` como entrada) | d, e, f, h, i (parte do cálculo) | snapshot `CompanyFiscalProfileDto`; allowlist `company_fiscal_profile.updated` (+`prestadoraExclusivaServicos`) | teste-tabela, como o PR-1 da Fase A (#478) |
| **PR-2** e-Lalur anual | 12 (`LALUR_PERIODOS`, período × forma, Parte B só no `A00`, continuidade entre exercícios, ramo `A0m` de `assertCompensacaoCabe`, M312 por `periodoBounds`, livros `n620`/`n660`) | a, g + **regressão**: as suítes do e-Lalur trimestral continuam verdes sem editar asserções | snapshot dos 5 schemas de `LalurDto.ts`; enums `quarter`/`livro` em `docs.paths.ts` (+0 paths) | integração do `LalurService`, com o perfil `ANUAL` semeado pelo repositório |
| **PR-3** model + fluxo + provisão | 5, 6, 11, 13, 14, 15, 16, 17 | b, c, m | migração aditiva (`diferencaPostergadaCents`; 2 FKs de saldo negativo); snapshot dos DTOs da apuração; allowlist `tax.assessment.confirmed` (+`modo`, +`diferencaPostergadaCents`) e `fiscal_profile.updated` (+2 FKs); enums `periodo`/`modo` (+0 paths) | integração das rotas da Fase A com períodos `Axx` |
| **PR-4** ECF anual + liberação do `ANUAL` | **1, 2**, 18, 19, 20, 21, 22, 23, 24 (emenda do ADR da ECF) | j, k, l | snapshot `SpedEcfRealDto` e `CompanyFiscalProfileDto`; catálogo N620/N660 regenerado (com a parada do item 22) | regressão byte a byte da ECF trimestral (26 k) + teste de perfil (26 l) |

- **Por que os itens 1 e 2 vão no PR-4 (F-TB-8.1):** cada `main` intermediário fica fechado para a PJ `ANUAL`.
  Antes do PR-4, o DTO recusa `ANUAL`. Assim não existe estado em que uma PJ `ANUAL` feche a Parte B trimestral e gere
  a ECF com `FORMA_APUR = T`, nem em que lance `A0m` no e-Lalur sem apuração que o consuma.
- **Custo assumido:** do PR-1 ao PR-3, os testes semeiam o perfil `ANUAL` direto pelo repositório, sem passar pelo
  DTO. O caminho real do perfil só é testado no PR-4 (26 l).
- **Paradas herdadas, que continuam valendo dentro de cada PR:** a do item 22 (abas existentes mudaram na
  regeneração), a do item 23 (L100/L300 nos meses `B`) e as do §5.2/§5.4 (nomes da Fase A conferidos no código depois
  do merge dela).

## 4. Pendente de validação externa (não entra no checklist como decidido)

| # | O quê | Por que está aqui | Quem fecha |
|---|---|---|---|
| P-B1 | Na suspensão/redução, deduzir o **devido** (IN 1.700 art. 47 § 5º I) e não o **"já pago"** da Lei 8.981 art. 35 caput | A lei e a IN usam palavras diferentes. O BRIEF segue a IN e o ADR B3 (devido confirmado); o art. 47 § 7º manda pagar a estimativa atrasada com acréscimos, o que é coerente com o devido (**I**) | contador |
| P-B2 | O mês por balancete com redução usa o código da estimativa (2362/5993; 2484) | A tabela de códigos não tem código próprio para o balancete (**I**) | contador / 1ª importação no MIT (X9) |
| P-B3 | A LC 224 não alcança a estimativa do Real | Inferido por omissão: o art. 4º § 2º II a só cita os arts. 25–26 da Lei 9.430, e a IN 2.305 não fala em estimativa (ADR §3) (**I**) | contador |
| P-B4 | Mês de início de atividade fracionado conta como 1 mês no adicional e no período em curso | O art. 29 § 1º fala em "número de meses", sem regra de fração (**I**) | contador |
| P-B5 | Limite de R$ 120 mil no ano de início de atividade (inteiro ou proporcional) | O art. 33 § 7º e a Lei 9.250 art. 40 não dizem (**I**); o item 9 usa o limite inteiro | contador |
| P-B6 | 16%: a Lei 9.250 art. 40 diz *"será"* e a IN § 7º diz *"poderão"* (obrigatório ou opção?); e se a diferença postergada entra no "devido em meses anteriores" do balancete (item 8) | O texto diverge; a declaração do perfil trata como opção (**I**) | contador |
| P-B7 | Ganhos de capital e demais receitas na base estimada (Lei 8.981 art. 32; IN 1.700 art. 39) | O mapa só cobre 3.1/3.3, e o gate recusa (400). É o mesmo P-6 da Fase A | contador |
| P-B8 | Contas de saldo negativo a compensar (IRPJ, CSLL) e o lançamento do ajuste | F-TB-3 → a; o código referencial vem do contador | contador |
| P-B9 | Oráculo do número: estimativas, balancetes e ajuste do X7 × N620/N660/N630/N670 do PVA × contador | Gate humano (RUNBOOK-FORMAT), no runbook X5. O agente prepara o passo em branco; não preenche, não marca desfecho, não assina | dono |
| P-B10 | O "pago" assumido de cada mês = `aPagar` + diferença postergada, e o retido já deduzido nos meses conta pelo art. 2º § 4º III | Reconstrução aritmética (**I**) | contador |

## 5. Insumos ausentes (pausa registrada; não varri além do item)

1. **Abas N620/N660 das Tabelas Dinâmicas** (TIPO e código das linhas `E`). Não estão no fixture, a planilha não está
   no disco, e a versão mudou (fixture `366b8d9030a0` × ADR `2a4c9688df7a`). O ADR §10.1 pedia a transcrição antes
   deste BRIEF; ela entra como passo do item 22, com a parada se as abas existentes mudarem.
2. **Regras finas do Manual da ECF para os meses `B`.** Li só a tabela de ocorrência (pp.46–48) e as regras de
   L030/M030/N030 (pp.222/242/278), na versão do MANIFEST (maio/2026). Ficaram sem leitura:
   - `DT_INI`/`DT_FIN` do `A0m` (acumulado ou só o mês);
   - `FORMA_TRIB_PER` com início de atividade no meio do ano;
   - a ocorrência de M500/M510 sob os M030 dos meses `B`;
   - o M305 (`IND_RELACAO = 1`) numa linha `P` de balancete.

   O executor lê as páginas no PR-3 (itens 18–20). O que divergir do BRIEF vira parada.
3. **L100/L300 nos meses `B` sob o Fork 6 → (b)**: se o PVA recupera da ECD os saldos mensais. Ver o item 23.
4. **A Fase A não tem código.** As referências "A-n" são itens de BRIEF, não `arquivo:linha`. Os pontos de extensão
   (constante de códigos, `ParametroApuracao`, schemas) são nomes do contrato da Fase A, e o executor os confirma no
   código depois do merge dela.

## 6. Achados fora de escopo (registrados, não planejados)

1. **O corpus da IN 1.700 está defasado no art. 33** (§ 1º II a, que ganhou "anestesiologia" e "de fato e de
   direito"; § 4º I/IV/V). O diff foi corpus × Sijut de 02/10. Nos arts. 31–32, 34, 38, 39 e 42–54, que esta fase
   usa, o texto é igual. O percentual hospitalar importa ao vertical clínica (P2) e ao P-7 da Fase A. Atualizar o
   corpus exige autorização (decisão 10 de 29/09).
2. **Multa isolada de 50%** (IN 1.700 art. 52) e acréscimos de mora da estimativa atrasada (art. 47 § 7º): o item 10
   só os anota na memória.
3. **MIT `BalancoLucroReal` por mês** = `modo = BALANCETE`. É do contrato C1 (Fase C / X9).
4. **Quota única com Selic** do saldo anual e o vencimento das estimativas: é a guia / X9. Aqui é só uma linha
   informativa.
5. **A mesma retenção é digitada duas vezes:** como dedução na apuração (A-11) e como linha `E` do e-Lalur (`n620`,
   `n630`). É o desenho herdado da Fase A, com o F-X7-2 → a. Derivar as linhas `E` do `TaxAssessment` reabriria o
   F-X7-2; fica registrado.

## 7. Gates de envio [OPS-001]

1. **Objetivo:** o dono quer a Fase B executável sem invenção, reusando a Fase A, com fonte vigente. O checklist §1
   cobre B1–B9:
   - B1 → itens 1–2;
   - B2 → 7;
   - B3 → 8 e 15;
   - B4 → 11 e 18;
   - B5 → 8, 13 e 14;
   - B6 → 10;
   - B7 → 12;
   - B8 → 18–23;
   - B9 → 24.

   Não há rota nova nem model novo.
2. **Grau:** cada fonte carrega V-fonte com data e hash, V-corpus ou I. Cada fato de código carrega `arquivo:linha`
   lido em `dafe594e`.
3. **Caso adversarial:**
   - *"o enum alargado basta para o e-Lalur"* foi derrubado pela leitura de `assertCompensacaoCabe`, que deixaria
     passar a compensação em `A0m` (item 12, teste 26 g);
   - *"L/M/N030 levam os 12 meses"* (ADR B8) foi derrubado pelo Manual: L030 e M030 só levam os meses `B` (item 19,
     teste 26 j).
4. **Checagens que teriam falhado:**
   - o diff da IN 1.700 vigente × corpus: se os arts. 47–54 tivessem mudado, o B3 do ADR estaria errado. Não mudaram;
     só o art. 33 mudou;
   - a leitura do art. 35 da Lei 9.430, que não é o que o pedido supunha (§Contexto).
5. **Duas primeiras linhas:** o cabeçalho diz que não há código e que os forks foram ratificados (um divergente). O
   bloco de alcance diz: depende da Fase A sem código, vale zero para o 1º cliente, e o número só tem oráculo no X5.

**Vieses (T8):**
- **Completude:** a ampliação do F-TB-5 (b) é do dono; o BRIEF não a recomendou. O item 9 traz o que a lei deixa
  aberto (P-B5, P-B6) sem decidir.
- **Fonte legível:** li a IN e as leis inteiras nos artigos usados. Do Manual da ECF li só tabelas e regras de
  ocorrência, e o que ficou de fora está no §5.2 como insumo, não como fato.
- **Herança da Fase A:** o BRIEF assume o contrato da Fase A como escrito. Se a execução dela mudar um nome, os deltas
  daqui mudam junto (§5.4).
