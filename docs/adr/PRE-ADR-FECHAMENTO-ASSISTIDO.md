# PRE-ADR-FECHAMENTO-ASSISTIDO — Conciliação de contas, DLPA/DMPL, notas explicativas e checklist de fechamento

- **Data:** 2026-10-22
- **Status:** **Proposed**. Os forks F-FA-0..13 estão todos **PENDENTES**. Nenhum código autorizado sem "executa".
- **Autorização:** dono, chat, 2026-10-22: *"Autorizo só as de planejamento"* (repassada pela sessão coordenadora do
  pacote de lacunas contábeis). Cobre **este PRE-ADR** e o esqueleto de BRIEF da §6. Não cobre código, não cobre
  `executa` e nenhum fork aqui se auto-ratifica.
- **Divergências registradas (passo 1 da `sessao-planejamento`):**
  1. **O nó não tem nota.** `FECHAMENTO-ASSISTIDO` e `RB-CONTABIL` só existem como proposta em
     `docs/plano/FILA-ORDEM.md:94` (seção F3) e `docs/plano/PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md:237-238`,
     e como PROPOSTO em `docs/plano/destino/06-catalogo-completo-de-modulos-16-dominios.md:75`. O pedido dizia "crie a
     nota do seu nó", mas `docs/plano/README.md` §Fold manda: *"Proposta nova só vira nota em `nos/` depois de PRE-ADR
     ratificado"*. **Não criei a nota.** O PRE-ADR é o artefato; a nota nasce no fold da ratificação (F-FA-13).
  2. **`RB-CONTABIL` é outro trabalho.** As quatro lacunas pedidas (conciliação, DLPA/DMPL, notas, checklist) são todas
     do `FECHAMENTO-ASSISTIDO`. O `RB-CONTABIL` é a generalização do builder de relatórios do CRM para o razão
     (`PROPOSTA…:238`). Planejá-lo aqui seria dimensionar além do pedido (regra 5). Fica como fronteira (F-FA-1).
  3. **A seção F3 ainda espera Q1/Q10 do dono** (régua F) e a **Q5** (provisões × [[R-motor-regras]]). Este PRE-ADR não
     decide nenhuma: a Q5 está registrada como F-FA-2.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `672031c5`.
- **Dossiê legal:** `pesquisas-legais/fechamento-assistido-dlpa-dmpl-notas/relatorio.md` (lido em 22/10/2026).

## TLDR

Hoje o contador fecha o mês no Luminaris com quatro trabalhos manuais: compor e conferir o saldo de cada conta numa
planilha, montar a DLPA/DMPL à mão, escrever as notas explicativas no Word e conferir, de cabeça, se tudo foi feito
antes de fechar o período. A proposta é um nó (`FECHAMENTO-ASSISTIDO`) com **quatro peças Prisma first-class**, em
cinco PRs pequenos:

1. **Conciliação de contas.** Saldo do razão × composição (itens), por conta e por mês. A composição vem dos subrazões
   que já existem (AR, AP, imobilizado, extrato) ou é digitada. O contador confere, e a conferência **fica desatualizada
   sozinha** se entrar lançamento depois. Não há trava nova no `postEntry`: a trava dura continua sendo o período (F-FA-3).
2. **DLPA/DMPL** como relatório lido do razão (PL inicial → fatos → PL final). Depois, na ECD, os registros
   **J210/J215**, atrás de um flag que só liga depois do teste no PVA do H1 (F-FA-8).
3. **Notas explicativas** com texto, variáveis lidas do razão e vínculo com as linhas do BP/DRE/DLPA (`NOTA_EXP_REF`).
   O contador aprova e elas vão para o **J800** (RTF, TIPO_DOC 010).
4. **Checklist de fechamento.** Verificações em código (conciliação conferida, `ReconcilePending` = 0, aprovações = 0,
   tie-out, depreciação rodada, apuração confirmada…). O resultado fica gravado por período e trava o `HARD_CLOSED` (F-FA-11).

**O que a lei manda (verificado):** a DLPA é exigida em todo porte que o produto atende. Na microentidade, pela
NBC TG 1002 item 3.6. Na pequena empresa, cabe a DMPL ou a DLPA, pela NBC TG 1001 itens 3.5 e 6.2. No Lucro Real,
vale a Lei 6.404, art. 176, II, por força da ITG 1000 item 10. As notas são obrigatórias para a pequena empresa e no
Lucro Real. Para a microentidade, não são (NBC TG 1002 item 3.7). No PVA, J210, J215 e J800 são **facultativos**:
omitir não reprova, mas **emitir errado reprova**.

**Risco principal:** o J210/J215 só se prova no PVA. Até o H1, o relatório da DLPA vale, mas a emissão na ECD fica
desligada. A classificação dos fatos do PL (J215) é o ponto em que o desenho mais pode errar (F-FA-6).

---

## 1. Objetivo (sob a letra)

A letra é "planejar o pacote que tira do contador o trabalho manual de fechamento". O objetivo é que o contador
**revise e assine** em vez de **montar**. A norma não deixa o sistema assinar no lugar dele: as análises e
demonstrações são "atribuição e responsabilidade exclusivas do profissional" (ITG 2000 (R1) item 12). Na prática:

- (1) cada conta relevante tem saldo composto e conferido por alguém identificado, com data;
- (2) a DLPA/DMPL sai do razão sem planilha e bate com a ECD (I155) pelas mesmas regras do PGE;
- (3) as notas são escritas uma vez, com números que se atualizam, e o contador aprova cada versão;
- (4) fechar o período exige que o checklist esteja verde ou que o contador registre por que passou por cima;
- (5) nada disso entra no caminho do lançamento: `postEntry` não muda.

## 2. Evidência

### 2.1 Plano e decisões

