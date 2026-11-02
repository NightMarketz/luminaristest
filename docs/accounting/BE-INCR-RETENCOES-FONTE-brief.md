# BE-INCR-RETENCOES-FONTE — BRIEF (nó RETENCOES-FONTE, materializa o PES-2)

> **Sessão:** `sessao-planejamento` (agente). Saída = este documento + fold da nota do nó + dossiê legal. **Sem código, sem
> `executa`, sem merge.**
> **Base:** `origin/main` `882cd0fb` (22/10). Insumos de decisão: ADR `ADR-INCR-RETENCOES-FONTE` (D1–D10, §6, §7, §13),
> cédula [[D-2026-10-21-FORKS-RETENCOES-FONTE]] (F-RET-1..8) e triagem [[D-2026-10-21-TRIAGEM-CONTADOR-F1]] (F-RET-6, F-RET-9,
> acúmulo do DARF < R$ 10).

## Emenda 22/10 — cruzamento com a Reinf (PR #848)

> **Aprovação do dono** (chat, 2026-10-22, repassada pela sessão de origem): *"Manda as correções para as sessões de
> retenções e da Reinf: tabela única com dono no RETENCOES-FONTE carregada com a leitura oficial da Reinf, porta de leitura
> no backend, código AGREGADO nas 3 linhas da CSRF, filtro de tributo na invariante 4 e o R-4010 de PF por serviço como
> lacuna até o nó de pes[soal]"*. Escopo: só o BRIEF e a nota do nó. **Nenhum fork é ratificado por esta emenda.**

1. **Uma tabela de cada, com dono aqui.** `NATUREZA_RENDIMENTO` (item 7) e `RETENCAO_CODIGO` (item 2) são as **únicas**
   tabelas e nascem no PR-1 deste nó. As tabelas `REINF_NATUREZA_RENDIMENTO` e `REINF_CODIGO_RECEITA` do BRIEF da Reinf
   deixam de existir; a Reinf lê estas.
   - **Carga:** a leitura oficial que a sessão da Reinf fez: Tabela 01 e tabelas "R-4020"/"R-4010" de 15/01/2026, dossiê
     `pesquisas-legais/verif-2026-10-22-efd-reinf-brief` [D02] (branch `claude/brief-efd-reinf-b0063b`), zip
     `EFD-REINF - Tabelas 15012026.zip` do portal SPED, SHA-256 `31c04713b92a965c7413190a21dfc1b8eab4b10002a58371506da758e770b1a7`.
     Ela cobre o grupo 15 inteiro (15001–15099), a 12001 (duas linhas por vigência: até 2025-12-31 sem tributo; desde
     2026-01-01 com IR) e a 12016.
   - **Status:** `PUBLISHED` onde há leitura oficial citada. `DRAFT` só no que não tem fonte: o código GPS/DCTFWeb do INSS
     retido (P-RET-6) e o `INSS/CPRB` (P-RET-8).
   - **10002** (trabalho sem vínculo, IRPF `058807`, lido no mesmo [D02]) **não** entra na carga listada. Entra na mesma
     condição do BRIEF da Reinf (F-REINF-9 a) e do F-RET-17 (a). Até lá, a retenção de PF grava `codigoReceita = null` com
     aviso (item 2).
   - **Vocabulário do discriminador (um só):** `IRPJ | IRPF | CSLL | COFINS | PIS | AGREGADO | INSS`, o mesmo das tabelas
     "R-4020"/"R-4010", que separam o IR de PJ do IR de PF. A coluna `TaxWithholding.tributo` continua `IRRF`. A busca do
     código mapeia `IRRF` + beneficiário CNPJ ⇒ `IRPJ` e `IRRF` + beneficiário CPF ⇒ `IRPF`, pelo `taxId` (item 5). Esse
     mapa é determinístico, então **não abre fork**.
2. **Porta de leitura no backend** (item 23, §5.4): `ITaxWithholdingReadPort.findMadeForReinf(scope, competencia)`,
   implementada pelo `TaxWithholdingRepository` e injetada pela factory. A Reinf consome a porta sem HTTP. O formato é
   `WithholdingLineViewSchema` + `settlementId` + `originSettlementId`, usados para agrupar por pagamento.
3. **CSRF até 2026-12-31:** **cada uma das 3 linhas** (CSLL, COFINS, PIS) grava `codigoReceita` = o código **AGREGADO**
   (`595207`, "5952" + variação, linha `AGREGADO` da `RETENCAO_CODIGO`). O título de imposto é um só. A Reinf decide entre
   informar agregado ou separado pelo código de cada linha (F-REINF-8 a). Desde 2027-01-01 há uma linha CSLL com o código
   do discriminador `CSLL` (`598707` na tabela de 15/01/2026). Se a RFB publicar uma tabela nova para 2027, ela substitui
   esta pela vigência.
4. **Dependentes:** o §5.4 entrega só a **quantidade** de dependentes (`pf.dependentes`). O **R-4010 de PF por serviço**
   (`ideDep` com CPF e relação) fica como **lacuna até o nó de pessoal**, que é dono do cadastro de dependentes (§8 item 5).

Itens afetados: 2, 7 e 23, §5.4, §6 (F-RET-16) e §8.

> **RATIFICAÇÃO 22/10/2026** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]; dono, chat, 2026-10-22: "Dispara 1 pra ratificar os forks", respostas no
> AskUserQuestion): **F-RET-10..19 todos (a)**, a recomendação do BRIEF. PR-2 e PR-3 deixam de esperar fork; cada PR
> continua precisando do próprio `executa`. F-RET-16 (a) e F-RET-18 (a) foram perguntados em par com F-REINF-8/9.

## Emenda 28/10 — fila de pesquisa de 27/10 (blocos 1, 2 e 4)

> **Pedido do dono** (chat, 2026-10-28): *"Faz o fold dos achados da fila de pesquisa de 27/10 (blocos 1 a 6) no vault e
> nos BRIEFs, junto com os 7 dossiês, num PR sem merge."* Escopo: este BRIEF e a nota do nó. **Só fato de fonte oficial:
> nenhum fork é ratificado, e não é `executa`.** Resumo da fila: [[PESQUISA-FILA-2026-10-27]].

1. **P-RET-6: código 116201.** Com a DCTFWeb, a retenção do art. 31 da Lei 8.212 sai com o código de receita **116201**, o
   mesmo para 11% e 3,5%; o adicional de retenção (aposentadoria especial, IN 2.110 art. 131) sai com **114106**. A Reinf
   devolve os códigos no retorno do R-2010 (MOU 2.1.2.1, totalizador da série R-2000, item 1.1; dossiê
   `pesquisas-legais/fila-2026-10-27-p-ret-6-8` [D03]). O GPS 2631 citado no ADR é do regime anterior à DCTFWeb e não vai
   para a linha `INSS` da `RETENCAO_CODIGO`. **Efeito:** a linha `INSS` do item 2 pode sair de `DRAFT` com `116201`.
2. **P-RET-8: 3,5% até 2027, 11% desde 2028.** Vale para contratada optante pela CPRB em atividade do caput do art. 7º da
   Lei 12.546 (TI e TIC, call center, transporte rodoviário coletivo de passageiros, construção civil nos grupos CNAE 412,
   432, 433 e 439): art. 7º § 6º e art. 9º-A, na redação da Lei 14.973/2024 (mesmo dossiê, [D01], compilada); a SC Cosit
   153/2026 fixa os 3,5% de 2025 a 2027 e os 11% a partir de 01/01/2028 ([D02], ementa lida no SIJUT). Sem opção pela CPRB,
   11%. **Efeito:** a linha `INSS/CPRB` do item 1 pode sair de `DRAFT` com 350 bp de 2025-01-01 a 2027-12-31 e 1100 bp
   desde 2028-01-01.
3. **P-RET-5: regra, não pergunta.** Só os serviços dos arts. 111 (cessão ou empreitada) e 112 (só cessão) da IN RFB
   2.110/2022 sofrem os 11%, e as listas são exaustivas (art. 113). Cessão é serviço contínuo com trabalhador à disposição
   (art. 108 § 1º). Dispensas no art. 115: nota abaixo do mínimo, prestador sem empregado até 2 tetos e profissão
   regulamentada exercida pelos sócios, as duas com declaração. Simples: o tomador do Simples retém (art. 133); o prestador
   do Simples só sofre se for do Anexo IV (arts. 166 e 167). Leitura no SIJUT, visão vigente, em 27/10 (dossiê
   `fila-2026-10-27-p-ret-5` [D01]). **Efeito:** o `inss` do perfil fica decidível com 4 dados do cadastro do fornecedor:
   o serviço (Tabela 06 da Reinf, `inssTpServico`), cessão ou empreitada, Simples e anexo, e a declaração de dispensa.
   Nenhum vai ao contador; o texto de ajuda cita o art. 108 § 1º. Quais desses 4 já existem no `WithholdingProfile` se
   confere no `executa` do PR-3/PR-4.
4. **P-RET-7: a tabela incide sobre a soma do mês.** RIR/2018 art. 677 § 2º: havendo mais de um pagamento no mês pela
   mesma fonte, "será aplicada a alíquota correspondente à soma dos rendimentos pagos à pessoa física" (cópia do Planalto
   de 21/10, dossiê `triagem-2026-10-21-contador-pacote-f1` [D05]). Confirma o F-RET-17 (a).
