# PRE-ADR-NUCLEO-KIT-DE-SETOR — Núcleo contábil/fiscal portável + kit de setor importado pelo wizard

- **Data:** 2026-10-07
- **Status:** **Accepted (2026-10-07)** — F-KS-1..7 (+ R1–R3) decididos pela prática de referência, por regra do dono; F-KS-0 → (b) e R4 → "mantém automático" por questionário. Cédulas em [`D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA`](../plano/decisoes/D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA.md). Nenhum código autorizado sem "executa".
- **Autorização:** dono, chat, 07/10/2026: *"Esta autorizado"*, em resposta a *"Quando quiser transformar isso em trabalho,
  eu escrevo o texto do nó do plano para você autorizar"*. E, no mesmo dia: *"Pode passar esse plano na frente de tudo"*.
  Cédulas em [`D-2026-10-07-NUCLEO-KIT-DE-SETOR`](../plano/decisoes/D-2026-10-07-NUCLEO-KIT-DE-SETOR.md).
- **Divergência registrada (passo 1 da `sessao-planejamento`):** a autorização pedia "o texto do nó". O vault não deixa
  proposta nova virar nó antes de um PRE-ADR ratificado (`docs/plano/README.md`, última linha). Por isso a autorização
  foi lida no escopo mais estreito que cumpre a regra: **este PRE-ADR + a nota de decisão**. Não há BRIEF, nó nem código.
- **Nó:** nenhum. A proposta de id está em F-KS-1.
- **Autor:** `sessao-planejamento` (agente). Os forks são decididos pelo dono.
- **Base:** `origin/main` = `dc6fb361` (07/10).

## TLDR

A ideia do dono: o razão e as regras dele são universais; o regime fiscal é uma estratégia; o que varia de empresa para
empresa é uma **estrutura pronta, escolhida no wizard**; a origem dos fatos é trocável (DynamicTable aqui, vertical rígido
nos outros projetos do dono).

**Metade disso já existe e está ratificado:** a Prensa do [[P1]] (ADR-P1, Accepted 21/08) e o segundo vertical [[P2]].

| Peça da ideia | O que já existe | Grau |
|---|---|---|
| Fato contábil (vocabulário fechado do núcleo) | **Arquétipos em código testado**, catálogo fechado de 7 (`accountingBinding/archetypes/catalog.ts`) | V |
| Evento de negócio → fato | **Binding** por setor: `eventKey` → `archetypeKey` + slots de campo + slots de papel (`AccountingBindingDto.ts`) | V |
| Conta por papel, validada contra o plano do tenant | `roleSlots[].accountCode`, resolvido na compilação (F-P1-5a) | V |
| Versão | `AccountingBinding.bindingVersion` + `compiledFromHash` (detecta defasagem) + `Draft/Active/Superseded` | V |
| Estrutura padrão por setor | `SECTOR_BINDING_REGISTRY` (salão, clínica), usada por CLI e por `activate-default` | V |
| Select | Wizard → `sectorKey` → `activate-default` (BE-INCR-ONBOARDING-ACTIVATION item 9) | V (no BRIEF) |
| Origem trocável | Fronteiras de import testadas: o motor nunca importa a contabilidade; `accountingBinding` importa só contratos nomeados | V |
| Regime como estratégia | Presumido ([[X7]]), Real/ECF, Simples ([[X14]]) em nós próprios; regime em `CompanyFiscalProfile` | V |

**O que falta (o escopo deste PRE-ADR):**

1. O registro por setor carrega só o **binding**. Plano de contas, padrões fiscais e referencial ainda **não** vêm com a
   escolha do setor. Hoje há **um** plano canônico para todos (`ChartOfAccountsFixture.ts`).
2. **Não existe atualização** do kit nos tenants que já o instalaram (decisão 2 + os 3 níveis da decisão 7).
3. O **ajuste do contador** não tem onde morar sem ferir a invariante 4 do ADR-P1 ("nunca edição manual do artefato").
4. A **fronteira de portabilidade** do núcleo é parcial: há testes de import, mas não uma fronteira do conjunto
   razão + arquétipos + intérprete + formatos.
5. A **prioridade** "na frente de tudo" precisa dizer o que acontece com o que já está `inflight`.

---

## 1. Objetivo (sob a letra)

A letra é "transformar a ideia em trabalho". O objetivo, nas palavras do dono, é *"não faz sentido criar nem corrigir nada
se não estiver na estrutura correta"*: cada setor novo, aqui ou noutro projeto, entra **escolhendo** a estrutura e não
programando. A contabilidade continua confiável **por construção**, sem depender de quem escolheu.

