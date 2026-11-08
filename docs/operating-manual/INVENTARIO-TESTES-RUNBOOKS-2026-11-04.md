# Inventário de testes e runbooks — 04/11/2026

> Pedido do dono (chat, 04/11): *"distinguir … o que tem todos os testes corretos e o que ainda não tem … se a gente for
> deixando dívidas para trás, vai ficar completamente impraticável"*. Leitura de `origin/main` em `b2084b6dd`. Nada foi
> executado (sem jest/vitest/build). A coleta bruta foi feita por 3 leitores Haiku de esforço médio. A classificação é da
> sessão principal (regra do dono, mesmo dia). Documento irmão, com o **método** de cada etapa de teste:
> `docs/operating-manual/PESQUISA-TESTES-2026-11-04.md` (sessão "Playwright: screenshot, CLI e DevTools"). Este aqui é
> o **inventário**: o que existe e o que falta.
>
> **Graus.** *verificado* = li o teste ou o código. *inferido* = pelo nome do arquivo, por casamento de termo ou pela
> coleta, sem abrir. Nenhuma linha "inferido" deve ser usada como prova de cobertura.

## 1. O achado em uma frase

Os runbooks estavam fazendo o papel de teste de integração e de tela, que o repo não tem para o caminho feliz. Pior: as
pré-condições de dado não têm dono, então cada execução começa cadastrando à mão ("desvio de dado" nos 6 runbooks irmãos
do H2 executados em 04/11). Só uma parte pequena de cada runbook precisa de fato de humano.