5. **P-RET-9 (= P-REINF-8): vira confirmação de sim ou não.** O manual da Reinf (item 11) e o FAQ oficial (1.17) mandam o
   rendimento do trabalho ao eSocial; o R-4010 de PF fica para pagamento sem relação de trabalho (dossiê
   `fila-2026-10-27-bloco2-reinf` [D01], [D05]). Pergunta: *"Autônomo PF que já entra no eSocial (S-1200/S-1210):
   confirmamos que não vai R-4010?"*
6. **Linha DRAFT de 21/10 (natureza e DARF do contador): descartada.** Os DARF 1708, 5952 e 8045 conferem com a tabela
   "R-4020"; as naturezas 13003, 13007 e 15001 não (são arrendamento, juros de alienação a prazo e cooperativa). A carga
   do PR-1 (`legal_parameters_retencoes_v1.sql`) já veio da Tabela 01 oficial e não as contém: nada muda no código (dossiê
   `fila-2026-10-27-bloco4-draft` [D01]).
7. **Lacunas que ficam:** o mínimo do documento de arrecadação do art. 115 I na DCTFWeb (o item usa R$ 10 do DARF), o teto
   do salário de contribuição de 2026 (art. 115 II) e a IN RFB 2.053/2021 (arts. 2º-A e 11, citados pela SC 153).

## TLDR (2 linhas)

Quatro PRs: **PR-1** grava as tabelas (alíquotas com a vigência de 2027, mínimos, códigos, natureza do rendimento,
tabela progressiva de PF), o regime da contraparte e o perfil de retenção; **PR-2** grava as retenções **feitas** em AP
(reconhecimento e baixa), o título de imposto por código e a **saída que a EFD-Reinf lê**; **PR-3** grava as **sofridas**
em AR e no F7; **PR-4** liga as sofridas ao X7/X8.
**Risco principal:** o ADR não cabe no código de `main` em quatro pontos: o `postEntry` abre tx própria, o título de
imposto não pode ter reconhecimento próprio, o X8 **já lança** PIS/Cofins retido e não há passivo de ISS no razão. Daí os
**10 forks novos F-RET-10..19**, ~~todos PENDENTES~~ **ratificados em 22/10/2026** (ver o quadro acima); PR-2 e PR-3 só recebem `executa` próprio.

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `RETENCOES-FONTE`, nota `docs/plano/nos/RETENCOES-FONTE.md` (régua F, seção F1; âncora SDD §M7.1).
- **Autorização:** dono, chat, 2026-10-22, repassada pela sessão de origem: *"Precisamos agora de sessões para a falta de
  brief"*. Limite: só o BRIEF (sessao-planejamento), só docs, sem código, sem `executa`, sem merge.
  - **Passo 1 (cobertura):** cobre exatamente o BRIEF deste nó. O campo `autorizacao` da nota ainda diz *"Só o PRE-ADR e
    esta nota"* (Q2 (a) de 20/10) e a cédula de 21/10 diz *"o BRIEF precisa de pedido próprio"*. **Este é o pedido
    próprio.** O fold (§10) registra a citação de 22/10 no `estado_detalhe`. O campo `autorizacao` não muda, porque o BRIEF
    não autoriza código.
- **Insumos (fato consumado):** ADR `docs/adr/ADR-INCR-RETENCOES-FONTE.md`; cédulas `D-2026-10-21-FORKS-RETENCOES-FONTE` e
  `D-2026-10-21-TRIAGEM-CONTADOR-F1`; triagem `docs/accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-10-21-PACOTE-F1.md`; dossiês
  `pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs` e **`pesquisas-legais/brief-2026-10-22-retencoes-fonte`**
  (novo, §0.1); nota do nó (`write_set`, `registros`); nota da sessão do BRIEF EFD-REINF (22/10, pasta de notas do grupo);
  ADR `ADR-INCR-EFD-REINF` §5–§7.
- **Nós vizinhos:** consome FIN-01 (`Payable`/`PayablePayment`), FIN-02 (`Receivable`/`ReceivableReceipt`), COUNTERPARTY
  (`Counterparty.taxId`), LEGAL-PARAMS (`LegalParameter`, `linhaLegalVigente`, `SemLinhaVigenteError`, `fotografia`),
  F7 (`BankSettlementItem`, `SHORTFALL_TREATMENTS`, `SETTLEMENT_KINDS`), X7 (`TaxAssessmentService.linhasIrpjCsll`,
  `RETIDO_MESES`), X8 (`linhasPisCofins`, `pisCofinsRetidoCompensarAccountId`/`pisCofinsRetencaoConciliarAccountId`),
  calendário (`packages/models/validity.ts` `isHoliday`, tabelas `FERIADO_NACIONAL`/`FERIADO_LOCAL`), X6
  (`Payable.recoverableTaxLines`). É consumido por **EFD-REINF** (contrato §5.4), X7 item 15, X8 e IBS-CBS-2027 (nada muda
  lá: as retenções de IBS/CBS não existem, a LC 214 trocou isso pelo split).

**Fronteira (STOP do CLAUDE.md):** o perfil, a retenção e o título de imposto seguem desenho de lei, igual para todos, e
precisam de atomicidade com o título de origem e o razão. Por isso ficam em **Prisma first-class**
(ADR-PERSISTENCE-BOUNDARY; ADR §4). A matriz de incidência é **dado** (tabela + `WithholdingProfile`), aplicada por função
pura chamada pelo serviço de AP/AR. Nada aqui toca `DynamicTableService`, `RuleContext` ou plugin.

### 0.1 Verificação legal (22/10, `legal.py`)

Dossiê `pesquisas-legais/brief-2026-10-22-retencoes-fonte/relatorio.md`, com documentos [Dnn] daquele dossiê:

- Os artigos do dossiê de 20/10 foram relidos e **conferem**: RIR arts. 714, 785 [D09]; Lei 10.833 arts. 30 § 2º, 31 § 3º,
  32 III, 35 [D01]; LC 214 arts. 509, 544 III [D10]; Lei 8.212 art. 31 [D06]; Lei 9.430 art. 68 [D05]; Lei 11.196 art. 70
  I "e" [D08].
- **Lista do art. 714 § 1º lida** (era o insumo ausente 2 do ADR): **estética e beleza não estão** nos 40 itens.
  Fisioterapia (XX), medicina (XXIV), odontologia (XXVI), nutricionismo (XXV) e psicologia (XXXII) estão. Para o salão como
  tomador, quase todo serviço contratado fica fora do IRRF de 1,5%. Para a clínica, a PJ médica prestadora sofre IRRF.
- **Novo por F-RET-7 (b), PF:** RIR art. 685 (trabalho não assalariado → tabela progressiva) [D09]; Lei 11.482 art. 1º XII
  (tabela mensal desde 05/2025) [D02]; **Lei 9.250 art. 3º-A** (redução mensal desde 01/2026, Lei 15.270) e art. 4º II, III
  "i", IV e § 2º (deduções, dependente R$ 189,59, desconto simplificado de 25% da faixa zero) [D11]; Lei 10.666 art. 4º
  (INSS do contribuinte individual, que fica no nó de pessoal) [D12].
- **Alerta resolvido:** a Lei 9.250 compilada do acervo (cópia de 13/10) **não traz o art. 3º-A**. É evidência de texto mais
  novo, então o texto foi conferido no **Planalto** [D11].
- **Detalhe que muda o vencimento:** a Lei 8.212 art. 31 manda recolher até o dia 20 **"ou até o dia útil imediatamente
  anterior"**. O IRRF e a CSRF vencem no "último dia útil do 2º decêndio". Os três dão o mesmo resultado: o dia 20, ou o
  dia útil anterior a ele.

## 1. Forks ratificados que este BRIEF aplica

| Fork | Ratificado | Efeito no checklist |
|---|---|---|
| F-RET-1 | (a) dois nós | este BRIEF + EFD-REINF; item 32 marca o PRE-ADR de pessoal como "superado por" |
| F-RET-2 | (a) 4 PRs | §3. A ordem do ADR §6 vale (PR-3 = AR, PR-4 = X7/X8/ISS). A cédula resume "PR-3 liga X7/X8", mas a referência dela é o §6 |
| F-RET-3 | (a) completo | IRRF + CSRF + INSS 11% + ISS retido, com perfil (itens 6–9, 14–20) |
| F-RET-4 | (a) proporcional por baixa | itens 17–18; mínimo da CSRF por **pagamento** |
| F-RET-5 | (a) regime no cadastro | item 5 (`Counterparty.regimeTributario` + declaração de optante) |
| F-RET-6 | (a), **emendado pela triagem de 21/10** | dispensa ≤ R$ 10 só para beneficiário Real/Presumido/Arbitrado (RIR art. 785 II); os demais seguem "reter > 0" (item 10) |
| F-RET-7 | **(b) incluir PF** (contra a recomendação) | itens 3 e 11; desenho do F-RET-17 (fork novo, §6) |
| F-RET-8 | (a) sugestão | itens 28–30; o manual ratificado prevalece |
| F-RET-9 | **baixa do ISS devido**, sem ativo (triagem 21/10) | item 25. Não há passivo de ISS no razão: ver F-RET-15 |
| Triagem 21/10 | DARF < R$ 10 acumula no mesmo código (Lei 9.430 art. 68 § 1º) | item 20 |

## 2. Onde o código de `main` obriga a corrigir o ADR (CBM-001: lido no arquivo)