Critério de pronto do incremento futuro (proposta):

- um tenant novo de um setor existente sai do wizard com plano, binding, padrões fiscais e referencial do kit, **sem passo
  manual**;
- uma versão nova do kit chega aos tenants pelos 3 níveis;
- o núcleo compila isolado do motor DynamicTable e da entrevista.

## 2. Evidência

### 2.1 Plano e decisões

- [[P1]] `done`, ADR-P1 **Accepted** (21/08). Ele fixa: arquétipos em código; binding = dado gerado na geração; contas por papel;
  validador determinístico; binding versionado e **customização = recompilar**; intérprete sem decisão de negócio; binding
  vive no pipeline de geração.
- [[P2]] `done`: a clínica provou a prensa num segundo setor.
- [[I3]] `done`: `activate-default` + período OPEN. [[LAC-B]] `inflight`: tela de ativação self-service.
- Trilho [[T10]]: bridge pós-commit explícita por origem, sem motor de regras. [[R-motor-regras]] rejeitada.
  O ADR-P1 §5 já reconciliou a prensa com os dois.
- Trilhos [[T6]] (contabilidade Prisma first-class), [[T8]] (estorno é lançamento novo) e [[T2]] (tenancy = `AccountingScope`).
- [[P5]] `deferred` ("Ecossistema… marketplace de presets"): vizinho, não sobreposto.
- Decisões do dono de 07/10: [`D-2026-10-07-NUCLEO-KIT-DE-SETOR`](../plano/decisoes/D-2026-10-07-NUCLEO-KIT-DE-SETOR.md).

### 2.2 Código (fato consumado que este PRE-ADR respeita)

| Arquivo | Fato | Grau |
|---|---|---|
| `server/src/features/accountingBinding/archetypes/catalog.ts` | Catálogo fechado: `revenue_recognition, settlement, reversal, performance_liability, cogs, subledger_command, performance_liability_release` | V |
| `server/src/features/accountingBinding/dtos/AccountingBindingDto.ts` | `ArchetypeKeySchema` fechado; `FieldSlotTransformSchema` = `cents_from_reais \| identity` (nunca expressão); `RoleSlot.accountCode` obrigatório | V |
| `server/src/features/accountingBinding/fixtures/sectorBindingRegistry.ts` | `sectorKey → {binding, operationalSchema}`; `DEFAULT_SECTOR_KEY` = salão | V |
| `server/prisma/schema.prisma` `model AccountingBinding` | `sectorKey`, `bindingVersion` monotônico, `compiledFromHash`, `status` Draft/Active/Superseded, soft-delete | V |
| `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts` | Um único `CANONICAL_ACCOUNTS`; `ensureChartOfAccounts` cria o que falta pelo código da conta | V |
| `server/src/features/accounting/sync/AccountingSyncPort.ts` | `AccountingEvent.sourceType` = união **fechada** `sale.*` | V |
| `server/src/features/accounting/sync/mappers/SaleSettledMapper.ts` | Contas em constantes (`'1.1.2'`, mapa método→conta) | V |
| `model CompanyFiscalProfile` | `regime` por `anoCalendario` | V |
| `model ReferentialMapping` | Mapeamento por `(userId, unitId, accountId, mappingVersion)` | V |
| `model AccountingScopeSettings` | Contas escolhidas pelo contador, por unidade (encargos, depreciação, Parte B) | V |
| `model ServiceFiscalProfile` | `cTribNac`, `cNBS`, `cIndOp`, `cLocPrestacao` por `(unitId, serviceRef)` | V |
| `server/src/features/accountingBinding/__tests__/importBoundary.test.ts` + `dynamicTables/__tests__/no-accounting-imports.boundary.test.ts` | Fronteiras de import já testadas | V (cabeçalho lido) |

### 2.3 Fora do código