| Fato | Fonte | Implica |
|---|---|---|
| F3 lista `FECHAMENTO-ASSISTIDO` (checklist, SOFT→HARD condicionado, trilha) e os miúdos "históricos padronizados" e "DLPA/DMPL se o PVA do H1 cobrar" | `PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md:237` | Escopo-base; aqui ampliado com conciliação e notas, que a sessão coordenadora mediu em 22/10 |
| DLPA/DMPL: `grep J210` = 0 | `PROPOSTA…:150` | Confirmado: `J210` não aparece em `server/src` (só `J800` na lista de tags proibidas do J801, `sped.ts:581`) |
| J210/J215/J800 ficaram fora do MVP da ECD | `docs/adr/ADR-INCR-SPED-ECD-file-generation.md:162` | Decisão consciente; este PRE-ADR é o que a reabre |
| "DMPL/DFC/notas não existem → frente própria com ADR" | `docs/accounting/BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md:125,197` | A DFC foi feita depois (`CashFlowReportService.ts:195`); DMPL e notas, não |
| Mapa 10/10: DMPL e notas "PLANO(reg)", DLPA "NÃO MAPEADO" | `docs/accounting/mapa-2026-10-10/dominio-contabil.md:80-82` | Mesmas lacunas, sem nó |
| `PROVISOES-AGENDADAS` colide com [[R-motor-regras]]; Q5 aberta | `PROPOSTA…:236,355`; `docs/plano/rejeitadas/R-motor-regras.md` | Fork F-FA-2, sem decisão |
| `CONCILIACAO-QUATRO-VIAS` proposto como item do checklist | `PROPOSTA…:312` | Vira um *check* opcional quando existir (F-FA-12) |
| Fronteira DT × Prisma: lei + atomicidade → Prisma | `docs/adr/ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md` | As quatro peças são Prisma (§3) |

### 2.2 O código (fato consumado, lido em `672031c5`)

| Fato | Onde | Implica |
|---|---|---|
| Período: `FUTURE → OPEN → SOFT_CLOSED ⇄ OPEN → HARD_CLOSED` (terminal), com transição e auditoria na mesma tx | `PeriodService.ts:94` (soft), `:126` (hard), `:158` (reopen); `schema.prisma:465-503` | O gate do checklist entra aqui (F-FA-11), não no `postEntry` |
| Lançar só em período `OPEN` | `PostingService.ts:125,142` | A trava dura já existe: período fechado não aceita lançamento (F-FA-3) |
| Reabrir exige o contador ativo (preflight + releitura na tx) | `PeriodService.ts:26-28,40-46`; `IAccountingPolicy.ts:167` | Padrão a copiar para "aprovar nota" e "passar por cima do checklist" |
| Pendências da ponte operacional → razão | `ReconcilePendingItem`, `schema.prisma:2260`; `ReconcilePendingService.list` | *Check* "pendências = 0" |
| Aprovação maker-checker | `EntryApprovalService.listPendingApproval` (`:360`) | *Check* "aprovações pendentes = 0" |
| Conciliação **bancária** (linha de extrato × partida) | `ReconciliationService.ts:290` (auto), `:558` (manual), `:712` (pendingReport) | É outra coisa: bate linha a linha. A conciliação **de conta** (saldo × composição) não existe. O extrato serve de fonte de composição do banco |
| Tie-out subrazão × razão (1.1.2 e afins) | `TieOutDiagnosticService.ts:142` | *Check* "tie-out OK" e fonte de composição |
| Depreciação mensal idempotente por `${assetId}:${yearMonth}` | `DepreciationService.ts:98` | *Check* "depreciação do mês lançada" (lê o razão pela chave) |
| Apurações com `status CONFIRMED` | `TaxAssessment` (`schema.prisma:2809`), `SimplesApuracao` (`:3083`) | *Checks* "apuração do período confirmada" por regime |
| Balancete com flag `balanced` | `AccountingReportService.ts:408`; saldos em data `:451` | *Check* barato e fonte do saldo da conciliação |
| Encerramento do exercício posta `sourceType='closing'` contra 2.3.1 | `ExerciseClosingService.ts` (cabeçalho) | É o fato "resultado do exercício" da DLPA |
| PL do plano-semente: 2.3.1.01 LPA, 2.3.2.01 Capital Social Integralizado, 2.3.3.01 Reserva Legal | `ChartOfAccountsFixture.ts:77-84` | A DMPL tem ao menos 3 colunas no plano-semente |
| Aglutinação da ECD é 1:1 com a conta analítica (D12) | `SpedGenerationService.ts:360` | `J210.COD_AGL` = código da conta analítica do PL; `REGRA_EXISTE_AGLUTINACAO_J210` atendida de graça |
| `NOTA_EXP_REF` já é campo do J100/J150 (vazio hoje) | `sped.ts:465,486,500,523` | O vínculo nota → linha é só preencher |
| Bloco J emitido em ordem J005 → J100 → J150 → (J801) | `sped.ts:956-961`; `buildEcdFile` `:891` | J210/J215 entram depois do J150; J800 antes do J801 |
| Sanitizador de RTF do J801 (tags proibidas, inclui `J800`) | `sped.ts:581,645` (`sanitizeRtfForSped`) | Reuso direto para o RTF do J800 |
| Porte micro × pequena **não é gravado**; só `regime` e `grandePorte` | `CompanyFiscalProfile`, `schema.prisma:1728-1729` | Escolha DLPA × DMPL e "notas obrigatórias?" dependem de porte (F-FA-7) |
| Revisão profissional anual com sign-off (nome + CRC) | `AccountingReview`, `schema.prisma:2397`; `AccountingReviewService.signOff` | O checklist **anual** referencia a revisão; não a substitui |
| Não há lançamento automático de distribuição de lucros (só contas 2.1.7.x configuráveis) | `grep` de `sourceType` em `server/src/features/accounting` (16 tipos; nenhum de distribuição) | Dividendos entram por lançamento manual: a J215 precisa classificar manual (F-FA-6) |

### 2.3 A norma (dossiê `pesquisas-legais/fechamento-assistido-dlpa-dmpl-notas/`)