| # | ADR diz | Código mostra | Consequência |
|---|---|---|---|
| C1 | D6: título de imposto na "mesma tx" do título de origem | `PayableService.createPayable` grava a linha na tx1 e o razão num `postEntry` separado (`PayableService.ts:288-353`; cabeçalho `atomicUntil`, l. 4-7). Memória "postEntry abre tx raiz" | `TaxWithholding` e o upsert do título de imposto entram na **tx1** (linha); as pernas vão a `postEntry` próprio, com re-drive em `reconcilePayables` (itens 15, 21) |
| C2 | D7: reconhecimento com 3 créditos (C fornecedor líquido + C a recolher) | `Payable.amountCents` é o bruto, e `paidCents` (cache do gate de soma) só fecha com baixas (`PayableService.ts:573-600`). Um C fornecedor líquido deixa o título aberto para sempre ou quebra o tie-out de 2.1.2 | **F-RET-10**: a retenção vira uma baixa sem caixa |
| C3 | D6: título de imposto = `Payable` | todo `Payable` posta D despesa / C 2.1.2 no reconhecimento (`buildRecognitionInput`, l. 1227) e D 2.1.2 / C banco na baixa. O passivo da retenção já nasceu na conta "a recolher" | **F-RET-11**: o título de imposto **não** pode ter reconhecimento próprio |
| C4 | §6 item 7: `kind = 'WITHHOLDING'` "molde DISCOUNT" | `SETTLEMENT_KINDS = ['PAYMENT','DISCOUNT']` (`BankSettlement.model.ts:70`) não tem consumidor fora do model (a Emenda 3.3 PR-3 não foi executada). `PayablePayment.method` é NOT NULL, com mapa fechado para a conta de crédito | WITHHOLDING é o **1º kind sem caixa realmente usado**: método e conta saem do `kind` (item 14) |
| C5 | D7: AR debita "IRRF/CSRF a compensar" | o X8 **já lança** PIS/Cofins retido: D retido a compensar / C retenções a conciliar e D a recolher / C retido a compensar (`TaxAssessmentService.ts:664-678`), a partir do valor informado | lançar de novo no AR conta duas vezes. Ver **F-RET-14** |
| C6 | D7/F-RET-9: ISS sofrido baixa o "ISS devido" | não há conta nem provisão de ISS próprio no razão (grep `issRecolher` = 0); o ISS da Fase C é só relatório (`issCompetencia.ts`) | **F-RET-15** |
| C7 | D3: códigos em `CODIGO_RECEITA` | `tabelaApuracaoDe` pega **toda** linha `CODIGO_RECEITA` sem discriminador (`taxAssessmentParams.ts:73`) e o `formatoLinha` só aceita nomes de IRPJ/CSLL ou PIS/COFINS com modalidade (`formatoLinha.ts:99-108`). `familiasDaLinha` manda o resto ao X7 (`TaxAssessmentRecalcService.ts:42`) | os códigos de retenção ficam em **tabela própria** `RETENCAO_CODIGO`, por natureza do rendimento (item 2); sem isso, uma linha nova dispararia o recálculo do X7 |
| C8 | D6/§13.8: "função de dias úteis já usada no IRRF-DISTRIBUICAO" | não existe em `main` (grep `decêndio` = 0 em `src/`). Existe `isHoliday` (`packages/models/validity.ts:92`), já importado pela contabilidade (`models/expiryKey.ts`) | o item 4 cria `vencimentoRetencao` puro; o IRRF-DISTRIBUICAO reusa |
| C9 | D8: o resumo por código basta à Reinf | nota da sessão EFD-REINF (22/10, MOU 2.1.2.1): R-4020/R-4010 são **por pagamento** (`dtFG`, beneficiário, `natRend`, bruto, base e valor por tributo); R-2010 é por NF (`serie`, `tpServico`, `indCPRB`) | contrato de saída = **linhas** + resumo (§5.4); perfil ganha `natRend` e campos do R-2010 (**F-RET-16**) |

## 3. Fatiamento (F-RET-2 a) — cada PR com `executa` próprio

| PR | Conteúdo | Itens | Forks que travam o `executa` | Depende de |
|---|---|---|---|---|
| **PR-1** dado e perfil | tabelas `RETENCAO`, `RETENCAO_CODIGO`, `NATUREZA_RENDIMENTO`, `IRRF_PF_MENSAL`; vencimento; regime da contraparte; `WithholdingProfile`; contas | 1–9 | F-RET-16, F-RET-17 (só a tabela de PF), F-RET-19 | — |
| **PR-2** feitas (AP) + saída da Reinf | `calcularRetencoes`, retenção no reconhecimento e na baixa, título de imposto, estorno, F7 do lado AP, leitura das feitas | 10–23 | F-RET-10, 11, 12, 17, 18 | PR-1 |
| **PR-3** sofridas (AR) | retenção no recebimento, F7 do lado AR, resumo das sofridas | 24–27 | F-RET-13, 14, 15 | PR-1 (PR-2 para o resumo comum) |
| **PR-4** ligação X7/X8/ISS | sugestão na prévia e baixa do IRRF/CSLL retido no X7 | 28–31 | F-RET-14 | PR-3 |

O **PR-1 não espera fork de lançamento**: só os três da tabela acima, que são de forma de dado. A EFD-REINF consome o PR-2
(§5.4).

## 4. Checklist numerado (cada item = ≥ 1 teste)

Caminhos relativos a `server/`. Padrão de camada obrigatório (Contrato §2/§3): Route → Controller → Service → Repository →
Prisma + Policy, Factory, DTO Zod `.strict()`, soft-delete, rota em 2 toques. Migração SQLite com prólogo defensivo (memória
"migração SQLite sem transação"). Toda coluna nova é nullable (memória do `inventoryMultiItem`: NOT NULL com default
reconstrói a tabela).

### PR-1 — dado e perfil

1. **Tabela `RETENCAO`** em `LEGAL_PARAMETER_TABELAS` + regra em `formatoLinha.ts` + semente (migração de dado):
   `CSRF/CSLL` 100 bp, `CSRF/COFINS` 300 bp, `CSRF/PIS` 65 bp de 2004-02-01 a **2026-12-31** (Lei 10.833 arts. 30–31
   [D01]); `CSRF/CSLL` 100 bp desde **2027-01-01**, sem Cofins/PIS (LC 214 art. 509; art. 544 III [D10]);
   `IRRF/SERVICO_PROFISSIONAL` 150 bp (RIR 714 [D09]); `IRRF/LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO` 100 bp (RIR 716);
   `IRRF/COMISSAO_PROPAGANDA` 150 bp (RIR 718); `INSS/CESSAO_MAO_DE_OBRA` 1100 bp (Lei 8.212 art. 31 [D06]);
   `MINIMO/CSRF` 1000 centavos (art. 31 § 3º); `MINIMO/IRRF` 1000 centavos com discriminador `REAL|PRESUMIDO|ARBITRADO|PF`
   (RIR 785 I–II [D09], triagem 21/10); `MINIMO/DARF` 1000 centavos (Lei 9.430 art. 68 [D05]). Todas `PUBLISHED` com
   `fonte`, menos a de `INSS/CPRB` (3,5%, não lida), que nasce `DRAFT` sem valor (§7). Teste: leitura por data em 2026-12-31
   e 2027-01-01 (invariante 1); proposta fora do formato ⇒ 400.
2. **Tabela `RETENCAO_CODIGO`** (C7; **única**, Emenda 22/10 item 1): chave = `natRend` (5 dígitos), discriminador =
   tributo (`IRPJ|IRPF|CSLL|COFINS|PIS|AGREGADO|INSS`), `valorTexto` = código de 6 dígitos, `valorJson = { periodicidade }`.
   Carga das tabelas "R-4020"/"R-4010" de 15/01/2026 (zip SHA-256 `31c04713…`, dossiê da Reinf [D02]), **`PUBLISHED`** com
   `fonteSha256`. Testes: 15022 × IRPJ = `170806`, × AGREGADO = `595207`; 15052 só IRPJ `804506`; 12016 × IRPF = `570602`;
   12001 × IRPF em 2026-03 = `184101`. `INSS` ⇒ código GPS/DCTFWeb **`DRAFT`** sem valor (o ADR cita 2631, grau I, tabela
   não lida; P-RET-6). A busca mapeia `IRRF` + CNPJ ⇒ `IRPJ` e `IRRF` + CPF ⇒ `IRPF`. Até 2026-12-31, CSLL/COFINS/PIS buscam
   o discriminador `AGREGADO` (Emenda item 3). `familiasDaLinha`
   devolve `[]` (não reabre X7/X8). Teste: sem linha `PUBLISHED`, a retenção grava `codigoReceita = null` com aviso
   `CODIGO_RECEITA_DRAFT` e o título de imposto fica `null` (item 19). **O cálculo não bloqueia**: reter é obrigação, o código
   só agrupa o DARF.
3. **Tabela `IRRF_PF_MENSAL`** (F-RET-7 b; desenho no **F-RET-17**): faixas da Lei 11.482 art. 1º XII desde 2025-05-01
   (`FAIXA_n` com `valorJson {ateCents, aliquotaBp, deduzirCents}`) [D02]; `REDUCAO_ART3A` desde 2026-01-01 (`{limiteZeroCents:
   500000, tetoCents: 735000, constanteCents: 97862, coeficienteMilionesimos: 133145}`) [D11]; `DEPENDENTE` 18959 desde
   2015-04-01 (art. 4º III "i"); `DESCONTO_SIMPLIFICADO_BP` 2500 sobre o teto da faixa zero (art. 4º § 2º). Teste: rendimento
   de R$ 5.000,00 sem dedução ⇒ IR zero; R$ 7.350,01 ⇒ sem redução; R$ 6.000,00 ⇒ redução = 978,62 − 798,87 (arredondamento
   HALF_UP em centavo, regra do `pisCofinsCalc`).