O referencial da Receita por regime e as listas de serviço (LC 116, NBS) são lei. Seguem a regra do dono de 07/10 (*"a lei é
única e não é interpretativa"*, [`D-2026-10-07-SIMPLES-FORKS`](../plano/decisoes/D-2026-10-07-SIMPLES-FORKS.md)).

### 2.4 Referência externa — como o Odoo resolve o mesmo problema

Regra do dono (chat, 07/10): *"O que vc não souber em arquitetura e estrutura, pesquise em projetos consolidados como a api
do focus ou outros do genero"*. O Odoo é a referência mais próxima: o **módulo de localização** traz plano de contas,
impostos, posições fiscais e contas-padrão, aplicados à empresa quando ela escolhe o modelo.

| Fato do Odoo | Fonte | Grau | O que ensina para o kit |
|---|---|---|---|
| A localização define o modelo de plano: contas, impostos, grupos e posições fiscais como *templates*. As **contas-padrão** ficam no modelo como `property_account_receivable_id`, `property_account_payable_id`, `property_account_income_categ_id`, `property_account_expense_categ_id`, `property_tax_payable/receivable_account_id`… | [Odoo 16 — Accounting localization](https://www.odoo.com/documentation/16.0/developer/howtos/accounting_localization.html) | V | As `property_*` são **papéis**: confirma o desenho "conta por papel" do P1 |
| Reaplicar o **mesmo** modelo numa empresa que já o tem (`reload_template`) **descarta todas as `property_*`**: a escolha de conta por papel feita pela empresa é preservada | [`addons/account/models/chart_template.py` (17.0)](https://raw.githubusercontent.com/odoo/odoo/17.0/addons/account/models/chart_template.py), `_pre_reload_data`, ~l.242-251 | V | **F-KS-4 (a)**: o ajuste papel→conta sobrevive à atualização |
| Na recarga, **conta existente não é sobrescrita**; *"on existing accounts, only tag_ids are to be updated"*. Conta nova é casada por código antes de criar (evita duplicata) | idem, ~l.355-375 | V | Nível (a) aditivo + **F-KS-3 (a)** (extensão por código). As *tags* do Odoo cumprem o papel do nosso referencial: o modelo atualiza a classificação, não a conta (**F-KS-7**) |
| **Imposto alterado no modelo não é editado**: o antigo é renomeado para `[old] nome` e um novo é criado. Imposto inalterado só recebe tags | idem, ~l.318-345 | V | **Nível (b) da decisão 7**: a regra nova vale daqui para frente, e a antiga fica para os lançamentos que já a usaram |
| Posição fiscal: na recarga, *"Only add tax mappings containing new taxes"*. Mapeamentos editáveis pelo usuário estão em `custom_fields` (*"Don't alter values that can be changed by the users"*) | idem, ~l.312-325 e ~l.398-400 | V | O que o usuário pode editar nunca é sobrescrito pela atualização |
| A carga e a recarga exigem administrador (*"Only administrators can install chart templates"*). Não há reaplicação automática no upgrade do módulo | idem, `_load`, ~l.167-168 | V (a exigência) / I (a ausência de automático: não achei chamada automática no arquivo) | **F-KS-5**: o gatilho é explícito; o "automático" da decisão 2 vira passo do deploy, não efeito colateral |
| Para comparar e atualizar depois de reforma tributária, a comunidade mantém um **assistente de diferenças**: compara o plano com o modelo, cria o novo, sobrescreve o alterado, desativa, e o usuário **exclui item a item** | [OCA `account_chart_update` README (16.0)](https://raw.githubusercontent.com/OCA/account-financial-tools/16.0/account_chart_update/README.rst); [listagem 17.0](https://apps.odoo.com/apps/modules/17.0/account_chart_update) | V | **Classificador de diff (§5 item 6)** + pendência com aceite item a item (nível c). O fato de existir como módulo à parte mostra que o núcleo do Odoo **não** resolveu isso: é o ponto mais delicado |
| Posição fiscal mapeia impostos e contas de receita/despesa conforme a situação do cliente | [Odoo — Fiscal positions](https://www.odoo.com/documentation/user/10.0/accounting/others/taxes/application.html) | V | Referência para a estratégia por regime; **não** adotado aqui (o regime é da empresa, não do cliente) |
| ERPNext: cada empresa mantém o próprio plano, criado a partir de um modelo do país ou de outra empresa | [Frappe — Company setup](https://docs.frappe.io/erpnext/user/manual/en/company-setup) | V | Mesmo padrão: modelo copiado na criação, plano por empresa |

**Onde o Luminaris vai além do Odoo (decisão do dono):** o Odoo só recarrega quando o administrador pede, e o diff fica num
módulo de terceiros. A decisão 2 quer que o tenant **receba** a v2. O desenho fica com as mesmas proteções do Odoo
(papel preservado, conta existente intocada, regra alterada vira nova), mas com o diff no próprio núcleo e o gatilho no deploy.

### 2.5 Revisão das decisões e forks contra a prática de referência (pedido do dono, 07/10)

Pedido: *"Pode revisar as decisões dos forks anteriores de acordo com essa prática de referência"*. Escopo lido: as decisões
de 07/10 ([`D-2026-10-07-NUCLEO-KIT-DE-SETOR`](../plano/decisoes/D-2026-10-07-NUCLEO-KIT-DE-SETOR.md)), os forks F-KS-* deste
PRE-ADR e os forks ratificados do ADR-P1 (F-P1-1..6), que são a base da estrutura. Os outros forks do projeto **não** foram revisados.

Referências acrescentadas às do §2.4:

| Referência | Fato | Fonte | Grau |
|---|---|---|---|
| Business Central | Contas determinadas por uma **matriz** "grupo de negócio (quem) × grupo de produto (o quê)" → contas de venda, compra, CMV, desconto…; os grupos ficam no cadastro do cliente e do item. Combinação faltando = erro **ao lançar** | [MS Learn — finance posting groups](https://learn.microsoft.com/en-au/dynamics365/business-central/finance-posting-groups); [MS Learn — configure general posting setup](https://learn.microsoft.com/en-us/training/modules/posting-groups-dynamics-365-business-central/4-configure) | V |
| Business Central | **Pacote de configuração** (RapidStart) aplicado a empresa **vazia**, com **questionário** para ajustar por cliente. *Não* é para empresa em produção (para essas, outro mecanismo) | [MS Learn — apply company configuration packages](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/apply-company-configuration-packages) | V (via resumo da busca; página não aberta) |
| OCA l10n-brazil | Regime em **dois campos** da empresa: `tax_framework` (1 Simples · 2 Simples com excesso de sublimite · 3 Regime Normal · 4 MEI) e `PROFIT_CALCULATION` (real · presumed · arbitrary) | [`l10n_br_fiscal/constants/fiscal.py` (16.0)](https://raw.githubusercontent.com/OCA/l10n-brazil/16.0/l10n_br_fiscal/constants/fiscal.py), l.149-167 | V |
| OCA l10n-brazil | Simples calculado por **tabela de dados**: CNAE + fator R → tabela → faixa de receita → alíquota efetiva | [`l10n_br_fiscal/models/res_company.py` (16.0)](https://raw.githubusercontent.com/OCA/l10n-brazil/16.0/l10n_br_fiscal/models/res_company.py), `_compute_simplified_tax` | V |
| OCA l10n-brazil | **Operação fiscal**: linhas casadas por regime da empresa × regime do parceiro × tipo fiscal do produto → CFOP e tributos, por linha de documento (no lugar da posição fiscal do Odoo) | [`l10n_br_fiscal/models/operation.py` (16.0)](https://raw.githubusercontent.com/OCA/l10n-brazil/16.0/l10n_br_fiscal/models/operation.py), l.229-262; `operation_line.py` l.116-127 | V |
| Odoo | Modelo de plano com **pai e filho** (`visible=False` no pai quando só se carrega pelo filho) | [Odoo 16 — Chart Template](https://odoo.com/documentation/16.0/developer/reference/standard_modules/account/account_chart_template.html) | V (via resumo da busca) |

**Veredito por item:**

| Item | Referência | Veredito | Ajuste proposto |
|---|---|---|---|
| T1 núcleo universal, regime como estratégia | Odoo, BC e OCA: um razão só; regime é configuração da empresa que escolhe tabelas e cálculos | **Confirma** | — (ver achado R6 sobre o formato do regime) |
| T3 / dec. 1 select + wizard | Odoo instala o modelo pelo país; BC aplica pacote + **questionário** | **Confirma** — o wizard com IA é o questionário do BC | — |
| T4 origem trocável | Odoo e BC geram o lançamento em **código** do módulo de negócio; a conta vem de atributos do cadastro (propriedades / grupos de lançamento) | **Confirma** o T10 + P1 | — |
| Dec. 2 v2 por atualização | BC: pacote **só** na criação. Odoo: recarga só por administrador, e o diff de reforma é módulo de terceiros (OCA) | **Vai além da prática** — nenhuma das três referências atualiza tenant em produção sem um humano | **R4:** manter (decisão do dono), mas com as proteções do Odoo como regra e risco registrado. Ver R1–R3 |
| Dec. 3 dois eventos | Odoo: documento → `account.move` ligado; BC: documento → movimentos com nº do documento de origem | **Confirma** | — |
| Dec. 4 troca de regime | OCA: regime é campo da empresa; trocar não mexe no plano | **Confirma** | — |
| Dec. 5 fiscal no kit | Odoo: impostos e posições fiscais vêm no módulo de localização. OCA: a operação fiscal é tabela própria, mais rica que "padrão por serviço" | **Confirma**, com alcance | **R7** (achado): NFC-e/NF-e vão precisar de tabela tipo "operação fiscal" (regime × destinatário × produto → CFOP/CST), não só padrão por serviço |
| Dec. 6 IA escolhe, contador valida | BC: o parceiro monta o pacote, o questionário ajusta | **Confirma** | — |
| Dec. 7 três níveis | Odoo 17 `_pre_reload_data` faz exatamente as três coisas (§2.4) | **Confirma**, mas meu §6 classificou errado um caso | **R1:** um **binding de evento novo** muda onde dinheiro é lançado. No Odoo a recarga **não** muda comportamento de lançamento (as `property_*` ficam). Logo, ele é nível **(b)** com aviso, não (a) |
| F-KS-2 kit em código, binding compilado | Odoo: modelo em código no módulo, copiado como registros da empresa | **Confirma (a)** | — |
| F-KS-3 base + extensão | Odoo: modelo pai e filho; recarga casa conta por código | **Confirma (a)** | — |
| F-KS-4 ajuste papel→conta | Odoo: `property_*` preservadas na recarga; BC: matriz é dado editável da empresa | **Confirma (a)** | — |
| F-KS-5 gatilho | Odoo: operação de **carga** ≠ operação de **recarga**, esta com regras próprias; BC: mecanismos distintos para empresa nova e em produção | **Confirma (b)**, com ajuste | **R2:** duas operações distintas — *instalar* (empresa nova, tudo) e *atualizar* (só diff, nunca papéis). A atualização grava um **relatório dry-run** antes de aplicar |
| F-KS-7 referencial no kit | Odoo atualiza as tags (classificação) de contas existentes na recarga | **Confirma (a)**, com limite | **R3:** atualizar referencial só de ano **sem ECD/ECF entregue**; ano entregue fica congelado e vira conflito (c) |
| F-P1-5 (a) papel→conta na compilação | Odoo e BC resolvem a conta **no lançamento** (propriedade / matriz); o BC falha **ao lançar** se falta combinação | **Diverge da prática, de propósito** | **R5:** manter (a). Ela troca a falha no lançamento (o defeito do BC) por falha na compilação. Custo: todo ajuste (F-KS-4) e toda atualização (F-KS-5) recompilam — o CLI do F-KS-5 já cobre |
| F-P1-1 (b) classe comando de subrazão | Odoo/BC: o documento de AR/AP nasce no subrazão e lança pelo ciclo dele | **Confirma** | — |
| F-P1-4 (a) dinheiro no código | Todos calculam dinheiro em código | **Confirma** | — |
| F-P1-6 (b) validador com dry-run | Odoo/BC validam só ao lançar | **Mais estrito que a prática** (bom) | — |
| Regime no Luminaris (`CompanyFiscalProfile.regime` = MEI·SIMPLES·PRESUMIDO·REAL) | OCA separa **regime para documento fiscal** (CRT, com "Simples com excesso de sublimite") de **apuração do IRPJ** | **Lacuna provável** | **R6** (achado fora de escopo): o estado "excesso de sublimite" (ICMS/ISS fora do DAS) hoje é só alerta no [[X14]] (PRE-ADR-SIMPLES §5 item 8); o CRT da NF-e/NFC-e precisa dele como estado. Vai para [[X13]]/[[X10a]] |

## 3. Colisões verificadas

| Regra | Colide? | Por quê |
|---|---|---|
| [[R-motor-regras]] / [[T10]] | **Não**, se F-KS-2 → (a) | O kit é código (fixtures + arquétipos); o binding do tenant é o dado compilado que o ADR-P1 §5 já reconciliou. Nenhuma regra é avaliada por lançamento |
| ADR-P1 invariante 4 ("customização = recompilar, nunca edição manual") | **Sim**, com o ajuste do contador (decisão 7c) | Resolvida em F-KS-4: o ajuste vira **entrada** da compilação, não edição do artefato |
| ADR-P1 invariante 6 (binding vive na geração, nunca em `features/accounting`) | Não | O kit continua no pipeline de geração |
| [[T6]] Prisma first-class / [[R-contab-preset-dt]] | Não | O kit instala tabelas Prisma; nada vira DynamicTable |
| [[T2]] tenancy / [[R-torre-multiempresa]] | Não | O kit é por `(userId, unitId)` |
| [[T8]] estorno / razão imutável | Não, se os 3 níveis forem respeitados | Nível (c) existe exatamente para não tocar conta já usada |
| Trilho de deploy sem fila (T3 do vault) | Considerado em F-KS-5 | A atualização não pode depender de fila |
| ⛔ Moratória de aparato de auditoria (`CLAUDE.md`) | Não | É código de produto, não gate nem rodada |

## 4. Forks (DECIDIDOS 07/10 — resultado no cabeçalho; texto original mantido por rastreabilidade)

### F-KS-0 — Alcance de "na frente de tudo"

Os nós `inflight` em 07/10 (`_INDEX`): [[GOV-CONTADOR]], [[LAC-B]], [[LEGAL-PARAMS]], [[PACOTE-VALIDADE]], [[W3]],
[[X7]], [[X9]], [[X14]], [[F5]].

- **(a) Congela tudo** o que está `inflight` até este nó fechar.
- **(b) Congela só o que a estrutura vai mudar.** Nada novo entra na fila antes deste. Do que está `inflight`, continua o
  que já está na camada certa ou tem prazo legal:
  - lei e regime: LEGAL-PARAMS, X7, X9, X14;
  - governança do razão: GOV-CONTADOR;
  - financeiro neutro: F5;
  - a entrada do wizard: W3;
  - um arquétipo já no catálogo: PACOTE-VALIDADE.

  **Pausa a [[LAC-B]]**, porque a tela de ativação vai instalar o kit, não só o binding.
- **(c)** Só a ordem da fila, sem pausar nada.

**Recomendação: (b).** Os nós de lei e regime são a camada "estratégia por regime" que o próprio desenho mantém: congelá-los
não melhora a estrutura e atrasa prazos legais (NFS-e do Simples em 01/11/2026; IBS/CBS no DAS em 01/01/2027 — [[X14]]).
A LAC-B é o único `inflight` cujo resultado seria refeito.

### F-KS-1 — Id e nome

- **(a)** Nó novo `KIT-SETOR` — "Kit de setor: núcleo portável + estrutura importada pelo wizard". Depende de [[P1]], [[P2]], [[I3]].
- **(b)** Emenda reabrindo o [[P1]] (`done`).

**Recomendação: (a)**, com o termo **"kit de setor"**. O P1 fechou com prova própria. "Pacote" já nomeia o pré-pago
([[PACOTE-VALIDADE]], conta 2.1.1), e usar a mesma palavra para as duas coisas confundiria tela, código e conversa com o contador.

### F-KS-2 — Leitura de "Código no pacote" (questionário de 07/10)

A pergunta foi feita **antes** de o agente ler o ADR-P1. Ela opunha "código" a "dado configurável" e não mostrava a terceira
forma, já ratificada: o kit em código gerando um binding-dado compilado e versionado.

- **(a)** O que o P1 já faz: o kit (fixtures do setor + arquétipos) é **código** versionado; o binding de cada tenant é
  **dado compilado** a partir dele, com o validador determinístico.
- **(b)** Literal: mappers em código por kit, sem binding compilado. Desfaz o P1/P2.

**Recomendação: (a).** É o que a resposta protege (T10 intacto, nenhum template avaliado por lançamento) sem jogar fora o P1.

### F-KS-3 — Plano de contas por setor

- **(a)** Canônico base + **extensão aditiva** por setor. O kit só acrescenta contas.
- **(b)** Plano completo próprio por setor.

**Recomendação: (a).** Arquétipos, papéis e relatórios já apontam códigos do canônico: `CashFlowReportService` tem 3
códigos, e os mappers usam as constantes do fixture. O mecanismo de hoje (cria o que falta pelo código) é aditivo por
natureza, e isso casa com o nível (a) da decisão 7.

### F-KS-4 — Onde mora o ajuste do contador

- **(a)** Tabela de **ajuste papel→conta por escopo**. A compilação passa a ser *kit ⊕ ajustes*. O artefato continua
  intocado (invariante 4 preservada), e o ajuste fica auditado.
- **(b)** O contador edita o binding compilado. Fere a invariante 4.
- **(c)** O contador só muda pela re-entrevista.

**Recomendação: (a).** Generaliza o que a `AccountingScopeSettings` já faz para contas soltas. A compilação vê o ajuste,
então os níveis (b)/(c) da decisão 7 viram comparação determinística.

### F-KS-5 — Gatilho da atualização (decisão 2)

- **(a)** Varredura no boot do servidor.
- **(b)** **Passo do deploy** (CLI, como o `activateAccountingBindingCli` de hoje): para cada tenant com
  `kitVersion < atual`, recompila, classifica em aditivo/daqui-para-frente/conflito, ativa o que pode e deixa o conflito
  `Draft` com pendência para o contador.
- **(c)** Preguiçosa, na próxima ativação ou consulta do tenant.

**Recomendação: (b)**, com o ajuste R2 do §2.5. São duas operações distintas, como a carga e a recarga do Odoo: **instalar** (empresa nova, kit inteiro) e **atualizar** (só o diff, nunca papéis nem ajustes). A atualização grava um relatório *dry-run* antes de aplicar. Para o tenant é automático (decisão 2). Não pesa no boot nem depende de fila (deploy single-process). É auditável por execução.

### F-KS-6 — Forma da portabilidade

- **(a)** Fronteira **dentro do monorepo agora**: núcleo = razão + `accountingBinding` (arquétipos/intérprete) + `lib/`
  de formatos e cálculo puro. Um teste de import proíbe `dynamicTables`, `interview` e presets. A extração para pacote
  privado acontece quando o 2º projeto entrar.
- **(b)** Pacote npm privado já.

**Recomendação: (a).** Sem um consumidor real, um pacote separado só traz custo de versão e publicação.
O dono descartou copiar o código (*"não faz sentido fazer assim"*).

### F-KS-7 — Referencial por regime dentro do kit

- **(a)** O kit traz o `ReferentialMapping` do seu plano por regime × ano (dado versionado, da tabela oficial).
- **(b)** O referencial continua por tenant, preenchido à mão.

**Recomendação: (a)**, com o limite R3 do §2.5: o kit só atualiza o referencial de ano **sem ECD/ECF entregue**; ano entregue fica congelado, e mudança nele vira conflito (nível c). O conteúdo fica sob §7 (validação externa) até ter a fonte oficial no corpus.

## 5. Comportamentos candidatos do futuro BRIEF (esqueleto — não é checklist executável)

1. O contrato `SectorKitV1` (Zod `.strict()`) agrega binding + extensão de plano + padrões fiscais + referencial + `kitVersion`.
2. O `SECTOR_BINDING_REGISTRY` vira registro de kits (salão e clínica migrados sem mudança de comportamento: teste golden).
3. `activate-default` instala o kit inteiro na mesma operação de hoje (plano → binding → padrões fiscais → referencial → período).
4. `KitInstallation` por escopo grava `kitKey`, `kitVersion` e a data.
5. Ajuste papel→conta por escopo (F-KS-4): CRUD com Policy, auditado. A compilação consome os ajustes.
6. Classificador determinístico de diff entre versões de kit: aditivo / daqui-para-frente / conflito (decisão 7). Um binding de evento **novo** é daqui-para-frente, não aditivo (R1, §2.5). Papéis e ajustes nunca entram no diff aplicável (R2).
7. CLI de atualização (F-KS-5): idempotente, relatório por tenant, conflito vira `Draft` + pendência.
8. Pendência do contador: listar, aceitar e recusar; a empresa segue na versão ativa até a decisão.
9. Teste de fronteira do núcleo (F-KS-6).
10. Vocabulário de eventos: a união `AccountingEvent.sourceType` (`sale.*`) passa a aceitar os `eventKey` dos kits sem
    editar o núcleo (forma em §8, insumo).
11. Os padrões fiscais do kit preenchem `ServiceFiscalProfile` quando o serviço é criado, sem sobrescrever o que já existe.
12. Gates acionados: snapshot de shape dos DTOs, allowlist do `auditCanonical.ts` (eventos novos), openapi path-count e i18n.

## 6. Contratos esboçados

```ts
// Kit (código, versionado) — estende o SectorBindingEntry de hoje
const SectorKitV1 = z.object({
  kitKey: z.string(),                      // = sectorKey (ex.: 'beautySalon')
  kitVersion: z.number().int().min(1),     // monotônico por kit
  chartExtension: z.array(CanonicalAccountSchema), // só acrescenta (F-KS-3a)
  binding: AccountingBindingV1Schema,      // inalterado (ADR-P1)
  operationalSchema: z.record(z.unknown()),
  serviceFiscalDefaults: z.array(z.object({
    serviceRef: z.string(), cTribNac: z.string().regex(/^\d{6}$/),
    cNBS: z.string().regex(/^\d{9}$/).optional(), cIndOp: z.string().regex(/^\d{6}$/),
  }).strict()),
  referential: z.array(z.object({         // F-KS-7a
    regime: z.enum(['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL']), mappingVersion: z.string(),
    entries: z.array(z.object({ accountCode: z.string(), referentialCode: z.string(), label: z.string() }).strict()),
  }).strict()),
}).strict();

// Por escopo (Prisma)
// KitInstallation { userId, unitId, kitKey, kitVersion, installedAt, updatedById }   @@unique([userId, unitId, kitKey])
// RoleAccountOverride { userId, unitId, role, accountId, setById, deletedAt? }      @@unique([userId, unitId, role])
// KitUpgradePending { userId, unitId, kitKey, fromVersion, toVersion, conflictsJson, status: Open|Accepted|Rejected }

// Saída do classificador (decisão 7)
type KitDiff = {
  additive: Array<{ kind: 'account' | 'fiscalDefault' | 'referential'; key: string }>; // não muda onde se lança
  forward:  Array<{ eventKey: string; change: 'new_binding' | 'changed_binding' }>;   // vale para eventos novos (R1)
  conflict: Array<{ key: string; reason: 'override' | 'account_in_use' | 'referential_year_filed' }>; // R3
};
```

## 7. Pendente de validação externa

- O conteúdo do referencial por regime (F-KS-7): precisa da tabela oficial da RFB no corpus `fontes-oficiais/`.
- Os padrões fiscais por serviço do salão e da clínica (`cTribNac`/`cNBS`): a lista é lei (LC 116, NBS 2.0); qual item
  vale para cada serviço do kit é enquadramento.

## 8. Insumos ausentes (registrados, não varridos — regra 2)

- Se os mappers à mão de `accounting/sync/mappers/` ainda estão ativos ao lado do intérprete, ou se são legado depois do
  swap do P1.
- Como `eventKey` do binding (`salon.sale.finalized`) e `AccountingEvent.sourceType` (`sale.*`) se casam no intérprete.
- A lista fechada de `AccountRole` em `accountingBinding/models/types.ts` (não lida).
- O que `installChartIfEmpty` do `activate-default` faz com tenant que já tem plano.

## 9. Achados fora de escopo (registrados, não planejados)

- O emissor próprio no ADN ([[D5]], reescrito em 07/10) vai consumir os padrões fiscais do kit. O emissor é frente própria.
- [[X10a]] e [[X10i]] ainda citam a Focus no estado.
- **R6** (§2.5): o regime tem um campo só (`CompanyFiscalProfile.regime`). A OCA separa o CRT (com "Simples com excesso de sublimite") da apuração do IRPJ. O CRT da NF-e/NFC-e precisa desse estado → [[X13]]/[[X10a]].
- **R7** (§2.5): NFC-e/NF-e vão precisar de tabela tipo "operação fiscal" da OCA (regime × destinatário × produto → CFOP/CST), além do padrão por serviço → [[X10a]].
- 5 códigos de conta fixos em serviços (`CashFlowReportService` ×3, `TieOutDiagnosticService`, `FiscalDocumentEmissionService`).
  Entram no F-KS-3 só se o kit mudar o canônico.

## 10. Como entra na fila (depois da ratificação)

1. A ratificação dos forks vira cédulas em `decisoes/`.
2. Nó `KIT-SETOR` (F-KS-1) em `nos/`, com `autorizacao` citando as cédulas e o *"na frente de tudo"*.
3. O `estado` da [[LAC-B]] muda conforme F-KS-0.
4. BRIEF por `sessao-planejamento`, que exige pedido próprio. Código só com *"executa"*.

## Riscos desta proposta (incluindo os vieses do autor)

- **Enquadramento enviesado já cometido:** a pergunta "código × dado" de 07/10 foi feita sem ler o ADR-P1. F-KS-2 existe para corrigir isso.
- **Escopo inflado:** "núcleo portável" pode virar reescrita. A defesa é o F-KS-6 (a), que só traça a fronteira e não move código.
- **Prazos legais:** um congelamento amplo (F-KS-0 a) atrasa o Simples de 01/11/2026 e o IBS/CBS de 2027.
- **A decisão 2 vai além da prática de referência** (R4, §2.5): BC, Odoo e OCA não atualizam empresa em produção sem um humano. O desenho compensa com as proteções do Odoo (papel preservado, conta existente intocada, regra alterada vira nova) e com o dry-run (R2). Se um incidente acontecer, o recuo natural é o modelo do Odoo: o diff aplica só depois de aprovação.
- **Atualização automática no razão:** um erro no classificador (§5 item 6) muda o lançamento de muitos tenants de uma vez.
  O BRIEF precisa de teste por classe de diff e de execução em dry-run antes de ativar.