| Ponto | Norma | Grau |
|---|---|---|
| Microentidade (receita bruta ≤ R$ 4,8 mi): BP + DRE + **DLPA**; DMPL opcional, com a DLPA como coluna | NBC TG 1002 itens 3.6 e 6.2 | verificado |
| Microentidade: notas **não obrigatórias**; declaração de conformidade e atividade "ao final das demonstrações" obrigatória | NBC TG 1002 itens 3.7 e 3.2 | verificado |
| Pequena (R$ 4,8 mi a R$ 78 mi): BP, DRE, **DMPL**, DFC, **notas**; só DLPA se o PL só mexeu em LPA | NBC TG 1001 itens 3.5 e 6.2 | verificado |
| Pequena: cada item da demonstração referencia a nota; nota declara conformidade | NBC TG 1001 itens 8.3 e 8.5 | verificado |
| Micro/pequena no **Lucro Real** ou companhia fechada → Lei 6.404 | ITG 1000 (2022) item 10 | verificado |
| Lei 6.404: DLPA obrigatória; pode ir na DMPL; notas obrigatórias com conteúdo mínimo | arts. 176 II, §4º, §5º; 186 §2º | verificado |
| Diretriz de notas: nota 1 = entidade/atividade; nota 2 = conformidade | ITG 1000 Anexo 6, A6.7-A6.8 | verificado |
| Carta de Responsabilidade da Administração ao fim de cada exercício | ITG 1000 itens 12-15 | verificado |
| Análises e demonstrações são do profissional habilitado | ITG 2000 (R1) item 12 | verificado |
| J210 (9 campos), J215 (5), J800 (6): leiaute e regras do PGE | Manual ECD L9, maio/2026, pp. 187-193 | verificado |
| J210/J215/J800 facultativos no PVA | Manual ECD L9, tabela de obrigatoriedade (coluna "F") | verificado |
| "Conciliação de contas" como procedimento formal | — | **não há norma**; decorre do CC art. 1.188 ("situação real") e da ITG 2000 item 12 |

### 2.4 Mercado (22/10/2026)

| Referência | O que faz | Fonte | Grau |
|---|---|---|---|
| Alterdata — Concilia Fácil / Conciliar Lançamentos | Marca **lançamentos** como Conciliado / Não conciliado / Pendente (pendente exige observação "o que verificar e com quem"); casa por histórico ou documento; habilita por conta ("Conciliação de Lançamentos = Sim"). **Não trava a conta** | ajuda.alterdata.com.br/wcont/realizar-consultas-contabil/concilia-facil e …/conciliar-lancamentos | lido |
| Alterdata — Notas explicativas | Cadastro de nota com **variáveis** (`<NMEMPRESA>`, `<NRCGC>`, `<NMCONTADOR>`, `<NRCRC>`, `<SD>`, `<SDANT>`, `<MV>`, `<TOTDEBITO>`, `<VALOR>`, `SD XX[EE]` = saldo de outra conta), ordem editável, **vínculo a conta**, campo "Resumo" usado na ECD | ajuda.alterdata.com.br/wcont/gerar-livros-e-relatorios/criar-notas-explicativas-contabil | lido |
| Domínio | Help center oficial sobre conciliação de contas e notas: **não encontrado** nas buscas de 22/10 | — | não verificado |
| Odoo / ERPNext | Datas de bloqueio e "Period Closing Voucher": **não lidos nesta sessão** | — | insumo ausente (§9) |

O desenho da §4 combina as duas coisas da Alterdata: estado por item e variáveis com vínculo a conta. Acrescenta o
que ela não tem: o **saldo composto** e a conferência que **perde a validade sozinha**.

## 3. Colisões verificadas

| Com | Colide? | Por quê |
|---|---|---|
| Fronteira DT × Prisma | Não | A DLPA, as notas e o fechamento são desenhados pela lei. A conferência precisa ser imutável por construção (trilha). As quatro peças ficam em **Prisma first-class**. O usuário configura só *quais* checks valem (flag), não cria check (F-FA-12) |
| [[R-motor-regras]] ("template gera lançamento") | **Só a parte de provisões** | Nenhuma peça aqui gera lançamento. Conciliação, DLPA, notas e checklist **só leem** o razão. As provisões recorrentes ficam no F-FA-2, que repete a Q5 sem decidir |
| `postEntry` (caminho quente, todas as pontes) | Não, se F-FA-3 → (a) | A recomendação não toca `PostingService`. A opção (b) tocaria e por isso não é a recomendada |
| [[T5]] (correção por estorno) | Não | Conferência desatualizada pede nova conferência, não edição de lançamento |
| ECD em produção (`buildEcdFile`) | Controlada | J210/J215/J800 entram atrás de flag no DTO do export (F-FA-8). Sem o flag, o arquivo sai idêntico ao de hoje (teste de igualdade byte a byte) |
| C11 (revisão profissional anual) | Não | O checklist anual tem o item "revisão C11 assinada" e lê `AccountingReview.status`. Não duplica o sign-off |
| `CONCILIACAO-QUATRO-VIAS` (proposto 22/10) | Não | Entra como mais um check quando existir |
| `EXPORT-RELATORIOS` (F5) | Não | O PDF da DLPA e das notas é dele. Aqui só entram o JSON e o RTF da ECD |

## 4. Desenho proposto

### 4.1 Conciliação de contas (`AccountReconciliation` + `AccountReconciliationItem`)

- **Unidade:** (escopo, conta analítica, ano, mês). O saldo de referência é `balancesAsOf(fim do mês)`.
- **Composição:** itens com descrição, valor em centavos (BigInt, como as demais colunas `*Cents`), referência opcional
  (contraparte, título, bem, documento) e **origem** (`MANUAL` ou a fonte que gerou: `AR_OPEN`, `AP_OPEN`,
  `FIXED_ASSET`, `BANK_STATEMENT`, `INVENTORY`). A diferença é `saldo − Σ itens`.
- **Fontes de composição** são adaptadores de leitura sobre serviços que já existem (F-FA-5). Ligar uma fonte gera
  sugestão de itens. Quem grava é o usuário.