4. **`models/vencimentoRetencao.ts`** (pura, C8): `ultimoDiaUtilAteDia20(competencia, feriados, codMun)` = dia 20 do mês
   seguinte, recuado ao dia útil anterior se cair em sábado, domingo ou feriado (`isHoliday`, precedente `expiryKey.ts`). Vale
   para IRRF (Lei 11.196 art. 70 I "e" [D08]), CSRF (Lei 10.833 art. 35 [D01]) e INSS (Lei 8.212 art. 31 [D06]). A
   competência do IRRF é a do fato gerador; a da CSRF, a do pagamento; a do INSS, a da emissão da NF. Teste: 2026-03 ⇒
   2026-04-20 (seg); um mês em que o dia 20 cai no sábado recua para sexta; feriado nacional no dia 20 recua.
5. **`Counterparty.regimeTributario String?`** ∈ `SIMPLES|MEI|PRESUMIDO|REAL|ARBITRADO|PF|COOPERATIVA|EXTERIOR` e
   **`declaracaoOptanteDocumentId String?`** (`SourceDocument` anexado, F-RET-5 a). `taxIdKind` derivado do comprimento do
   `taxId` (11 = CPF, 14 = CNPJ, nunca coluna). DTO `.strict()` aceita os dois. Coerência: `PF` exige `taxId` de 11 dígitos;
   CNPJ com `PF` ⇒ 400. Teste: CRUD, migração aditiva, snapshot de shape (inserir só a entrada nova, memória "UPDATE do
   snapshot reordena").
6. **Model `WithholdingProfile`** (§5.1) + `WithholdingProfileRepository` (seam de tx `runInTransaction`/`withTransaction`)
   + `canManageWithholdingProfile` (reusa a regra de `canManagePayable`) + factory + rotas `GET/POST/PATCH/DELETE
   /api/accounting/withholding-profiles` (2 toques). Validações: `issRetido` exige `issCodMun` (7 dígitos) e `issAliquotaBp`;
   `inss` exige `inssTpServico` (9 dígitos, F-RET-16); `natRend` 5 dígitos, que precisa existir em `NATUREZA_RENDIMENTO`
   (`DRAFT` aceito, com aviso); `fonte` não vazia. Perfil da contraparte `PF` só aceita `irrf` (CSRF/INSS 11%/ISS ⇒ 400).
   Vigência sem sobreposição por `(counterpartyId, naturezaServico)`. Soft-delete. `resetDb` limpa a tabela.
7. **Tabela `NATUREZA_RENDIMENTO`** (F-REINF-5 a; **única e com dono aqui**, Emenda 22/10 item 1): chave = `natRend`,
   `valorJson = { descricao, grupo, declarante, tributos[], tiposIsencao[] }` (forma do BRIEF da Reinf). Carga = grupo 15
   inteiro (15001–15099), 12001 (duas linhas por vigência) e 12016, da Tabela 01 de 15/01/2026, **`PUBLISHED`**, `fonte =
   "EFD-Reinf Tabela 01 (Tabelas de 15/01/2026)"` com o `fonteSha256` do zip. 10002 só na condição da Emenda item 1. A
   alíquota continua vindo da `naturezaServico` do perfil (item 1). Teste: perfil com `natRend` fora da tabela ⇒ 400.
8. **Contas** (F-RET-19): folhas do plano padrão em `ChartOfAccountsFixture.ts` + `REFERENCIAL_PLANO_PADRAO` (só se o
   F-RET-19 ratificar códigos) + papéis novos no perfil fiscal (`FiscalProfileDto`/`IFiscalProfileRepository`/`FiscalProfileService`):
   `retencaoIrrfRecolherAccountId`, `retencaoCsrfRecolherAccountId`, `retencaoInssRecolherAccountId`,
   `retencaoIssRecolherAccountId` (Liability), `retencaoIrrfCompensarAccountId`, `retencaoCsllCompensarAccountId`,
   `retencaoInssCompensarAccountId` (Asset), mais o que o F-RET-14 e o F-RET-15 decidirem. `ensureCanonicalAccounts`
   preenche só campo nulo (precedente #826-1). Conta ausente na hora de lançar ⇒ `ValidationError` nomeado (F-TA-7). Teste
   por papel, com a natureza da conta checada.
9. **Gates do PR-1:** `auditCanonical.ts` ganha `withholding_profile.created|updated|deleted` (ids, natureza, flags, **sem
   `taxId`**, memória "allowlist de auditoria") e o campo novo de `Counterparty` na allowlist existente; doc
   `routes/docs/accounting.withholdings.paths.ts` + `docs.paths.ts` + `public/openapi.json` (guard de path-count); paridade
   i18n pt/en das mensagens; `tsc` server limpo; `check:arch` sem violação nova; `node scripts/plano-vault.mjs check`.

### PR-2 — feitas (AP) e saída da Reinf

10. **`models/withholdingCalc.ts` — `calcularRetencoes(e)`** (pura; §5.2). Regras, cada uma com o artigo na linha de memória:
    - pagador `SIMPLES`/`MEI` (do `CompanyFiscalProfile.regime` do ano do fato gerador) ⇒ **sem CSRF** (Lei 10.833 art. 30 §
      2º [D01]) e **com IRRF** pelo perfil (P-RET-1 confirmada na triagem);
    - beneficiário `SIMPLES`/`MEI` ⇒ sem CSRF (art. 32 III [D01]) e sem IRRF **só com** `declaracaoOptanteDocumentId`; sem a
      declaração ⇒ retém o IRRF e avisa `SEM_DECLARACAO_OPTANTE` (IN 765 não lida; leitura segura). Sem regime ⇒ avisa
      `SEM_REGIME_BENEFICIARIO` e trata como não optante;
    - `COOPERATIVA` ⇒ só CSLL (art. 32 p.ú.); `EXTERIOR` ⇒ 400 nomeado "remessa ao exterior fora deste nó";
    - mínimo: CSRF ≤ R$ 10 **por pagamento** ⇒ `dispensa = MINIMO_R10` (art. 31 § 3º; F-RET-4 a); IRRF ≤ R$ 10 ⇒ dispensa
      **só** com beneficiário `REAL|PRESUMIDO|ARBITRADO|PF` (RIR 785 [D09]); `SIMPLES`/`MEI`/sem regime ⇒ retém > 0;
    - 2027-01-01 em diante ⇒ uma linha CSLL, nunca COFINS/PIS (invariante 1);
    - sem perfil e contraparte PJ com despesa de serviço ⇒ nenhuma linha + aviso `SEM_PERFIL_RETENCAO` (ADR D5).
    Teste: tabela de casos com uma linha por regra; `parametrosSha256` estável para a mesma fotografia.
11. **PF** (F-RET-7 b; desenho no **F-RET-17**): `calcularIrrfPf({rendimentoMesCents, retidoMesCents, dependentes,
    previdenciaCents, pensaoCents}, tabela)`: base = rendimento − max(deduções do art. 4º, desconto simplificado § 2º)
    [D11]; IR pela faixa [D02]; menos a redução do art. 3º-A [D11]; menos o já retido no mês do mesmo CPF (pela leitura do
    F-RET-17); ≤ R$ 10 ⇒ dispensa (RIR 785 I). As deduções são **informadas no pagamento**: não há cadastro de dependentes
    nem cálculo do INSS do contribuinte individual (Lei 10.666 art. 4º [D12] fica no nó de pessoal). Teste: os três casos
    do item 3 e um 2º pagamento no mês.
12. **`PayableDto`** aceita `withholdings?: WithholdingOverride[]` (§5.3), **só para menos** que o calculado, com `motivo`
    obrigatório quando menor (ADR D5), e `pfDeducoes?` (item 11) quando a contraparte é `PF`. Linha a mais que o calculado
    ⇒ 400. Os campos do R-2010 da NF (`documentoSerie?`) entram no DTO (C9). Teste: override para menos aceito e auditado;
    para mais ⇒ 400; PF sem `pfDeducoes` ⇒ dependentes 0 e desconto simplificado.
13. **`TaxWithholding`** (§5.1) + `TaxWithholdingRepository` + migração aditiva. `@@index([userId, unitId, competencia,
    direction])`, `@@index([titleType, titleId])`. `resetDb` limpa a tabela.
14. **`SETTLEMENT_KINDS` ganha `WITHHOLDING`** (C4; leg no **F-RET-10**). A linha `PayablePayment` de kind `WITHHOLDING`
    é baixa **sem caixa**: `method = 'NONE'` aceito **só** com esse kind (o mapa fechado de método segue para PAYMENT); conta
    de crédito = papel do perfil fiscal pelo tributo (item 8). O gate de soma de `paidCents` conta o WITHHOLDING igual ao
    PAYMENT (invariante 3). Teste: `method = 'NONE'` com kind PAYMENT ⇒ 400.
15. **Reconhecimento** (`createPayable`): `calcularRetencoes` com event `RECOGNITION` (IRRF, INSS, ISS; ADR D2). A **tx1**
    grava `Payable` + `TaxWithholding[]` + `PayablePayment` WITHHOLDING por tributo + upsert do título de imposto (item 19) +
    auditoria. Depois, `postEntry` do reconhecimento (como hoje) e `postEntry(sourceType='ap.withholding', sourceId=paymentId)`
    por baixa sem caixa: **D 2.1.2 / C X a recolher** (F-RET-10 a). Data do lançamento = `issueDate`. Falha do 2º post ⇒ o
    `reconcilePayables` refaz (item 21). Cabeçalho `atomicUntil` atualizado com os testes. Teste: título de R$ 1.000 a PJ
    Presumido, serviço profissional ⇒ IRRF R$ 15,00, `paidCents = 1500`, `remainingCents = 98500`, razão balanceado.
16. **INSS 11%** só com `perfil.inss` e regime do beneficiário diferente de PF; base = **bruto da NF** (`amountCents`; Lei 8.212
    art. 31 [D06]); competência = mês da `issueDate`. Destaque na NF é do prestador (§ 1º), não validado. Teste.
17. **Baixa com CSRF** (`registerPayment`): `calcularRetencoes` com event `SETTLEMENT` sobre o **bruto da parcela** (F-RET-4
    a). O DTO recebe o valor **pago em caixa** e o serviço deriva o bruto `g` da parcela (`g − csrf(g) = pago`, HALF_UP, menor
    `g` que fecha; sem `g` exato ⇒ 409 nomeado). Grava PAYMENT(pago) + WITHHOLDING(csrf por tributo) e o claim CAS de
    `paidCents += g`. A tx1 traz o upsert do título de imposto. Teste: R$ 1.000 em uma baixa (CSRF R$ 46,50) e em 4 parcelas
    de R$ 250 (R$ 11,63 cada, retida); 5 parcelas de R$ 200 (R$ 9,30 ⇒ dispensada; caso adversarial do ADR §12).
18. **Saldo da última parcela:** a soma das parcelas fecha `amountCents` exatamente; a última absorve o centavo do
    arredondamento (invariante 3).
19. **Título de imposto** (ADR D6; forma no **F-RET-11**): upsert por `(userId, unitId, codigoReceita, competencia)` do
    `Payable` `origin = 'WITHHOLDING_TAX'` da contraparte de sistema `UNIAO` (IRRF/CSRF), `INSS` ou `MUNICIPIO:<codMun>` (ISS),
    `documentNumber = <codigo>-<AAAAMM>`, `dueDate` do item 4, **sem `postEntry` de reconhecimento** (o passivo já está na
    conta a recolher). A baixa debita a conta a recolher do papel (não 2.1.2). Enquanto `OPEN`, `amountCents` cresce e encolhe
    com as retenções da competência; com qualquer baixa, uma retenção nova da mesma competência abre título
    **complementar** (`-C1`, `-C2`…). ISS sem `dueDate` legal ⇒ `issVencimentoDia` do perfil ou o dia 10 com aviso
    `VENCIMENTO_ISS_INFORMAR`. Teste: duas retenções no mês ⇒ um título com a soma (invariante 7).
20. **DARF < R$ 10** (Lei 9.430 art. 68 § 1º [D05], triagem 21/10): título por código com total < R$ 10 no fechamento da
    competência ⇒ `status = 'DEFERRED'` (não vence) e soma no título do mesmo código da competência seguinte; o
    `documentNumber` lista as competências somadas. INSS (GPS/DCTFWeb) e ISS **não** acumulam por esta regra (o art. 68 é de
    tributo administrado pela RFB). Teste: R$ 4,50 em 03 + R$ 7,00 em 04 ⇒ um título de R$ 11,50 com vencimento de 04.
21. **Estorno** (`cancelPayment`/`cancelPayable`): a retenção vira `REVERSED`, o razão é estornado (T5, `reverseEntry` em
    período aberto) e o título de imposto encolhe; título de imposto já baixado (total ou parcial) ⇒ **409 nomeado** "imposto
    já recolhido — estorne o DARF antes" (invariante 7). `reconcilePayables` refaz WITHHOLDING faltante, idempotente por
    `paymentId` (asserção da 2ª chamada). Teste do estorno e do re-drive.
22. **F7, lado AP** (**F-RET-12**): proposta sobre título com CSRF pendente usa `|linha|` como **pago líquido** e o
    confirm chama a mesma derivação do item 17. Teste com a linha de R$ 953,50 contra o título de R$ 1.000 ⇒ PAYMENT 953,50
    + WITHHOLDING 46,50, sem shortfall.
23. **Leitura das feitas — contrato da Reinf** (§5.4; posição no PR-2 = **F-RET-18**): `GET /api/accounting/withholdings?
    direction=MADE&competencia=YYYY-MM` (linhas) e `GET /api/accounting/withholdings/summary?competencia=` (feitas por
    código, com vencimento e `taxPayableId`), mais a **porta** `ITaxWithholdingReadPort.findMadeForReinf(scope,
    competencia)` (Emenda item 2), implementada no `TaxWithholdingRepository` e registrada na factory. A rota e a porta
    usam o mesmo mapeador, e um teste garante que as duas devolvem o mesmo conjunto. PII: `taxId` sai **só** na rota de linhas, com policy de leitura contábil; a
    auditoria nunca o carrega. Gates: auditoria `ap.withholding.recorded|reversed`, `tax_payable.upserted` (ids, tributo,
    cents, competência); doc + openapi + path-count; snapshot de shape; i18n.

### PR-3 — sofridas (AR)

24. **`ReceivableReceipt` kind `WITHHOLDING`** (sofrida; ADR D1): no `registerReceipt`, linhas `withholdings[]`
    informadas **pelo usuário** (o cliente decide quanto reteve; o perfil da contraparte CUSTOMER só **sugere**), com
    `documento` (comprovante/NF). Grava `TaxWithholding SUFFERED` por tributo + baixa sem caixa; razão no **F-RET-14**
    (IRRF/CSRF/INSS) e no **F-RET-15** (ISS). Gate de soma `receivedCents` conta o WITHHOLDING. Teste: título de R$ 1.000,00
    recebido com R$ 938,50 + IRRF R$ 15,00 + CSRF R$ 46,50 fecha.
25. **ISS retido sofrido** (F-RET-9, triagem 21/10): sem ativo a compensar; a contrapartida é o **F-RET-15**. Teste da perna.
26. **F7, lado AR** (**F-RET-13**): `SHORTFALL_TREATMENTS` ganha `WITHHOLDING`, com partes por tributo digitadas no confirm
    (molde `BankSettlementChargePart`, value-object com `@@unique([itemId, tributo])`); Σ partes = `shortfallCents`, ou 400.
    Teste.
27. **Resumo das sofridas** no mesmo `summary` (por tributo e competência, com os documentos). Gates do PR-3: auditoria
    `ar.withholding.recorded|reversed`, doc/openapi, snapshot, i18n.

### PR-4 — ligação X7/X8/ISS (F-RET-8 a)

28. **Prévia do X8** (`PisCofinsAssessmentService.preview`): quando `entradaInformada.retencoes` está vazia, a resposta traz
    `retencoesSugeridas` = Σ SUFFERED PIS/COFINS da competência (com ids). Quando o informado diverge da soma, traz o aviso
    `RETENCAO_INFORMADA_DIVERGE`. **O informado prevalece** e nada se grava sozinho. Teste.
29. **Prévia do X7** (item 15 `RETIDO_MESES` e trimestrais): mesma sugestão para IRRF e CSLL sofridos. Teste.
30. **ISS da Fase C**: o relatório por competência mostra o retido do `FiscalDocument` (`tpRetISSQN`) **ao lado** do retido
    gravado no AR. A divergência vira aviso, sem alterar a soma do documento. Teste.
31. **Baixa do retido a compensar** (F-RET-14): a provisão do X7 ganha o par D IRPJ/CSLL a recolher / C IRRF/CSLL retido a
    compensar pela parte abatida (molde X8, `TaxAssessmentService.ts:672-678`), com o excedente no ativo (F-TA-9 a). Teste
    de balanceamento e de idempotência.
32. **Fold de fechamento:** linha "superado por RETENCOES-FONTE + EFD-REINF (F-RET-1 a)" no
    `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md` §PES-2; export do contador `EXPORT_RETENCOES` (feitas + sofridas por
    competência; molde `EXPORT_TAX_ASSESSMENT_MEMO`; ADR §6 item 13).

## 5. Contratos esboçados

### 5.1 Prisma

```prisma
model WithholdingProfile {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId          String
  counterpartyId  String
  counterparty    Counterparty @relation(fields: [counterpartyId], references: [id], onDelete: Restrict)
  naturezaServico String       // chave da RETENCAO: SERVICO_PROFISSIONAL | LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO | COMISSAO_PROPAGANDA | CESSAO_MAO_DE_OBRA | TRABALHO_NAO_ASSALARIADO_PF | OUTRO
  natRend         String?      // 5 dígitos, NATUREZA_RENDIMENTO (F-RET-16) — obrigatório quando irrf || csrf
  irrf            Boolean
  csrf            Boolean
  inss            Boolean
  inssTpServico   String?      // 9 dígitos, Tabela 06 da Reinf (R-2010) — obrigatório se inss
  inssCprb        Boolean?     // prestador na CPRB (indCPRB) — alíquota DRAFT (§7)
  issRetido       Boolean
  issCodMun       String?      // IBGE 7 — obrigatório se issRetido
  issAliquotaBp   Int?         // lei municipal (informada) — obrigatória se issRetido
  issVencimentoDia Int?        // 1..31, lei municipal (informada)
  fonte           String       // enquadramento citado (ex. "RIR/2018 art. 714 § 1º XX")
  vigenteDesde    String       // YYYY-MM-DD
  vigenteAte      String?
  createdById     String?
  updatedById     String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?
  @@index([userId, unitId, counterpartyId])
  @@map("withholding_profiles")
}

model TaxWithholding {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId           String
  direction        String    // MADE | SUFFERED
  tributo          String    // IRRF | CSLL | COFINS | PIS | INSS | ISS
  event            String    // RECOGNITION | SETTLEMENT
  titleType        String    // PAYABLE | RECEIVABLE
  titleId          String
  settlementId     String    // payable_payments.id | receivable_receipts.id da baixa WITHHOLDING (F-RET-10 a)
  originSettlementId String? // PAYMENT que gerou a CSRF (event = SETTLEMENT)
  counterpartyId   String    // beneficiário (MADE) ou fonte pagadora (SUFFERED)
  naturezaServico  String?
  natRend          String?
  dataFatoGerador  String    // YYYY-MM-DD (dtFG da Reinf): issueDate (IRRF/INSS/ISS) | paidAt (CSRF)
  competencia      String    // YYYY-MM do fato gerador
  brutoCents       BigInt    // vlrBruto: bruto do título (IRRF/INSS) ou da parcela (CSRF)
  baseCents        BigInt
  aliquotaBp       Int?      // null em PF (tabela progressiva)
  amountCents      BigInt    // ≥ 0; 0 só com `dispensa`
  dispensa         String?   // MINIMO_R10 | OPTANTE_SIMPLES | COOPERATIVA | ISENCAO_COMPROVADA
  overrideMotivo   String?
  codigoReceita    String?   // 6 dígitos; null enquanto RETENCAO_CODIGO for DRAFT
  taxPayableId     String?   // Payable origin=WITHHOLDING_TAX (MADE)
  documentoNumero  String?   // NF (R-2010 numDocto) / comprovante (SUFFERED)
  documentoSerie   String?   // R-2010 serie
  pfDetalhe        String?   // JSON: {dependentes, deducaoDependentesCents, previdenciaCents, pensaoCents, descontoSimplificadoCents, reducaoArt3ACents, retidoAntesNoMesCents} (R-4010 ideDep/detDed)
  entryId          String?
  parametrosIds    String    // JSON
  parametrosSha256 String
  status           String    // ACTIVE | REVERSED
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  @@index([userId, unitId, competencia, direction])
  @@index([titleType, titleId])
  @@map("tax_withholdings")
}

// Aditivos (nullable): Counterparty.regimeTributario, Counterparty.declaracaoOptanteDocumentId,
// Payable.origin ('WITHHOLDING_TAX' | null) + Payable.liabilityAccountId (F-RET-11 a),
// BankSettlementWithholdingPart { itemId, tributo, cents, @@unique([itemId, tributo]) } (F-RET-13 a)
```

### 5.2 Função pura

```ts
// models/withholdingCalc.ts
export type Tributo = 'IRRF' | 'CSLL' | 'COFINS' | 'PIS' | 'INSS' | 'ISS';
export type RegimeContraparte = 'SIMPLES' | 'MEI' | 'PRESUMIDO' | 'REAL' | 'ARBITRADO' | 'PF' | 'COOPERATIVA' | 'EXTERIOR';
export interface EntradaRetencao {
  event: 'RECOGNITION' | 'SETTLEMENT';
  brutoCents: bigint;                 // título (RECOGNITION) ou parcela bruta (SETTLEMENT)
  dataFatoGerador: string;            // date-only escrito (memória "Date ISO UTC → scopeDay −1")
  regimePagador: 'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL';
  beneficiario: { regime: RegimeContraparte | null; temDeclaracaoOptante: boolean };
  perfil: Pick<WithholdingProfile, 'naturezaServico' | 'natRend' | 'irrf' | 'csrf' | 'inss' | 'inssCprb' | 'issRetido' | 'issAliquotaBp'> | null;
  pf?: { rendimentoMesAntesCents: bigint; retidoMesAntesCents: bigint; dependentes: number; previdenciaCents: bigint; pensaoCents: bigint };
  tabela: readonly LinhaLegal[];      // RETENCAO + RETENCAO_CODIGO + IRRF_PF_MENSAL (fotografia)
}
export interface LinhaRetencao {
  tributo: Tributo; baseCents: bigint; aliquotaBp: number | null; amountCents: bigint;
  dispensa: 'MINIMO_R10' | 'OPTANTE_SIMPLES' | 'COOPERATIVA' | null; codigoReceita: string | null; fonte: string;
}
export function calcularRetencoes(e: EntradaRetencao): { linhas: LinhaRetencao[]; avisos: string[]; parametrosSha256: string };
export function brutoDaParcela(pagoCents: bigint, aliquotaCsrfBp: number): bigint; // item 17; throws se não fecha
```

### 5.3 Zod

```ts
export const WithholdingOverrideSchema = z.object({
  tributo: z.enum(['IRRF', 'CSLL', 'COFINS', 'PIS', 'INSS', 'ISS']),
  amountCents: z.coerce.number().int().min(0),         // ≤ calculado (serviço); MAX_CENTS no DTO
  motivo: z.string().trim().min(3).max(140),
}).strict();
export const PfDeducoesSchema = z.object({
  dependentes: z.number().int().min(0).max(30),
  previdenciaCents: z.coerce.number().int().min(0).default(0),
  pensaoCents: z.coerce.number().int().min(0).default(0),
}).strict();                                            // sem .partial() no update (memória Zod 4)
export const SufferedWithholdingSchema = z.object({
  tributo: z.enum(['IRRF', 'CSLL', 'COFINS', 'PIS', 'INSS', 'ISS']),
  amountCents: z.coerce.number().int().min(1),
  documento: z.string().trim().min(1).max(60),
}).strict();
export const WithholdingProfileCreateSchema = z.object({
  counterpartyId: z.string().cuid(),
  naturezaServico: z.enum(['SERVICO_PROFISSIONAL', 'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO', 'COMISSAO_PROPAGANDA', 'CESSAO_MAO_DE_OBRA', 'TRABALHO_NAO_ASSALARIADO_PF', 'OUTRO']),
  natRend: z.string().regex(/^\d{5}$/).nullable().optional(),
  irrf: z.boolean(), csrf: z.boolean(), inss: z.boolean(), issRetido: z.boolean(),
  inssTpServico: z.string().regex(/^\d{9}$/).nullable().optional(), inssCprb: z.boolean().nullable().optional(),
  issCodMun: z.string().regex(/^\d{7}$/).nullable().optional(), issAliquotaBp: z.number().int().min(0).max(10_000).nullable().optional(),
  issVencimentoDia: z.number().int().min(1).max(31).nullable().optional(),
  fonte: z.string().trim().min(3), vigenteDesde: dateOnly, vigenteAte: dateOnly.nullable().optional(),
}).strict().superRefine(/* issRetido ⇒ codMun+alíquota; inss ⇒ tpServico; (irrf||csrf) ⇒ natRend */);
// Query boolean: união explícita, nunca z.coerce.boolean() (memória).
```

### 5.4 Contrato de saída que a EFD-REINF lê (PR-2; F-RET-18)

A Reinf é **por pagamento** (nota da sessão EFD-REINF, MOU 2.1.2.1). O resumo por código serve ao DARF, e o evento lê as
linhas. As duas rotas são **só leitura** e mostram apenas `MADE` `ACTIVE` (as sofridas são da Reinf do cliente; ADR-EFD-REINF
§4).

```ts
// GET /api/accounting/withholdings?direction=MADE&competencia=YYYY-MM   — linhas (R-4020, R-4010, R-2010)
export const WithholdingLineViewSchema = z.object({
  id: z.string(),
  tributo: z.enum(['IRRF', 'CSLL', 'COFINS', 'PIS', 'INSS', 'ISS']),
  event: z.enum(['RECOGNITION', 'SETTLEMENT']),
  dataFatoGerador: z.string(),                  // dtFG (IR = crédito; CSRF = pagamento — MOU item 6 f)
  competencia: z.string(),
  beneficiario: z.object({ counterpartyId: z.string(), nome: z.string(), taxId: z.string().nullable(), kind: z.enum(['CPF', 'CNPJ']).nullable(), regime: z.string().nullable() }).strict(),
  natRend: z.string().nullable(),
  codigoReceita: z.string().nullable(),         // null = RETENCAO_CODIGO ainda DRAFT
  brutoCents: z.string(), baseCents: z.string(), amountCents: z.string(),   // BigInt serializado como string (padrão do repo)
  dispensa: z.string().nullable(),
  titulo: z.object({ payableId: z.string(), documentNumber: z.string().nullable(), documentoSerie: z.string().nullable(), issueDate: z.string() }).strict(),
  inss: z.object({ tpServico: z.string().nullable(), cprb: z.boolean().nullable() }).strict().nullable(),       // R-2010
  pf: z.object({ dependentes: z.number(), deducaoDependentesCents: z.string(), previdenciaCents: z.string(), pensaoCents: z.string(),
                 descontoSimplificadoCents: z.string(), reducaoArt3ACents: z.string() }).strict().nullable(),  // R-4010 ideDep/detDed
  taxPayableId: z.string().nullable(),
}).strict();

// Porta de leitura no backend (Emenda 22/10 item 2) — a Reinf consome sem HTTP
export const WithholdingLineForReinfSchema = WithholdingLineViewSchema.extend({
  settlementId: z.string(),                    // baixa WITHHOLDING da linha
  originSettlementId: z.string().nullable(),   // PAYMENT que gerou a CSRF (agrupa por pagamento)
}).strict();
export interface ITaxWithholdingReadPort {
  findMadeForReinf(scope: AccountingScope, competencia: string): Promise<z.infer<typeof WithholdingLineForReinfSchema>[]>; // só MADE ACTIVE
}

// GET /api/accounting/withholdings/summary?competencia=YYYY-MM          — título de imposto por código (DARF/GPS/ISS)
export const WithholdingSummarySchema = z.object({
  competencia: z.string(),
  feitas: z.array(z.object({
    codigoReceita: z.string().nullable(), tributos: z.array(z.string()), totalCents: z.string(), vencimento: z.string().nullable(),
    status: z.enum(['OPEN', 'PARTIALLY_PAID', 'PAID', 'DEFERRED']), competenciasSomadas: z.array(z.string()),  // art. 68 § 1º
    taxPayableId: z.string().nullable(), linhas: z.number().int(),
  }).strict()),
  sofridas: z.array(z.object({ tributo: z.string(), totalCents: z.string(), linhas: z.number().int() }).strict()),    // PR-3
  avisos: z.array(z.string()),
}).strict();
```

**Fixado aqui para a Reinf (item 4 da nota dela; Emenda 22/10 item 3):** até 2026-12-31 a CSRF fica em **3 linhas
`TaxWithholding`** (CSLL/COFINS/PIS, uma por tributo). **Cada uma** carrega `codigoReceita = 595207` (`AGREGADO` da
`RETENCAO_CODIGO`, `PUBLISHED`), e há **um título de imposto** com esse código. Isso segue a resposta do contador (item 9 da triagem, "5952") e o MOU ("empresas em geral informam Agregado").
Desde 2027-01-01 há uma linha CSLL, com o código do discriminador `CSLL` (`598707` na tabela de 15/01/2026; uma tabela
nova da RFB substitui esta pela vigência). Se a Reinf precisar dos valores separados por tributo, eles estão nas linhas. **A Reinf não precisa abrir fork de agregação por conta deste nó.**

### 5.5 Rotas

| Rota | PR | Policy |
|---|---|---|
| `GET/POST/PATCH/DELETE /api/accounting/withholding-profiles[/:id]` | 1 | `canManageWithholdingProfile` |
| `GET /api/accounting/withholdings?direction=&competencia=` | 2 (MADE) · 3 (SUFFERED) | leitura contábil |
| `GET /api/accounting/withholdings/summary?competencia=` | 2 · 3 | idem |
| (sem rota nova) `POST /payables`, `/payables/:id/payments`, `/receivables/:id/receipts`, confirm do F7 | 2 · 3 | as existentes |

## 6. Forks novos — **RATIFICADOS em 22/10/2026** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]])

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-RET-10** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · Onde mora a perna da retenção (C2) | **(a)** baixa **sem caixa** `kind = WITHHOLDING` em `PayablePayment`/`ReceivableReceipt`, na data do fato gerador: o reconhecimento segue D despesa / C 2.1.2 **bruto** e a baixa faz D 2.1.2 / C X a recolher · **(b)** ADR D7 literal: reconhecimento com C fornecedor **líquido** + C a recolher, e o gate de `paidCents` passa a somar as retenções de RECOGNITION | **(a).** O tie-out Σ títulos abertos = saldo de 2.1.2 e o gate de soma ficam como estão; estorno = estornar a baixa; o F7 lê o saldo certo. (b) muda o reconhecimento, que tem 4 ramos (estoque, multi-item, imobilizado, insumo), e o `paidCents` deixa de ser "soma das baixas" | alto em (b): tie-out e re-drive do reconhecimento |
| **F-RET-11** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · Forma do título de imposto (C3) | **(a)** `Payable` com `origin = 'WITHHOLDING_TAX'` + `liabilityAccountId`: sem reconhecimento próprio, baixa D conta a recolher / C banco, `amountCents` mutável só enquanto `OPEN`, complementar depois da 1ª baixa · **(b)** model próprio `WithholdingTaxTitle`, com baixa própria (fora do F7, da agenda e do aging) · **(c)** `Payable` comum que reconhece D conta a recolher / C 2.1.2 (reclassifica o passivo de uma conta para outra) | **(a).** Reusa F7, aging e a agenda fiscal (F4) sem duplicar a baixa. (c) é o mais simples no código, mas põe imposto em "Fornecedores a pagar" no balanço. (b) duplica a máquina de baixa | médio |
| **F-RET-12** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · F7 em título AP com CSRF (linha líquida) | **(a)** o confirm deriva o bruto da parcela (`brutoDaParcela`) e grava PAYMENT + WITHHOLDING · **(b)** título com CSRF pendente sai da auto-proposta do F7 (409 nomeado "registre a baixa pelo AP") | **(a).** O F7 é o caminho normal de baixa; com (b) toda baixa com CSRF fica manual. O 1º cliente (Simples) não retém CSRF, então o custo de (a) só aparece em tenant do lucro presumido ou real | baixo |
| **F-RET-13** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · F7 em título AR com retenção sofrida | **(a)** `SHORTFALL_TREATMENTS` ganha `WITHHOLDING`, com partes por tributo digitadas no confirm (`BankSettlementWithholdingPart`) · **(b)** só pelo AR manual (o F7 trata como `PARTIAL`) | **(a).** O cliente PJ deposita o líquido. Sem (a), o F7 propõe "parcial" e o título fica aberto com o valor retido | baixo |
| **F-RET-14** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · Sofridas × X7/X8 já lançando (C5) | **(a)** o recebimento debita a **transitória "retenções a conciliar"**: PIS/Cofins na conta existente `pisCofinsRetencaoConciliarAccountId`, IRRF/CSLL/INSS em papel novo. As provisões seguem como estão (D retido a compensar / C conciliar a partir do informado), a transitória zera quando o informado bate e o X7 ganha a baixa do retido (item 31) · **(b)** o recebimento debita direto "retido a compensar" e X7/X8 deixam de lançar o reconhecimento das retenções vindas do AR (emenda de dois serviços mergeados, deduplicação por origem) · (c) o recebimento debita "a compensar" e X7/X8 não mudam ⇒ **dupla contagem** (listado só para descartar) | **(a).** Não reabre o F-PCB-3 nem a emenda de 06/10, e a divergência fica visível (saldo na transitória) em vez de silenciosa. (b) exige que o informado manual e o AR nunca se cruzem | alto em (c) |
| **F-RET-15** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · Contrapartida do ISS retido sofrido sem passivo de ISS (C6; F-RET-9 decidido) | **(a)** D **"ISS sobre serviços"** (conta de dedução da receita, papel novo `issDeducaoAccountId`): o imposto se extingue pela retenção e vira custo do serviço, sem ativo, como o contador mandou. No Simples, o ISS faz parte do DAS e a retenção é informada no PGDAS (`simplesEspelho.ts:31`), então vale a mesma conta · **(b)** D **"ISS a recolher"** (papel novo), deixando saldo devedor no passivo até um nó de ISS próprio provisionar o devido · **(c)** transitória "ISS retido a conciliar" | **(a).** É a única que não deixa saldo esperando um nó que não existe. Pergunta ao contador junto: *"sem provisão de ISS próprio no razão, o ISS retido pelo tomador vai a 'ISS sobre serviços' (dedução) no regime normal e no Simples?"* | médio |
| **F-RET-16** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · `natRend` e a tabela `NATUREZA_RENDIMENTO` (C9). **Emenda 22/10:** onde nasce a tabela foi fixado pelo dono ("tabela única com dono no RETENCOES-FONTE"), e por isso o caminho (c) sai. Segue PENDENTE a escolha entre `natRend` no perfil (a) e o mapa natureza → `natRend` (b) | **(a)** o perfil ganha `natRend` (5 dígitos) e os campos do R-2010 (`inssTpServico`, `inssCprb`); a tabela `NATUREZA_RENDIMENTO` (F-REINF-5 a) **nasce no PR-1 deste nó** (DRAFT), e o BRIEF da Reinf consome · **(b)** só `naturezaServico` aqui, e a Reinf mapeia natureza → `natRend` numa tabela dela · (c) as duas sessões criam a tabela (colisão de migração) | **(a).** O PR-1 daqui vem antes do PR-1 da Reinf, e o código de receita depende do `natRend` (Tabela "R-4020"). Com (b) o código só existiria na Reinf e o título de imposto ficaria sem código. **Avisar a sessão do EFD-REINF do que for ratificado** | médio em (c) |
| **F-RET-17** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · Desenho do IRRF de PF (F-RET-7 b reabriu o F-PES-0) | **(a)** neste nó: tabela mensal + redução do art. 3º-A + deduções do art. 4º **informadas no pagamento** (dependentes, previdência, pensão; ou desconto simplificado, o que for melhor). Vários pagamentos no mês ao mesmo CPF **somam** (retenção pela diferença; P-RET-7). Fica no **nó de pessoal**: cadastro de dependentes, INSS do contribuinte individual (Lei 10.666 art. 4º), eSocial S-1200/S-1210, pró-labore, aluguel PF, 13º · **(b)** igual a (a), mas cada pagamento é calculado isolado · **(c)** só o serviço PF sem dedução (base = bruto) | **(a).** É o que a tabela "mensal" pede e o que a Reinf R-4010 declara (`ideDep`/`detDed`). (b) retém a menor quando há dois pagamentos no mês. (c) retém a maior e não fecha o R-4010 | médio |
| **F-RET-18** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · Onde nasce a leitura das feitas | **(a)** no **PR-2** (com o AP), para a Reinf começar o PR-1 dela antes do AR · **(b)** no PR-3, junto do resumo das sofridas, como no ADR §6 item 11 | **(a).** A Reinf só lê MADE, e (b) prende o PR-1 dela ao PR-3 daqui sem motivo | baixo |
| **F-RET-19** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]) · Folhas do plano padrão e referencial | **(a)** IRRF retido de serviço **reusa** `2.1.7.03 IRRF a Recolher` (já mapeada ao referencial 2.01.01.09.01); torre nova **`2.1.9` Tributos Retidos a Recolher** (CSRF, INSS, ISS) e **`1.1.8` Tributos Retidos a Compensar** (IRRF, CSLL, INSS; o PIS/Cofins segue no papel do X8); referencial **DRAFT** até o contador conferir (P-RET-4) · **(b)** folha própria para o IRRF de serviço em 2.1.9 (o 2.1.7 é "Obrigações com Sócios") · (c) só papéis no perfil, sem folha no plano padrão (cada unidade configura) | **(a)** com o porém de (b) dito: o 2.1.7.03 está sob "Obrigações com Sócios" por decisão de 21/10 (IRRF-DISTRIBUICAO). Os dois IRRF vão ao mesmo passivo, mas a agregação no balanço fica estranha. Se o dono preferir a semântica, é (b) | baixo |

