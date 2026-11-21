# BE-INCR-CICLO-FISCAL — ciclo fiscal agendado por competência (PRE-ADR + BRIEF)

- **Data:** 2026-11-21
- **Nó:** [[CICLO-FISCAL]] (`docs/plano/nos/CICLO-FISCAL.md`), aberto por este planejamento
- **Status:** **Proposed → forks RATIFICADOS em 21/11** por questionário ([[D-2026-11-21-CICLO-FISCAL-FORKS]]). F-CF-1,
  2, 3, 7, 8, 9 e 10 ficaram na recomendação. **F-CF-4 → (b)** e **F-CF-5 → (b)** foram contra a recomendação. O
  **F-CF-6 foi perguntado de novo**: a 1ª recomendação estava errada, porque o `postEntry` exige período `OPEN`
  (`PostingService.ts:131,148`). Ficou em (a) "dia de corte com o período aberto". Os detalhes F-CF-4a e F-CF-5a ficaram
  na recomendação. Nenhum código autorizado sem "executa".
- **Lacuna de origem:** `L-20261121-184212-4fdb` (classe `feature`): "nenhum job agenda o ciclo fiscal".
- **Autorização:** dono, chat, 2026-11-21: *"Executa tudo pra liberar e poder rodar em xhigh até terminar"*, em
  resposta à proposta de planejar o job do ciclo fiscal (repassada pela sessão que abriu esta). Cobre este PRE-ADR/BRIEF,
  a nota do nó, os forks levados ao dono e o PR só de `.md`. **Não cobre código.** O "executa" do nó vem depois da
  ratificação, com citação própria (`D-2026-10-28-FLUXO-AUTONOMO`: o executa vale para o BRIEF inteiro só depois de
  ratificado e sem fork pendente).
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `43719baaf`.
- **Dossiê legal:** [`pesquisas-legais/ciclo-fiscal-prazos/relatorio.md`](../../pesquisas-legais/ciclo-fiscal-prazos/relatorio.md)
  (21/11/2026; fontes D01–D10). Prazos já conferidos em dossiês anteriores são citados por eles.

## Divergências registradas (passo 1 da `sessao-planejamento`)

1. **A nota do nó nasce antes do PRE-ADR ratificado.** O `docs/plano/README.md` §Fold diz que proposta nova só vira nota
   em `nos/` depois de ratificada. O pedido manda criar a nota agora. Segui o precedente do [[IBS-CBS-2027]]: a nota
   existe, em `planned`, e **não roteia código até a ratificação** (está escrito na nota).
2. **Sobreposição com `AGENDA-FISCAL` (F4).** A proposta de 20/10 (`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md:247`)
   tem um `AGENDA-FISCAL` **de frontend**: "tela única de obrigações por período", "FE sobre rotas existentes". Este nó
   é o **backend** que essa tela consome (calendário persistido + job). A tela continua do `AGENDA-FISCAL`, fora daqui.
   O EFD-REINF já diz que "o alerta é da `AGENDA-FISCAL`" (`ADR-INCR-EFD-REINF.md:119`). Este BRIEF dá a ela os dados;
   o desenho visual do alerta continua lá.
3. **Vizinhos com proposta pendente:** `PROVISOES-AGENDADAS` (F3, colide com [[R-motor-regras]]) e `FECHAMENTO-ASSISTIDO`
   (`docs/adr/PRE-ADR-FECHAMENTO-ASSISTIDO.md`, forks F-FA-0..13 pendentes, cujo checklist lê "apuração confirmada"). Este
   nó **não** cria lançamento por template. Só chama a confirmação que já existe, e cada apuração faz a própria
   provisão. Por isso não reabre o [[R-motor-regras]] nem o `ADR-DOMAIN-MOTOR-rejected` (ver §3.4).

---

# Parte I — PRE-ADR

## 1. Problema

O fiscal só anda quando o usuário clica. Hoje, por competência:

| Obrigação | Como acontece hoje | Onde |
|---|---|---|
| Simples (DAS) | `POST /accounting/simples/apuracoes/:competencia/calcular` (prévia, nada gravado) e `PUT …/das` com o DAS oficial, que lança a provisão | `SimplesApuracaoService.calcular:361`, `registrarDas:388` |
| IRPJ/CSLL | `POST /tax-assessments/preview` → `confirm` (provisão depois, best-effort, + `reconcile`) | `TaxAssessmentService.preview:377`, `confirm:384`, `reconcileProvisao:643` |
| PIS/COFINS (até 12/2026) | idem, em ordem mensal obrigatória (409 `TAX_ASSESSMENT_ORDER`) | `PisCofinsAssessmentService.preview:164`, `confirm:176` |
| IBS/CBS (desde 2027) | `preview` → `confirm` (CAS `expectedSupersedesId`) → `reconcileIbsCbsProvisao` | `IbsCbsAssessmentService:145,188,274` |
| EFD-Reinf | `POST` gera o lote (XML não assinado + relatório) | `ReinfService.gerar:111` |
| DCTFWeb (MIT) | `POST` gera o JSON do MIT | `MitExportService.gerar:41` |
| ECD/ECF, DEFIS, DASN-SIMEI | geração por rota; transmissão no PVA/portal (humano) | `SpedEcf*GenerationService`, `SimplesDeclaracaoService` |
| Aviso de vencimento | não existe | — |

A matriz `server/src/features/accounting/models/obrigacoesPorRegime.ts` (tabela de plataforma `OBRIGACAO_REGIME`) diz o
que cada regime deve. Mas ela não tem prazo e ninguém a lê num agendador. Os 8 schedulers de `server/src/jobs/` cuidam
de outras coisas: sync de vendas, poll de DF-e, parâmetros legais, cobrança, relatório do MP, PTAX e duas varreduras.

**O que já existe e este nó reusa (verificado lendo o arquivo):**

- **O recálculo automático do LEGAL-PARAMS PR-4** (`TaxAssessmentRecalcService` + `LegalParamsRecalcScheduler`) já
  confirma apuração **sem usuário**. O autor é `ATOR_PLATAFORMA = 'PLATFORM'` (dono, 07/10). Os métodos
  `recalcularPeloSistema`/`confirmarPeloSistema` do X7 e do X8 não passam pela policy, e o serviço só **ordena** as
  chamadas (cabeçalho `atomicUntil: —`). É o molde exato deste nó.
- **Os intérpretes de prazo:** `prazoReinfMensal`/`prazoReinfIsentos` (`lib/prazoReinf.ts`, dia 15 que adia),
  `ultimoDiaUtilAteDia20` (`lib/vencimentoRetencao.ts`, dia 20 que antecipa), `ultimoDiaUtilDoMesSeguinte`
  (`lib/ibsCbsApuracao.ts:72`), `vencimentoQuotaUnica` (`models/taxAssessmentMemoExport.ts:87`) e
  `vencimentoIbsCbsDe` (`models/ibsCbsParams.ts:73`, a regra como **linha de parâmetro legal**).
- **Os períodos esperados do ano:** `TaxAssessmentPeriodosService` (nó [[TAX-ASSESSMENT-PERIODOS]]) já sabe a forma
  efetiva, os trimestres e os meses em atividade, a modalidade de PIS/COFINS e as competências do Simples.
- **A forma do scheduler:** `LegalParamsRecalcScheduler.ts`, com lock local, `job.*` do catálogo, `alert` injetado e
  `kick()`. O teste de falha descobre `jobs/*Scheduler.ts` por glob (F-OBS-14).

## 2. Como Odoo e ERPNext fazem (pesquisa, 21/11)