- **Conferir** grava o retrato do razão: Σ débito, Σ crédito e nº de partidas da conta até o fim do mês, mais quem e
  quando. Só confere com diferença zero, ou com diferença justificada em texto (F-FA-4).
- **Desatualizada (derivado, não gravado):** se o retrato atual diverge do gravado, a conferência vale como
  `STALE`. O checklist reprova e a tela mostra o que mudou. Não há bloqueio de lançamento (F-FA-3).
- **Quais contas exigem conciliação:** flag por conta (`Account.requiresReconciliation`, padrão no plano-semente para
  disponível, clientes, fornecedores, tributos a recolher, imobilizado e PL). Mesmo padrão do `requiresDimension`.

### 4.2 DLPA / DMPL (`EquityStatementService`, só leitura)

- Colunas = contas analíticas de natureza `Equity` (no plano-semente: 2.3.1.01, 2.3.2.01, 2.3.3.01).
- Linhas = saldo inicial → fatos do exercício → saldo final. Cada partida numa conta de PL vira um fato **classificado**
  (F-FA-6): resultado do exercício (`sourceType='closing'`), ajuste de exercícios anteriores, distribuição de lucros,
  aumento/redução de capital, constituição/reversão de reservas, outras.
- **Tie-out obrigatório:** saldo final da coluna = saldo da conta em `balancesAsOf(31/12)`; Σ fatos = final − inicial.
  São as mesmas duas regras do PGE (`REGRA_VALIDA_DMPL_COM_SALDO_FIN` e `REGRA_VALIDA_TOT_AGLUTINACAO_J215`).
  Divergência = erro de geração, nunca linha "ajuste" inventada.
- **DLPA × DMPL:** DLPA = só a coluna de LPA; DMPL = todas. Escolha por F-FA-7.
- **ECD:** `buildJ210`/`buildJ215` em `lib/sped.ts`, emitidos depois do J150, só com `includeEquityStatement=true`
  (F-FA-8). DLPA → um só J210 com `IND_TIP=0` (REGRA_UNICO_DLPA). DMPL → um J210 por conta com `IND_TIP=1`.

### 4.3 Notas explicativas (`FinancialStatementNote` + versões)

- Por (escopo, exercício): ordem, título, corpo, vínculos e status `DRAFT → APPROVED`. Editar uma aprovada cria nova
  versão em `DRAFT` (a aprovada fica imutável, para a trilha).
- **Corpo:** texto com **variáveis de uma lista fechada** (`{{empresa.razaoSocial}}`, `{{empresa.cnpj}}`,
  `{{contador.nome}}`, `{{contador.crc}}`, `{{conta:2.3.2.01.saldoFinal}}`, `{{conta:…saldoInicial}}`,
  `{{conta:…movimento}}`, `{{exercicio}}`). Variável desconhecida = 400 na gravação, não texto em branco.
  Alternativa: `.rtf` pronto enviado pelo contador (F-FA-9).
- **Vínculo:** nota → contas analíticas. Daí sai o `NOTA_EXP_REF` (número da nota) das linhas J100/J150/J210 que
  agregam aquelas contas (aglutinação 1:1, D12).
- **Aprovar:** só o contador ativo (F-FA-10), no mesmo padrão de duas leituras do `canReopenPeriod`.
- **ECD:** as notas aprovadas viram **um** RTF (na ordem), passam pelo `sanitizeRtfForSped` e saem num J800 com
  `TIPO_DOC=010`. Com flag no export. Sem nota aprovada, o J800 não sai e nenhuma linha leva `NOTA_EXP_REF`
  (a REGRA_EXISTE_NOTA_EXPLICATIVA exige o par).
- **Modelos iniciais** por porte, da ITG 1000 Anexo 6: nota 1 (entidade e atividade) e nota 2 (declaração de
  conformidade com a NBC TG 1001 ou 1002). Também o modelo da Carta de Responsabilidade (ITG 1000 Anexo 1) (F-FA-12).

### 4.4 Checklist de fechamento (`ClosingChecklistRun`)

- **Checks em código**, num `Record<ClosingCheckId, ClosingCheck>` exaustivo (mesmo padrão do
  `POS_FEEDER_SOURCE_TYPE_MAP` do tie-out): id, escopo (`MONTHLY` | `ANNUAL`), regimes em que vale e uma função de
  leitura que devolve `PASS | FAIL | WARN | NOT_APPLICABLE` com contagem e link de evidência.
- **Mensais:** balancete fecha · `ReconcilePending` aberto = 0 · aprovações pendentes = 0 · linhas de extrato não
  conciliadas = 0 · tie-out OK · depreciação do mês lançada (se há bem ativo) · contas que exigem conciliação conferidas
  e não `STALE` · apuração do mês confirmada (Simples/PIS-Cofins/IBS-CBS conforme o regime) · *provisões lançadas*
  (`NOT_APPLICABLE` até o F-FA-2).
- **Anuais (dezembro):** encerramento do exercício lançado · DLPA/DMPL com tie-out OK · notas aprovadas (se o porte ou
  regime exigir, F-FA-7) · carta de responsabilidade anexada · revisão C11 assinada · IRPJ/CSLL do último período confirmados.
- **Rodar** grava um `ClosingChecklistRun` com o resultado de cada check (retrato imutável) e audita.
- **Gate (F-FA-11):** `hardClosePeriod` exige a última rodada **verde e atual**, ou um override do contador ativo com
  motivo (auditado). `softClosePeriod` só avisa.

## 5. Forks (todos RATIFICAÇÃO PENDENTE)

### F-FA-0 — Um nó ou quatro?
- (a) **Um nó `FECHAMENTO-ASSISTIDO`, cinco PRs** (ordem na §6). *Recomendado:* as peças se encontram no checklist,
  e a fila F3 já tem o nó com esse nome (`FILA-ORDEM.md:94`).