## 7. Pendente de validação externa (não são forks)

| # | Pergunta | Trava | Quem |
|---|---|---|---|
| P-RET-1 | ~~Simples tomador retém IRRF?~~ **Respondida 21/10:** retém, e não retém de optante com declaração | — | — |
| P-RET-2 | ~~mínimo de R$ 10 de PJ~~ **Respondida 21/10:** RIR art. 785 II (conferido [D09]) | — | — |
| P-RET-3 | ~~fato gerador por tributo~~ **Respondida 21/10:** confirma o D2; o MOU da Reinf também | — | — |
| P-RET-4 | Códigos do referencial das folhas do F-RET-19 e a pergunta do F-RET-15 | itens 8, 25 | contador |
| P-RET-5 | ~~cessão de mão de obra~~ **respondida 21/10; lida em 27/10** na IN 2.110 vigente (arts. 108–115, 133, 166–167): lista exaustiva, dispensas e regra do Simples (Emenda 28/10 item 3) | perfil (dado do usuário) | — |
| P-RET-6 | ~~Códigos por `natRend` × tributo~~ resolvidos pela leitura oficial da Reinf (Emenda 22/10). ~~Código do INSS retido~~ **resolvido 27/10: 116201** (adicional 114106; Emenda 28/10 item 1). Resta a eventual tabela nova para 2027 (P-REINF-9) | item 2 (`INSS` sai de DRAFT por PR de dado) | fonte oficial |
| **P-RET-7** (nova) | ~~Pagando duas vezes no mês ao mesmo autônomo PF, a tabela incide sobre a soma do mês?~~ **Resolvida 27/10: sim**, RIR art. 677 § 2º (Emenda 28/10 item 4) | — | — |
| **P-RET-8** (nova) | ~~Prestador na CPRB: retenção de 3,5% em vez de 11%?~~ **Resolvida 27/10:** 3,5% até 2027-12-31 e 11% desde 2028 (Lei 12.546 art. 7º § 6º e 9º-A; SC Cosit 153/2026; Emenda 28/10 item 2) | item 1 (`INSS/CPRB` sai de DRAFT por PR de dado) | — |
| **P-RET-9** (nova) | O pagamento a contribuinte individual também vai ao eSocial S-1210? **27/10: manual e FAQ da Reinf mandam ao eSocial; vira confirmação de sim ou não** (= P-REINF-8; Emenda 28/10 item 5) | fronteira do F-RET-17 | contador (confirmação) |