Os dois foram lidos só pela documentação e pelo `hooks.py`. A lógica de agendamento do Odoo não foi conferida no código.

- **Odoo 18/19** ([doc 19.0](https://www.odoo.com/documentation/19.0/applications/finance/accounting/reporting/tax_returns.html),
  [doc 18.0](https://www.odoo.com/documentation/18.0/applications/finance/accounting/reporting/tax_returns.html)). A
  periodicidade (mensal/trimestral) e o "lembrete" ficam nas configurações. A tela lista as declarações pendentes com
  período e prazo, e o prazo vencido aparece em vermelho. O sistema **calcula e propõe** o lançamento de fechamento do
  imposto e, no 19, roda *checks* (rascunhos, anexos, dados da empresa, IVA negativo) com estado revisado/anomalia. **Quem
  valida, posta o lançamento e trava o período é o usuário.** Lançamento atrasado entra no período seguinte.
- **ERPNext** ([hooks.py](https://raw.githubusercontent.com/frappe/erpnext/develop/erpnext/hooks.py)). Nenhum job
  calcula imposto ou lança provisão de imposto. O que roda sozinho é determinístico: depreciação diária, receita e
  despesa diferidas mensais, reavaliação cambial. A idempotência do diferido é "retoma do último lançamento não
  cancelado", com trava `for_update` na linha e erro registrado por fatura, sem retentativa.

**Leitura para cá:** nenhum dos dois confirma apuração sozinho. O padrão de mercado é **calcular, conferir e avisar, com
o humano confirmando**, e lançar sozinho só o que é determinístico. O pedido do dono vai além ("confirma o que a lei e a
política do tenant permitem"). Por isso a confirmação automática é opt-in por política (F-CF-3), e o padrão de mercado é
o comportamento quando a chave está desligada.

## 3. Decisão proposta

### 3.1 Três peças

1. **Calendário** (Prisma first-class). Uma linha por **PJ × obrigação × período**: vencimento calculado pela regra da
   lei (com fonte), estado, pré-requisitos faltando, referência à apuração ou ao artefato, e a prévia. Lei desenha igual
   para todos, a chave única é a idempotência do job e o estado é uma máquina com transição por CAS. Pela tabela STOP do
   `CLAUDE.md` é Prisma, não DynamicTable: o usuário não desenha o esquema, a lei desenha.
2. **Job** (`CicloFiscalScheduler` + `CicloFiscalService`). Clone do par do LEGAL-PARAMS PR-4. Uma vez por dia, para
   cada PJ com perfil fiscal do ano: (a) materializa as ocorrências; (b) checa os pré-requisitos; (c) calcula a prévia
   pelos serviços que existem; (d) confirma só o que a política deixa, a partir do dia de corte (F-CF-3, F-CF-6),
   incluindo a provisão estimada do Simples (F-CF-5 → b); (e) gera Reinf e MIT quando a entrada está completa, e o
   rascunho de ECD/ECF com o exercício encerrado (F-CF-4 → b); (f) deixa ao humano o que exige julgamento ou assinatura.
3. **Leitura e marcação** (rotas). `GET` do calendário com a situação do prazo. A marcação humana do que só se
   cumpre fora do sistema (transmitiu no PVA, pagou, transmitiu o PGDAS-D) é auditada. A tela é do `AGENDA-FISCAL`.

### 3.2 O que continua humano (com a razão)

| Passo | Por quê | Fonte |
|---|---|---|
| Transmitir o PGDAS-D e registrar o DAS oficial | o PGDAS-D "constitui confissão de dívida"; a provisão **definitiva** do Simples é pelo valor **oficial** do DAS (F-SN-10 → a). A estimada do job (F-CF-5 → b) é estornada nesse registro | Res. CGSN 140 art. 38 § 2º I [D04]; `SimplesApuracaoService` cabeçalho `atomicUntil` |
| Assinar e transmitir ECD/ECF no PVA | assinatura ICP-Brasil; o job só gera o rascunho (F-CF-4 → b) | IN 2.004 art. 3º § 1º [D06]; gate H1 |
| Encerrar a DCTFWeb no MIT | o usuário encerra (Manual do MIT §9) | `ADR-INCR-DCTFWEB-MIT`; F-X7-9 → b |
| Transmitir a Reinf | porta `ReinfTransmissorPort` sem adaptador (PR-4 do EFD-REINF) | nó [[EFD-REINF]] |
| Opção pelo Simples, opção semestral IBS/CBS regular (2027), forma do IRPJ | decisão irretratável do contribuinte | Res. CGSN 140 art. 40-D [D09]; IN 2.004 |
| Procuração e-CAC, e-CNPJ, PSC | contrato e identidade | R5 (Integra Contador adiado) |
| Informar dedução/retenção sofrida que o sistema não conhece | dado externo | handoff de 21/11 §2 A |

### 3.3 Prazo como dado

O dossiê mostra cinco formas de regra: dia N que adia, dia N que antecipa, último dia útil, data fixa e janela. O prazo
também **muda por ato avulso**: o art. 3º da ECF traz três "Vide" de prorrogação (IN 2.039/2021, IN 2.082/2022,
Portaria RFB 421/2024), e o art. 40-A do DAS prorroga por calamidade municipal. A recomendação (F-CF-2) é a regra como
linha de parâmetro legal com vigência, como a `IBS_CBS/VENCIMENTO`. A prorrogação vira uma linha nova de vigência
estreita, publicada pelo fluxo que já existe, sem deploy.

### 3.4 Por que não é motor de domínio

O `ADR-DOMAIN-MOTOR-rejected` §3 reabre só com "ordem de passos diferente por vertical", um segundo canal assíncrono,
o mesmo bug de reconcile em três serviços ou mais de três pessoas na equipe. Aqui:

- a **ordem é fixa no código** e é a da lei: prévia → confirmação → arquivo. Não há DAG, workflow por tenant nem plugin;
- a fila é a própria tabela do calendário, varrida pelo scheduler, como `legal_parameter_recalc_jobs`. Não há
  Redis/bull;
- cada efeito no razão continua no serviço dono, com o próprio `atomicUntil`. O `CicloFiscalService` não chama
  `postEntry` (cabeçalho `atomicUntil: —`, como o `TaxAssessmentRecalcService`);
- a política do tenant é **chave liga/desliga por família**, não sequência configurável.

## 4. Riscos

| Risco | Mitigação |
|---|---|
| Confirmação automática com dedução que o usuário não informou superestima o imposto | política desligada por padrão; entrada por ocorrência que o usuário preenche antes; confirmação só a partir do dia de corte (F-CF-3 b, F-CF-6 a) |
| Provisão no período já fechado | o `postEntry` recusa período que não está `OPEN` (`PostingService.ts:131,148`); o job confirma, a provisão fica pendente com aviso "reabra o período" (mecanismo do X7 item 15) e o `reconcile` completa quando reabrir |
| Prévia calculada com venda ainda não lançada subestima | pré-requisito `VENDAS_PENDENTES` (`ReconcilePending` aberto ou sync bloqueado na competência) |
| Job e usuário confirmam ao mesmo tempo | a confirmação já tem CAS (`expectedAPagarCents`, `ALREADY_CONFIRMED`); o job lê o 409 como "já confirmada" |
| Duas réplicas rodam o job | lock local não protege; a chave única e o CAS da transição protegem (2ª passada sem efeito) |
| Parâmetro legal ausente ou DRAFT (CBS de referência) | pré-requisito nomeado; `CALCULATED_PROVISIONAL` nunca confirma sozinho |
| Erro de um tenant derruba o job | isolamento por PJ (`try` por PJ, contagem `falhas`, `job.completed` em `warn`), como o recálculo; `job.failed` + `alert` só no erro do job inteiro |

---

# Parte II — BRIEF

## 5. Contexto fixo (não rediscutir)

- **Item a planejar:** nó [[CICLO-FISCAL]]; lacuna `L-20261121-184212-4fdb`; handoff de 21/11 §2 C1 ("a trava central").
- **Autorização:** a citação do cabeçalho.
- **Insumos (fato consumado):** os 6 serviços da §1; `TaxAssessmentRecalcService` e `LegalParamsRecalcScheduler`
  (LEGAL-PARAMS PR-4); `obrigacoesPorRegime.ts` + a tabela `OBRIGACAO_REGIME`; `TaxAssessmentPeriodosService`; os
  intérpretes de prazo da §1; `ADR-OBSERVABILIDADE` (OBS-R9, R11, R14; F-OBS-14); `_ARCHITECTURE-CONTRACT.md` §2.1 e
  §2.3; decisões F-SN-10 → a (provisão do Simples pelo DAS oficial), F-X7-9 → b (MIT por arquivo), R5 (Integra
  Contador adiado), dono 07/10 "Ator PLATFORM", dono 23/10 (IBS/CBS: o recálculo só avisa).
- **Nós vizinhos:** consome [[X7]], [[X8]], [[X9]], [[X13]], [[X14]], [[EFD-REINF]], [[IBS-CBS-2027]],
  [[LEGAL-PARAMS]], [[TAX-ASSESSMENT-PERIODOS]], [[OBS]]; é consumido por `AGENDA-FISCAL` (FE, proposta),
  `FECHAMENTO-ASSISTIDO` (proposta) e, no futuro, por `EMAIL-TRANSPORT`/`ALERTAS-ASSINATURAS` (aviso por e-mail).
  [[PES-4]] (folha) entra como pré-requisito do fator r e da CPP quando a ponte folha → razão existir.

## 6. Checklist numerado

Cada item é testável sozinho. **[F-CF-n]** = o fork que decidiu o item. Todos foram ratificados em 21/11
([[D-2026-11-21-CICLO-FISCAL-FORKS]]). As marcas *(se F-CF-n a)* que ficaram valem como "F-CF-n → a ratificado".

### PR-0 — contrato: prazo como dado + calendário puro + modelo (sem job, sem rota)

1. **Tabela `PRAZO_OBRIGACAO`** em `legal_parameters` *(se F-CF-2 a)*: `chave` = obrigação, `discriminador` = regime
   (`*` = todos), `valorTexto` = regra (enum `REGRAS_PRAZO`), `fonte` + `fonteUrl` + vigência. Semente com as 15 linhas
   da tabela do dossiê §1, fontes literais de lá. O `formatoLinha.ts` e o `checkLegalParamsFormatoCli` aceitam a tabela.
   Teste: o check reprova uma regra fora do enum.
2. **`REGRAS_PRAZO`** (enum fechado) e o intérprete puro `vencimentoDe(regra, periodo, feriados, codMun)`, que delega
   aos intérpretes que já existem (§1) e acrescenta só o que falta: `DIA_20_ADIA` (DAS), `DIA_25_ANTECIPA` (PIS/COFINS),
   `ULTIMO_DIA_UTIL_DO_MES` com deslocamento (junho/julho do ano seguinte, março do ajuste), `DATA_FIXA` (31/03, último
   dia de maio) e `JANELA` (bloco anual do PGDAS-D, jan–mar). Mora em `lib/`, ao lado dos outros (o núcleo contábil não
   importa `packages/`, core-boundary). Testes por regra, com datas calculadas (conferir na execução):
   DAS 2026-11 → 20/12/2026 é domingo ⇒ **21/12/2026**; PIS/COFINS 2026-09 → 25/10/2026 é domingo ⇒ **23/10/2026**;
   Reinf 2026-07 → 15/08/2026 é sábado ⇒ **17/08/2026**.
3. **Exceção datada** *(se F-CF-2 a)*: linha `PRAZO_OBRIGACAO` com `discriminador` = `<regime>@<codMun>` (calamidade do
   art. 40-A) ou vigência estreita (prorrogação da ECF) vence a regra geral. Teste: com a linha de prorrogação publicada,
   a ECF do ano X vence na data da linha. Sem ela, vence no último dia útil de julho.
4. **`ocorrenciasEsperadas(perfil, matriz, prazos, ano)`** — puro, sem I/O. A partir de `resolverObrigacoes` (o que é
   `OBRIGATORIA`/`CONDICIONAL`) e das regras de período que o `TaxAssessmentPeriodosService` já usa (forma efetiva,
   trimestres/meses em atividade, modalidade), devolve `{obrigacao, periodo, vencimento, regra, fonte}[]`. As guias
   (DAS, DARF IRPJ/CSLL, PIS/COFINS, CBS/IBS) vêm do regime. As declarações (DCTFWeb, Reinf, ECD, ECF, DEFIS,
   DASN-SIMEI, bloco anual do PGDAS-D) vêm da matriz. **A extração da regra de períodos para função pura compartilhada
   não pode mudar a resposta do `GET /tax-assessments/periodos`** (o teste dele roda igual). [F-CF-9]
   Testes: Simples 2026 ⇒ 12 DAS + DEFIS em 03/2027; Presumido trimestral 2026 ⇒ 4×2 DARF + 12 PIS + 12 COFINS +
   12 DCTFWeb + ECD (se obrigatória) + ECF; Presumido 2027 ⇒ sem PIS/COFINS, com CBS (IBS só com linha publicada);
   Reinf `CONDICIONAL` aparece com a pergunta pendente; obrigação `NAO_SE_APLICA` não aparece.
5. **Modelo `ObrigacaoFiscalOcorrencia`** *(se F-CF-1 a)* + migração aditiva + repositório (interface + Prisma,
   `tx` propagado). Chave única `(userId, obrigacao, periodo)`. Transição de estado **só** por
   `updateMany where {id, estado: de, versao}` (CAS). 0 linhas ⇒ `ConflictError` nomeado. Soft-delete (`deletedAt`).
   Teste de integração: duas transições concorrentes do mesmo `de` ⇒ uma vence, a outra recebe 409.

### PR-1 — job: prévia, pré-requisitos, alerta de operação, leitura

6. **`CicloFiscalService.processar(hoje)`** — enumera as PJs com `CompanyFiscalProfile` do ano de `hoje` (e do ano
   anterior até o último prazo anual dele). Materializa as ocorrências esperadas por *upsert* na chave única: a 2ª
   passada não cria linha, só atualiza o vencimento quando a regra mudou. Depois processa as ocorrências cujo período já
   acabou e que ainda não estão em estado final. A ordem é cronológica por família: o X8 exige o mês anterior
   confirmado (409 `TAX_ASSESSMENT_ORDER`, `PisCofinsAssessmentService.ts:127`). Cabeçalho `atomicUntil: —`. Teste: 2
   execuções seguidas sem dado novo ⇒ 0 escritas na 2ª (contagem `inalteradas`).
7. **Catálogo fechado de pré-requisitos** (`PRE_REQUISITOS_CICLO`), cada um com código, mensagem pt/en e a origem
   **lida** (o job não reimplementa a regra, só mapeia o erro nomeado do serviço dono):
   `SEM_PERFIL_DO_ANO` · `UNIDADE_NAO_DEFINIDA` [F-CF-10] · `ANO_NAO_ENCERRADO` / `SPED_SEM_SIGNATARIO` (item 21) ·
   `VENDAS_PENDENTES`
   (`ReconcilePending` aberto na competência ou sync bloqueado) · `ORDEM_ANTERIOR_PENDENTE` (409 `…_ORDER`) ·
   `PARAMETRO_LEGAL_AUSENTE` (`ParametroLegalAusenteError`) · `TETO_PRESUMIDO_EXCEDIDO` (`PRESUMIDO_TETO_EXCEDIDO`) ·
   `CONTAS_DE_PROVISAO` (`provisaoContasConfiguradas = false`) · `LALUR_PARTE_B` (Real, sem Parte B no `A00`/trimestre) ·
   `CBS_REFERENCIA_PROVISORIA` (`CALCULATED_PROVISIONAL`) · `REINF_SEM_CNPJ_DECLARANTE` / `REINF_SEM_CONTATO`
   (`ReinfService.ts:344,348`). O `catch` pega **só** esses erros nomeados, pelo código. Qualquer outro sobe e conta como
   falha da PJ (memória "skip+log só com erro próprio"). Teste por código: o serviço dono lança o erro ⇒ a ocorrência
   fica `AGUARDANDO_PRE_REQUISITO` com aquele código. Um `Error` genérico ⇒ `falhas + 1` e a ocorrência não muda.
8. **Métodos `*PeloSistema` que faltam**, no molde do LEGAL-PARAMS PR-4 (sem policy, ator `PLATFORM`):
   `SimplesApuracaoService.calcularPeloSistema`, `IbsCbsAssessmentService.previewPeloSistema`/`confirmarPeloSistema`,
   `ReinfService.gerarPeloSistema`, `MitExportService.gerarPeloSistema`. Os do X7/X8 já existem. Guarda: teste de
   fronteira que reprova chamador de `*PeloSistema` fora da allowlist (`TaxAssessmentRecalcService`,
   `CicloFiscalService`).
9. **Prévia persistida na ocorrência:** valores por tributo, `parametrosSha256`, avisos com código e `calculadaEm`. Ela é
   recalculada a cada passada até o estado sair de `PREVIA_CALCULADA`, e só se grava quando o hash muda.
   **Simples:** depois da prévia, o estado vai a `AGUARDANDO_HUMANO` ("transmita o PGDAS-D até <vencimento> e registre o
   DAS"), com a prévia como espelho. A provisão estimada é o item 17b (PR-2, F-CF-5 → b).
10. **`CicloFiscalScheduler.ts`**, clone do `LegalParamsRecalcScheduler`: lock local, eventos `job.scheduled/completed/
    skipped/failed`, `alert` injetado (padrão `sendAlertWebhook`) que dispara `job_failed` no `catch` do `runOnce`.
    A fonte `ciclo_fiscal` entra em `AlertPayload.source` na mesma mudança (OBS-R11). Intervalo
    `CICLO_FISCAL_INTERVAL_MS` (padrão 6 h) e atraso inicial pelo `readMsEnv`. Fica desligado sob `NODE_ENV=test` sem
    `allowInTest` e desligado sem `CICLO_FISCAL_ENABLED=true`. Registrado no `start`/`stop` de `server.ts`. Teste: o caso
    entra na tabela do `schedulerFailureAlert.test.ts` (que acha o arquivo por glob). Com `falhas > 0`, o
    `job.completed` sai em `warn`.
11. **`GET /api/accounting/obrigacoes?ano&estado?&ate?`** — cadeia Route → Controller → Service → Repository, policy
    `canReadTaxAssessment`, DTO Zod `.strict()`, rota em 2 toques (`routes/accounting.ts` + `docs.paths.ts`), openapi
    (guarda de path-count). Devolve as ocorrências com `vencimento`, `regra`, `fonte`, `estado`, `preRequisitos`,
    `previa` e a situação do prazo **derivada na leitura** (`NO_PRAZO` · `VENCE_EM_BREVE` [≤ N dias úteis, F-CF-7] ·
    `VENCIDA`, nunca gravada). Testes: 403 sem permissão; 400 com chave extra; `VENCIDA` muda com o relógio e não com
    escrita.
12. **Gates do diff no PR-1:** snapshot de shape dos DTOs novos; códigos de pré-requisito e de aviso no catálogo i18n
    pt/en (paridade); `npm run check:arch` sem violação nova (o controller usa o resolver HTTP, nunca o
    `resolveAccountingScopeInternal`).

### PR-2 — reprocessamento, marcação humana e confirmação por política

13. **`POST /api/accounting/obrigacoes/:id/reprocessar`** (policy `canManageTaxAssessment`) — roda só aquela ocorrência
    agora, pelo mesmo caminho do job, com o mesmo resultado. Teste: reprocessar duas vezes seguidas sem dado novo ⇒ a
    2ª não escreve.
14. **`PATCH /api/accounting/obrigacoes/:id`** — o humano marca o que se cumpre fora do sistema (`ENTREGUE` com recibo
    opcional, `PAGA`, `DISPENSADA` com motivo) nas obrigações sem registro próprio (DCTFWeb encerrada no MIT, ECD/ECF no
    PVA, DEFIS, DASN-SIMEI). As que têm registro próprio derivam o estado dele e recusam o PATCH (400 nomeado): DAS
    registrado ⇒ `CONCLUIDA`; `ReinfBatch.status = TRANSMITIDO/ACEITO`. Evento de auditoria novo
    `fiscal.obrigacao.marcada` na allowlist do `auditCanonical.ts` (campos: `ocorrenciaId`, `obrigacao`, `periodo`,
    `de`, `para`; o recibo é texto livre e passa pelo `auditFreeTextMask`).
15. **Entrada por ocorrência** (F-CF-3 → b): `PUT /api/accounting/obrigacoes/:id/entrada`. Guarda as deduções,
    retenções sofridas, estimativas pagas e o modo mensal que a confirmação do X7/X8/IBS-CBS aceita, validados **pelo
    mesmo schema** do preview da família (sem schema paralelo). O job usa essa entrada; sem ela, usa a vazia.
16. **Política no perfil fiscal do ano** (F-CF-3 → b; F-CF-5a → a): `cicloFiscalAutoConfirmar` (lista fechada de
    famílias: `X7`, `X8`, `IBS_CBS`, `SIMPLES`; vazia por padrão) e `cicloFiscalDiaCorteUtil` (o n-ésimo dia útil do mês
    seguinte à competência, padrão 5, F-CF-6 → a), com migração aditiva. Os campos novos entram no evento de auditoria do
    perfil (guarda de allowlist: campo novo exige guarda, memória "Allowlist de auditoria").
17. **Confirmação automática** (F-CF-3 → b, F-CF-6 → a): a família está na política, a prévia não tem aviso bloqueante,
    não há `VENDAS_PENDENTES`, e `hoje` ≥ dia de corte. Então o job chama `confirmarPeloSistema` com a entrada do item 15
    e `expectedAPagarCents` da prévia **da mesma passada**. A provisão segue o caminho do serviço dono (X7: best-effort
    depois do commit 1; ocorrência confirmada com `provisaoEntryId = null` ⇒ o job chama `reconcileProvisao` na passada
    seguinte). **Período já fechado** quando o job chega: confirma, e a provisão fica pendente com o aviso "reabra o
    período para lançar a provisão", porque o `postEntry` exige `OPEN` (`PostingService.ts:131,148`). O `reconcile`
    completa quando o período reabrir. Testes de integração: confirma e provisiona sem HTTP (é o `comoProvar` da lacuna);
    antes do dia de corte não confirma; com o período `SOFT_CLOSED`, a confirmação existe e a provisão fica pendente com o
    aviso; 409 `ALREADY_CONFIRMED` porque o usuário confirmou antes ⇒ ocorrência `CONFIRMADA` apontando para a dele, sem
    2ª linha; `CALCULATED_PROVISIONAL` nunca confirma.
17b. **Provisão estimada do Simples** (F-CF-5 → b; F-CF-5a → a). Com `SIMPLES` na política, a partir do dia de corte,
    com o período `OPEN` e sem DAS oficial registrado, o job lança a provisão pelo valor **calculado** da prévia, no
    último dia da competência. Lançamento: D dedução da receita / C Simples a recolher, contas do perfil, por um método
    novo `SimplesApuracaoService.provisionarEstimativaPeloSistema` com `sourceType = 'simples.das.provision.estimate'`
    e `sourceId = <ocorrência>`. O `registrarDas` ganha um passo no commit 1: **estorna a estimada viva da competência
    antes** de lançar a oficial (o mesmo estorno idempotente que ele já faz para a substituída). Resultado: uma provisão
    viva por competência, sempre. Prévia mudou antes do registro ⇒ estorna a estimada e lança outra (F-CF-8 → b, nada
    entregue). Atualizar o cabeçalho `atomicUntil` do serviço com as linhas e os testes novos (`[AC-2.3-2]`).
    **Emenda o F-SN-10 só neste ponto:** a provisão definitiva continua pelo valor oficial. Testes de integração:
    estimada lançada sem HTTP; `registrarDas` ⇒ estimada estornada + oficial lançada, 1 viva; repetir o registro não cria
    linha (reconcile); sem a família na política, nenhuma estimada.
18. **Depois de confirmada** [F-CF-8]: a cada passada, a apuração viva é recalculada com `recalcularPeloSistema` e
    comparada como em `mesmosValores` (`TaxAssessmentRecalcService.ts:55`). Se diverge, *(se F-CF-8 b)* reconfirma
    quando nada foi entregue (sem `MitExport` com a apuração e sem DAS registrado). Se algo foi entregue, só grava o
    aviso `AVISO_VALOR_MUDOU_APOS_ENTREGA`, que já existe. Teste: venda nova no mês confirmado ⇒ a ocorrência mostra a
    divergência.

### PR-3 — arquivos

19. **EFD-Reinf** [F-CF-4]: com o período encerrado e o R-1000 completo, o job chama `gerarPeloSistema` uma vez por
    competência. `ReinfNadaAGerarError` com `REINF_SEM_FATO` ⇒ `DISPENSADA` com a fonte (IN 2.043 art. 4º, "dispensa sem
    fato"). Gera de novo só quando o lote está `defasado` (leitura que já existe). Estado final automático =
    `ARQUIVO_GERADO`; a transmissão é humana até o PR-4 do EFD-REINF.
20. **MIT/DCTFWeb** [F-CF-4]: quando todas as apurações X7/X8 do mês estão confirmadas, o job chama
    `MitExportService.gerarPeloSistema`. Gera de novo só se uma apuração do mês foi substituída depois do arquivo. Estado
    `ARQUIVO_GERADO` → o humano encerra no MIT (item 14).
21. **Rascunho de ECD e ECF** (F-CF-4 → b; F-CF-4a → a): uma vez por ano-calendário, quando o encerramento do exercício
    estiver lançado (`ExerciseClosingService`) e os signatários do SPED estiverem no perfil, o job chama a geração que já
    existe (`SpedGenerationService` para a ECD; `SpedEcfGenerationService`/`SpedEcfRealGenerationService` pela forma) por
    métodos `*PeloSistema`. Estado `ARQUIVO_GERADO` → o humano assina e transmite no PVA. Gera de novo só se o razão do
    ano mudar depois da geração. A detecção (lançamento do ano com `createdAt` posterior ao arquivo, ou estorno) é esboço
    e se confere na execução (§10 item 6). Sem encerramento ⇒ `AGUARDANDO_PRE_REQUISITO` com `ANO_NAO_ENCERRADO`; sem
    signatário ⇒ `SPED_SEM_SIGNATARIO`. Testes: exercício encerrado ⇒ 1 arquivo; 2ª passada ⇒ nenhum; lançamento novo no
    ano ⇒ 1 arquivo novo.
22. **DEFIS, DASN-SIMEI e bloco anual do PGDAS-D**: só ocorrência + prazo + pré-requisito. O job não gera, porque a
    declaração é feita no portal.

## 7. Contratos esboçados

```prisma
// PR-0 (F-CF-1 a). Calendário de obrigações: 1 linha por PJ × obrigação × período.
model ObrigacaoFiscalOcorrencia {
  id               String    @id @default(cuid())
  userId           String // a PJ (R8)
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId           String? // unidade do escopo usada na prévia (F-CF-10); null até haver
  obrigacao        String // OBRIGACOES_CICLO (abaixo)
  periodo          String // "2026-11" | "2026-T03" | "2026-A05" | "2026" (anual)
  anoCalendario    Int
  vencimento       String // date-only
  regraPrazo       String // REGRAS_PRAZO
  prazoParametroId String? // linha PRAZO_OBRIGACAO usada (proveniência)
  fontePrazo       String
  estado           String // ESTADOS_OCORRENCIA
  versao           Int       @default(0) // CAS da transição
  preRequisitos    Json? // { codigo, detalhe }[]
  previa           Json? // PreviaOcorrenciaSchema
  previaSha256     String?
  entradaInformada Json? // item 15 (F-CF-3 b)
  sourceType       String? // 'tax_assessment' | 'consumption_tax_assessment' | 'simples_apuracao' | 'reinf_batch' | 'mit_export'
  sourceId         String?
  aviso            String?
  marcadoPorId     String? // PATCH humano (item 14)
  ultimaPassadaEm  DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?

  @@unique([userId, obrigacao, periodo])
  @@index([userId, anoCalendario, estado])
  @@index([estado, vencimento])
  @@map("obrigacao_fiscal_ocorrencias")
}
```

```ts
// PR-0 — server/src/features/accounting/models/cicloFiscal.ts
export const OBRIGACOES_CICLO = [
  'DAS', 'DARF_IRPJ', 'DARF_CSLL', 'PIS', 'COFINS', 'CBS', 'IBS',
  'DCTFWEB', 'REINF', 'ECD', 'ECF', 'DEFIS', 'PGDAS_D_ANUAL', 'DASN_SIMEI',
] as const;
// O PGDAS-D mensal NÃO é ocorrência própria: vence junto com o DAS (Res. CGSN 140 art. 38 § 2º II, "até o vencimento
// do prazo para pagamento") e é o passo humano da ocorrência DAS (AGUARDANDO_HUMANO). A linha PGDAS_D da matriz
// `OBRIGACAO_REGIME` mapeia para a ocorrência DAS.

export const ESTADOS_OCORRENCIA = [
  'PREVISTA',                 // período ainda não acabou
  'AGUARDANDO_PRE_REQUISITO', // preRequisitos não vazio
  'PREVIA_CALCULADA',
  'CONFIRMADA',               // apuração CONFIRMED viva (sourceId)
  'ARQUIVO_GERADO',           // Reinf/MIT gerado
  'AGUARDANDO_HUMANO',        // falta passo humano (§3.2)
  'CONCLUIDA',                // derivado (DAS registrado) ou marcado (ENTREGUE/PAGA)
  'DISPENSADA',               // sem fato (Reinf art. 4º) ou marcado com motivo
] as const;
// Transições permitidas (tabela fechada; fora dela ⇒ ConflictError 'CICLO_TRANSICAO_INVALIDA'):
// PREVISTA→{AGUARDANDO_PRE_REQUISITO,PREVIA_CALCULADA,DISPENSADA}; AGUARDANDO_PRE_REQUISITO↔PREVIA_CALCULADA;
// PREVIA_CALCULADA→{CONFIRMADA,AGUARDANDO_HUMANO}; CONFIRMADA→{ARQUIVO_GERADO,AGUARDANDO_HUMANO,PREVIA_CALCULADA (superseded)};
// ARQUIVO_GERADO→{AGUARDANDO_HUMANO,CONCLUIDA}; AGUARDANDO_HUMANO→CONCLUIDA; *→DISPENSADA só com motivo.

export const REGRAS_PRAZO = [
  'DIA_20_ADIA', 'DIA_25_ANTECIPA', 'DIA_15_ADIA', 'DIA_15_2O_MES_POS_TRIMESTRE_ADIA',
  'ULTIMO_DIA_UTIL_MES_SEGUINTE', 'ULTIMO_DIA_UTIL_MARCO_ANO_SEGUINTE',
  'ULTIMO_DIA_UTIL_JUNHO_ANO_SEGUINTE', 'ULTIMO_DIA_UTIL_JULHO_ANO_SEGUINTE',
  'DATA_FIXA_31_MARCO_ANO_SEGUINTE', 'DATA_FIXA_ULTIMO_DIA_MAIO', 'JANELA_JAN_MAR', 'DATA_DA_LINHA',
] as const; // DATA_DA_LINHA = prorrogação: valorJson.data

export interface OcorrenciaEsperada {
  obrigacao: (typeof OBRIGACOES_CICLO)[number];
  periodo: string;
  vencimento: string;
  regra: (typeof REGRAS_PRAZO)[number];
  fonte: string;
  prazoParametroId: string | null;
  perguntaPendente?: string; // CONDICIONAL da matriz
}
export function ocorrenciasEsperadas(perfil: PerfilDoAno, matriz: readonly LinhaMatriz[], prazos: readonly LinhaLegal[],
  feriados: Feriados, ano: number): OcorrenciaEsperada[];
export function vencimentoDe(regra: RegraPrazo, periodo: string, feriados: Feriados, codMun: string | null,
  linha?: LinhaLegal): string;
```

```ts
// PR-1 — dtos/CicloFiscalDto.ts
export const ObrigacaoListQuerySchema = z.object({
  ano: z.coerce.number().int().min(2025).max(2100),
  estado: z.enum(ESTADOS_OCORRENCIA).optional(),
  ate: dateOnly('ate').optional(), // vencimento <= ate
}).strict();

export const PreRequisitoSchema = z.object({ codigo: z.enum(PRE_REQUISITOS_CICLO), detalhe: z.string().max(500) }).strict();

export const PreviaOcorrenciaSchema = z.object({
  tributos: z.record(z.string(), z.object({ baseCents: CentsStr, devidoCents: CentsStr, aPagarCents: CentsStr }).strict()),
  parametrosSha256: z.string().length(64),
  avisos: z.array(z.object({ codigo: z.string(), detalhe: z.string() }).strict()),
  calculadaEm: z.string().datetime(),
}).strict();

export const ObrigacaoViewSchema = z.object({
  id: z.string(), obrigacao: z.enum(OBRIGACOES_CICLO), periodo: z.string(), vencimento: z.string(),
  regraPrazo: z.enum(REGRAS_PRAZO), fontePrazo: z.string(), estado: z.enum(ESTADOS_OCORRENCIA),
  situacaoPrazo: z.enum(['NO_PRAZO', 'VENCE_EM_BREVE', 'VENCIDA']).nullable(), // null em estado final
  diasUteisParaVencer: z.number().int(),
  preRequisitos: z.array(PreRequisitoSchema), previa: PreviaOcorrenciaSchema.nullable(),
  sourceType: z.string().nullable(), sourceId: z.string().nullable(), aviso: z.string().nullable(),
}).strict();

// PR-2
export const ObrigacaoMarcarSchema = z.object({
  estado: z.enum(['CONCLUIDA', 'DISPENSADA']),
  tipo: z.enum(['ENTREGUE', 'PAGA', 'DISPENSADA']),
  recibo: z.string().max(120).optional(),
  motivo: z.string().max(500).optional(), // obrigatório se DISPENSADA (refine)
}).strict();
// PUT /:id/entrada (F-CF-3 b): o corpo é o schema de preview da família SEM unitId/ano/periodo (vêm da ocorrência):
//   X7 → TaxAssessmentPreviewFields.pick({ deducoes, modoMensal, estimativasPagas }); X8 → o do PisCofins; IBS_CBS → o do IbsCbs.
```

```ts
// PR-1 — services/CicloFiscalService.ts (atomicUntil: — ; só ordena chamadas, como o TaxAssessmentRecalcService)
export interface ResumoCicloFiscal { pjs: number; falhas: number; materializadas: number; previas: number;
  confirmadas: number; arquivos: number; aguardando: number; inalteradas: number }
export class CicloFiscalService {
  constructor(deps: {
    repo: IObrigacaoFiscalOcorrenciaRepository; perfis: ICompanyFiscalProfileRepository; legalParams: LegalParameterService;
    x7: Pick<TaxAssessmentService, 'recalcularPeloSistema' | 'confirmarPeloSistema' | 'reconcileProvisao'>;
    x8: Pick<PisCofinsAssessmentService, 'recalcularPeloSistema' | 'confirmarPeloSistema'>;
    ibsCbs: Pick<IbsCbsAssessmentService, 'previewPeloSistema' | 'confirmarPeloSistema' | 'reconcileIbsCbsProvisao'>;
    simples: Pick<SimplesApuracaoService, 'calcularPeloSistema'>;
    reinf: Pick<ReinfService, 'gerarPeloSistema'>; mit: Pick<MitExportService, 'gerarPeloSistema'>;
    pendencias: Pick<IReconcilePendingRepository, 'countAbertasNaCompetencia'>; periodos: Pick<IAccountingPeriodRepository, 'statusDo'>;
  });
  processar(hoje: string): Promise<ResumoCicloFiscal>;
  processarUma(scope: AccountingScope, id: string): Promise<ObrigacaoView>; // item 13
  listar(scope: AccountingScope, q: ObrigacaoListQuery): Promise<ObrigacaoView[]>;
  marcar(scope: AccountingScope, id: string, body: ObrigacaoMarcar): Promise<ObrigacaoView>;
}
```

```ts
// PR-1 — lib/alertWebhook.ts: AlertPayload.source ganha 'ciclo_fiscal'
// jobs/CicloFiscalScheduler.ts: deps { run?, log?, alert? } idênticos aos do LegalParamsRecalcScheduler
```

## 8. Forks — RATIFICADOS em 21/11 (questionário; cédula em [[D-2026-11-21-CICLO-FISCAL-FORKS]])

Em cada fork, a opção (a) é a recomendada, salvo onde se diz outra coisa.

**F-CF-1 · Calendário persistido ou derivado na leitura.**
- **RATIFICADO 21/11: (a)** — na recomendação.
- (a) **Tabela `ObrigacaoFiscalOcorrencia`** (§7). A função pura gera o esperado e a tabela guarda o estado do job:
  pré-requisito, prévia, tentativa, marcação humana. Isso dá idempotência por chave única, retentativa e "aguardando
  humano" que sobrevive ao restart.
- (b) Derivado na leitura, como o `GET /tax-assessments/periodos`. Não precisa de migração, mas o job não tem onde
  guardar "já tentei e faltou X". A marcação humana (DCTFWeb encerrada) não tem casa, e a prévia é recalculada em todo
  GET.
- **Recomendação: (a).** O estado do job é dado novo, que nenhuma tabela atual guarda.

**F-CF-2 · Prazo como dado ou como código.**
- **RATIFICADO 21/11: (a)** — na recomendação.
- (a) **Linha `PRAZO_OBRIGACAO` em `legal_parameters`** (regra do enum + fonte + vigência). A prorrogação e a calamidade
  viram linhas novas publicadas pelo fluxo do LEGAL-PARAMS, sem deploy. Precedente: `IBS_CBS/VENCIMENTO` (dono, 23/10).
- (b) Funções em `lib/` por obrigação, como `prazoReinf.ts`. É mais simples, mas cada prorrogação vira deploy, e o
  dossiê mostra três prorrogações só da ECF.
- **Recomendação: (a)**, com os intérpretes de `lib/` como execução da regra.

**F-CF-3 · O que o job confirma sem humano (o fork central).**
- **RATIFICADO 21/11: (b)** — na recomendação. A janela "≤ N dias úteis antes do vencimento" foi trocada pelo dia de corte do F-CF-6 (perguntado de novo).
- (a) **Nunca confirma.** Calcula a prévia, checa, avisa, e o humano confirma (padrão Odoo/ERPNext, §2). Não tem risco
  de valor errado, mas automatiza só o cálculo.
- (b) **Confirma por política do tenant, opt-in por família** (`X7`, `X8`, `IBS_CBS`), com três travas: período fechado
  (F-CF-6), prévia sem aviso bloqueante, e só a ≤ N dias úteis do vencimento. Até lá, o usuário pode preencher a
  **entrada da ocorrência** (deduções, retenções sofridas, estimativas pagas), e o job confirma com ela, ou com a vazia
  se ninguém preencheu (itens 15–17). Com a política desligada, vale (a).
- (c) Confirma sempre que a prévia não tiver aviso. É o máximo de automação, mas a dedução não informada vira imposto a
  maior lançado sem ninguém ver.
- **Recomendação: (b).** É o que o pedido descreve ("o que a lei e a política do tenant permitem"), e (a) é o modo
  desligado dela. A chave padrão desligada vem do mercado (§2) e do risco da §4. O Simples fica fora pelo F-CF-5.

**F-CF-4 · Que arquivos o job gera sozinho.**
- **RATIFICADO 21/11: (b) — contra a recomendação.** Detalhe F-CF-4a → (a), na recomendação: gera uma vez quando o encerramento do exercício estiver lançado e os signatários estiverem no perfil; gera de novo só se o razão do ano mudar (item 21).
- (a) **Reinf e MIT mensais**, quando a entrada está completa (itens 19–20). O ECD, a ECF e as declarações anuais ficam
  só no calendário, com prazo e pré-requisito, porque pedem ano encerrado, signatários e PVA.
- (b) (a) + rascunho do ECD/ECF quando o exercício estiver encerrado (`ExerciseClosingService`).
- (c) Nenhum arquivo, só aviso.
- **Recomendação: (a).** Gerar o arquivo não cria obrigação nem transmite nada; o lote é registrado e imutável (hash).
  ECD e ECF pesam vários MB, e o PVA é humano de qualquer forma (gate H1).

**F-CF-5 · Simples: o job para na prévia ou provisiona uma estimativa.**
- **RATIFICADO 21/11: (b) — contra a recomendação.** Emenda o F-SN-10 só neste ponto: a provisão definitiva continua pelo DAS oficial. Detalhe F-CF-5a → (a), na recomendação: a estimada segue a mesma política opt-in (família `SIMPLES`) e o dia de corte (item 17b).
- (a) **Para na prévia.** Calcula, mostra o espelho do PGDAS-D e avisa "transmita até <vencimento> e registre o DAS". A
  provisão continua no registro do DAS oficial (F-SN-10 → a).
- (b) Lança uma provisão estimada pelo valor calculado no último dia da competência e a estorna no registro do DAS
  oficial. Reabre o F-SN-10.
- **Recomendação: (a).** A opção estrutural para automatizar o Simples é transmitir o PGDAS-D pela API (Integra
  Contador), adiada pela R5. O handoff de 21/11 §3 item 3 já propõe rever a R5. Uma provisão estimada é remendo: gera
  dois lançamentos por mês e diferença a estornar.

**F-CF-6 · Quando o job confirma e provisiona (perguntado de novo em 21/11).**
- **RATIFICADO 21/11: (a)** — na recomendação corrigida.
- **Correção:** a 1ª versão deste fork recomendava "a confirmação automática exige `SOFT_CLOSED`", e o dono respondeu
  (a). A recomendação estava errada: o `postEntry` exige período `OPEN` (`PostingService.ts:131,148`), então a provisão
  ficaria sempre pendente. A pergunta foi refeita com isso explícito.
- (a) **Dia de corte, com o período aberto.** A partir do n-ésimo dia útil do mês seguinte (padrão 5, no perfil), com o
  período ainda `OPEN`, sem venda pendente e sem aviso, o job confirma e a provisão entra na competência; depois o
  usuário fecha o período. Se o período já estiver fechado, o job confirma e a provisão fica pendente com aviso
  (mecanismo do X7 item 15). A prévia roda sempre, com o período aberto ou fechado.
- (b) Logo que o mês acaba. Cada venda atrasada força uma reconfirmação (estorno + provisão nova) até a entrega.
- (c) Só depois de `SOFT_CLOSED`. A provisão fica sempre pendente até alguém reabrir o período.
- **Recomendação: (a).**

**F-CF-7 · Como o usuário fica sabendo (vencimento e pré-requisito).**
- **RATIFICADO 21/11: (a)** — na recomendação.
- (a) **Estado e situação do prazo no calendário** (`GET`, item 11), com `VENCE_EM_BREVE` a ≤ N dias úteis (padrão
  5). A tela é do `AGENDA-FISCAL`. O e-mail vem quando o `EMAIL-TRANSPORT` existir (proposta F5.1). O alerta de
  operação (webhook) é só da falha do job (OBS-R11).
- (b) Criar já um modelo de notificação no app (sino), dentro deste nó.
- (c) Mandar ao webhook de operação também o "vence em breve" do tenant. Mistura alerta de operação com aviso de
  negócio, e o webhook é da plataforma, não do cliente.
- **Recomendação: (a).** Não há canal ao usuário no código: não existe modelo de notificação e não existe e-mail em
  `lib/`. Criar um canal é outro nó.

**F-CF-8 · Depois de confirmada, se o dado muda.**
- **RATIFICADO 21/11: (b)** — na recomendação.
- (a) **Só avisa.** Grava a divergência e o humano substitui (retificação).
- (b) **Reconfirma sozinho se nada foi entregue** (sem MIT com a apuração, sem DAS registrado) e a família está na
  política. Se algo foi entregue, só avisa com `AVISO_VALOR_MUDOU_APOS_ENTREGA`. É o mesmo critério do recálculo do
  LEGAL-PARAMS (dono, 07/10: "Recalcula e só reconfirma se mudar").
- **Recomendação: (b)**, pela coerência com o precedente. Com a política desligada, vale (a).

**F-CF-9 · Quais obrigações entram no calendário.**
- **RATIFICADO 21/11: (a)** — na recomendação.
- (a) **As que o código apura, gera ou já tem na matriz:** DAS, DARF IRPJ/CSLL, PIS/COFINS (até 12/2026), CBS/IBS
  (desde 2027), DCTFWeb, Reinf, ECD, ECF, DEFIS (até a de 2026), bloco anual do PGDAS-D (desde 2027) e DASN-SIMEI. FGTS,
  eSocial e GPS entram com o [[PES-4]]. ISS municipal entra quando houver apuração. EFD-Contribuições e EFD ICMS/IPI
  seguem fora (F-XP-7 → a; fork `3b81` já na caixa).
- (b) (a) + "lembretes" sem apuração para FGTS, eSocial e ISS, com prazo da lei e sem prévia.
- **Recomendação: (a).** Um lembrete sem dado do sistema promete o que o sistema não sabe; quando a folha chegar, o
  prazo chega com ela.

**F-CF-10 · Qual unidade o job usa no escopo.**
- **RATIFICADO 21/11: (a)** — na recomendação.
O perfil fiscal é por PJ (`@@unique([userId, anoCalendario])`, sem `unitId`), mas o `AccountingScope` exige uma unidade,
e a apuração grava a "unidade lida". Não há conceito de matriz no código.
- (a) **A unidade da última apuração confirmada da família; na 1ª, a única unidade da PJ.** PJ com 2+ unidades e sem
  histórico ⇒ pré-requisito `UNIDADE_NAO_DEFINIDA` até o usuário escolher. A escolha fica num campo novo
  `unidadeApuracaoId` no perfil do ano.
- (b) Campo obrigatório no perfil do ano desde já, preenchido no onboarding.
- **Recomendação: (a).** Não quebra perfil existente, e o campo nasce só onde faz falta.

## 9. Pendente de validação externa

1. **"Expediente bancário" no DAS** (Res. CGSN 140 art. 40 § 3º): só feriado nacional ou também o local? A leitura
   provisória conta o local (dossiê §4). Pergunta ao contador: "O DAS de uma empresa em SP que vence num feriado municipal
   vence no dia útil seguinte?"
2. **DAS do MEI**: o prazo e a regra de dia não útil não foram lidos (LC 123 art. 18-A). Até lá, o DAS-MEI não entra no
   PR-0.
3. **IBS**: prazo DRAFT até o regulamento do CG-IBS (P-IBS-5). A ocorrência IBS só nasce com a linha publicada.
4. **Datas fixas sem regra de dia não útil** (DEFIS, DASN-SIMEI, bloco anual): o prazo não muda. O `VENCE_EM_BREVE`
   conta até o último dia útil antes da data (dossiê §4).
5. **Oráculo do número**: a prévia do job **é** a apuração do serviço dono, então o oráculo continua o deles (PVA,
   H1/H1b/X5, contador). Este nó não cria número novo.

## 10. Insumos ausentes

1. **Canal de aviso ao usuário** (e-mail ou notificação): não existe (F-CF-7). Proposta `EMAIL-TRANSPORT` (F5.1).
2. **Retenções sofridas automáticas**: hoje são digitadas por apuração. O item 15 dá onde digitar uma vez por
   ocorrência. A automação é do [[RETENCOES-FONTE]].
3. **Folha → razão** (CPP, fator r): [[PES-4]], com a ponte em planejamento na sessão irmã `dp-ponte-razao`.
4. **Transmissão** (PGDAS-D, DCTFWeb, Reinf, eSocial): R5 e o PR-4 do EFD-REINF.
5. **Lista de pendências de venda por competência**: o item 7 supõe uma contagem de `ReconcilePending` aberta por
   competência. O nome do método do repositório (`countAbertasNaCompetencia`) é esboço e se confere na execução.
6. **"O razão do ano mudou depois do rascunho de ECD/ECF"** (item 21): não existe marca d'água por ano no razão. A
   detecção por `createdAt` dos lançamentos do ano é esboço; a execução lê o `SpedGenerationService` e o
   `spedRectificationGate.ts` antes de fixar a regra.

## 11. Achados fora de escopo (na caixa)

- **Quotas do IRPJ/CSLL** (Lei 9.430 art. 5º § 1º–§ 3º): o X7 só modela a quota única (`vencimentoQuotaUnica`; nenhum
  "quota" em `features/accounting` fora da depreciação). O calendário mostra só a quota única. Lacuna
  `L-20261121-191723-f153` (nó X7, pai `L-20261121-184212-4fdb`).

## 12. Write-set

| PR | Edita / cria |
|---|---|
| PR-0 | `server/prisma/schema.prisma`, `server/prisma/migrations/<ts>_ciclo_fiscal_pr0/**`, `server/prisma/data/legal_parameters_prazo_obrigacao_v1.sql`, `server/src/lib/prazoObrigacao.ts` (novo), `server/src/features/accounting/models/cicloFiscal.ts` (novo), `server/src/features/accounting/models/periodosEsperados.ts` (novo, extraído), `server/src/features/accounting/services/TaxAssessmentPeriodosService.ts`, `server/src/features/accounting/repositories/{I,}ObrigacaoFiscalOcorrenciaRepository.ts` (novos), `server/src/features/legalParameters/models/formatoLinha.ts`, `server/src/features/legalParameters/models/legalParameter.ts` (tabela no enum), testes em `__tests__/` |
| PR-1 | `server/src/features/accounting/services/CicloFiscalService.ts` (novo), `server/src/jobs/CicloFiscalScheduler.ts` (novo), `server/src/jobs/__tests__/schedulerFailureAlert.test.ts`, `server/src/features/accounting/services/{SimplesApuracaoService,IbsCbsAssessmentService,ReinfService,MitExportService}.ts` (métodos `*PeloSistema`), `server/src/features/accounting/dtos/CicloFiscalDto.ts` (novo), `server/src/controllers/cicloFiscalController.ts` (novo), `server/src/routes/obrigacoes.ts` (novo), `server/src/routes/docs/accounting.obrigacoes.paths.ts` (novo), i18n dos códigos |
| PR-2 | `CicloFiscalService.ts`, `CicloFiscalDto.ts`, `cicloFiscalController.ts`, `routes/obrigacoes.ts`, `server/src/features/accounting/dtos/CompanyFiscalProfileDto.ts`, `server/src/features/accounting/services/SimplesApuracaoService.ts` (estimada + estorno no `registrarDas`, item 17b), `server/prisma/schema.prisma` + migração (campos da política, F-CF-3 b; `unidadeApuracaoId`, F-CF-10) |
| PR-3 | `CicloFiscalService.ts`, `server/src/features/accounting/services/{SpedGenerationService,SpedEcfGenerationService,SpedEcfRealGenerationService}.ts` (métodos `*PeloSistema`, item 21) e os testes de integração de Reinf/MIT/ECD/ECF |

**Registros (choke points PAR-001):** `server/src/lib/factory.ts`, `server/src/routes/accounting.ts`,
`server/src/routes/docs.paths.ts`, `server/public/openapi.json`, `server/src/server.ts` (start/stop),
`server/src/lib/alertWebhook.ts` (`AlertPayload.source`), `server/src/features/accounting/audit/auditCanonical.ts`
(PR-2), o snapshot de shape dos DTOs.

**Fatiamento:** 4 PRs com arquivos em comum ⇒ `integration/ciclo-fiscal` como base, em pilha nativa
(`D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE`). PR-0 é o contrato e entra primeiro. Classe de risco esperada:
vermelho (migração + job que confirma apuração) ⇒ revisor independente + lote do dono.

**Perfil previsto:** `opus-medio` para o PR-0 e o PR-1 (padrões existentes, sem decisão nova depois dos forks);
`opus-medio` com revisor para o PR-2 (confirmação automática e CAS com o usuário).