- (b) Quatro nós (`CONCILIACAO-CONTAS`, `DEMONSTRACOES-PL`, `NOTAS-EXPLICATIVAS`, `FECHAMENTO-ASSISTIDO`). A régua fica
  mais fina, mas aumenta o custo de vault e a dependência cruzada.
- Fonte: `PROPOSTA…:237`.

### F-FA-1 — `RB-CONTABIL` neste PRE-ADR?
- (a) **Não: PRE-ADR próprio, depois.** *Recomendado:* é generalizar o `CrmReportDefinition.source` para o razão. É
  outro contrato e outro risco, e nada das quatro lacunas depende dele. A DLPA/DMPL é demonstração **fixa da lei**,
  não relatório configurável.
- (b) Sim, junto.
- Fonte: `PROPOSTA…:238`; regra 5 da `sessao-planejamento`.

### F-FA-2 — Provisões recorrentes × [[R-motor-regras]] (é a **Q5** do dono, repetida sem decidir)
- (a) ADR que define "cópia agendada revisada por humano" como fora da rejeição. O precedente é o job de depreciação
  do C8, que cria lançamento idempotente por chave. Aqui seria criar **DRAFT** para o maker-checker.
- (b) Manter a rejeição; provisão fica manual (CSV mensal).
- **Recomendação da proposta de 20/10:** (a). **Este PRE-ADR não depende da resposta.** O check "provisões lançadas"
  nasce `NOT_APPLICABLE` e só liga se (a) virar nó.
- Fonte: `PROPOSTA…:236,355-357`; `rejeitadas/R-motor-regras.md`.

### F-FA-3 — "Trava da conta conferida"
- (a) **Conferência que perde a validade:** lançar continua livre no período `OPEN`. A conferência vira `STALE`
  pelo retrato (Σd, Σc, nº de partidas) e o checklist reprova. A trava dura é o fechamento do período, que já existe.
  *Recomendado:* não toca o `postEntry` (os 16 `sourceType` de ponte passam por ele). Também não cria um segundo mecanismo de bloqueio
  ao lado do período. A Alterdata, a referência lida, também não trava a conta.
- (b) Bloqueio no `postEntry` para conta conferida no mês. É a trava "de verdade", mas põe um gate novo dentro da tx de
  todo lançamento e faz ponte automática falhar (vira `ReconcilePending` por motivo novo).
- (c) Sem estado de desatualização (só data da conferência).
- Fonte: `PostingService.ts:125,142`; página "Conciliar Lançamentos" da Alterdata.

### F-FA-4 — Conferir com diferença
- (a) **Só com diferença zero, ou com justificativa em texto (≥ 10 caracteres), auditada.** *Recomendado:* é o
  "pendente exige observação" da Alterdata. Diferença justificada aparece como `WARN` no checklist, não como `PASS`.
- (b) Só com diferença zero.
- Fonte: Alterdata (§2.4).

### F-FA-5 — Fontes de composição na v1
- (a) **AR em aberto, AP em aberto, imobilizado (custo e depreciação acumulada) e saldo final do extrato importado;
  o resto, manual.** *Recomendado:* os quatro já existem como serviço de leitura.
- (b) Só manual na v1.
- (c) (a) + estoque (`InventoryService`) e tributos a recolher (apurações). Mais cobertura, mais PR.

### F-FA-6 — Como classificar os fatos do PL (J215)
- (a) Tabela de regra por `sourceType` + conta de contrapartida (ex.: `closing` → "Resultado do exercício";
  contrapartida em 2.1.7.01/02 → "Distribuição de lucros/JCP"). O resto cai em "Outras mutações".
- (b) Tag manual obrigatória em todo lançamento manual que toque o PL.
- (c) **(a) com override manual por partida, guardado ao lado do lançamento** (metadado, sem mudar o lançamento).
  *Recomendado:* as pontes classificam sozinhas. Dividendo e aumento de capital, que hoje são manuais, ganham
  classificação explícita, e o relatório mostra "Outras mutações" como alerta, não como silêncio.
- Fonte: Manual ECD L9 J215 (`COD_HIST_FAT` livre); NBC TG 1002 item 6.1 e NBC TG 1001 item 6.1 (lista de itens mínimos).

### F-FA-7 — Porte (micro × pequena) e escolha DLPA × DMPL
- (a) **Derivar o porte da receita bruta do exercício anterior no razão, com override do contador no
  `CompanyFiscalProfile`.** DLPA por padrão. DMPL quando o porte é pequena **e** o PL mexeu fora de LPA, ou quando o
  regime é Lucro Real. *Recomendado:* segue NBC TG 1001 item 6.2 e ITG 1000 itens 5, 10 e 11 sem pedir dado novo ao
  usuário. O override cobre o caso do contrato social com regência supletiva da S.A.
- (b) Campo manual de porte, sem derivar.
- (c) Sempre DMPL (a DLPA vai como coluna, NBC TG 1002 item 6.2). Mais simples, mas mais texto para o micro.
- Fonte: dossiê §1; `schema.prisma:1728-1729`.

### F-FA-8 — J210/J215/J800 na ECD
- (a) Sempre que houver dado.
- (b) **Flag no DTO do export (`includeEquityStatement`, `includeNotes`), padrão desligado até o teste no PVA do H1.**
  *Recomendado:* omitir não reprova o PVA, emitir errado reprova. É o mesmo cuidado do J801.
- (c) Não emitir; DLPA e notas só no PDF.
- Fonte: Manual ECD L9 (tabela de obrigatoriedade; REGRA_VALIDA_DMPL_COM_SALDO_FIN e REGRA_VALIDA_TOT_AGLUTINACAO_J215).

### F-FA-9 — Corpo da nota
- (a) Texto com variáveis da lista fechada, renderizado para RTF pelo servidor.
- (b) Só upload de `.rtf` pronto (padrão do J801).
- (c) **Os dois:** texto com variáveis por padrão, e upload de `.rtf` para quem já tem as notas no Word.
  *Recomendado:* (a) é o ganho de produto, porque o número se atualiza sozinho. (b) é a migração do contador que já tem
  o arquivo. O upload reusa o `sanitizeRtfForSped`.