Três fatos medidos sustentam isso:
- **Não há teste de tela ponta a ponta no repo** (nenhum Playwright/Cypress; o runner Puppeteer foi versionado só agora,
  no PR #1064, pela sessão irmã). Verificado por `git ls-tree`.
- **Os seeds não montam cenário.** `server/prisma/seed.ts` cria só o admin. `seedAccountingFixtureCli.ts` cria usuário,
  períodos, lançamentos, AP/AR e fechamento, mas o perfil fiscal sai só com regime (`:414`), sem CNPJ, CPF de cliente, NBS
  ou tributos. Verificado.
- **"Existe teste" não é "o teste cobre o caso".** O IMO-1 (400 em vez de 409) escapou de um teste que existe e passa:
  `fixedAssetController.integration.test.ts:127` manda `version: 999` num bem **ainda pendente**, e o caso real (bem já
  ativado por outra aba + `version` velho) nunca roda. Verificado.

## 2. Três tipos de passo (a régua)

| Tipo | O que é | Destino |
|---|---|---|
| **EXT / DEC** | oráculo externo (portal da prefeitura, SEFAZ, PVA, RFB, contador real, LLM real), credencial do dono (certificado, PSC) ou decisão de negócio/fiscal | fica no runbook; a saída vira fixture |
| **OPS** | procedimento sobre dado real ou ambiente real (backup, rekey do dev.db, deploy) | fica como procedimento operacional; não é teste |
| **AUTO** | o que a máquina consegue provar com seed de cenário + teste de integração (banco real) ou teste de tela | sai do runbook e vira teste: *coberto* (há teste que assere o caso) ou *falta* |

A pré-condição de dado fictício (unidade, cliente, pacote, perfil fiscal, contas) é **SEED**: um seed de cenário por
runbook, em banco descartável, a põe de pé.

## 3. Runbooks, um por um

Classificação **inferida** a partir da coleta passo a passo (salvo onde marcado verificado). "Sobra pro dono" é o que
resta depois de seed + testes.

| Runbook | Desfecho registrado | EXT/DEC | OPS | AUTO | Seed necessário | Sobra pro dono |
|---|---|---|---|---|---|---|
| H2-ATIVACAO-CONTABIL | PASSOU 04/11 (com desvio: unidade e perfil criados) | — | — | 1–5 | unidade sem binding + perfil fiscal | **nada** — 4 e 5 já cobertos (verificado: `activateDefault.reload…:87`, `activateDefault…:135`); 1–3 cabem em teste de tela |
| H2-DFE-MANUAL | BLOQUEADO 04/11 (P4/P5/P6 cadastro, P7 portal) | P7, 2–9 (portal, PV-1..10, e-mail, produção), 10 (MEI real) | — | 1, ficha, registrar retorno/rejeição/cancelamento com XML-fixture, P8, P9 | unidade c/ CNPJ fictício, cliente c/ CPF de teste, serviço c/ cTribNac+NBS, perfil completo | 1 emissão em homologação + 1 rejeição + 1 cancelamento + PV-1..10 (~60 min, uma vez) |
| H2-IMOBILIZADO | FALHOU 04/11 no 5 (IMO-1) | 9 (NF-e de compra real) | — | 1–8 | contas 1.2.x/3.7/4.7/4.8 + período aberto | só o 9, quando houver NF-e real |
| H2-PACOTE-VALIDADE | BLOQUEADO 04/11 (impressão/assinatura em papel) | P7 + fim do 6 (imprimir, colher assinatura) | — | 1–11 | 2 pacotes (30 dias e sem validade), cliente com saldo vencido | imprimir 1 comprovante e conferir no papel (~10 min) |
| H2-VENDA-PACOTE | FALHOU 04/11 no 5 (VP-1, corrigido no #1052) | — | — | 1–9 | catálogo com pacote ativo/inativo, cliente, unidade | **nada** |
| H2-WIZARD-ENTREVISTA | PASSOU 04/11 (principal e W6) | P3 (chave OpenAI real): 1 rodada de fumaça | — | 1–6, W6-1..9 com LLM falso | usuário sem tabelas | 1 conversa real de fumaça (~10 min) |
| H2-BROWSER-SIGNOFF | 14 desfechos (#982): FALHOU no 14 (Y600), no 19 b) e no 21 d); BLOQUEADO no 16 e), 17 e 18 | PRE-P0 (dado real), passos com contador real (opcional) | PRE-P0 | 1–23 quase todo | salão com vendas de serviço/produto/pacote/devolução, 3 meios de pagamento, contador cadastrado | só PRE-P0 (backup/migração no dado real) |
| W3-ESCOLHA-CRIACAO | não executado | P3 (OpenAI real): fumaça | — | 1–8 com LLM falso | 2 usuários sem tabelas | fumaça com LLM real |
| W7-HIGIENE-WIZARD | não executado | P2 (OpenAI real): fumaça | — | 1–9 (o 2 exige derrubar o server: teste de tela com API fora) | 2 usuários sem tabelas | fumaça com LLM real |
| KANBAN-REORDER | FALHOU 4× (24–28/10) | — | — | 1–10 (arrasto e offline exigem teste de tela) | tabela Kanban com 6+ cards | **nada** |
| LAC-B-KIT-DE-SETOR | PASSOU 26/10 (reexecução) | — | — | 1–9 (vários por `UPDATE` direto no banco = fixture) | unidade com kit instalado; pendências no formato real | **nada** |
| H1-PVA | passos 1–5 PASSOU (agente, 29/10); 6 pausado | P4/P6 (PVA, dados do contador), 4, 6, 2P-1..4 (PVA) | P2/P2b (dado real) | 1, 2, 3, 5 (gerar ECD/ECF e fechar) | seed multi-exercício (já existe) | importar no PVA e ler as críticas (ECD e ECF) |
| H3-P2-CLINICA | não executado | P7, 6 (PVA) | P5 | 1–5, 7 | tenant clínica (`scripts/seed-clinic-tenant.mjs` existe) | importar a ECD no PVA |
| ECD-SUBSTITUTA | não executado | P1–P6 (transmissão RFB, prazo, ITG 2000, termo assinado), 2 (PVA) | — | 1, 3–6 (`spedController.ecdSubstitutaPerfil.integration.test.ts` é candidato, inferido) | job EXPORTED de ECD | decidir o motivo, assinar o termo, PVA |
| X2-RFB-REFERENCIAL | PASSOU (dono) | P1/P4 (arquivo oficial do portal SPED) | — | 1–4 | — | baixar o arquivo oficial quando a RFB publicar versão nova |
| D5-PRODUCAO-RESTRITA | não executado (bloqueado de antemão) | P2–P7, 1–7 (PSC, SEFAZ, titular) | — | — (adaptador já tem testes com falsos) | — | tudo: é homologação real |
| B4-RESTORE-REHEARSAL | PASSOU (dono) | — | 1–4 | backup/integrity podem ter teste do script | — | ensaio periódico de restauração (procedimento) |
| I1B-UNIT-REKEY | rascunho de execução 04/10; oficial em branco | 3 (--name/--type: DEC) | 1–8 | 9 coberto (verificado: `rekeyLegacyUnitCli.integration.test.ts:272`, `NOTHING_TO_DO` em `:330–333`); 10 falta (boot relendo o binding re-chaveado, inferido) | — | escolher nomes e aplicar no dado real |
| M2-DEPLOY-SMOKE | não executado | P1–P5, 3–7, R0–R5 (VPS, cofre, Redis no host) | todos | R4/R5 cabem em teste com Redis de container | — | tudo: é implantação |
| DEV-DRIVE | — | máquina do dono | — | — | — | fora do escopo de produto |

**Leitura.** São 19 runbooks de produto: a tabela lista 20, mas o DEV-DRIVE é da máquina do dono e fica fora (também ficam fora o `RUNBOOK-FORMAT` e o rascunho do I1B).
- **4 podem ser aposentados** depois de seed + testes (ATIVACAO, VENDA-PACOTE, KANBAN, LAC-B).
- **9 encolhem** para minutos de oráculo externo (DFE, IMOBILIZADO, PACOTE-VALIDADE, WIZARD, W3, W7, BROWSER-SIGNOFF,
  H1, H3).
- **6 são de fato humanos ou operacionais** (D5, M2, B4, I1B, ECD-SUBSTITUTA, X2) e ficam.

## 4. Dívida de teste concreta (o que escrever)

Ordenado por risco. Cada item é "instrumentação → correção" quando há bug, ou só teste quando o código está certo.

1. **Seed de cenário por runbook**, em banco descartável e idempotente. Destrava sozinho as pré-condições de 14 dos 19
   runbooks (coluna "Seed necessário"; 2 desses seeds já existem: o multi-exercício do H1 e o `scripts/seed-clinic-tenant.mjs` do H3). O seed é dado de teste, não aparato de auditoria.
2. **IMO-1**: teste de serviço que ativa o bem (`version` 1→2) e reativa com `version: 1`, esperando `ConflictError`;
   idem para `disposeAsset`. Hoje reprova. Verificado.
3. **DFE, caminho feliz pela pilha real**: preview com 1 documento e tie-out com o razão; "Confirmar" → ficha (P8);
   reenvio de REJECTED (P9); uma falta por vez (CNPJ, taxId, cNBS, perfil) com mensagem **com nome** (DFE-1:
   `FiscalDocumentEmissionService.ts:816/:839/:879`). Inferido: só o texto do taxId aparece hoje em teste
   (`FiscalDocumentEmissionService.test.ts:526`, com dublês).
4. **I1B passo 10**: boot depois do rekey relê o binding sob o `unitId` novo e `GET /accounts` → 200. Inferido: nenhum
   teste encontrado.
5. **Teste de tela automatizado** sobre o seed, para os passos de tela dos runbooks AUTO: arrasto/offline do Kanban,
   "Seu sistema já foi criado"/"Tentar novamente" do W7, textos da VENDA-PACOTE ("Pacote precisa de cliente cadastrado",
   "Uma venda leva um único pacote": nenhum teste casa com esses termos, inferido), modal e ficha do DFE. Depende do
   runner do #1064.
6. **LLM falso determinístico** para WIZARD/W3/W7: os passos de conversa viram teste, e a chave real fica numa fumaça só.
7. **Repositórios contábeis**: 41 dos 109 testes de serviço usam repositório falso (inferido, por grep `Repository` +
   `jest.fn`). Uma varredura nomeia 22 repositórios que nenhum teste de integração cita: `FixedAsset*`,
   `DepreciationRate`, `Simples*` (3), `TaxWithholding`, `WithholdingProfile`, `Reinf`, `MitExport`, `NfceCsc`,
   `ReceitaFiscal*`, `ReferentialAccount`, `CompanySigner`… **É só pista**: teste HTTP passa pelo repositório real sem
   citá-lo (o `fixedAssetController.integration.test.ts` exercita o `FixedAssetRepository`). O critério certo é "rota ou
   serviço com teste de integração", a medir por rota.

## 5. Áreas do produto

Contagem verificada (`git ls-tree`). Julgamento **inferido**, salvo onde marcado.

| Área | integ. | unit | front | Leitura |
|---|---|---|---|---|
| Contabilidade (server) | 59 + boa parte dos 100 de `controllers/__tests__` | 223 | 77 + 17 (my-app) | a área mais coberta, mas 41/109 testes de serviço com repositório falso e o fiscal sem caminho feliz pela pilha (item 3) |
| DynamicTables / vendas (plugins) | 16 (inclui `SalesPlugin.*` ×4) | 35 | — | vendas e pacotes são cobertos por aqui, não pelas pastas `sales` e `packages`, que têm 0 integração própria |
| Pacotes / validade | `packageAcceptance` + `pacoteValidade.e2e` + `pacoteValidade.dataIso` | 5 | sim | contrato de API forte (verificado: `packageAcceptance.integration.test.ts:87–165`); tela sem teste automatizado |
| Binding / ativação | 7 | 21 | sim | bom (verificado nos passos 4–5 da ATIVACAO) |
| Kits de setor | 9 | 16 | sim | bom pela contagem; a LAC-B passou |
| Imobilizado | `fixedAssetController` + `depreciationRateController` | — | sim | caminho feliz coberto; concorrência com dado fraco (IMO-1, verificado) |
| CRM | 1 (`crmReports`) | 7 | 12 | **fraco**: pipeline, conversão e no-show sem integração (inferido) |
| Onboarding / entrevista | 2 (interview) + 8 (`dashboardCreate*`) | 14 | 20 | razoável; LLM real nos runbooks em vez de falso |
| Chat / IA | 1 | 5 | — | fraco (inferido) |
| Users / auth | 4 + `auth.endpoints` | 1 | — | a troca de senha falhou no runbook (21 d), sem teste que a pegasse (inferido) |
| **DP / folha** | 5 (um por serviço F0/F1 + `parametrosFolha`) + 5 em `controllers` (`dp*`) | 15 | **0** | ver §6 |

## 6. DP (departamento pessoal) — como retomar

O que existe na main é F0 + F1 (#1041, 04/11): fundação, cadastros, vínculos, afastamentos/férias, ativação do módulo e
catálogo de rubricas (`server/src/features/dp`, 32 arquivos de fonte). Os 4 serviços com repositório
(`DpCadastro`, `DpVinculo`, `DpAfastamentoFerias`, `DpModule`) têm teste de integração próprio, e há mais 5 de rota.
O `DpRubricaService` tem só unit. **Não há tela** (nenhum arquivo do my-app com dp/folha/payroll) e **não há cálculo
de folha** (F2–F6 pendentes; nó `PES-4`, estado `planned`). Leitura (inferida pelos nomes): o que existe está coberto
como o resto; o risco está no que vem. Proposta para o BRIEF do F2:
- exigir desde o início o **seed de cenário** (empresa, empregados, vínculos, uma competência);
- exigir o **caminho feliz pela pilha real** e **uma falta por vez**;
- deixar como EXT só a conferência do contador e o eSocial real.

## 7. Ordem de ataque proposta (nada ratificado)

1. **Piloto no DFE-MANUAL**: seed de cenário DFE + itens 3 e 5 da §4 + runbook reescrito só com o que é EXT.
2. **IMO-1** (instrumentação → correção), que já tem sessão de correção autorizada no H2.
3. **Seeds de cenário** dos runbooks AUTO restantes e **aposentadoria** dos 4 runbooks que zeram.
4. **Emenda ao `RUNBOOK-FORMAT`**: coluna "quem põe de pé" (seed X / dono) e a régua EXT/OPS/AUTO. A decisão é do dono.
5. **CRM e users/auth**: caminho feliz pela pilha + erros nomeados.
6. **BRIEF do F2 do DP** já no formato do §6.

Decisões do dono:
- seed em banco descartável (recomendado) ou no dev.db real;
- a emenda do `RUNBOOK-FORMAT`;
- o LLM falso para o wizard;
- quando haverá acesso de homologação ao Emissor Nacional.

## Fontes

- Coleta bruta (scratchpad da sessão, não versionado): `col-runbooks-A.md`, `col-runbooks-B.md` e `col-testes-areas.md`.
- Execução do DFE-MANUAL 04/11: `docs/accounting/RUNBOOK-H2-DFE-MANUAL.md` (branch `claude/c7-runbooks-irmaos-4759d6`,
  `72315294`); achados das irmãs no corpo de NightMarketz/luminaristest#1035.
- Reconferência das 4 repetições (ATIVACAO 4–5, IMOBILIZADO 3/5/6/8, I1B 9–10, aceite do PACOTE-VALIDADE): §3 e §4
  deste documento, com o resultado enviado à sessão irmã.
