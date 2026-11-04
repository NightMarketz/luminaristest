# PRE-ADR-DP-DEPARTAMENTO-PESSOAL — Departamento Pessoal (folha + eSocial) como núcleo first-class com submódulos plugáveis

- **Data:** 2026-11-02
- **Status:** **Accepted (2026-11-02)** — F-DP-1..14 decididos (§5): F-DP-1 e F-DP-4 pela regra da casa; os outros pelo
  dono em quatro questionários no mesmo dia. F-DP-8 saiu contra a recomendação; F-DP-6 com formulação do dono; F-DP-5 foi
  revisto no mesmo dia, depois do achado do §0. Sem nó, sem BRIEF, sem código.
- **Autorização:** dono, chat, 2026-11-02, na sessão que recebeu a spec: *"A folha estava diferida exatamente pra entrar
  nesse módulo aqui"* e *"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief em outra e o
  executa na terceira"*. Cédulas em [`D-2026-11-02-DP-PRE-ADR`](../plano/decisoes/D-2026-11-02-DP-PRE-ADR.md).
- **Escopo da autorização (passo 1 da `sessao-planejamento`):** cobre **este PRE-ADR**, a nota de decisão e a cópia da
  spec. Nó em `docs/plano/nos/`, BRIEF e código são das sessões 2 e 3. Sem divergência: o protocolo do vault já exige
  PRE-ADR ratificado antes do nó (`docs/plano/README.md`, última linha do §Fold).
- **Insumo principal:** [`docs/dp/SPEC-DP-2026-10-31-katz.md`](../dp/SPEC-DP-2026-10-31-katz.md) (spec de @Katz, 31/10,
  insumo externo não ratificado). Neste texto, "spec §N" = seção N dela; "D1..D10 da spec" = as "decisões fixadas" do
  autor, que **não** são decisões do dono do Luminaris.
- **Nó:** nenhum (sessão 2). A folha estava no diferido [`M5-subrazoes-restantes`](../plano/diferidos/M5-subrazoes-restantes.md)
  (master map §5 item 13, ⚫ "só com demanda explícita"); a demanda é a fala do dono acima.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `0b3d165e` (02/11).
- **Respeita:** Contrato §2.1–2.3, `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`, `ADR-ARCH-BOUNDARIES.md`,
  `ADR-DOMAIN-MOTOR-rejected.md`, trilhos T2, T8, T10, T11, decisões R8, D5 (30/10) e
  [`D-2026-10-31-MODULOS-BASE-SUBMODULOS`](../plano/decisoes/D-2026-10-31-MODULOS-BASE-SUBMODULOS.md).

## 0. Passo 1 da sessão: o DP não começa do zero

Achado no fechamento desta sessão, **depois** do primeiro questionário (o grep inicial por "folha" em `docs/` cortou a
lista antes de chegar nestes arquivos). Dois PRE-ADRs de pessoal já existiam:

