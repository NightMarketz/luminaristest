---
id: "D-2026-10-28-LACUNAS-EXECUTA-27-28"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas dos executa de 27–28/10 (#928–#933): 3 forks respondidos por questionário (JCP de sócio removido, C6b com vários períodos do mesmo kind, forma de ReinfRelatorio.avisos) e triagem das pendências externas e achados fora de escopo"
estado: "decided"
autorizacao: "dono, chat, 2026-10-28: lista \"Lacunas abertas dos executa de 27–28/10\" — \"Escolha de spec → AskUserQuestion ao dono … a resposta vira cédula em docs/plano/decisoes/. Nada se auto-ratifica, nada mergeia.\" Respostas por AskUserQuestion no mesmo turno"
atualizado: "2026-10-28"
---
# D-2026-10-28-LACUNAS-EXECUTA-27-28

**Estado:** `decided` (itens 1–3). Os demais itens são triagem: nenhum vira trabalho sem `executa` próprio.

**Autorização:** dono, chat, 2026-10-28. A lista colada dos executa de 27–28/10 trazia os PRs
[#928](https://github.com/NightMarketz/luminaristest/pull/928), [#929](https://github.com/NightMarketz/luminaristest/pull/929),
[#930](https://github.com/NightMarketz/luminaristest/pull/930), [#931](https://github.com/NightMarketz/luminaristest/pull/931) e
[#933](https://github.com/NightMarketz/luminaristest/pull/933). Todos estavam abertos e sem merge (`gh pr list`, 28/10). Esta
cédula **não** autoriza código: cada emenda abaixo espera o `executa` do dono no nó dela.

## A. Forks respondidos (AskUserQuestion, recomendada como 1ª opção)

| # | Lacuna | Evidência lida antes de perguntar | Resposta literal | Efeito |
|---|---|---|---|---|
| 1 | JCP de sócio removido: a Reinf dá 400 `REINF_SOCIO_REMOVIDO` (#929, herdado no #933) | `PartnerRepository.findById` filtra `deletedAt: null`. `PartnerService.remove` faz o soft-delete sem olhar se há distribuição. O sócio que saiu tem `saidaEm` (branch `claude/efd-reinf-pr-3`) | "Bloquear remoção (Recomendado)" | Emenda no [[IRRF-DISTRIBUICAO]]: `PartnerService.remove` responde **409** quando o sócio tem JCP/dividendo, com a checagem **dentro da tx** do soft-delete (gate autoritativo na tx). A saída da sociedade é registrada em `saidaEm`, e o soft-delete fica só para o cadastro errado, que não tem fato. A porta `IPartnerRepository` **não** muda. O 400 `REINF_SOCIO_REMOVIDO` do [[EFD-REINF]] continua, para dado legado. O código do erro 409 sai na sessão de feature |
| 2 | O pacote do contador recusa 2 extras do mesmo kind (`DUPLICATE_KIND`), e o pacote anual leva só 1 mês de `EXPORT_REINF` (#933) | `AccountingDeliveryService` faz `seenKinds.has(job.kind)` → 400 `DUPLICATE_KIND`. Todo extra já exige `periodStart`/`periodEnd` | "Chave kind+período (Recomendado)" | Emenda no [[C6b]]: a unicidade do extra passa a ser **kind + período**. O mesmo kind entra várias vezes se os períodos **não se cruzam**; período sobreposto do mesmo kind continua 400 `DUPLICATE_KIND`. Vale para todo kind, não só o REINF |
| 3 | `ReinfRelatorio.avisos` mudou de `string[]` para `{ codigo, quantidade, detalhe }[]`. Só constava como decorrência (#933, item 23 do BRIEF #848) | `ReinfDto.ts`. Os outros `avisos` (NF-e, IBS/CBS, JCP, MIT) continuam `string[]` | "Confirmo o objeto (Recomendado)" | A forma do #933 fica ratificada. Os outros DTOs não mudam até que um deles precise de i18n |

## B. Pendências externas (não são fork)

| # | Item | Encaminhamento |
|---|---|---|
| 6 | A versão online do MOC (PR) só sai em **01/11/2026**. Nela se conferem as linhas `[MOC-DANFE-…]` do PR-2 e do PR-3 do [[NFE-DANFE-IBSCBS]] | Espera a data. Em 01/11 ou depois, conferir cada linha citada contra a versão online. Divergência vira lacuna do nó; sem divergência, registrar a conferência no relatório do PR-3 (#928) |
| 7 | O acervo `ctresb/leis` não tem os convênios CONFAZ de 2018 nem a legislação paulista. A `ICMS_ST_NCM_UF` (só SP, DRAFT até 31/03/2026) veio de fonte oficial (#930) | Já resolvido pelo método: o dossiê está em `pesquisas-legais/eficiencia-fiscal-pr2-icms-st-ncm/relatorio.md`. Nada a decidir. A tabela segue DRAFT e a publicação continua gate humano |

## C. Achados fora de escopo: triagem

Cada linha é **candidata** a nó ou lacuna própria. Nenhuma entra na fila sem `executa`.

| # | Achado | Grau | Destino proposto |
|---|---|---|---|
| 8 | O `openapi.json` da main diverge do código em `/api/dashboard-layout/{id}`, `/api/dashboard/create`, `/api/dashboard/ai/ChatInterview`, `/api/dashboard/ai/InterviewModules` e `/api/reports/generate-chart-data` (#928, #933) | relatado pelas sessões, não reconferido aqui | Lacuna de plataforma: regenerar com `docs:generate` num PR só de docs, sem misturar com PR de domínio (o artefato estático commitado é o que vale) |
| 9 | `NATUREZA_RENDIMENTO` 12001 com `tiposIsencao: []`, mas a NT 02/2026 criou o tipo 12. O código do REINF já usa o 12 (#929) | **verificado**: `natrend-12001-2026-01-01` em `server/prisma/data/legal_parameters_retencoes_v1.sql:17` e na migração `20261024120000_add_withholding_profiles_retencoes` tem `"tiposIsencao":[]` | Lacuna do [[RETENCOES-FONTE]]: nova linha supersedendo a vigente (`supersedesId`), com a NT 02/2026 como fonte (método legal: ler a NT, citar). Nunca editar a migração aplicada |
| 10 | O job de export fica `PROCESSING` órfão quando a tx do lote falha depois de gravar o arquivo. O mesmo risco existe no `DataExchangeExportService.export` (#933) | relatado | Lacuna de classe: instrumentação primeiro (teste-guarda que falha nos **dois** write-paths), depois a correção |
| 11 | A ponte de CMV registra "Estoque insuficiente" ao vender produto sem `InventoryItem` (#930) | relatado, comportamento existente | Vai para o reconcile, como o achado pediu. Não é lacuna de spec |
| 12 | Console: 404 `/favicon.ico` e 400 `/_next/image?url=%2Flogo.png` em toda carga de página (#931) | relatado | Lacuna de FE, leve (OPS-006): asset ausente em `my-app/public` ou loader de imagem. Teste → fix |
| 13 | Pendentes do BRIEF §9 do DANFE: emenda de texto do ADR-DFE §3 D1, botão "Baixar DANFE" (nó de FE), DANFE Simplificado Tipo 2, DANFE de NF-e recebida (#928) | listado pelo BRIEF | Já são pendências declaradas do [[NFE-DANFE-IBSCBS]]. O botão vira nó de FE quando o #928 mergear; o Tipo 2 e o DANFE de recebida esperam demanda |

## Itens 4 e 5 (Kanban, #931): já decididos e encaminhados

- **4.** Guarda vermelho → correção, já decidido. O guarda está em `claude/kanban-reorder-fkr4-empty-drop-guard` (`d5cda468`).
  A sessão de correção, junto com os passos 6–10 do runbook, está em cartão esperando o clique do dono. Os passos 7–10 não rodaram.
- **5.** Pré-conferência (**verificado** no código, não no app): `server/src/controllers/dashboardController.ts:264` grava
  `category: 'other'` para toda tabela de `addedTables` (branch `claude/kanban-reorder-emenda-1`). A sessão que rodar o runbook
  de novo marca o passo 8 como N/A com essa linha como evidência, se o predicado do passo depender da categoria. Senão, roda o
  passo.

## D. Ambiente

- **14.** Com 3 sessões na mesma máquina, a integração local dá timeout no Windows; no CI ela passa. Regra operacional: **no
  máximo 2 integrações (`npm run test:integration`) ao mesmo tempo** na máquina. Não muda código.