## 8. Insumos ausentes

1. **IN SRF 459/2004 e IN RFB 765/2007** (Simples nos dois sentidos, declaração de optante): não lidas. O item 10 usa a
   leitura segura (sem declaração ⇒ retém IRRF).
2. ~~**IN RFB 2.110/2022** (lista de cessão de mão de obra): não lida.~~ **Lida em 27/10** no SIJUT (dossiê
   `fila-2026-10-27-p-ret-5`; Emenda 28/10 item 3). A natureza continua escolha do usuário no perfil, com `fonte`.
3. **Tabela 01 e tabelas "R-4020"/"R-4010" da Reinf**: lidas em fonte oficial pela sessão EFD-REINF em 22/10 (dossiê
   `verif-2026-10-22-efd-reinf-brief` [D02], branch `claude/brief-efd-reinf-b0063b`), não neste dossiê. Pela Emenda 22/10
   nascem `PUBLISHED`, com o `fonteSha256` do zip daquele dossiê.
4. **Lei municipal de ISS** do município do tenant: alíquota, vencimento e lista de retidos são informados no perfil.
5. **Dependentes com CPF e relação** (R-4010 `ideDep`): o nó só recebe a quantidade. O **R-4010 de PF por serviço** fica
   como **lacuna até o nó de pessoal**, dono do cadastro de dependentes (Emenda 22/10 item 4).