- Fonte: Alterdata (variáveis); `sped.ts:645`.

### F-FA-10 — Quem aprova nota e quem passa por cima do checklist
- (a) **Só o contador ativo** (`AccountantAssignment` ACTIVE), com o fallback do dono sem contador, como no
  `canReopenPeriod`. *Recomendado:* ITG 2000 (R1) item 12.
- (b) Qualquer `canClosePeriod`.
- Fonte: `IAccountingPolicy.ts:164-167`.

### F-FA-11 — O que o checklist bloqueia
- (a) Bloqueia `softClose` e `hardClose`.
- (b) Só avisa.
- (c) **Bloqueia `hardClose` (terminal), avisa no `softClose`; override do contador ativo com motivo, auditado.**
  *Recomendado:* o `HARD_CLOSED` não reabre (`PeriodService.ts:158-171`), então é ali que o erro custa caro. O
  `SOFT_CLOSED` reabre e serve de rascunho do fechamento.
- Fonte: `PeriodService.ts`; `PROPOSTA…:237` ("SOFT→HARD condicionado ao checklist").

### F-FA-12 — Checks e modelos: código ou configuração do usuário?
- (a) **Checks e modelos de nota em código (lista fechada), com liga/desliga por escopo em Prisma.** *Recomendado:* a
  lista é desenhada pela lei e pelo produto; check novo é PR com teste. Contador que quer item próprio usa nota ou
  observação.
- (b) Check customizado pelo usuário (DynamicTable). Colide com a fronteira de persistência para o que trava o
  fechamento.

### F-FA-13 — Id e fold
- (a) **Manter `FECHAMENTO-ASSISTIDO`; a nota em `docs/plano/nos/` nasce no PR da ratificação, com `write_set` da
  §6.** *Recomendado:* `docs/plano/README.md` §Fold.
- (b) Outro id.

## 6. Comportamentos candidatos do futuro BRIEF

Esqueleto em ordem de PR. Cada item é testável sozinho. Itens com fork só entram no BRIEF na forma ratificada.
Escopo **backend** (o FE é `FE-INCR-FECHAMENTO-ASSISTIDO`, nó vizinho).

**PR-1 — DLPA/DMPL (só leitura, sem schema)**
1. `EquityStatementService.statement(scope, year)` devolve colunas (contas `Equity` analíticas), saldo inicial, fatos e saldo final, em centavos.
2. Fato `closing` do exercício aparece como "Resultado do exercício" na coluna 2.3.1.01.
3. Classificação por regra (F-FA-6) + "Outras mutações" com contagem de partidas não classificadas.
4. Tie-out: `final(coluna) == balancesAsOf(31/12)` e `Σ fatos == final − inicial`. Divergência → erro, sem linha de ajuste.
5. `kind` DLPA × DMPL pela regra do F-FA-7.
6. Rota `GET /accounting/reports/equity-statement?year=` (Route → Controller → Service, policy `canRead`, DTO `.strict()`).
7. Snapshot de shape do DTO + paridade i18n de rótulos de fato.

**PR-2 — Conciliação de contas**
8. Migração: `Account.requiresReconciliation` (default false; seed liga nas contas da §4.1), `AccountReconciliation`, `AccountReconciliationItem`, `AccountReconciliationConferral` (retrato).
9. Criar/editar composição (itens manuais) só em período `OPEN` ou `SOFT_CLOSED`.
10. Fontes de composição (F-FA-5) geram **sugestões**; aceitar grava itens com `origin` da fonte.
11. `diffCents = saldo(fim do mês) − Σ itens`, calculado na leitura.
12. Conferir: grava retrato (Σd, Σc, nº de partidas até o fim do mês) + ator + data; recusa diferença ≠ 0 sem justificativa (F-FA-4).
13. Estado `STALE` derivado: retrato atual ≠ gravado. Teste: conferir, lançar na conta no mesmo mês, ler → `STALE`.
14. Auditoria: `account_reconciliation.conferred` e `.reopened`, na allowlist do `auditCanonical.ts` no mesmo PR, sem texto livre de contraparte no payload.
15. Escopo/tenant: conta de outro escopo → 404 (teste de isolamento).

**PR-3 — Checklist + gate**
16. Registro `Record<ClosingCheckId, ClosingCheck>` exaustivo (tsc quebra com id faltando).
17. Cada check mensal da §4.4 com teste PASS e FAIL próprio.
18. `runChecklist(scope, year, month)` grava `ClosingChecklistRun` imutável + auditoria.
19. "Atual" = nenhuma partida no período depois do `ranAt` (lida na tx do fechamento).
20. `hardClosePeriod`: sem rodada verde e atual → 409, exceto com override (F-FA-10/11). **Gate re-checado dentro da tx** do `setStatus`.
21. `softClosePeriod`: devolve o resultado do checklist no corpo, sem bloquear (F-FA-11 c).
22. Liga/desliga de check por escopo (F-FA-12), auditado.

**PR-4 — Notas explicativas (+ J800)**
23. Migração: `FinancialStatementNote`, `FinancialStatementNoteVersion`, `FinancialStatementNoteAccount`.
24. Variáveis da lista fechada; variável desconhecida → 400 na gravação.
25. Aprovar exige contador ativo (F-FA-10), com releitura na tx; versão aprovada imutável.
26. Modelos iniciais por porte (nota 1 e nota 2, ITG 1000 Anexo 6) e Carta de Responsabilidade (Anexo 1).
27. Renderização RTF determinística (mesmo input → mesmo sha256) + `sanitizeRtfForSped`.
28. Upload de `.rtf` (F-FA-9 c) com o mesmo sanitizador e limite de 30 MB do manual.

