# BE-INCR-DP-PONTE-RAZAO — emenda do PES-4: folha → razão, folha → Simples e CPP patronal com RAT/FAP e terceiros (BRIEF)

> **Sessão:** `sessao-planejamento`. Produz decisão, não código.
> **Autorização (dono, chat, 2026-11-21):** *"Executa tudo pra liberar e poder rodar em xhigh até terminar"*, em resposta
> à proposta de planejar a ponte da folha com o razão (handoff de 21/11, §5: *"abrir `sessao-planejamento` para a emenda
> do PES-4 (ponte folha → razão → Simples + CPP patronal/RAT/FAP/terceiros)"*). Registrada na nota
> [`PES-4`](../plano/nos/PES-4.md) como **autorização de planejamento da emenda**. O "Executa" da frase liberou esta
> sessão; **não** é o `executa` deste BRIEF, que pede autorização nova depois dos forks ([[D-2026-10-28-FLUXO-AUTONOMO]];
> ORCH-006).
> **Lacuna de origem:** `L-20261121-181950-5cb9` (caixa do maestro).
> **Insumos:** [`PRE-ADR-FOLHA-CONTABILIZACAO.md`](../adr/PRE-ADR-FOLHA-CONTABILIZACAO.md) (22/10, F-FOL-0..9);
> [`PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md`](../adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md) (F-DP-4, F-DP-12, F-DP-14);
> [`BE-INCR-DP-F2-brief.md`](BE-INCR-DP-F2-brief.md) (D-6, §3, §7; em execução por outra sessão);
> [`ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`](../adr/ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md);
> Contrato §2.3 (`.claude/skills/_ARCHITECTURE-CONTRACT.md`); o código em `origin/main` `43719baaf` (fetch 21/11).
> **Escopo:** backend. A tela da folha fechada e do lançamento é nó FE vizinho.
> **Dossiê legal:** [`pesquisas-legais/emenda-pes4-ponte-folha/relatorio.md`](../../pesquisas-legais/emenda-pes4-ponte-folha/relatorio.md)
> (D01–D10). As referências [Dnn] abaixo são dele; [FOL-Dnn] são do `pesquisas-legais/folha-contabil-2026-10-22/`;
> [F2-Dnn] do `brief-pes4-f2/`; [F1-Dnn] do `brief-pes4-f0-f1/`.

## TLDR (2 linhas)

A folha **fechada** de cada competência vira **um lançamento por folha e unidade** pelo `postEntry` (2 commits +
reconcile, `atomicUntil`), com a CPP patronal calculada por uma função pura única, que a simulação também passa a usar:
20% (empregado e contribuinte individual), RAT × FAP e terceiros pelo FPAS, com o regime vindo do perfil fiscal. A
apuração do Simples passa a **ler** a folha do DP para o fator r, pela leitura de caixa (o histórico digitado vale nos
meses em que o DP não tem o mês completo, como a receita). Forks F-PNT-1..7 decididos em 21/11 (dois contra a
recomendação: 3 e 7).
**Risco principal:** nada aqui tem oráculo. A folha do F2 não foi conferida pelo contador, a composição da folha do
fator r tem duas leituras legais (pago × competência, A-1; o dono escolheu caixa, provisória) e, com ela, **o fator r só
sai do DP quando o F5 trouxer o recolhimento**: até lá segue digitado. Errar o FS12 muda o anexo de quem tem fator r.

---

## 0. Passo 1 — a autorização cobre o item? Divergências que o dono precisa ver antes

A autorização cobre os três itens da lacuna `5cb9`. **Quatro divergências** com o que está escrito no plano:

| # | Divergência | Onde | Como este BRIEF trata |
|---|---|---|---|
| P1 | **Não existe "folha fechada".** O F2 só tem `ABERTA \| CALCULADA`; o estado `FECHADA` e a reabertura são do F5 | F2 item 48; F2 §7 | O gatilho do lançamento virou o **F-PNT-1**; decidido (a): `FECHADA` e a reabertura entram nesta emenda |
| P2 | **Esta emenda é a fatia "ponte contábil + patronal" do F5.** O F2 mandou para o F5 a patronal (D-6) e o lançamento, com F-FOL-1..9 pendentes (§7). A nota do PES-4 diz "F5 — fechamento, guias, ponte contábil (F-FOL-1..9 pendentes)" | F2 D-6 e §7; nota do PES-4, tabela de fases | Os F-FOL viram forks desta emenda, relidos com o motor próprio (§4.1). Guias, DCTFWeb, GFD e pagamento ficam no F5 restante |
| P3 | **"A apuração do Presumido/Real passa a ler a CPP": nenhuma apuração calcula CPP hoje.** `taxAssessmentCalc.ts` não tem CPP; a CPP como tributo a declarar é da DCTFWeb (X9). No Real, a CPP chega ao IRPJ/CSLL pelo resultado do razão; no Presumido, a base é presumida e a despesa não entra | grep em `models/taxAssessmentCalc.ts` (0 ocorrências de `cpp`/`patronal`/`folha`); `taxSimulation.ts:224` | O consumidor real é (i) o **razão** (despesa no resultado do Real, item 34) e (ii) a **simulação** (`cargaComum`, item 36). A declaração da CPP fica com o X9 (encaixe, §8). Não invento comportamento de apuração |
| P4 | **O pedido manda RAT/FAP/terceiros para `legalParameters`, mas o FAP é da empresa, não da lei.** O FAP é por CNPJ (Dec. 3.048 art. 202-A [D06]), o grau de risco do RAT é por estabelecimento (art. 202 § 3º [D06]) e o FPAS é por raiz de CNPJ (IN RFB 2.110 art. 91 [D07]) | dossiê §1 | **F-PNT-3**: a recomendação separava lei de dado da empresa; o dono decidiu (b), tudo em `LegalParameter`, com linha por CNPJ publicada pelo admin (F-PNT-3b) |

Dois forks do PRE-ADR de 22/10 estão **superados** e não voltam ao dono: **F-FOL-1** (fronteira com o software de folha),
pela F-DP-12 (o DP é a fase 2, motor próprio; dono, 02/11); e **F-FOL-9** (id e régua), pela F-DP-14 (o nó é o PES-4). O
**F-FOL-0** foi respondido em 02/11 ("agora, pelo DP"; PRE-ADR-DP §0).

## 1. Fatos consumados que este BRIEF respeita (lidos nesta sessão, `origin/main` `43719baaf`)

| # | Fato | Onde |
|---|---|---|
| G1 | `PostingService.postEntry(scope, input)` abre tx raiz própria; idempotente por `@@unique([userId, unitId, sourceType, sourceId])` | `services/PostingService.ts:339`; `schema.prisma` (`JournalEntry`) |
| G2 | `reverseEntry` exige motivo (ITG 2000 item 32) | `PostingService.ts:575` |
| G3 | Padrão 2 commits + reconcile e cabeçalho `atomicUntil` (5 linhas, 3 testes); o gate `atomicUntil.boundary.test.ts` varre `features/<x>/services` de **toda** feature, inclusive `dp` | Contrato §2.3; `accounting/__tests__/atomicUntil.boundary.test.ts:23-25`; molde `DepreciationService.ts:1-13` |
| G4 | F-DP-4 (a), decidido: o serviço do DP chama `postEntry` direto, `sourceType` `dp.*`, contas por papel no `AccountingScopeSettings` | PRE-ADR-DP §5 |
| G5 | O DP já importa `accounting` (ex.: `encargos.ts` → `withholdingCalc`). `X3-no-circular` reprova ciclo; o `lib/factory.ts` é o único caminho isento | `.dependency-cruiser.cjs:128-132` |
| G6 | `DpFolha` é por `userId` (sem `unitId`); `DpVinculo.unitId` = estabelecimento (R8). `DpResultadoVinculo` guarda `linhasJson`, `basesJson` (`{cp, irrf, fgts}`, soma por incidência, sem teto), `totaisJson`, imutáveis | F2 §3.3 e item 34 |
| G7 | `ParametrosFolha.patronalBp` existe (linha `ENCARGO_FOLHA/PATRONAL_BP` = 2000, fonte Lei 8.212 art. 22 I e III, "RAT e terceiros não incluídos") | `dp/models/parametrosFolha.ts:30`; `prisma/data/legal_parameters_encargo_folha_v1.sql` |
| G8 | `DP_CATEGORIA_ENCARGO` diz o que cada categoria recolhe (`inss`, `fgtsChave`, `irrf`) | F2 item 66; `dp/models/regrasFolha.ts` |
| G9 | `SimplesHistoricoMensal.folhaCents` (nullable) é digitado em `PUT /accounting/simples/historico/:competencia`; a apuração usa a folha do mês e o FS12 dele | `SimplesEntradasService.ts:41-52`; `SimplesApuracaoService.ts:526, 682`; `simplesCalc.ts:265-286` |
| G10 | **Precedente de leitura com precedência:** na receita do Simples, o subrazão prevalece; o histórico vale nos meses sem subrazão; os dois no mesmo mês ⇒ alerta `HISTORICO_IGNORADO` | `SimplesApuracaoService.ts:509-529` |
| G11 | A simulação calcula a CPP fora do Simples como `folhaCents × PATRONAL_BP`, sem RAT/FAP nem terceiros, e **avisa** a subestimação; no Anexo IV faz o mesmo | `taxSimulation.ts:224, 284, 370` |
| G12 | O plano de contas padrão não tem conta de pessoal, salvo `2.1.7.03 IRRF a Recolher`; precedente de papel resolvido por código no perfil (`retencaoIrrfRecolherAccountId` → `2.1.7.03`) | `fixtures/ChartOfAccountsFixture.ts:68, 354` |
| G13 | `CompanyFiscalProfile.regime` por ano (`SIMPLES \| PRESUMIDO \| REAL \| MEI`) | `schema.prisma` (`CompanyFiscalProfile`) |
| G14 | `PROVISOES-AGENDADAS` não tem nó: só proposta (F3 da régua) | `FILA-ORDEM.md:129` |

**Lei (dossiê `emenda-pes4-ponte-folha`, V-fonte):** Lei 8.212 art. 22 I, II e III [D01]; Lei 10.666 art. 10 [D02];
LC 123 art. 13 VI e § 3º, art. 18 §§ 5º-C, 5º-K e 24 [D03]; LC 214, nova redação dos §§ 5º-K e 24 [D04]; Res. CGSN 140
art. 26 §§ 1º–3º [D05] e nova redação pela Res. CGSN 190 [D09]; Dec. 3.048 arts. 202 §§ 3º e 5º e 202-A [D06]; IN RFB
2.110 arts. 81 § 6º I, 83, 85 e 91 [D07] e Anexo III [D08]. Do PRE-ADR de 22/10: Lei 8.036 art. 15 [FOL-D02]; Lei 4.090
art. 1º [FOL-D03]; CLT arts. 129–145 [FOL-D05]. Do F2: Lei 8.213 art. 68 (salário-família) [F2-D03].

## 2. Divisão em PRs (depois do PR-6 do F2; o `executa`, quando vier, vale para o BRIEF inteiro)

O F2 e esta emenda são o mesmo tema com 2+ PRs: entram como pilha na `integration/dp-f2` (ou na que a sessão do F2
usar), não direto na `main` (D-2026-11-10-BRANCH-DE-INTEGRACAO).

| PR | Conteúdo | Itens | Muda comportamento? |
|---|---|---|---|
| **PR-P0** | Dados de lei: `RAT_ALIQUOTA`, `FAP_LIMITES`, `TERCEIROS_FPAS` em `LegalParameter`; função pura `cppPatronal` | 1–6 | Não (tabela nova + função pura) |
| **PR-P1** | Enquadramento do estabelecimento (grau, FAP, FPAS) como linhas de `LegalParameter` por CNPJ; marca Anexo IV no `FiscalProfile` | 7–11 | Sim: tabelas novas; campo novo no perfil |
| **PR-P2** | `FECHADA`, fechar e reabrir a folha | 12–17 | Sim (F-PNT-1) |
| **PR-P3** | Contas de pessoal e a ponte contábil (lançamento por folha × unidade) | 18–29 | Sim |
| **PR-P4** | Provisões de 13º e férias com encargos | 30–33 | Sim (F-PNT-5) |
| **PR-P5** | Simples lê a folha do DP; simulação usa `cppPatronal`; prova do Real pelo razão | 34–40 | Sim |

## 3. Checklist de comportamentos (cada um testável isoladamente)

Convenções do DP: dinheiro em centavos `bigint`; taxas em bp (10 000 = 100%); o FAP em **décimos de milésimo**
(`fapX10000`, 5000..20000), porque a norma o fixa com 4 casas e truncamento (Dec. 3.048 art. 202-A § 1º [D06]). **Todo
número de lei vem de `LegalParameter`** (regra de parâmetro do dono, [[D-2026-11-06-DP-BRIEF-F2]]): os valores abaixo são
o valor inicial da linha, com a fonte.

### PR-P0 — dados de lei e a função pura da CPP

1. **Tabela `RAT_ALIQUOTA`** (chave `GRAU_1`, `GRAU_2`, `GRAU_3`; `valorInt` em bp: 100, 200, 300; vigência desde
   1998-12-11; fonte Lei 8.212 art. 22 II "a"–"c", red. Lei 9.732/1998 [D01]). Formato validado no `formatoLinha.ts`.
2. **Tabela `FAP_LIMITES`** (chaves `MIN_X10000` = 5000 e `MAX_X10000` = 20000; fonte Lei 10.666 art. 10 [D02] e Dec. 3.048
   art. 202-A § 1º [D06]).
3. **Tabela `TERCEIROS_FPAS`** (chave = código FPAS; `valorJson` = `{ entidades: Record<codigoTerceiro, bp>, totalBp }`;
   carga inicial **só com as linhas de FPAS que o contador indicar** (A-3); a linha 515 do Anexo III [D08] entra como
   exemplo de teste, não como enquadramento do salão). `totalBp` = soma das entidades (gate de formato). Fonte: IN RFB
   2.110 art. 85 II e Anexo III [D07, D08].
4. **Função pura `cppPatronal(entrada) → Calculo<CppResultado>`** em `features/dp/models/folha/cpp.ts`, com prova
   (`CalcNode`, F2 item 3):
   - entrada: `{ regimeCpp: 'NO_DAS' | 'ANEXO_IV' | 'GERAL'; baseEmpregadosCents; baseContribuinteIndividualCents;
     ratGrau: 1|2|3; fapX10000; fpas: string | null; tabelas }`;
   - `GERAL`: `patronal = 20% × (empregados + CI)` (art. 22 I e III [D01]); `rat = ratBp × fap/10000 × empregados`
     (art. 22 II [D01]; art. 202-A [D06]); `terceiros = totalBp(fpas) × empregados` (IN 2.110 art. 81 § 6º I [D07]);
   - `ANEXO_IV`: patronal e RAT × FAP como `GERAL`; **terceiros = 0** (LC 123 art. 13 § 3º e art. 18 § 5º-C [D03]);
   - `NO_DAS`: tudo zero, com o nó de prova "CPP no DAS (LC 123 art. 13 VI)" (Anexos I, II, III e V);
   - arredondamento só no total de cada parcela, pela linha `FOLHA_REGRA/ARREDONDAMENTO` do F2;
   - o FAP entra já truncado na 4ª casa (`fapX10000` inteiro; art. 202-A § 1º [D06] trunca o **multiplicador**); o
     produto `ratBp × fap` e o valor do RAT ficam em fração exata e arredondam só no total da parcela. Se o eSocial/a
     DCTFWeb arredondarem a alíquota ajustada antes, é pendência externa (§6), não regra decidida;
   - `fpas` nulo com `regimeCpp = GERAL` ⇒ erro nomeado (o chamador vira pendência, item 9).
5. **Teste da regra de parâmetro** (F2 §0.1): cada parcela roda com duas fotografias (a vigente e uma alterada: RAT 2→3,
   FPAS com Sebrae 0,6→0,7) e espera resultados diferentes; nenhum literal de alíquota no `cpp.ts` (revisor confere).
6. **Sem teto:** base de R$ 20 000,00 (acima do teto do RGPS) gera patronal de R$ 4 000,00. O teto é só do segurado
   (art. 22 I não limita) — teste com propriedade `fast-check`: `patronal(b) = 20% × b` para todo `b ≥ 0`.

### PR-P1 — enquadramento do estabelecimento em `LegalParameter` (F-PNT-3 → (b), dono 21/11: *"Tudo em parâmetros legais"* + *"Linha por CNPJ, via admin"*)

7. **Três tabelas novas de `LegalParameter`, com o CNPJ como chave** (a tabela é global, sem `userId`; só o
   `PLATFORM_ADMIN` propõe e publica, `LegalParameterPolicy.ts:13`):
   - `RAT_GRAU_ESTABELECIMENTO`: chave = CNPJ do estabelecimento (14 posições, `lib/cnpj` `CNPJ_REGEX`, alfanumérico);
     `valorInt` = grau 1..3 (Dec. 3.048 art. 202 §§ 3º e 5º [D06]: preponderância por estabelecimento, autoenquadramento);
   - `FAP_ESTABELECIMENTO`: chave = CNPJ do estabelecimento; `valorInt` = `fapX10000`; vigência anual (1º/01 a 31/12 do
     ano de validade); `fonte` = de onde veio o índice (ex.: "FAPweb, vigência 2026"); Dec. 3.048 art. 202-A [D06];
   - `FPAS_EMPRESA`: chave = raiz do CNPJ (8 posições; IN RFB 2.110 art. 91 [D07]); `valorTexto` = código FPAS;
     `valorJson` opcional `{ codigoTerceiros }` (o código de terceiros do S-1005).
   Formato validado no `formatoLinha.ts` (grau nas chaves de `RAT_ALIQUOTA`, FAP entre os `FAP_LIMITES` vigentes, FPAS com
   linha em `TERCEIROS_FPAS`).
8. **Fluxo:** o contador do cliente pede, o admin da plataforma propõe e publica pela rota que já existe
   (`/legal-parameters`), com `motivo` e `fonte`. **Nenhuma rota nova no DP.** O carregador de semente não traz linha de
   cliente (só as tabelas de lei do PR-P0).
9. **Leitor `enquadramentoNaCompetencia(fotografia, cnpjEstabelecimento, data)`** em `features/dp/models/`: devolve
   `{ ratGrau, fapX10000, fpas }` vigentes; falta qualquer um ⇒ pendência **bloqueante** do fechamento
   `ENQUADRAMENTO_CPP_AUSENTE` com o CNPJ formatado e a tabela que falta (ex.: "FAP_ESTABELECIMENTO de
   12.ABC.345/01DE-35 em 2026-03"), **só** quando o regime da competência exige CPP fora do DAS (item 10). No Simples
   sem Anexo IV, não pede nada.
10. **`regimeCpp` da competência** = `NO_DAS` se `CompanyFiscalProfile.regime = SIMPLES` e o estabelecimento não está no
    Anexo IV; `ANEXO_IV` se `SIMPLES` e está; `GERAL` se `PRESUMIDO`/`REAL`. A marca "Anexo IV" é `FiscalProfile`
    (por unidade) `simplesCppForaDoDas: boolean`, informada pelo contador (dado da empresa, não da lei). Sem perfil do ano
    ⇒ pendência bloqueante `PERFIL_FISCAL_AUSENTE`. `MEI` ⇒ pendência `CPP_MEI_FORA_DO_ESCOPO` (LC 123 art. 18-C, não
    lido). **Atividade mista (Anexo IV + outro anexo)**: não suportada (§6).
11. **CNPJ do estabelecimento:** o leitor recebe o CNPJ da unidade. **Insumo ausente (§7 Insumos ausentes):** o schema não guarda CNPJ
    por unidade; o da empresa está em `CompanyFiscalProfile.declarante.cnpj` (por ano). Nesta emenda: instância com uma
    unidade usa o CNPJ do declarante; com mais de uma, pendência bloqueante `CNPJ_ESTABELECIMENTO_AUSENTE` até existir o
    campo (fica para o dono decidir onde, fora deste BRIEF; caixa `0736`). `declarante` ausente (é `Json?`) ⇒ a mesma
    pendência `CNPJ_ESTABELECIMENTO_AUSENTE`.

### PR-P2 — fechar e reabrir a folha (F-PNT-1, recomendação (a))

12. **`DpFolha.estado`** ganha `FECHADA` (F2 item 48 deixou o espaço). Transição `CALCULADA → FECHADA` só com
    `desatualizada = false` e **sem pendência bloqueante** na execução atual (F2 item 44) e nas do item 9/10. CAS no
    `estado` e no `execucaoAtualId` lidos, dentro da tx.
13. **Folha `FECHADA` é imutável:** `calcular` responde 409 `DP_FOLHA_FECHADA`; escrita que marcaria `desatualizada`
    (F2 item 52) numa competência com folha `FECHADA` responde 409 `DP_COMPETENCIA_FECHADA` com a competência e o tipo
    da folha (o lançamento, a versão de vínculo, o afastamento e o dependente que tocam a competência).
14. **Reabrir** (`POST /dp/folhas/:id/reabrir`, motivo obrigatório): `FECHADA → CALCULADA`; o lançamento contábil da
    folha é **estornado** pela ponte (item 25) **antes** da troca de estado. Período contábil fechado ⇒ 409
    `DP_REABERTURA_PERIODO_FECHADO` e nada muda (o estorno é o gate autoritativo, memória
    `efeito-irreversivel-antes-do-gate-autoritativo`: o estorno roda primeiro e, se falhar, a folha continua `FECHADA`).
15. **Ordem dentro do F2:** `ADIANTAMENTO` fecha antes ou junto da `MENSAL` da mesma competência; fechar a `MENSAL`
    com o adiantamento da mesma competência só `CALCULADA` ⇒ 409 `DP_ADIANTAMENTO_ABERTO`.
16. **Rotas** `POST /dp/folhas/:id/fechar`, `POST /dp/folhas/:id/reabrir`; auditoria `dp.folha.fechada`
    `['folhaId', 'competencia', 'tipo', 'execucaoId']` e `dp.folha.reaberta` `['folhaId', 'competencia', 'tipo',
    'motivo']`. `reason` novos no `DP_ERROR_REASONS`.
17. **Testes no estado de partida certo** (régua A2): folha **já** `FECHADA` + lançamento informado ⇒ 409; reabrir com
    o período contábil fechado ⇒ 409 e a folha segue `FECHADA` (relida).

### PR-P3 — contas e ponte contábil (F-PNT-2, F-PNT-4)

18. **Papel contábil de cada rubrica** (código, catálogo fechado; F-PES-9): mapa `PAPEL_CONTABIL_POR_RUBRICA` em
    `features/dp/models/contabil/papeis.ts`, com teste que reprova rubrica do catálogo sem papel. Papéis (despesa):
    `SALARIOS` (proventos de 101/103: salário, HE, noturno, DSR, comissão, complementos), `PRO_LABORE` (723),
    `BOLSA_ESTAGIO` (901), `SALARIO_FAMILIA` (paga pela empresa e compensada no INSS, Lei 8.213 art. 68 [F2-D03]);
    descontos: `INSS_SEGURADO`, `IRRF`, `ADIANTAMENTO_DESCONTADO`, `FALTAS` (reduz o provento, não é conta).
19. **Contas por papel** em `AccountingScopeSettings` (F-DP-4; F-PNT-4): despesas `salariosExpense`, `proLaboreExpense`,
    `bolsaEstagioExpense`, `inssPatronalExpense`, `ratExpense`, `terceirosExpense`, `fgtsExpense`; passivos
    `salariosAPagar`, `proLaboreAPagar`, `inssARecolher`, `fgtsARecolher`, `irrfFolhaARecolher` (padrão: o `2.1.7.03`, como
    o F-RET-19 (a)); ativo `adiantamentosSalariais`. Cada uma `…AccountId String?` com `onDelete: Restrict`, folha
    analítica e natureza conferida no serviço (molde `AccountingScopeSettingsService`).
20. **Lançamento `MENSAL` por (folha, unidade)**, na data do último dia da competência (despesa por competência):
    - D `salariosExpense` = proventos de empregados; D `proLaboreExpense`; D `bolsaEstagioExpense`;
    - D `inssPatronalExpense` = patronal (20% de empregados + CI); D `ratExpense`; D `terceirosExpense` (item 4);
    - D `fgtsExpense` = FGTS do mês (F2 item 7) / C `fgtsARecolher`;
    - C `inssARecolher` = INSS do segurado + patronal + RAT + terceiros − salário-família pago;
    - C `irrfFolhaARecolher`; C `adiantamentosSalariais` = adiantamento descontado; C `salariosAPagar` e
      `proLaboreAPagar` = líquidos.
    Soma D = soma C por construção (teste de propriedade: para toda folha gerada, o lançamento balanceia e o líquido do
    lançamento = soma dos `totais.liquido` dos vínculos da unidade).
21. **Lançamento `ADIANTAMENTO`**: D `adiantamentosSalariais` / C `salariosAPagar` pelo líquido do adiantamento (sem
    despesa; o F2 não tributa o adiantamento salvo o IRRF do F-DPF-10, que vai a `irrfFolhaARecolher`).
22. **`DpFolhaContabilService`** em `features/dp/services/`, com o cabeçalho `atomicUntil` (G3):
    - commit 1 — `postEntry(sourceType = 'dp.folha.mensal' | 'dp.folha.adiantamento', sourceId =
      `${folhaId}:${unitId}:${execucaoId}`)`, gate de período dentro da tx (o do `PostingService`);
    - commit 2 — `DpFolhaLancamento` (§5.3) com CAS `PENDENTE → LANCADO` + `journalEntryId`, `runTransaction` próprio,
      `tx` ao repo;
    - reconcile — `reconciliarFolha(folhaId)`: read-first pelo `@@unique` do razão; fecha "commit 1 ok, commit 2 falhou";
    - fora da tx — nada.
    Disparo: no fechamento (item 12), **depois** do commit do estado `FECHADA` (F-PNT-1 a). **Preflight:** o `fechar`
    confere antes, fora da tx, que o período contábil da data do lançamento está aberto em cada unidade e que as contas
    dos papéis existem (item 24); falhou ⇒ 409/400 e a folha continua `CALCULADA`. O gate autoritativo segue dentro do
    `postEntry`: se o período fechar entre o preflight e o commit 1, a folha fica `FECHADA` com lançamento `PENDENTE`.
    Nesse estado, `reabrir` é aceito sem estorno (não há lançamento `LANCADO`) e o lançamento `PENDENTE` vira `DESCARTADO`. Falha do commit 1 deixa a
    folha `FECHADA` com `DpFolhaLancamento.estado = PENDENTE` e a pendência visível no `GET` da folha; o reconcile relança.
23. **Os 3 testes do Contrato §2.3:** (i) período fechado dentro da tx ⇒ nada no razão e o `DpFolhaLancamento` segue
    `PENDENTE`; (ii) commit 2 falha ⇒ razão com o lançamento, reconcile converge; (iii) reconcile 2× ⇒ a 2ª chamada não
    lança nem atualiza nada (asserindo a 2ª).
24. **Conta não configurada** ⇒ o fechamento recusa com 400 `DP_CONTA_PAPEL_NAO_CONFIGURADA` e o nome do papel
    (nunca o cuid). Regra: só os papéis com valor ≠ 0 na folha são exigidos.
25. **Estorno na reabertura** (item 14): `reverseEntry` de cada `DpFolhaLancamento` `LANCADO` da folha, motivo = o da
    reabertura; `DpFolhaLancamento.estado = ESTORNADO` + `reversalEntryId` (2 commits, com reconcile próprio).
    O próximo fechamento cria lançamento novo (o `sourceId` leva o `execucaoId`).
26. **Subrazão por vínculo:** o detalhe de cada vínculo já está no `DpResultadoVinculo` imutável (G6); o
    `DpFolhaLancamento` guarda `resumoJson` (totais por papel da unidade). **Tie-out**: `GET /dp/folhas/:id/lancamentos`
    devolve, por unidade, soma por papel do resultado × soma por conta do lançamento, com `ok` (F-PES-10 (a): subrazão
    por trabalhador e tie-out).
27. **Auditoria:** `dp.folha.lancada` `['folhaId', 'unitId', 'execucaoId', 'journalEntryId', 'sourceType']` e
    `dp.folha.lancamento_estornado` `['folhaId', 'unitId', 'journalEntryId', 'reversalEntryId']`. Valor por pessoa nunca.
28. **Kit/plano:** contas de pessoal no plano padrão (F-PNT-4 a) e os papéis do item 19 resolvidos por código no
    `ensureChartOfAccounts`/perfil, como o `2.1.7.03` (G12). Códigos **provisórios até o contador** (P-FOL-5).
29. **Reset e `resetDb`:** `DpFolhaLancamento` BLOCKING (F2 G14), no `resetDb()` em ordem de FK (antes de `DpFolha`).

### PR-P4 — provisões de 13º e férias (F-PNT-5, recomendação (a) como etapa)

30. **Função pura `provisaoMensal(entrada)`** em `features/dp/models/contabil/provisao.ts`: por vínculo de empregado
    (101/103) ativo com ≥ 15 dias na competência (Lei 4.090 art. 1º § 2º [FOL-D03]):
    `provisao13 = baseCents / 12`; `provisaoFerias = baseCents / 12 × (1 + 1/3)` (CLT art. 130 e 142 [FOL-D05]; o terço,
    CF art. 7º XVII [F1-D12]); encargos sobre a provisão: FGTS pela chave da categoria (Lei 8.036 art. 15 [FOL-D02]) e,
    com `regimeCpp ≠ NO_DAS`, `cppPatronal` (item 4) sobre a provisão. **Base nesta etapa:** o salário contratual da
    versão vigente no fim da competência (sem médias de variáveis; P-FOL-4 e o F3).
31. **Lançamento `dp.provisao`** por (folha `MENSAL`, unidade), no fechamento, com o mesmo serviço e o mesmo par de
    commits do item 22 (`sourceId` `${folhaId}:${unitId}:${execucaoId}:provisao`): D despesas de 13º, férias e encargos /
    C `provisao13`, `provisaoFerias`, `provisaoEncargos` (papéis novos no item 19).
32. **Pendência não bloqueante** `PROVISAO_BASE_SEM_MEDIAS` por vínculo com rubrica variável na competência: a provisão
    saiu sem a média (aviso com a matrícula). A **baixa** da provisão (pagamento de férias e 13º) é do F3; o F3 lança o
    pagamento contra estas contas (encaixe, §8).
33. **Guarda de dobra** com o futuro `PROVISOES-AGENDADAS` (F-FOL-4 a, relido): se aquele nó nascer, a ponte recusa
    competência com provisão agendada de férias/13º (400 nomeado). Hoje ele não existe (G14): o item fica como teste de
    contrato só quando o nó existir; registrado no §8.

### PR-P5 — Simples, simulação e a prova do Real

34. **Real pelo razão** (P3): teste de integração em que a folha fechada de março reduz o `resultadoAntes` do trimestre
    no `TaxAssessmentService` do Real pelo total das despesas do lançamento. Sem mudança no cálculo da apuração.
35. **Porta `FolhaFatorRPort`** em `features/accounting/ports/` (interface só com tipos): `folhaPorMes(scope, meses) →
    Map<mes, { folhaCents: bigint; origem: 'DP'; completa: boolean; falta: string | null }>`. Adaptador em
    `features/dp/adapters/`, montado só no `lib/factory.ts` (G5: sem ciclo `accounting → dp`). Adaptador nulo quando a
    instância não tem folha fechada (mapa vazio).
36. **Folha do fator r do mês, pela leitura de caixa** (F-PNT-7 → (b), dono 21/11: *"Caixa (pago no mês)"*; LC 123 art.
    18 § 24 [D03]; Res. CGSN 140 art. 26 § 1º [D05]): soma (i) a remuneração **paga** no mês = `bases.cp` de empregados e
    CI das folhas `FECHADA` cuja `dataPagamento` cai no mês (pró-labore pela base CI; o 13º e as férias quando o F3 os
    pagar), (ii) o FGTS **efetivamente recolhido** no mês e (iii) a CPP recolhida **fora do DAS** no mês (só `ANEXO_IV`;
    A-2 leitura 1). (ii) e (iii) vêm de uma segunda porta, `RecolhimentoFolhaPort` (`recolhidoNoMes(scope, mes) → {
    fgtsCents, cppCents } | null`), cujo adaptador real é do **F5** (guias e pagamento); nesta emenda o adaptador é **nulo**.
    Sem o recolhimento do mês, o item vem com `completa = false` e `falta = 'recolhimento de FGTS/CPP (F5)'`.
37. **Simples lê a folha do DP** (F-PNT-6 → (a), dono 21/11: *"Ler do DP"*): no `SimplesApuracaoService`, mês com folha
    do DP **completa** prevalece sobre o `folhaCents` do histórico; mês **incompleto** usa o histórico, se houver, com o
    alerta `FOLHA_DP_INCOMPLETA` (o mês e o que falta); os dois completos no mesmo mês ⇒ alerta
    `HISTORICO_FOLHA_IGNORADO` (como a receita, G10). **Consequência declarada da leitura de caixa:** até o F5 trazer o
    recolhimento, todo mês sai incompleto e o fator r continua pelo histórico digitado; esta emenda entrega a porta, a
    precedência e a soma (testadas com um adaptador de teste de recolhimento), não o valor em produção.
38. **Alerta permanente** `FOLHA_FATOR_R_LEITURA_PROVISORIA` em toda apuração que usou folha do DP, até o contador
    responder o A-1/A-2 (memória `pacote-contador-triar-antes`): diz que a leitura usada é a de caixa.
39. **Simulação** (`taxSimulation.ts`, `TaxSimulationService.ts`): a CPP fora do Simples e a do Anexo IV passam a vir de
    `cppPatronal` (item 4, mesma função: `_REUSE-CRITERION`, mesmo objeto e vivo nos dois lados). Sem o encargo do
    estabelecimento cadastrado, a simulação continua com 20% e o aviso de hoje, trocado por um que diz o que falta
    ("falta a linha de RAT_GRAU_ESTABELECIMENTO / FAP_ESTABELECIMENTO / FPAS_EMPRESA do CNPJ; peça ao admin"). A **base** da CPP passa a ser a base CP do DP quando houver folha fechada; nos
    outros meses, o `folhaCents` (com o aviso de que inclui encargos e superestima a base, G11).
40. **Gates do diff:** snapshot de shape dos DTOs (`dp` e `accounting`), allowlist do `auditCanonical.ts`, paths
    `/api/dp/*` no openapi sem subir o `BASELINE`, paridade i18n dos alertas novos do Simples, classificação do reset,
    `check:arch` (sem ciclo; `D1` do DP).

## 4. Forks — ✅ DECIDIDOS 2026-11-21 (questionário; cédula [[D-2026-11-21-DP-PONTE-RAZAO]])

Escritos como foram levados ao dono, com a decisão embaixo de cada um. Dois contra a recomendação: **F-PNT-3** e
**F-PNT-7**. O F-PNT-3 abriu uma pergunta de consequência (F-PNT-3b).

### 4.1 De onde vêm (os F-FOL de 22/10, relidos com o motor do F2)

| F-FOL (22/10) | Estado aqui |
|---|---|
| F-FOL-0 | Respondido em 02/11 (PRE-ADR-DP §0) |
| F-FOL-1 | Superado pela F-DP-12 (motor próprio) |
| F-FOL-2 granularidade | → **F-PNT-2** |
| F-FOL-3 provisões | → **F-PNT-5** |
| F-FOL-4 × `PROVISOES-AGENDADAS` | Direto: guarda de dobra (item 33); o nó não existe |
| F-FOL-5 rateio por centro de custo | **Fora do escopo autorizado** (caixa) |
| F-FOL-6 comissão CLT no razão | Fora do escopo: a comissão chega ao DP como `DpLancamento` `COMISSAO` (F2 PR-1); a ligação com a linha `commissions` da venda é outra frente (caixa) |
| F-FOL-7 conferências (S-5011, GFD) | Fora: F4/F5 (caixa) |
| F-FOL-8 contas | → **F-PNT-4** |
| F-FOL-9 | Superado pela F-DP-14 |

### F-PNT-1 — Quando a folha vira lançamento

- **(a) A emenda traz `FECHADA` e a reabertura (PR-P2).** Fecha = imutável e lança; reabrir = estorna e volta a
  `CALCULADA`.
- **(b) Lança em `CALCULADA`.** Cada execução nova estorna a anterior e relança.
- **(c) Espera o F5** inteiro (fechamento, guias, painel); esta emenda só entrega as funções e a porta.
- **Recomendação: (a).** É a opção estrutural: o razão só recebe o que é definitivo, e a reabertura com motivo é o estorno
  da ITG 2000. (b) enche o razão de estornos a cada lançamento de hora extra. (c) deixa a lacuna aberta até o F5, que não
  tem BRIEF. O que (a) **não** traz do F5: painel do contador, gate do ponto, guias.
- ✅ **Decidido: (a)** — dono, questionário, 21/11: *"Fechar e lançar (Recommended)"*.

### F-PNT-2 — Granularidade do lançamento

- **(a) Um lançamento por folha × unidade × tipo** (`dp.folha.mensal`, `dp.folha.adiantamento`, `dp.provisao`),
  `sourceId` com o `execucaoId`; o detalhe por pessoa fica no `DpResultadoVinculo` (subrazão), com tie-out (item 26).
- **(b) Um lançamento por vínculo.**
- **Recomendação: (a).** É o F-PES-10 (a) ratificado em 12/10 e o que a Alterdata força (férias e rescisão separadas;
  PRE-ADR 22/10 §2.3). A unidade é obrigatória porque o `postEntry` é por `userId + unitId` (G1, G6). (b) põe salário de
  pessoa nomeada no histórico do razão, que vai para o ECD e para quem tem acesso à contabilidade.
- ✅ **Decidido: (a)** — dono, questionário, 21/11: *"Um por folha e unidade (Recommended)"*.

### F-PNT-3 — Onde moram RAT, FAP e FPAS

- **(a) Separar lei de dado da empresa.** Em `LegalParameter`: as alíquotas do RAT por grau, os limites do FAP e as
  alíquotas de terceiros por FPAS. Em `DpEncargoEstabelecimento` (com vigência): o grau, o FAP do ano e o FPAS de cada
  estabelecimento.
- **(b) Tudo em `LegalParameter`**, com `discriminador` = unidade ou CNPJ para o FAP e o grau.
- **(c) Tudo digitado na unidade** (percentuais prontos de RAT ajustado e de terceiros).
- **Recomendação: (a).** A lei fixa a forma e as tabelas; o FAP é índice por CNPJ publicado todo ano e o grau é
  autoenquadramento mensal da empresa (Dec. 3.048 arts. 202 § 5º e 202-A [D06]). (b) põe dado de cliente na tabela
  nacional, que tem fluxo de publicação próprio para norma. (c) perde a fonte e a validação (um FAP 2,5 passaria). O
  registro de (a) é o mesmo do S-1005, que o F4 vai ler.
- ✅ **Decidido: (b), contra a recomendação** — dono, questionário, 21/11: *"Tudo em parâmetros legais"*. O PR-P1 foi
  reescrito (itens 7–11): sem model nem rota no DP; três tabelas de `LegalParameter` com o CNPJ como chave.

### F-PNT-3b — Consequência do F-PNT-3 (a tabela é global e só o admin da plataforma publica)

- **(a)** Linha por CNPJ (FAP e grau pelo estabelecimento; FPAS pela raiz), proposta e publicada pelo admin a pedido do
  contador, com a fonte. **(b)** O contador do cliente propõe linha do próprio CNPJ e o admin publica (muda a policy dos
  parâmetros legais). **(c)** Rever o F-PNT-3 para o cadastro por unidade.
- **Recomendação: (a).** Cumpre o F-PNT-3 sem mexer na policy de quem publica norma.
- ✅ **Decidido: (a)** — dono, questionário, 21/11: *"Linha por CNPJ, via admin (Recommended)"*. Itens 7–9 e 11.
  Consequências que ficam: o contador do cliente depende do admin para o FAP de cada ano; a linha do FAP de um cliente
  fica na tabela que todos os escopos leem (o leitor filtra pela chave; sem nome nem valor de pessoa).

### F-PNT-4 — Contas de pessoal

- **(a) Contas no plano padrão + papéis no `AccountingScopeSettings`**, resolvidos por código (precedente `2.1.7.03`), o
  contador troca.
- **(b) Só os papéis;** o contador cria as contas e configura.
- **Recomendação: (a).** O plano não tem conta de pessoal (G12) e o precedente das retenções (F-RET-19 a) e da
  distribuição (F-IRD-15) foi esse. Os códigos ficam provisórios até o P-FOL-5.
- ✅ **Decidido: (a)** — dono, questionário, 21/11: *"Plano padrão + papéis (Recommended)"*.

### F-PNT-5 — Provisões de 13º e férias

- **(a) Provisionar já (PR-P4)**, todo mês, com a base contratual e aviso por vínculo com variável; ajuste e baixa no F3.
- **(b) Provisionar só no F3**, junto com os roteiros de férias e 13º e as médias.
- **(c) Não provisionar:** reconhecer no pagamento.
- **Recomendação: (a), como etapa declarada da estrutural.** A estrutural é a provisão com a base completa (médias) e a
  baixa pelo pagamento, que dependem do F3 e da resposta P-FOL-3/4. (a) entrega a competência no BP mensal agora e deixa
  o resto nomeado (aviso + encaixe). (b) deixa o BP sem provisão até o F3. (c) quebra a competência.
- ✅ **Decidido: (a)** — dono, questionário, 21/11: *"Provisionar já (Recommended)"*.

### F-PNT-6 — Como o Simples recebe a folha

- **(a) A apuração lê a folha do DP por uma porta**, com precedência sobre o histórico e alerta quando os dois existem
  (como a receita, G10).
- **(b) A ponte grava em `SimplesHistoricoMensal.folhaCents`** ao fechar a folha.
- **Recomendação: (a).** O histórico é da pré-adoção (decisão de 07/10 citada em `SimplesApuracaoService.ts:509`); gravar
  nele mistura o digitado com o derivado e um `PUT` do usuário apagaria a folha do DP sem aviso. (a) segue o precedente da
  receita e não muda o contrato do `PUT`.
- ✅ **Decidido: (a)** — dono, questionário, 21/11: *"Ler do DP (Recommended)"*.

### F-PNT-7 — Composição da folha do fator r (ambiguidade A-1/A-2; o contador fecha)

- **(a) Competência:** base CP de empregados e CI + FGTS **devido** + CPP fora do DAS **devida** da competência, com o
  alerta de leitura provisória (item 38).
- **(b) Caixa:** só o que foi **pago** e **recolhido** no mês. Precisa do pagamento e das guias, que o DP só terá no F5.
- **Recomendação: (a), provisória.** É a base que vai ao eSocial (Res. 140 art. 26 § 2º I–II [D05]) e é o que o DP tem ao
  fechar. (b) espera o F5 e o fator r segue digitado até lá. A pergunta ao contador está no dossiê §4 (A-1 e A-2); se ele
  ler (b), muda a soma do item 36 e o fechamento do mês do pagamento, não o resto.
- ✅ **Decidido: (b), contra a recomendação** — dono, questionário, 21/11: *"Caixa (pago no mês)"*. Itens 35–38
  reescritos: a remuneração paga sai das folhas fechadas pela `dataPagamento`; o FGTS e a CPP recolhidos vêm de uma porta
  cujo adaptador real é do F5. **Até o F5, o fator r segue pelo histórico digitado** (todo mês do DP sai incompleto).
  O contador ainda pode mudar a leitura (A-1/A-2); a troca muda só a soma do item 36.

### 4.2 Decididos pela casa depois do questionário (o dono pode reverter; regra 4)

| # | Pergunta | Decisão | Outro caminho razoável |
|---|---|---|---|
| C-1 | Onde marcar que o estabelecimento do Simples recolhe a CPP fora do DAS (Anexo IV) | `FiscalProfile.simplesCppForaDoDas` (por unidade), informado pelo contador (item 10) | Derivar das atividades da apuração do Simples (anexo por atividade); exige a apuração do mês antes do fechamento da folha |
| C-2 | CNPJ do estabelecimento enquanto o schema não o tem | Uma unidade: `CompanyFiscalProfile.declarante.cnpj`; mais de uma ou sem declarante: pendência bloqueante (item 11; lacuna `0736`) | Campo novo de CNPJ na unidade já nesta emenda |
| C-3 | "Montante pago" na leitura de caixa (F-PNT-7 b) | `bases.cp` **bruta** das folhas `FECHADA` pela `dataPagamento` gravada (data prevista, não a do extrato); o adiantamento conta no mês do pagamento dele (item 36) | Líquido pago; ou a data real do pagamento, que só existe com o F5 |
| C-4 | Recolhimento de FGTS/CPP sem o F5 | `RecolhimentoFolhaPort` com adaptador nulo; mês do DP sai incompleto e o histórico manda (itens 36–37) | Usar o devido como aproximação até o F5 (seria a leitura de competência, que o dono não escolheu) |
| C-5 | RAT × FAP: onde arredondar | FAP truncado na 4ª casa (norma); produto exato; arredonda só o valor da parcela (item 4) | Arredondar a alíquota ajustada antes (se o eSocial fizer assim; §6) |

## 5. Contratos (esboço materializável)

### 5.1 Tipos puros (PR-P0, PR-P3, PR-P4)

```ts
type Cents = bigint;
type RegimeCpp = 'NO_DAS' | 'ANEXO_IV' | 'GERAL';
interface EntradaCpp {
  regimeCpp: RegimeCpp;
  baseEmpregadosCents: Cents;            // soma de bases.cp dos vínculos 101/103 (sem teto)
  baseContribuinteIndividualCents: Cents; // soma de bases.cp dos 723 (e 701, se um dia entrar)
  ratGrau: 1 | 2 | 3 | null;              // null só com NO_DAS
  fapX10000: number | null;               // 5000..20000
  fpas: string | null;
  tabelas: { rat: LinhaLegal[]; fap: LinhaLegal[]; terceiros: LinhaLegal[]; regras: RegrasFolha; data: string };
}
interface CppResultado {
  patronalCents: Cents; ratCents: Cents; terceirosCents: Cents; totalCents: Cents;
  ratAjustado: Fracao;                    // ratBp × fapX10000 / 10000, exato (arredonda só o valor, item 4)
  terceirosPorEntidade: Array<{ codigo: string; bp: number; valorCents: Cents }>;
}
type PapelContabil =
  | 'SALARIOS' | 'PRO_LABORE' | 'BOLSA_ESTAGIO' | 'SALARIO_FAMILIA'
  | 'INSS_PATRONAL' | 'RAT' | 'TERCEIROS' | 'FGTS'
  | 'SALARIOS_A_PAGAR' | 'PRO_LABORE_A_PAGAR' | 'INSS_A_RECOLHER' | 'FGTS_A_RECOLHER' | 'IRRF_FOLHA_A_RECOLHER'
  | 'ADIANTAMENTOS_SALARIAIS'
  | 'PROVISAO_13' | 'PROVISAO_FERIAS' | 'PROVISAO_ENCARGOS'
  | 'DESPESA_13' | 'DESPESA_FERIAS' | 'DESPESA_ENCARGOS_PROVISAO';
interface ResumoLancamentoUnidade { unitId: string; porPapel: Record<PapelContabil, Cents>; vinculos: number }
interface FolhaFatorR { mes: string; folhaCents: Cents; origem: 'DP'; completa: boolean; falta: string | null }
interface FolhaFatorRPort { folhaPorMes(scope: AccountingScope, meses: string[]): Promise<Map<string, FolhaFatorR>> }
interface RecolhimentoFolhaPort { recolhidoNoMes(scope: AccountingScope, mes: string): Promise<{ fgtsCents: Cents; cppCents: Cents } | null> } // adaptador real no F5
```

### 5.2 Linhas de `LegalParameter` (PR-P0; `formatoLinha.ts`)

```ts
// RAT_ALIQUOTA: chave GRAU_1|GRAU_2|GRAU_3; valorInt bp 0..10000
// FAP_LIMITES:  chave MIN_X10000|MAX_X10000; valorInt 1..30000
// TERCEIROS_FPAS: chave = /^\d{3}$/; valorJson { entidades: Record</^\d{4}$/, bp>, totalBp } (totalBp = soma)
// F-PNT-3 (b) + 3b (a), dado da empresa na tabela global, publicado só pelo admin:
// RAT_GRAU_ESTABELECIMENTO: chave = CNPJ (14, CNPJ_REGEX); valorInt 1..3 (∈ chaves de RAT_ALIQUOTA)
// FAP_ESTABELECIMENTO:      chave = CNPJ (14); valorInt fapX10000 (entre FAP_LIMITES); vigência anual
// FPAS_EMPRESA:             chave = raiz do CNPJ (8); valorTexto FPAS (com linha em TERCEIROS_FPAS); valorJson? { codigoTerceiros }
```

### 5.3 Prisma (PR-P1, PR-P3; dinheiro `BigInt`, competência `String`)

```prisma
// FiscalProfile (por unidade): + simplesCppForaDoDas Boolean @default(false) (item 10)
model DpFolhaLancamento { id String @id @default(cuid()); folhaId String; folha DpFolha @relation(fields: [folhaId], references: [id], onDelete: Restrict)
  unitId String; execucaoId String; tipo String /* MENSAL | ADIANTAMENTO | PROVISAO */; estado String /* PENDENTE | LANCADO | ESTORNADO | DESCARTADO */
  sourceType String; sourceId String; journalEntryId String?; reversalEntryId String?; resumoJson String
  createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
  @@unique([folhaId, unitId, execucaoId, tipo]) @@index([folhaId]) @@map("dp_folha_lancamentos") }
// AccountingScopeSettings: + <papel>AccountId String? (Restrict) para cada papel do item 19 e do item 31.
// DpFolha.estado: + 'FECHADA'; + fechadaEm DateTime?; + fechadaPorId String?
```

### 5.4 HTTP (aditivo; sob `/api/dp`)

| Método e path | Corpo / resposta |
|---|---|
| `POST /dp/folhas/:id/fechar` | 200 `{ folhaId, estado: 'FECHADA', lancamentos: [{ unitId, tipo, estado, journalEntryId? }] }` |
| `POST /dp/folhas/:id/reabrir` | `{ motivo }` → 200 `{ folhaId, estado: 'CALCULADA', estornos: [...] }` |
| `GET /dp/folhas/:id/lancamentos` | por unidade: `{ porPapel, porConta, ok }` (tie-out, dinheiro como string) |
| `POST /dp/folhas/:id/lancamentos/reconciliar` | 200 `{ relancados, jaLancados }` |

## 6. Pendente de validação externa (não entra no checklist como decidido)

- **A-1 e A-2 do dossiê** (folha do fator r: pago × competência; CPP no fator r do Anexo III/V) — pergunta exata no
  dossiê §4. O dono escolheu a leitura de caixa (F-PNT-7 b) até o contador responder; alerta do item 38.
- **Arredondamento da alíquota ajustada (RAT × FAP)** no eSocial/DCTFWeb: não lido; o item 4 arredonda só o valor (C-5).
- **A-3 — grau de risco e FPAS do salão:** o enquadramento é da empresa (Dec. 3.048 art. 202 § 5º; IN 2.110 art. 83); o
  contador informa e o sistema só valida contra as tabelas. Nenhuma carga assume o CNAE 9602-5/01.
- **Simples com atividade mista (Anexo IV + outro anexo):** a regra de proporção da CPP não foi lida; não suportado
  (item 10).
- **MEI com empregado** (LC 123 art. 18-C): não lido; pendência `CPP_MEI_FORA_DO_ESCOPO`.
- **P-FOL-3/4/5** (PRE-ADR 22/10 §12): norma da provisão (NBC TG), base da provisão com variável e média, estrutura de
  contas. A base contratual do item 30 é etapa, não regra decidida.
- **Conferência da folha do F2** (11 goldens, 19 rubricas): segue aberta (F2 §5). O lançamento herda o mesmo grau: prova
  que a ponte transporta o resultado do motor, não que o resultado está certo.

## 7. Insumos ausentes

- Anexo V do Dec. 3.048 (CNAE → grau de risco) e Anexo II da IN RFB 2.110 (quadros do FPAS): não lidos (dossiê §5).
- Regra da CPP do Simples com atividade mista e do MEI com empregado (acima).
- O código do PR-3..PR-6 do F2 (em execução por outra sessão, sem branch no remoto em 21/11): os nomes `DpFolha`,
  `DpExecucaoCalculo`, `DpResultadoVinculo` e `bases` saem do BRIEF do F2 §3, não do código. Conferir no PR-P0 contra o
  que entrou.

## 8. Encaixes (o que esta emenda prepara e outro BRIEF faz)

| Encaixe | Onde entra | O que esta emenda deixa |
|---|---|---|
| Baixa das provisões no pagamento de férias e 13º; médias de variáveis na base | F3 | Contas `PROVISAO_*`, `DpFolhaLancamento` tipo `PROVISAO`, aviso `PROVISAO_BASE_SEM_MEDIAS` |
| Rescisão, férias e 13º como lançamento próprio (`dp.folha.rescisao` etc.) | F3 | O serviço aceita `tipo` novo sem mudar o par de commits |
| S-1005 (RAT, FAP, FPAS do estabelecimento) | F4 | Linhas `RAT_GRAU_ESTABELECIMENTO`, `FAP_ESTABELECIMENTO`, `FPAS_EMPRESA` |
| FGTS e CPP **recolhidos** no mês (fator r pela leitura de caixa) | F5 (guias) | `RecolhimentoFolhaPort` com adaptador nulo (item 36) |
| DCTFWeb (declarar a CPP), guias (DARF, GFD), pagamento do líquido (título a pagar / banco), conferências S-5011 × razão e GFD × FGTS a recolher | F5 restante / X9 | Passivos `*_A_RECOLHER` e `*_A_PAGAR` por competência |
| Folha do fator r pela leitura de competência, se o contador ler assim | — | A porta do item 35 muda só a soma |
| Guarda de dobra com `PROVISOES-AGENDADAS` | Quando o nó nascer | Item 33 |

## 9. Achados fora de escopo (registrados na caixa, não planejados)

Ids na 1ª linha do relatório da sessão e no corpo do PR (todas com `--pai L-20261121-181950-5cb9`).

1. `L-20261121-193953-ea64` — Rateio da despesa de pessoal por centro de custo (F-FOL-5 de 22/10) — `PostingDimension` já existe; sem nó.
2. `L-20261121-193954-e9c8` — Comissão de venda (`commissions` do preset) → `DpLancamento` `COMISSAO` do empregado CLT (F-FOL-6 de 22/10): hoje o
   operador digita a comissão no DP; a venda não alimenta.
3. `L-20261121-193955-95f3` — O alerta "TEXTO MUDOU" do Dec. 3.048 no dossiê `parecer-salao-sp-4-pessoas` (D40), que o `legal.py` acusou nesta
   sessão: conferir se a conclusão daquele dossiê ainda vale.
4. `L-20261121-193957-8ae3` — A simulação usa `folhaCents` (folha do fator r, **com** encargos) como base da CPP (`taxSimulation.ts:224`): a base da
   CPP é a remuneração, sem FGTS nem CPP. O item 39 corrige quando há folha do DP; nos meses só com histórico o erro
   continua (aviso).
5. `L-20261121-193958-0736` (fork) — o schema não guarda CNPJ por unidade; o enquadramento por CNPJ (F-PNT-3b) precisa
   dele (item 11).
6. `L-20261121-194408-54c2` (spec) — com a leitura de caixa (F-PNT-7 b), o fator r do DP depende do recolhimento
   de FGTS/CPP, que é do F5 (sem BRIEF): até lá a lacuna de origem não fecha pelo `comoProvar` dela.

## 10. Write-set

| PR | Arquivos |
|---|---|
| PR-P0 | `server/src/features/dp/models/folha/cpp.ts` (+ `__tests__`); `server/prisma/data/legal_parameters_dp_encargos_v1.sql`; `server/src/features/legalParameters/models/legalParameter.ts`; `server/src/features/legalParameters/models/formatoLinha.ts`; `server/src/features/legalParameters/dtos/__tests__/__dto-shapes__.json`; `server/test/helpers/legalParams.ts` |
| PR-P1 | `server/src/features/dp/models/enquadramentoCpp.ts` (+ `__tests__`); `server/src/features/legalParameters/models/legalParameter.ts`; `server/src/features/legalParameters/models/formatoLinha.ts`; `server/src/features/legalParameters/dtos/__tests__/__dto-shapes__.json`; `server/prisma/schema.prisma` (`FiscalProfile.simplesCppForaDoDas`); `server/prisma/migrations/**`; `server/src/features/accounting/dtos/FiscalProfileDto.ts`; `server/src/features/accounting/services/FiscalProfileService.ts`; `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` |
| PR-P2 | `server/src/features/dp/services/DpFolhaService.ts`; `server/src/features/dp/models/erros.ts`; `server/src/controllers/dpFolhaController.ts`; rotas/openapi/schema/migração/auditoria como no PR-P1 |
| PR-P3 | `server/src/features/dp/services/DpFolhaContabilService.ts`; `server/src/features/dp/models/contabil/**`; `server/src/features/dp/repositories/*Lancamento*`; `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts`; `server/src/features/accounting/services/AccountingScopeSettingsService.ts`; `server/src/features/accounting/dtos/AccountingScopeSettingsDto.ts`; `my-app/types/contracts/accounting/*.gen.ts`; schema/migração/auditoria/rotas/openapi |
| PR-P4 | `server/src/features/dp/models/contabil/provisao.ts`; `DpFolhaContabilService.ts`; papéis e contas do PR-P3 |
| PR-P5 | `server/src/features/accounting/ports/FolhaFatorRPort.ts`; `server/src/features/accounting/ports/RecolhimentoFolhaPort.ts`; `server/src/features/dp/adapters/FolhaFatorRDpAdapter.ts`; `server/src/features/accounting/services/SimplesApuracaoService.ts`; `server/src/features/accounting/services/TaxSimulationService.ts`; `server/src/features/accounting/models/taxSimulation.ts`; `my-app/public/locales/{pt,en}/*.json` (alertas) |

**Registros (PAR-001):** `server/src/lib/factory.ts`, `server/src/routes/index.ts` (se a rota nova não couber no
`routes/dp.ts`), `server/prisma/schema.prisma`, `server/src/routes/docs/dp.paths.ts`, `server/test/helpers/db.ts`
(`resetDb`), `server/src/jobs/PurgeDeletedRecords.ts`, `accountingResetClassification`.

## 11. Perfil previsto por PR (previsão, não decisão)

| PR | Perfil | Por quê |
|---|---|---|
| PR-P0 | opus-medio | Três tabelas com fonte e a função com truncamento do FAP |
| PR-P1 | opus-baixo | Três tabelas de formato e um leitor; um campo no perfil |
| PR-P2 | opus-medio | Máquina de estado com estorno como gate autoritativo |
| PR-P3 | opus-alto | 2 commits + reconcile, contas por papel, tie-out e balanceamento por propriedade |
| PR-P4 | opus-medio | Provisão pura + segundo lançamento no mesmo serviço |
| PR-P5 | opus-medio | Porta sem ciclo, precedência no Simples e troca na simulação |

## 12. Riscos (incluindo os vieses do autor)

- **Sem oráculo, em cadeia.** A folha do F2 não foi conferida; o lançamento e o fator r herdam o erro dela. Mitigação:
  alertas de leitura provisória, `RUBRICAS_CONFERIDAS_PELO_CONTADOR = false` visível, e o go-live em 2027 (memória
  `go-live-em-2027`). O gate humano (folha + provisão + S-5011 + GFD do contador ao lado do razão, PRE-ADR 22/10 §10
  item 12) fica para o F5, com runbook.
- **Fator r errado muda o anexo.** Para quem tem atividade do § 5º-I (fator r), o FS12 decide Anexo III × V. O alerta do
  item 38 sai em toda apuração até o contador responder.
- **Reabertura em período fechado.** Bloqueada por desenho (item 14); a correção vira lançamento de ajuste manual. Se o
  dono preferir ajuste automático no mês seguinte, é fork novo.
- **Leitura adotada que pode estar errada:** "Anexo IV paga RAT" (dossiê §1.2: o § 5º-C remete ao art. 22 inteiro, que
  inclui o II). Se o contador ler diferente, troca uma linha do `cppPatronal`.
- **Caso adversarial tentado:** pró-labore acima do teto. A CPP patronal de 20% não tem teto (art. 22 III), o INSS do
  sócio tem; o item 6 prova com propriedade. O segundo: duas unidades com FAP diferente na mesma folha — o lançamento é
  por unidade (F-PNT-2) e o enquadramento é por CNPJ, então cada unidade usaria o seu; **hoje** isso trava no item 11
  (sem CNPJ por unidade), então o caso só fica coberto quando a lacuna `0736` for decidida. O que **não** tentei: empresa com estabelecimento
  em município com FPAS diferente (IN 2.110 art. 91 diz que o FPAS é da raiz, então não deveria acontecer).
- **Viés do autor:** reusar o molde do C8 e da receita do Simples em tudo. O contrapeso está nos forks: (b) do F-PNT-6
  (gravar no histórico) é menos código e foi descrito com o custo real.