## 9. Achados fora de escopo (não planejados)

1. `Counterparty.taxId` sem DV ("no checksum this phase"): a Reinf exige DV válido. Validação no nó EFD-REINF ou em emenda do
   COUNTERPARTY (ADR §11.1).
2. `SETTLEMENT_KINDS` `DISCOUNT` e `SHORTFALL_TREATMENTS` `DISCOUNT` sem consumidor (a Emenda 3.3 PR-3 não foi executada).
   O WITHHOLDING nasce antes dele. Não é tarefa daqui.
3. O 2.1.7.03 "IRRF a Recolher" sob "Obrigações com Sócios" (decisão de 21/10): ver F-RET-19.
4. Não há provisão de ISS próprio no razão (C6). O ISS da Fase C é só relatório. É uma frente do X7 Fase C ou de um nó novo,
   e exige autorização.
5. O ADR §5 D6/D7/D8 e §13.3 ficam obsoletos pelos C1–C3/C9. A emenda do ADR é do fold que o tornar `Accepted`, não deste BRIEF.

## 10. Fold desta sessão

`docs/plano/nos/RETENCOES-FONTE.md`: `estado` continua `planned`; `estado_detalhe` ganha a entrada de 22/10 (BRIEF escrito,
autorização citada, 10 forks F-RET-10..19 PENDENTES, P-RET-7..9, próximo = ratificar os forks e depois `executa` do PR-1);
"Docs" aponta para este arquivo e para o dossiê de 22/10; `atualizado` = 2026-10-22; `prs` ganha o PR deste BRIEF.
`autorizacao` não muda.