**PR-5 — ECD (atrás de flag)**
29. `buildJ210`/`buildJ215`/`buildJ800` em `lib/sped.ts`, com teste de campo a campo contra os exemplos do manual (pp. 189, 191, 193).
30. `includeEquityStatement=false` e `includeNotes=false` → arquivo **idêntico byte a byte** ao de hoje.
31. DLPA → um só J210 `IND_TIP=0`; DMPL → todos os J210 com `IND_TIP=1`; primeiro J215 = saldo inicial.
32. `NOTA_EXP_REF` preenchido em J100/J150/J210 **só** quando sai J800 `TIPO_DOC=010`.
33. Ordem do bloco J: J005, J100, J150, J210/J215, J800, J801, J900… e contagem no 9900.

## 7. Contratos esboçados (Zod)

```ts
// dtos/EquityStatementDto.ts
export const EquityStatementQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
}).strict();

export const EquityFactKind = z.enum([
  'OPENING_BALANCE', 'NET_INCOME', 'PRIOR_PERIOD_ADJUSTMENT', 'PROFIT_DISTRIBUTION',
  'CAPITAL_INCREASE', 'CAPITAL_DECREASE', 'RESERVE_APPROPRIATION', 'RESERVE_REVERSAL', 'OTHER',
]);

export const EquityStatementViewSchema = z.object({
  year: z.number().int(),
  kind: z.enum(['DLPA', 'DMPL']),
  kindReason: z.enum(['MICRO_DEFAULT', 'SMALL_ONLY_LPA', 'SMALL_EQUITY_MOVED', 'LUCRO_REAL', 'OVERRIDE']),
  columns: z.array(z.object({ accountId: z.string(), code: z.string(), name: z.string() })),
  rows: z.array(z.object({
    kind: EquityFactKind,
    label: z.string(),
    amountsCents: z.record(z.string(), z.string()), // accountId → centavos (string de BigInt)
  })),
  closingCents: z.record(z.string(), z.string()),
  unclassifiedPostings: z.number().int().nonnegative(),
  tieOut: z.object({ closingMatchesLedger: z.boolean(), factsSumMatches: z.boolean() }),
});

// dtos/AccountReconciliationDto.ts
export const ReconciliationItemOrigin = z.enum(['MANUAL', 'AR_OPEN', 'AP_OPEN', 'FIXED_ASSET', 'BANK_STATEMENT']);

export const UpsertReconciliationItemsSchema = z.object({
  accountId: z.string().cuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  items: z.array(z.object({
    description: z.string().min(1).max(200),
    amountCents: z.string().regex(/^-?\d+$/), // BigInt em string
    reference: z.string().max(120).optional(),
    origin: ReconciliationItemOrigin,
  }).strict()).max(5000),
}).strict();

export const ConferReconciliationSchema = z.object({
  reconciliationId: z.string().cuid(),
  justification: z.string().min(10).max(1000).optional(), // obrigatório se diff ≠ 0 (F-FA-4) — refine no service
}).strict();

export const AccountReconciliationViewSchema = z.object({
  id: z.string(),
  accountId: z.string(), code: z.string(), year: z.number(), month: z.number(),
  ledgerBalanceCents: z.string(),
  itemsTotalCents: z.string(),
  diffCents: z.string(),
  status: z.enum(['OPEN', 'CONFERRED', 'STALE']), // STALE é derivado na leitura
  conferredBy: z.string().nullable(), conferredAt: z.string().nullable(),
});

// dtos/ClosingChecklistDto.ts
export const ClosingCheckId = z.enum([
  'TRIAL_BALANCE_BALANCED', 'RECONCILE_PENDING_ZERO', 'APPROVALS_PENDING_ZERO', 'BANK_LINES_UNMATCHED_ZERO',
  'TIE_OUT_OK', 'DEPRECIATION_POSTED', 'ACCOUNTS_RECONCILED', 'TAX_ASSESSMENT_CONFIRMED', 'PROVISIONS_POSTED',
  // anuais
  'EXERCISE_CLOSING_POSTED', 'EQUITY_STATEMENT_TIES_OUT', 'NOTES_APPROVED', 'MANAGEMENT_LETTER_ATTACHED',
  'PROFESSIONAL_REVIEW_SIGNED', 'IRPJ_CSLL_CONFIRMED',
]);

export const ClosingChecklistRunViewSchema = z.object({
  id: z.string(), year: z.number(), month: z.number(), ranAt: z.string(), ranBy: z.string(),
  results: z.array(z.object({
    checkId: ClosingCheckId,
    outcome: z.enum(['PASS', 'FAIL', 'WARN', 'NOT_APPLICABLE']),
    count: z.number().int().nonnegative(),
    evidenceHref: z.string().optional(),
  })),
  green: z.boolean(), // nenhum FAIL
});

export const HardCloseWithChecklistSchema = z.object({
  reason: z.string().max(500).optional(),
  overrideChecklist: z.object({ justification: z.string().min(10).max(1000) }).strict().optional(),
}).strict();

// dtos/FinancialStatementNoteDto.ts
export const NoteVariable = z.enum([
  'empresa.razaoSocial', 'empresa.cnpj', 'empresa.atividade', 'contador.nome', 'contador.crc', 'exercicio',
]); // + padrão `conta:<code>.(saldoInicial|saldoFinal|movimento)` validado por regex

export const UpsertNoteSchema = z.object({
  year: z.number().int(),
  order: z.number().int().min(1).max(999),
  title: z.string().min(1).max(200),
  body: z.string().max(200_000),          // texto com {{variáveis}}
  accountIds: z.array(z.string().cuid()).max(500),
}).strict();

// SpedEcdDto (extensão)
//   includeEquityStatement: z.boolean().default(false)   // F-FA-8
//   includeNotes:           z.boolean().default(false)   // F-FA-8
```