| Documento | Estado | Grau |
|---|---|---|
| [`docs/accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`](../accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) (10/10, #627) | F-PES-0..13 **ratificados em lote pela recomendação** em 12/10 ([`D-2026-10-12-QUESTIONARIO-DONO`](../plano/decisoes/D-2026-10-12-QUESTIONARIO-DONO.md) linha 31). F-PES-0 (c) "por fases": fase 1 importa a folha do software do contador (XML do eSocial); fase 2 é motor próprio, aberta por gatilho ("o primeiro tenant com empregado CLT e sem provedor de folha, **ou uma decisão do dono**") | V |
| [`docs/adr/PRE-ADR-FOLHA-CONTABILIZACAO.md`](PRE-ADR-FOLHA-CONTABILIZACAO.md) (22/10, #858) | Proposed; F-FOL-0..9 pendentes. Folha → razão: provisões de 13º e férias, rateio por centro de custo (`PostingDimension`), comissão CLT × parceiro | V |

**Como este PRE-ADR se encaixa (decidido pelo dono em 02/11, F-DP-12..14):** o DP **é a fase 2 do F-PES-0**, aberta
por decisão do dono. Os F-PES-1..13 continuam valendo, com uma exceção explícita: o F-PES-4 (a) (guarda do A1 do
cliente pelo Luminaris) foi superado pela [D5 de 30/10](../plano/decisoes/D-2026-10-30-D5-SEM-CONTRATACAO-BYOK.md) e
pelo F-DP-3. O F-DP-5 de hoje (árvore de expressão) **caiu** no mesmo dia em favor do F-PES-9 (a). O nó do
DP é o **PES-4** (F-PES-1). A fala do dono de 02/11 responde o F-FOL-0 ("tirar a folha do diferido agora") no sentido
"agora, pelo DP"; os F-FOL-1..9 continuam pendentes e vão para o BRIEF da ponte contábil.

## TLDR (2 linhas)

A spec cabe nos mecanismos que o Luminaris já usa para "núcleo + submódulos": registro com `dependsOn`, porta com
adaptador nulo escolhido por configuração, parâmetro legal com vigência, `postEntry` idempotente e gate `check:arch`.
Sete decisões da spec batem em decisão fechada e são **adaptadas, não reabertas** (§4). O DP é a fase 2 do F-PES-0
ratificado em 12/10 (§0), com nó PES-4; catorze forks decididos em 02/11 (§5): núcleo ligado em toda instância, com
pró-labore e SST, e rubricas em código com os valores da CCT como dado.
**Risco principal:** todo valor de folha depende de oráculo externo (cenário golden conferido pelo contador; eSocial em
produção restrita com certificado real), num momento em que os 4 gates do Bloco A já estão abertos há mais de 14 dias.

---

## 1. Objetivo (sob a letra)

A letra do dono foi *"Como fazer esse modulo de forma agnóstica em submodulos como estamos fazendo tudo o resto?"*. O
objetivo é o DP entrar pela **mesma estrutura** do resto do produto: um núcleo que cobre o mínimo legal de todo
empregador CLT, e submódulos ligados por unidade de negócio sem deploy, sem que o núcleo conheça os opcionais, e **sem
reabrir** as decisões que já valem para contabilidade e fiscal.

Critério de pronto do incremento futuro (proposta, a ratificar no BRIEF):

- o núcleo existe em toda instância, como a contabilidade, e serve à menor empresa possível, inclusive a que só tem
  sócio com pró-labore (F-DP-6, F-DP-11);
- o núcleo calcula, transmite e fecha uma competência com todos os opcionais desligados (adaptadores nulos);
- ligar ou desligar um submódulo opcional é escrita em tabela com vigência, não deploy;
- `check:arch` reprova import de submódulo opcional a partir do núcleo do DP.

## 2. Evidência

Grau: **V** = verificado por leitura nesta sessão (arquivo e linha); **I** = inferido; **A** = assumido ou premissa da
spec não verificada.

### 2.1 Plano e decisões

| Fonte | Fato | Grau |
|---|---|---|
| `docs/plano/diferidos/M5-subrazoes-restantes.md` | "Subrazões restantes (estoque, imobilizado, folha…)": folha ⚫, autorização "falta" | V |
| `docs/accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md` §5, §6, §9 | F-PES-0..13 ratificados em 12/10; F-PES-0 (c) por fases; F-PES-9 (a) rubricas em código; F-PES-3 (a) SST obrigatório na fase do motor; F-PES-7 (a) pró-labore no domínio; F-PES-8 (a) CCT como dado; F-PES-10 (a) um lançamento por competência + subrazão | V |
| `docs/adr/PRE-ADR-FOLHA-CONTABILIZACAO.md` | Proposed, F-FOL-0..9 pendentes: provisões, centro de custo, comissão CLT × parceiro | V |
| `.claude/skills/_ARCHITECTURE-CONTRACT.md:93` | "Módulos first-class servem para: Contabilidade, **Folha de Pagamento**, Fiscal/NF-e, RH" | V |
| `.claude/skills/_ARCHITECTURE-CONTRACT.md:114` | `AC-2.1-B2`: `PayrollEntry` é Prisma first-class, "ponto final" | V |
| `.claude/skills/_ARCHITECTURE-CONTRACT.md:136-140` | `AC-2.2-1`: dinheiro = inteiro em centavos, sem Decimal | V |
| `docs/plano/decisoes/R8.md` | "Instância = CNPJ raiz; unidade = filial com conta de emissão própria. `units.cnpj` fica" (dono, 14/09) | V |
| `docs/plano/trilhos/T2.md` | Tenancy = `AccountingScope` (owner + unit + ledger DEFAULT), sem torre LegalEntity | V |
| `docs/plano/trilhos/T11.md` | "Deploy single-process, SQLite local. Scheduler in-process. Sem fila/outbox/DLQ" | V |
| `docs/plano/diferidos/M5-inbox-outbox.md` | Inbox/outbox/DLQ ⚫ "condicionado a sair de single-process (T11)" | V |
| `docs/plano/rejeitadas/R-postgresql.md` | PostgreSQL / exclusion constraints rejeitado; vencedor SQLite + gate transacional + `@@unique` | V |
| `docs/plano/rejeitadas/R-torre-multiempresa.md` | Torre `Workspace→LegalEntity→Establishment→Ledger` rejeitada; vencedor `AccountingScope` de 2 níveis | V |
| `docs/plano/rejeitadas/R-motor-dominio.md` | Motor de domínio (DAG + PluginRegistry + fila) rejeitado em 21/09; vencedor 2 commits + reconcile (`atomicUntil`) | V |
| `docs/plano/rejeitadas/R-motor-regras.md` + T10 | Template que gera lançamento rejeitado; vencedor: bridge pós-commit explícita por origem | V |
| `docs/plano/decisoes/D-2026-10-30-D5-SEM-CONTRATACAO-BYOK.md` | O Luminaris não contrata PSC nem e-CNPJ; serviço futuro só BYOK | V |
| `docs/plano/decisoes/D-2026-10-31-MODULOS-BASE-SUBMODULOS.md` | Categorias com base fixa + submódulos de uma tabela; `employees` é base do Core, fora do registro | V |
| `docs/adr/PRE-ADR-BUILDER-VERTICAIS.md` | Manifesto Zod por referência a módulos; `bridges` de enum fechado (F-BV-1, F-BV-3, Proposed) | V |
| `docs/adr/ADR-MODULE-BOUNDARIES.md` | Pastas `domain/ports/adapters` e regra M2 só **propostas**, nada ligado | V |
| `docs/plano/nos/X10a.md`, `docs/accounting/BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md` | Assinador local com o certificado do cliente: BRIEF com forks ratificados em 30/10, **sem código em `main`** | V |
| Memória `go-live-em-2027` (dono, 30/10) | O produto vai ao ar só em 2027 | V (fala do dono registrada) |

### 2.2 Código (fato consumado que este PRE-ADR respeita)

| Arquivo | Fato | Grau |
|---|---|---|
| `server/prisma/schema.prisma:13` | `provider = "sqlite"` | V |
| `server/prisma/schema.prisma` (78 ocorrências) | Colunas `*Cents BigInt` | V |
| `server/src/features/dynamicTables/presets/modules/registry.ts:30,46,51` | `MODULE_KEYS` só CRM; `category: z.literal('crm')`; `tables: z.array(...).min(1)` | V |
| `server/src/features/dynamicTables/presets/modules/moduleSelection.ts:16` | `resolveModuleSelection` fecha `dependsOn` e recusa com o módulo faltante nomeado | V |
| `server/src/features/dynamicTables/presets/modules/core/EmployeesModule.ts:11-57` | Tabela `employees` (DT): nome, cargo, e-mail, CPF, telefone, nascimento, admissão, unidade, comissões, `monthlyCost`, `workSchedule` | V |
| `server/src/features/dynamicTables/rules/plugins/EmployeesPlugin.ts:2-8`, `AppointmentsPlugin.ts` | `employees` é lida por plugin (agenda, jornada) | V |
| `server/prisma/schema.prisma:1503-1518` | `KitInstallation` com `@@unique([userId, unitId])`: um kit por unidade, sem vigência por módulo | V |
| `server/prisma/schema.prisma:1617` | `FiscalProfile`: "1 perfil por unidade (R8: unidade = filial do mesmo CNPJ raiz)" | V |
| `server/prisma/schema.prisma:3476-3501` | `LegalParameter`: `tabela` (enum fechado), `chave`, `valorInt` ("bp ou centavos"), `valorJson`, `fonte` obrigatória, `vigenteDesde`/`vigenteAte` | V |
| `server/src/features/legalParameters/models/legalParameter.ts:9-34` | `LEGAL_PARAMETER_TABELAS` já tem `SALARIO_MINIMO` e `FERIADO_NACIONAL`; não tem INSS, IRRF nem FGTS | V |
| `server/src/jobs/LegalParamsRecalcScheduler.ts` | Recálculo disparado por publicação de parâmetro legal | V (arquivo existe) |
| `server/prisma/schema.prisma:3174-3175` | `TaxAssessment`: `status CONFIRMED \| SUPERSEDED` + `supersedesId` | V |
| `server/prisma/schema.prisma:692-722` | `JournalEntry`: `sourceType`/`sourceId` e `@@unique([userId, unitId, sourceType, sourceId])` | V |
| `server/prisma/schema.prisma:502-509` | `AuditEvent`: `prevHash`, `hash`, `@@unique([scopeUserId, unitId, seq])` (T8) | V |
| `server/prisma/schema.prisma:2411-2429` | `AccountingScopeSettings`: contas do contador para tarifa bancária, depreciação e baixa. **Nenhuma de folha** | V |
| `server/src/features/accounting/services/{PayableService,FixedAssetService,DepreciationService}.ts` | Módulo Prisma que lança chama `postEntry` direto | V (grep) |
| `server/src/features/accountingBinding/archetypes/catalog.ts:29-36` | Catálogo fechado de 7 arquétipos; nenhum de folha ou provisão trabalhista | V |
| `server/src/features/accounting/dfe/DfeEmissorPort.ts:64,255` | Porta com `capabilities.kinds`; "o serviço nunca assume uma capacidade que o adaptador não declara" | V |
| `server/src/features/accounting/dfe/selectDfeEmissor.ts:30-62` | Seleção de adaptador por env, pura; ausente ou sem capacidade ⇒ `DfeDisabledEmissor` com motivo nomeado | V |
| `server/src/features/accounting/dfe/AssinadorRemotoPort.ts:31-33` | `assinarHash(digest, algoritmo, tipo, cred)`: só o hash sai; `TipoDfeAssinado` = NFS-e, NF-e, NFC-e | V |
| `server/src/lib/dfeXmlSign.ts:5-15` | Monta e canoniza o `SignedInfo`; a chave privada nunca passa ali; constantes do MOC 7.0 (rsa-sha1) | V |
| `server/src/lib/reinf.ts:2-17` | EFD-Reinf: serializer **puro**, XSD oficial no repo, XML sai sem assinatura, valores em centavos `bigint` | V |
| `server/.dependency-cruiser.cjs:94-101` | Regra F1: lib fiscal pura não toca service, repository, Prisma ou HTTP | V |
| `server/prisma/schema.prisma:2290-2303` | `FiscalDocumentAttempt` (`attemptNo`, `payloadJson`, `resultStatus`, `@@unique([documentId, attemptNo])`) | V |
| `server/src/jobs/DfePollScheduler.ts:2-9` | Poll in-process, lock process-local | V |
| `server/prisma/schema.prisma:3509-3528` | `FiscalCertificate`: chave e certificado cifrados por unidade. O caminho de guarda foi arquivado em 22/10 (nó X10i) | V |
| `server/package.json:99-100,111` | `fast-check`, `jest` (não Vitest), `xmllint-wasm` | V |

### 2.3 Referência externa (código-fonte, lido em 02/11)

Regra do dono de 07/10: dúvida de arquitetura se resolve em projeto consolidado, código acima de marketing.

| Referência | Fato | Fonte | Grau | O que ensina |
|---|---|---|---|---|
| OCA l10n-brazil | Nos branches 10.0, 12.0, 14.0 e 16.0 só há `l10n_br_hr`, `l10n_br_hr_contract` e anexos. O `l10n_br_hr` 16.0 traz CBO, deficiência, empregado, certidão civil. **Não há folha nem eSocial** | `gh api repos/OCA/l10n-brazil/git/trees/<branch>`; `l10n_br_hr/__manifest__.py` e `models/` (16.0) | V | Não existe referência open source consolidada de folha brasileira com eSocial para copiar; o desenho é nosso |
| OCA payroll (sucessor comunitário do `hr_payroll` do Odoo) | Regra salarial = `amount_select` fix/percentage/code; `code` e `condition_python` avaliados com `safe_eval(..., mode="exec")` | [`payroll/models/hr_salary_rule.py` (16.0)](https://github.com/OCA/payroll/blob/16.0/payroll/models/hr_salary_rule.py), l.5, 208-258, 321-323 | V (código) / I (ser sucessor do `hr_payroll`: o README só diz "Modules to manage your Payroll in Odoo") | Rubrica como **dado** avaliado por intérprete restrito é o padrão consolidado |
| Frappe HR (ERPNext Payroll) | Componente salarial com condição e fórmula avaliadas por `_safe_eval(formula, whitelisted_globals, data)`; globais em `COMPONENT_EVAL_GLOBALS` | [`hrms/payroll/doctype/salary_slip/salary_slip.py` (develop)](https://github.com/frappe/hrms/blob/develop/hrms/payroll/doctype/salary_slip/salary_slip.py), l.164, 1471-1478; `hrms/payroll/utils.py` l.57 | V | Idem, com lista branca de funções |
| Frappe HR | `Salary Structure Assignment` com `from_date` e `base` | `salary_structure_assignment.json` (develop), l.86-117 | V | Vigência **por data de efeito** |
| Odoo 19 | Modelo `hr.version` com `date_version` (data de efeito), ordenado por ela; datas do contrato na versão | [`addons/hr/models/hr_version.py` (19.0)](https://github.com/odoo/odoo/blob/19.0/addons/hr/models/hr_version.py), l.35-64, 156 | V | Dado de empregado versionado por data de efeito; o "quando o sistema soube" fica no histórico de alterações, não na versão |

### 2.4 Lei (dossiê `pesquisas-legais/pre-adr-dp-2026-11-02/`)

| Ponto | Norma | Fonte | Grau |
|---|---|---|---|
| Ponto obrigatório "para os estabelecimentos com mais de 20 (vinte) trabalhadores" | CLT art. 74 § 2º (redação Lei 13.874/2019) | [D01] acervo `ctresb/leis`, compilado, cópia de 13/10/2026, sem alerta | V |
| Extinção por acordo | CLT art. 484-A | [D01] | V |
| Prazos e ordem dos eventos do eSocial, S-1299, algoritmo de assinatura, limite por lote | MOS e leiautes do eSocial | **não lidos** | A — premissa da spec |
| Procuração eletrônica do contador; tabelas INSS/IRRF/redutor 2026; consignado CLT; DCTFWeb e FGTS Digital | — | **não lidos** | A — vão para o BRIEF do submódulo que os usa |

---

## 3. Mapa spec → Luminaris

Cada pacote da spec, onde ele vive aqui e qual mecanismo existente ele reaproveita.

| Pacote da spec | Onde vive | Mecanismo existente | Grau |
|---|---|---|---|
| `kernel` | `models/` puros do núcleo do DP: `Competencia` (`AAAA-MM`), vigência como `vigenteDesde`/`vigenteAte` date-only (molde do `LegalParameter`), dinheiro em centavos `bigint` | `AC-2.2-1`; `LegalParameter`; erros tipados do `FEATURE_TEMPLATE.md` §3 no lugar de `Result` | V |
| Registro de módulos (spec §3) | Núcleo sempre ligado, sem ativação. Submódulos opcionais num registro do DP no **formato** do `MODULE_REGISTRY` (chave, categoria, `dependsOn`, `requiresOneOf`, `aiDescription`) + ativação com vigência | `registry.ts`, `moduleSelection.ts`, D-2026-10-31 | V (molde) · F-DP-6 |
| `legal-tables` | `legalParameters`: INSS, IRRF + redutor, FGTS e prazos do eSocial viram `tabela` nova do enum; mudança = linha nova com vigência e fonte | `LegalParameter`, `LegalParamsRecalcScheduler` | V |
| `core` | Feature Prisma first-class: vínculo, versões, lotação, sindicato/CCT, cargo, jornada, rubrica, afastamento, férias; e o sócio com pró-labore (F-DP-11) | Contrato §2.1 l.93/114 | V · F-DP-1, F-DP-2, F-DP-8, F-DP-11 |
| `payroll` | Service + calculadoras puras em `models/`; catálogo fechado de rubricas em código, com natureza e incidências, e os valores da CCT como dado versionado por sindicato (F-PES-8, F-PES-9); testes em Jest + `fast-check` | `package.json:99-100` | V · F-DP-5 (revisto) |
| `esocial` | Serializer puro em `lib/` sob a regra F1, XSD oficial no repo, validação por `xmllint-wasm`; assinatura pela `AssinadorRemotoPort`; porta de transmissão com adaptadores escolhidos como o `selectDfeEmissor`; estado do evento no molde `FiscalDocument` + `FiscalDocumentAttempt`; consulta por poll in-process | `lib/reinf.ts`, `.dependency-cruiser.cjs:94`, `AssinadorRemotoPort.ts`, `selectDfeEmissor.ts`, `DfePollScheduler.ts` | V (moldes) · A (eSocial em RSA-SHA256, transporte SOAP + mTLS) · fork F-DP-3 |
| `gov-guides` | DCTFWeb já está no escopo do fiscal (F-M2, nó X9); FGTS Digital e conciliação S-5001/5002/5003 são do DP | CEDULA 03/09 F-M2 | V (escopo) · A (canais) |
| `closing` | Competência com estados e substituição por linha nova (`SUPERSEDED` + `supersedesId`); trilha no `AuditEvent` encadeado; "assinatura" = aprovação registrada + certificado no XML | `TaxAssessment`, `AuditEvent`, T8 | V |
| `accounting-bridge` | O serviço do DP chama `postEntry` com `sourceType`/`sourceId` idempotentes; contas por papel novas em `AccountingScopeSettings` (folha, encargos, provisões) | AP (F0 → a), C8 (`FixedAssetService`, `DepreciationService`), `JournalEntry` `@@unique` | V · fork F-DP-4 |
| `payments` | Remessa de pagamento de salário | `lib/cnab.ts`, `CollectionProviderPort` (hoje cobrança); F-M3 ratificou remessa CNAB/Pix | V (arquivos) · I (alcance do `cnab.ts` para pagamento) |
| `timekeeping` (opcional*) | Submódulo próprio; o gate legal da CLT art. 74 § 2º conta por **estabelecimento** = unidade | [D01]; R8 | V (lei) · A (portaria de REP-P/AFD/AEJ) |
| `ohs` (SST) | **No núcleo**, em BRIEF próprio da mesma fase (F-PES-3 a; F-DP-13). Não é submódulo opcional | `PRE-ADR-PESSOAL` §6 | V (decisão) · A (S-2240 para todo trabalhador: MOS não lido) |
| `onboarding`, `documents`, `benefits`, `self-service`, `performance`, `special-categories`, `analytics` | Um submódulo opcional cada, com BRIEF próprio quando chegar a vez | — | — |
| `testkit` | Cenários golden conferidos pelo contador = oráculo externo; o aceite dele vira runbook (`RUNBOOK-FORMAT.md`), nunca frase | `ORACLE-DEFICIT.md`, `RUNBOOK-FORMAT.md` | V (molde) |
| Pacotes `packages/dp/*` | Uma feature por submódulo em `server/src/features/dp<Nome>/`, cadeia Route → Controller → Service → Repository → Prisma (+ Policy) | `FEATURE_TEMPLATE.md`; `ADR-MODULE-BOUNDARIES` (Proposed) | V · fork F-DP-10 |

**Fronteira com o motor DynamicTable.** O que a lei desenha (vínculo, rubrica, evento eSocial, resultado, competência)
é Prisma (`AC-2.1-B2`). O que o usuário desenha continua no motor: a tabela `employees` do Core segue sendo a pessoa
operacional da agenda e da comissão (D-2026-10-31). O núcleo do DP nunca é injetado no motor (`AC-2.1-B1`); a
integração sobe ao serviço (`AC-2.1-B4`).

## 4. O que a spec contradiz em decisão fechada — e como se adapta

Nenhuma linha abaixo reabre decisão. Onde reabrir é opção real do dono, a linha aponta o fork.

| Spec | Decisão fechada | Adaptação | Fork? |
|---|---|---|---|
| D5 — Postgres com RLS por tenant | R-postgresql; memória `stay-on-sqlite-no-postgres` | SQLite. Isolamento pelo escopo no repositório (`AccountingScope`: `ownerUserId` + `unitId`), como no resto. O teste "sem contexto = zero linhas" vira o teste de isolamento Tier-0 do `FEATURE_TEMPLATE.md` §7 (outro dono ⇒ 404 ou lista vazia) | não |
| D2 — tenant → várias empresas (CNPJ/CPF/CAEPF) → estabelecimento | R8 (instância = CNPJ raiz, unidade = filial), T2, R-torre-multiempresa | Empregador do eSocial = a raiz da instância; estabelecimento = unidade (`units.cnpj`). Grupo com várias raízes = várias instâncias. Empregador pessoa física (CPF/CAEPF) fica fora | **sim, F-DP-2** — a spec atribui D2 a uma aprovação de "Raphael" |
| D6 — outbox transacional + inbox; §9 "nenhum pacote chama caso de uso de outro" | T11; diferido `M5-inbox-outbox`; R-motor-dominio; T10 | Efeito externo **depois** do commit, com idempotência por `@@unique` e um job de poll/reconcile in-process (molde `DfePollScheduler` e `AccountingSyncScheduler`). O serviço que posta declara o cabeçalho `atomicUntil` (`AC-2.3-2`). A tabela de eventos do §9 vira lista de chamadas explícitas no nível de serviço | não |
| D8 — Decimal com escala fixa; `numeric(18,6)` para quantidades e taxas | `AC-2.2-1`; 78 colunas `*Cents BigInt`; `LegalParameter.valorInt` em bp | Dinheiro em centavos `bigint`. Alíquota em bp. Quantidade em inteiro de escala declarada (horas em minutos, por exemplo). Arredondamento só no ponto que a regra declara. **Premissa:** essa escala basta para INSS progressivo, IRRF com redutor e DSR; o cenário golden prova | não |
| D4 — pacotes hexagonais com `domain/application/ports/adapters/contracts` | `FEATURE_TEMPLATE.md`; `ADR-MODULE-BOUNDARIES` só Proposed | Feature por submódulo com a cadeia de camadas. Lógica pura em `models/`; porta e adaptadores como `accounting/dfe/`. As pastas `domain/ports/adapters` só entram se a M2 for ratificada | não (ver F-DP-10) |
| D7 — eSocial próprio com `A1KmsSigner` (A1 guardado) e agente A3 | D5 (30/10): sem contratação, só BYOK; guarda de certificado arquivada em 22/10 (X10i); assinador local da EMENDA-4. Supera o F-PES-4 (a) de 12/10, que previa a guarda do A1 | Assinatura e mTLS com o certificado do **próprio** empregador (ou do contador procurador) pelo assinador local, atrás da `AssinadorRemotoPort`. Nada de A1 guardado pelo Luminaris | **sim, F-DP-3** (quando e como transmitir) |
| D9 — bitemporal (`valido_de/ate` + `registrado_em/substituida_em`) | R-postgresql ("exclusion constraints → serviço") | **Só data de efeito** (F-DP-8, dono, contra a recomendação). A não sobreposição de versões é checada no serviço, dentro da transação. O cálculo antigo se reproduz pelo snapshot gravado, não pela releitura das versões | **sim, F-DP-8** (decidido) |
| §6 — workers paralelos por vínculo | T11 (processo único) | Cálculo por vínculo continua independente e puro; paralelismo só in-process. A meta de 1.000 vínculos em 60 s é medida, não premissa | não |
| §10 — Vitest; testes de RLS com Postgres real | `package.json`: Jest; SQLite | Jest + `fast-check`; teste de isolamento por escopo | não |
| §11 — "um pacote por PR"; ADR curto em `docs/adr/dp/` | Fluxo da casa: BRIEF com PR-0..n; ADRs em `docs/adr/` | BRIEF por fase; ADR na pasta única | não |
| §11 F1 — "carga das tabelas 2026" | Go-live em 2027 (dono, 30/10) | Tabela de 2026 só como dado de teste golden; produção começa nas de 2027 | não |

## 5. Forks — ✅ DECIDIDOS 2026-11-02

Pela regra do dono de 07/10, fork que a casa ou a referência respondem é decidido por elas, com a fonte citada. O
questionário fica para produto, prioridade e o que contraria decisão explícita. As respostas literais do dono estão em
[`D-2026-11-02-DP-PRE-ADR`](../plano/decisoes/D-2026-11-02-DP-PRE-ADR.md).

| Fork | Como decidiu | Decisão | Contra a recomendação? |
|---|---|---|---|
| F-DP-1 Trabalhador | pela casa (`ADR-PERSISTENCE-BOUNDARY`, `AC-2.1-B2`) | (a) Prisma + `employeeRef` | não |
| F-DP-2 Empregador | dono, questionário | (a) mantém R8 | não |
| F-DP-3 eSocial v1 | dono, questionário | (b) pipeline agnóstico + `Null`/`Manual` primeiro | não |
| F-DP-4 Alfândega contábil | pela casa (precedente AP e C8) | (a) `postEntry` direto | não |
| F-DP-5 Fórmula de rubrica | dono, questionário; **revisto** no 4º questionário | ~~(a) árvore fechada~~ → **F-PES-9 (a): catálogo em código + CCT como dado** | não (a recomendação também mudou, ver o fork) |
| F-DP-6 Núcleo e ativação | dono, resposta própria + confirmação | núcleo sempre ligado em toda instância; opcionais pelo (a) | formulação do dono |
| F-DP-7 Gate de obrigação legal | dono, questionário | (a) pendência bloqueante | não |
| F-DP-8 Vigência | dono, questionário | **(b) só data de efeito** | **sim** |
| F-DP-9 Posição na fila | dono, questionário | (a) BRIEF de F0 + F1 já | não |
| F-DP-10 Fronteira mecanizada | dono, questionário (após explicação) | (a) trava no `check:arch` | não |
| F-DP-11 Pró-labore no núcleo | dono, questionário (fork novo) | (a) sim; coincide com o F-PES-7 (a) | não |
| F-DP-12 Estratégia × F-PES-0 | dono, 4º questionário | (a) o DP abre a fase 2 do F-PES-0 | não |
| F-DP-13 SST × F-PES-3 | dono, 4º questionário | (a) SST no núcleo (F-PES-3 vale) | não |
| F-DP-14 Nó do vault × F-PES-1 | dono, 4º questionário | (a) nó PES-4 | não |

### F-DP-1 — Onde mora o trabalhador

- **(a)** Trabalhador e vínculo são Prisma first-class no DP, com `employeeRef String?` apontando para a linha da tabela
  `employees` do motor (o terceiro tipo de referência do `ADR-PERSISTENCE-BOUNDARY`, com guarda contra órfão declarada
  no schema). A `employees` continua sendo a pessoa da agenda e da comissão.
- **(b)** Tudo na `employees` do motor, com os campos legais acrescentados.
- **(c)** Tudo no Prisma, e a `employees` sai do Core.
- **Recomendação: (a).** O cadastro do S-2200 e o contrato são desenhados pela lei (`AC-2.1-B2`); a pessoa da agenda é
  desenhada pelo usuário (D-2026-10-31 a pôs na base do Core). (b) viola `AC-2.1-B2`; (c) desfaz a decisão de 31/10 e
  quebra os plugins que leem `employees`. **Decidido pela casa**, sem questionário.
- ✅ **Decidido: (a).** O esboço de modelo do `PRE-ADR-PESSOAL` §7 (`Trabalhador`, `FolhaCompetencia`,
  `EsocialEventoRegistro` com `origem`) já era Prisma; o `employeeRef` é o acréscimo deste PRE-ADR.

### F-DP-2 — Quem é o empregador

- **(a)** Mantém R8: a instância é o empregador (a raiz do CNPJ); cada unidade é um estabelecimento. O painel do contador
  mostra a instância; a carteira de clientes do contador (spec §8) fica fora da v1, porque cada cliente é outra instância.
  Empregador pessoa física (doméstico, rural com CAEPF) fica para `special-categories`, com PRE-ADR próprio.
- **(b)** Reabre R8 e R-torre-multiempresa: uma instância com várias raízes e a carteira do contador dentro dela.
- **Recomendação: (a).** R8 e a rejeição da torre valem para contabilidade e fiscal; o DP com outra noção de empresa
  criaria duas tenancies no mesmo produto. A carteira entre instâncias é um produto próprio, não uma tabela.
- ✅ **Ratificado: (a)** — dono, questionário, 02/11: *"Mantém R8"*.

### F-DP-3 — Como o eSocial sai na v1

- **(a)** Transmissão própria desde a v1: XML + assinatura + SOAP com mTLS pelo assinador local, com o certificado do
  empregador ou do contador. Depende do código do assinador local (EMENDA-4 do X10a), que ainda não está em `main`.
- **(b)** O pipeline inteiro (montar, validar no XSD, assinar pela porta) nasce agnóstico de transporte, com adaptadores
  `Null` e `Manual` primeiro; a transmissão pelo assinador local entra quando a EMENDA-4 estiver em `main`.
- **(c)** Transmissor de terceiro por API (BYOK do cliente).
- **Recomendação: (b).** Mesmo molde do DFe (`selectDfeEmissor` com motivo nomeado quando desabilitado). O núcleo de
  cálculo e o fechamento não esperam o assinador. **Premissa não verificada:** o que o adaptador `Manual` entrega ao
  usuário (o eSocial tem módulo web de digitação; não há upload de XML para empresa) precisa ser lido no MOS antes do
  BRIEF da fase.
- ✅ **Ratificado: (b)** — dono, questionário, 02/11: *"Pipeline + Manual"*.

### F-DP-4 — Alfândega contábil

- **(a)** O serviço do DP chama `postEntry` direto, com `sourceType` `dp.*`, `sourceId` estável e contas por papel novas
  no `AccountingScopeSettings`, escolhidas pelo contador.
- **(b)** Arquétipo novo no catálogo fechado + binding pelo kit de setor.
- **Recomendação: (a).** O binding existe para origem no motor DynamicTable; módulo Prisma que lança chama `postEntry`
  direto (AP, F0 → a; C8). Arquétipo novo é código de catálogo sem ganho aqui. **Decidido pela casa**, sem questionário.
- ✅ **Decidido: (a).** Coincide com o F-PES-10 (a) de 12/10 (um lançamento por competência e lote, subrazão por
  trabalhador, tie-out). O detalhe de provisões, centro de custo e comissão está no `PRE-ADR-FOLHA-CONTABILIZACAO`, com
  F-FOL-1..9 pendentes para o BRIEF da ponte.

### F-DP-5 — Fórmula de rubrica

- **(a)** Árvore de expressão fechada (a `Expr` da spec §6), interpretada por função pura no próprio DP. Sem `eval`, sem
  texto livre. Declarada como **cálculo interno da folha**: não gera lançamento, não orquestra módulo, não entra no
  caminho do razão. O lançamento continua pela ponte do F-DP-4.
- **(b)** Rubricas só em código TS, catálogo fixo; CCT e casos do cliente viram PR.
- **(c)** Expressão em texto com sandbox, como OCA payroll e Frappe HR.
- **Recomendação: (a).** As duas referências tratam regra salarial como dado avaliado por intérprete (§2.3); a árvore
  fechada é mais estrita que elas e testável por propriedade. A R-motor-regras rejeitou template que **gera lançamento**;
  aqui a saída é valor de rubrica, e quem lança é código revisado. (b) faria cada CCT virar PR; (c) reabre `eval`.
- ~~Ratificado: (a) — dono, questionário, 02/11: *"Árvore fechada"*.~~ **Superado no mesmo dia.**
- **Revisão (4º questionário, 02/11).** Depois da 1ª rodada apareceu o F-PES-9 (a), ratificado em 12/10: *"Catálogo
  **fechado** de rubricas em código, cada uma com a natureza da Tabela 03 do eSocial e as incidências (CP, IRRF, FGTS),
  calculadas por funções puras"*, com o argumento de que fórmula interpretada é *"irmão do rejeitado R-motor-regras"*.
  Somado ao F-PES-8 (a) (valores da CCT como dado versionado por sindicato), ele cobre a variação por CCT sem intérprete.
  A recomendação desta sessão mudou para manter o F-PES-9; a árvore só volta se uma CCT exigir uma forma de fórmula que o
  catálogo não tem, e aí por incidente, com PR.
- ✅ **Decidido: F-PES-9 (a)** — dono, questionário, 02/11: *"Código + CCT como dado"*. A opção (b) "Só código TS" desta
  lista coincide com ele, acrescida dos parâmetros de CCT.

### F-DP-6 — Núcleo e ativação de submódulo

- **Pergunta como foi feita:** só a ativação dos submódulos, com as três opções abaixo.
- **(a)** Registro do DP no formato do `MODULE_REGISTRY` (chave, categoria, base fixa, `dependsOn`, `requiresOneOf`,
  `aiDescription`), mas próprio do DP, e tabela nova de ativação com vigência por instância
  (`moduleKey`, `vigenteDesde`, `vigenteAte`). O cálculo de uma competência antiga lê o que estava ativo nela.
- **(b)** Reusar `KitInstallation`.
- **(c)** Pôr os módulos do DP no `MODULE_REGISTRY` do motor.
- **Recomendação: (a).** `KitInstallation` é um por unidade e sem vigência por módulo (`schema.prisma:1518`).
  O `MODULE_REGISTRY` é metadado de tabela do motor (`tables` exige ao menos uma); pôr lá módulo Prisma faria o motor
  conhecer o DP. O formato igual deixa o wizard e o futuro manifesto do BUILDER-VERTICAIS lerem os dois do mesmo jeito.
- ✅ **Decidido pelo dono, com formulação própria** (questionário, 02/11): *"Deve ser um módulo grande assim como
  contabilidade, fiscal, vendas etc o mínimo é obrigatório pra qualquer empresa desde a menor possível"*. Confirmação da
  leitura, no mesmo questionário: *"Isso, núcleo sempre ligado"*. Fica assim:
  - o DP é módulo do mesmo nível da contabilidade e do fiscal;
  - o **núcleo** (mínimo legal) existe em **toda instância**; não tem ativação, como a contabilidade não tem;
  - só os **submódulos opcionais** ligam e desligam, pelo (a): registro no formato do `MODULE_REGISTRY`, dentro do DP,
    e ativação com vigência por instância.
  - Consequência: o núcleo tem de servir a menor empresa possível, o que abriu o F-DP-11.

### F-DP-7 — Gate de obrigação legal

- **(a)** Fato que obriga um submódulo cria pendência **bloqueante** no fechamento; nunca liga o módulo sozinho. O limite
  é dado com fonte (`LegalParameter`), avaliado por estabelecimento. Exemplo verificado: mais de 20 trabalhadores no
  estabelecimento exige ponto (CLT art. 74 § 2º, [D01]).
- **(b)** Só alerta, sem bloquear.
- **(c)** Liga o submódulo automaticamente.
- **Recomendação: (a)**, como a spec. (b) deixa fechar competência fora da lei; (c) muda cobrança e dado sem decisão
  humana.
- ✅ **Ratificado: (a)** — dono, questionário, 02/11: *"Pendência bloqueante"*.

### F-DP-8 — Vigência dos dados que afetam cálculo

- **(a)** Bitemporal, como a spec: data de efeito (`vigenteDesde`/`vigenteAte`) + quando o sistema soube (`createdAt` /
  `supersededAt`), só por acréscimo. Correção de dado já registrado = linha nova que substitui a antiga.
- **(b)** Só data de efeito, como Odoo 19 (`hr.version`) e Frappe HR (`from_date`); o histórico fica no `AuditEvent`.
- **Recomendação: (a).** O retroativo e o recálculo reproduzível (spec §6) precisam saber "o que se sabia na data de
  corte". As referências não oferecem recálculo reproduzível. O custo é uma coluna e uma checagem de sobreposição no
  serviço, molde `TaxAssessment` (`SUPERSEDED` + `supersedesId`).
- ✅ **Ratificado: (b), CONTRA a recomendação** — dono, questionário, 02/11: *"Só data de efeito"*. Consequências que o
  BRIEF herda:
  - versão de dado que afeta cálculo tem só `vigenteDesde`/`vigenteAte`; a sobreposição é checada no serviço, na tx;
  - corrigir um dado já registrado é alteração auditada no `AuditEvent`, não versão nova;
  - o que foi calculado e transmitido continua imutável (spec §5): resultado, prova e XML nunca mudam;
  - para reproduzir um cálculo antigo vale o **snapshot gravado** na execução (spec §6 passo 1), não a releitura das
    versões. Por isso o snapshot tem de ser guardado inteiro, não só o hash;
  - o retroativo segue: recalcula com o dado de hoje e a diferença é "novo − resultado gravado".

### F-DP-9 — Posição na fila

- **(a)** Depois do PRE-ADR ratificado, a sessão 2 cria o nó e o BRIEF das fases F0 (fundação) e F1 (cadastros e tabelas
  legais). O código espera `executa`. O pedido ao contador (quem confere tabela e cenário golden, spec §12) entra no
  próximo pacote do contador, triado.
- **(b)** O DP espera H2 e M2.
- **(c)** O DP passa na frente da fila ratificada.
- **Recomendação: (a).** F0 e F1 não dependem de gate humano para virar código; o oráculo só morde no F2 em diante.
  A fila ratificada (`FILA-ORDEM.md`) não muda.
- ✅ **Ratificado: (a)** — dono, questionário, 02/11: *"BRIEF F0+F1 já"*.

### F-DP-10 — Fronteira mecanizada

- **(a)** Uma regra nova no `check:arch` (emenda datada ao `ADR-ARCH-BOUNDARIES`): feature do núcleo do DP não importa
  feature de submódulo opcional do DP. Entra no primeiro PR de código, com prova de que morde.
- **(b)** Só convenção, sem regra.
- **Recomendação: (a).** É a regra 3 da spec §4, no gate que já existe e que a exceção de 13/10 cobre. Não é bancada
  nova.
- ✅ **Ratificado: (a)** — dono, questionário, 02/11. Na primeira rodada a resposta foi *"Não entendi essa regra"*; a
  pergunta foi refeita em palavras simples ("o código do núcleo não pode chamar o código de um submódulo opcional; se
  chamar, o CI fica vermelho") e a resposta foi *"Cria a trava"*.

### F-DP-11 — Pró-labore do sócio no núcleo (fork novo, aberto pelo F-DP-6)

- **Contexto:** a menor empresa possível pode não ter empregado CLT, só sócio com pró-labore. A spec põe no núcleo só o
  empregador CLT. **Premissa não verificada:** o pró-labore também vai ao eSocial e à DCTFWeb (manual do eSocial).
- **(a)** O núcleo calcula e informa o pró-labore do sócio.
- **(b)** Só CLT no núcleo; pró-labore num submódulo depois.
- **Recomendação: (a)**, porque o F-DP-6 fixou o núcleo para "qualquer empresa desde a menor possível".
- ✅ **Ratificado: (a)** — dono, questionário, 02/11: *"Sim, no núcleo"*. O BRIEF confere a regra no manual do eSocial
  e na lei de custeio antes de codificar; até lá, é premissa (§6). Coincide com o F-PES-7 (a) de 12/10 (pró-labore como
  contribuinte individual no domínio de pessoal).

### F-DP-12 — Estratégia: o DP diante do F-PES-0 (c) de 12/10

- **Contexto:** F-PES-0 (c) ratificado: fase 1 importa a folha do software do contador; fase 2 é motor próprio, aberta
  por gatilho, inclusive "uma decisão do dono". As tabelas da fase 1 nasceriam com `origem ∈ {IMPORTADA_ESOCIAL,
  DIGITADA, MOTOR}`.
- **(a)** O DP é a decisão do dono que abre a fase 2. As tabelas nascem com a `origem` do F-PES-0; a importação (PES-1)
  fica no plano como caminho de migração, sem prioridade.
- **(b)** Só motor: a importação sai do plano.
- **(c)** Importação primeiro, como em 12/10; o DP espera.
- **Recomendação: (a).** Mantém o desenho ratificado e destrava o DP. A importação continua útil para o cliente que
  chega com folha em outro software.
- ✅ **Ratificado: (a)** — dono, questionário, 02/11: *"DP abre a fase 2"*.

### F-DP-13 — SST: núcleo ou opcional

- **Contexto:** F-PES-3 (a), ratificado em 12/10: *"SST como BRIEF obrigatório da mesma fase, não opcional"*. A spec põe
  SST como submódulo opcional exigido por fato.
- **(a)** Vale o F-PES-3: SST no núcleo, em BRIEF próprio da mesma fase.
- **(b)** Vale a spec: opcional, com o gate do F-DP-7.
- **Recomendação: (a).** Mantém o ratificado e combina com o núcleo que serve qualquer empresa (F-DP-6). **Premissa não
  verificada:** o S-2240 é devido para todo trabalhador, mesmo sem exposição (MOS não lido nesta sessão).
- ✅ **Ratificado: (a)** — dono, questionário, 02/11: *"SST no núcleo"*. O gate do F-DP-7 não se aplica a SST, que é
  núcleo; continua para o ponto (CLT art. 74 § 2º) e para os outros opcionais.

### F-DP-14 — Nó do vault

- **Contexto:** F-PES-1 (a), ratificado em 12/10: PES-1 importação, PES-2 retenções (materializado em `RETENCOES-FONTE`
  e `EFD-REINF`), PES-3 parceria do salão, PES-4 motor + eSocial.
- **(a)** O núcleo do DP é o PES-4; submódulos viram nós `PES-4-<nome>` quando chegar a vez; PES-1 e PES-3 ficam como
  estão.
- **(b)** Nó novo `DP` que absorve PES-1, PES-3 e PES-4.
- **Recomendação: (a).** Mantém os ids ratificados.
- ✅ **Ratificado: (a)** — dono, questionário, 02/11: *"Usa o PES-4"*.

## 6. Pendente de validação externa

- **Contador:** quem confere tabelas e cenários golden, e como assina o aceite (spec §12). Liga com o risco da F-Z0
  (premissa "o contador só assina", aberta como Z0-a) e com o nó [`GOV-CONTADOR`](../plano/nos/GOV-CONTADOR.md)
  (contador parceiro contratado pelo cliente).
- **Pró-labore do sócio** (F-DP-11): como entra no eSocial e na DCTFWeb e qual a contribuição; manual do eSocial e lei
  de custeio, não lidos.
- **MOS e leiautes do eSocial:** prazos, ordem de envio, S-1299, limite de eventos por lote, algoritmo de assinatura,
  existência de canal de envio para o adaptador `Manual`.
- **Procuração eletrônica** do contador no eSocial.
- **Tabelas legais** de INSS, IRRF com redutor e FGTS para 2027; consignado CLT; pensão.
- **DCTFWeb e FGTS Digital:** canal automatizado ou fluxo assistido (spec §12).
- **Assinador local:** o risco da EMENDA-4 (token A3 assinando e abrindo mTLS no Windows) vale também para o eSocial,
  com o algoritmo do eSocial em vez do rsa-sha1 da NF-e. Só o runbook A3 prova.

## 7. Insumos ausentes

- As três figuras da spec (fluxo da competência, árvore de exceção, fluxograma) não vieram no texto colado.
- O "documento de mapa funcional" citado na spec §12 não foi recebido.
- Leiaute vigente do eSocial e o MOS não estão no repositório.

## 8. Achados fora de escopo

- **Atendimento pelo WhatsApp (Lumine)** consultando holerite (spec §9): integração com o chat, fora do DP.
- **Precificação por submódulo** (spec §3 regra 6 e §12): a cobrança derivada da ativação é decisão comercial própria.
- **`uiRoutes` no builder de telas** (spec §3 e §9): pertence ao nó
  [`BUILDER-VERTICAIS`](../plano/nos/BUILDER-VERTICAIS.md), cujo PRE-ADR segue Proposed.
- **Pastas `domain/ports/adapters`**: dependem da regra M2 do `ADR-MODULE-BOUNDARIES`, ainda Proposed.
- **Cabeçalho desatualizado:** o `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF` ainda diz "Proposed — RATIFICAÇÃO PENDENTE" e
  "todos RATIFICAÇÃO PENDENTE" no §6, embora o lote F-PES-0..13 tenha sido ratificado em 12/10. Esta sessão não edita
  documento de outro item (regra 1 da `sessao-planejamento`); a correção é um fold à parte.

## 9. Riscos e vieses (T8)

- **Oráculo.** Folha errada é passivo trabalhista. Nenhum teste escrito pelo agente substitui o cenário golden conferido
  pelo contador, e o produto já tem 4 de 4 gates do Bloco A abertos há mais de 14 dias. O DP soma um quinto tipo de
  oráculo (contador de DP + eSocial em produção restrita com certificado real).
- **Ancoragem na spec.** A spec chega com "decisões fixadas". Tentei o caso adversarial: e se a casa estiver errada e a
  spec certa? Em cada linha do §4 a decisão da casa tem nota no vault com autorização do dono, e a spec não traz
  evidência nova contra nenhuma delas. Por isso o §4 adapta em vez de reabrir. A exceção é D2: a spec diz que veio de uma
  aprovação explícita; por isso virou fork.
- **Ancoragem na casa.** O risco inverso é forçar molde de NF-e num domínio diferente. Onde o molde não serve, o fork
  diz (F-DP-6: `KitInstallation` não serve; F-DP-8: a referência diverge da spec).
- **Sem referência open source de folha BR.** O OCA não tem; o desenho do eSocial é nosso e se valida só no ambiente
  do governo.
- **Achado tardio (erro desta sessão, registrado).** O `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF` e o
  `PRE-ADR-FOLHA-CONTABILIZACAO` só apareceram na checagem de sessão paralela, antes do commit. O grep inicial
  (`grep -rli folha docs | head -30`) cortou a lista em ordem alfabética antes deles. Os três primeiros questionários
  foram respondidos sem esse contexto. O 4º questionário refez as quatro decisões que colidiam (F-DP-5, F-DP-12..14);
  as outras foram conferidas uma a uma contra os F-PES e não colidem (F-DP-1 × §7, F-DP-4 × F-PES-10, F-DP-11 × F-PES-7,
  F-DP-3 × F-PES-4 já superado pela D5).

## 10. O que a sessão 2 (nó + BRIEF) recebe

Entrada, toda no repositório (a sessão 2 é fresh):

- este PRE-ADR, **Accepted**, com os catorze forks decididos;
- o [`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF`](../accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) (F-PES-0..13 ratificados
  em 12/10; o DP é a fase 2 dele) e o [`PRE-ADR-FOLHA-CONTABILIZACAO`](PRE-ADR-FOLHA-CONTABILIZACAO.md) (F-FOL-1..9
  pendentes);
- a spec em [`docs/dp/SPEC-DP-2026-10-31-katz.md`](../dp/SPEC-DP-2026-10-31-katz.md), lida **através** do §4 (o que se
  adapta) e do §5 (o que foi decidido);
- o dossiê legal `pesquisas-legais/pre-adr-dp-2026-11-02/` (CLT art. 74 § 2º e art. 484-A);
- a nota [`D-2026-11-02-DP-PRE-ADR`](../plano/decisoes/D-2026-11-02-DP-PRE-ADR.md) com as cédulas e as falas do dono;
- o diferido [`M5-subrazoes-restantes`](../plano/diferidos/M5-subrazoes-restantes.md), que este PR liga ao DP.

O que ela faz: cria o nó **`PES-4`** em `docs/plano/nos/` (F-DP-14), com `depende_de` que o F-PES-1 §10 já propôs e
`autorizacao` citando a fala do dono que iniciar a sessão 2, e escreve o BRIEF de **F0 (fundação) e F1 (cadastros e
tabelas legais)** pelo F-DP-9. O BRIEF inclui: o pró-labore (F-DP-11), a ativação dos opcionais (F-DP-6), a vigência
só por data de efeito com snapshot guardado inteiro (F-DP-8), a `origem` do F-PES-0 nas tabelas (F-DP-12), o catálogo
de rubricas em código com CCT como dado (F-DP-5 revisto, F-PES-8/9) e a regra do `check:arch` (F-DP-10). SST entra em
BRIEF próprio da fase do motor (F-DP-13). Os moldes do §3 são insumo; o §6 vira a seção "pendente de validação externa"
do BRIEF.