## 11. Invariantes (cada uma vira teste)

1. Fato gerador em 2026-12-31 ⇒ CSRF = 465 bp em 3 linhas; 2027-01-01 ⇒ só CSLL 100 bp.
2. Pagador `SIMPLES`/`MEI` ⇒ nenhuma linha CSRF; IRRF pelo perfil.
3. Fechamento: `amountCents = Σ PAYMENT + Σ WITHHOLDING + Σ DISCOUNT` (lados AP e AR); Σ títulos abertos = saldo de 2.1.2.01
   (os títulos `WITHHOLDING_TAX` ficam fora dessa soma, porque estão nas contas a recolher; F-RET-11 a).
4. Beneficiário `SIMPLES` ⇒ sem CSRF; sem IRRF só com declaração; `COOPERATIVA` ⇒ só CSLL; `EXTERIOR` ⇒ 400.
5. Mínimo: CSRF ≤ R$ 10 por pagamento ⇒ `amountCents = 0` + `MINIMO_R10`, sem linha no título; IRRF ≤ R$ 10 dispensado só
   para beneficiário Real/Presumido/Arbitrado/PF.
6. Baixa parcial: CSRF sobre o bruto da parcela; a última parcela fecha o centavo.
7. Título de imposto por `(codigoReceita, competencia)`: soma, encolhe no estorno, 409 se já baixado; < R$ 10 ⇒ `DEFERRED`
   e soma no período seguinte (só códigos da RFB).
8. `dueDate` = dia 20 do mês seguinte ou o dia útil anterior (IRRF/CSRF/INSS), com feriado nacional e local.
9. Todo lançamento balanceia; auditoria sem `taxId`; `taxId` só na rota de linhas.
10. `parametrosSha256` gravado em cada retenção; linha publicada depois ⇒ aviso, nunca recálculo silencioso.
11. PF: rendimento de R$ 5.000 sem dedução ⇒ IR zero (art. 3º-A); segundo pagamento no mês retém pela diferença (F-RET-17 a).
12. Sofrida: Σ transitória "a conciliar" = Σ sofridas − Σ informado nas apurações confirmadas (F-RET-14 a).