```ts
// lib/sped.ts (esboço dos builders)
export interface RegJ210Line { indTip: 0 | 1; codAgl: string; descrCodAgl: string;
  vlCtaIniCents: bigint; vlCtaFinCents: bigint; notasExpRef?: string } // D/C derivados do sinal
export interface RegJ215Line { codHistFat: string; descFat: string; vlFatContCents: bigint;
  indDcFat: 'D' | 'C' | 'P' | 'N' }
export interface RegJ800Input { tipoDoc: '001'|'002'|'003'|'010'|'011'|'012'|'099';
  descRtf?: string; arqRtf: string } // HASH_RTF calculado; IND_FIM_RTF = 'J800FIM'
```

## 8. Pendente de validação externa (não entra em checklist)

1. **PVA aceita J210/J215 gerados** (DLPA e DMPL) com o plano-semente. Gate: H1, com o flag ligado numa ECD de teste.
2. **J800 "Ocorrência 1:N" × "facultativo".** O manual se contradiz. Teste: ECD sem J800 no PVA (hoje já sai sem, então
   o H1 prova).
3. **"999" × "099"** na REGRA_EXISTE_NOTA_EXPLICATIVA. A recomendação evita depender disso (só TIPO_DOC 010).
4. **Status "em vigor" da NBC TG 1001/1002 e da ITG 1000 (2022) no SRE do CFC**, não exposto por URL direta.

## 9. Perguntas ao contador (separadas; pacote via `luminaris-contador-liaison`)

1. *"Para microentidade sem notas explicativas, você coloca a declaração de conformidade da NBC TG 1002 item 3.2 num
   J800 da ECD ou só nas demonstrações impressas?"* (ambiguidade 1 do dossiê)
2. *"Uma Ltda microentidade no Presumido, cujo contrato social adota a Lei das S.A. supletivamente (CC art. 1.053 par.
   único), precisa de notas explicativas?"* (ambiguidade 4)
3. *"Quais contas você concilia todo mês e quais só no balanço? A composição por título em aberto (AR/AP) e pela ficha
   do imobilizado serve como papel de trabalho, ou você precisa de outro formato?"* (calibra F-FA-5 e o seed da §4.1)
4. *"No checklist mensal, falta algum item que você confere hoje antes de fechar o mês?"* (calibra §4.4)
5. *"Você aceita conferir uma conta com diferença justificada, ou só com diferença zero?"* (F-FA-4)

## 10. Insumos ausentes

- Help center oficial da **Domínio** (conciliação e notas com variáveis): não achado. A comparação de 22/10 que dava
  "Domínio tem" não foi conferida em fonte da Thomson Reuters.
- **Odoo / ERPNext** (lock dates, Period Closing Voucher): não lidos. Não mudam o desenho; serviriam de contraexemplo
  para F-FA-3.
- **Porte real do primeiro tenant** (receita bruta do ano anterior): define se a v1 precisa de DMPL e de notas
  obrigatórias. Não está gravado (`schema.prisma:1728-1729`).

## 11. Achados fora de escopo (registrados, não planejados)

- **Históricos padronizados (ECD I075)**: miúdo do `FECHAMENTO-ASSISTIDO` em `PROPOSTA…:143`, mas fora das quatro lacunas
  pedidas. Fica para emenda.
- **DFC no J800 (`TIPO_DOC=002`)**: a DFC existe (`CashFlowReportService.ts:195`) e o J800 aceita. É obrigatória para
  a pequena empresa (NBC TG 1001 item 3.5 "d"). O PR-5 deixa a porta aberta, mas não a planeja.
- **PDF da DLPA e das notas**: pertence ao `EXPORT-RELATORIOS` (F5).
- **`RB-CONTABIL`**: PRE-ADR próprio (F-FA-1).

## 12. Como entra na fila (depois da ratificação)

Ratificado → `decisoes/D-<data>-FECHAMENTO-ASSISTIDO-FORKS.md` + nota `nos/FECHAMENTO-ASSISTIDO.md` (`write_set`:
`server/src/features/accounting/{services,repositories,dtos,controllers,policies}/**` dos nomes da §6,
`server/src/lib/sped.ts`, `server/prisma/schema.prisma` + migração; `registros`: `auditCanonical.ts`, factory, rotas)
→ BRIEF `docs/accounting/BE-INCR-FECHAMENTO-ASSISTIDO-brief.md` → `executa` por PR. Dependências: PR-1 e PR-2 não
dependem de nada aberto. PR-3 lê os dois. PR-5 depende do H1 para ligar o flag, não para mergear.

## Riscos desta proposta (incluindo os vieses do autor)

- **Viés de completude.** Cinco PRs para "tirar trabalho manual" é muito. O corte mínimo que entrega valor é PR-1 + PR-3
  (DLPA lida do razão + checklist com gate). A conciliação é o maior ganho para o contador, mas também o maior PR.
- **F-FA-6 pode errar no dado real.** Lançamento manual de PL sem classificação cai em "Outras mutações". Se o
  primeiro tenant tiver muitos, a DLPA sai correta no total e pobre na linha. O alerta de contagem é o mitigador.
- **"Atual" no checklist** (item 19) depende de ler partidas depois do `ranAt` dentro da tx do fechamento. Se for lido
  fora, repete a classe de bug "gate autoritativo fora da tx", que a casa já pagou.
- **Caso adversarial tentado:** "omitir o J210 reprova o PVA?". A tabela de obrigatoriedade diz "F" e as Observações
  dizem "facultativo", então não reprova. Se estivesse errado, a ECD de hoje (sem J210) já teria falhado no PVA do
  H1. Ela ainda não rodou, por isso o item 1 da §8 fica aberto, e não como fato.

## Estado legal verificado em 22/10/2026

Lei 6.404/76 e CC (acervo `ctresb/leis`, compilada, cópia de 13/10/2026, sem alerta). Manual ECD L9 maio/2026
(sped.rfb.gov.br, sha `bc63f0a893ce`). NBC TG 1001, NBC TG 1002, ITG 1000 (2022) e ITG 2000 (R1) baixadas do CFC, com
sha no dossiê. O detalhe e as ambiguidades estão em `pesquisas-legais/fechamento-assistido-dlpa-dmpl-notas/relatorio.md`.
