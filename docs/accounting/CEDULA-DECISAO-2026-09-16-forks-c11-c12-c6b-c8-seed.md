# Cédula de decisão — 2026-09-16 — forks C11 (6) · C12 (4) · C6b (5) · C8 (3) · SEED-MY (2)

> **O que este doc é:** o registro citável (ORCH-006) das **20 ratificações** do dono tomadas em
> **questionário** (`AskUserQuestion`, 5 rodadas × 4 perguntas, sessão de 2026-09-16, worktree
> `claude/orquestracao-proximos-passos-d9d0b1`) sobre os forks que o fold de 16/09 (#332) deixou como
> "restos que só o dono fecha" (`PROXIMOS-PASSOS-2026-09-14.md` §Estado na 3ª leitura;
> `GRAFO-DEPENDENCIAS-2026-09-14.md` §4.2). Cada pergunta levou a evidência citável, o que cada opção
> **fecha**, e a recomendação marcada como 1ª opção (`duvidas-por-questionario-com-contexto`).
> **O que não é:** autorização de implementação — ratificar fork abre a `sessao-feature` **só** com o
> "executa" do dono por nó (ORCH-006). **[Adendo, mesma sessão]** "executa C11" foi dado depois desta cédula → #334 mergeado; os demais seguem sem "executa".

## Sinal do dono (literal)

> "Pode orquestrar os proximos passos" — dado sobre `origin/main` `1327ca5e` (#332), 0 PRs abertos.
> Preflight do passo 0 do prompt-mãe: `merge-base` ok, `gh pr list` vazio, 0 jest concorrente.

## Decisões

Todas as 20 respostas coincidem com a recomendação não-vinculante do BRIEF (coluna "Recomendação" = "=").
A coluna "Consequência" transcreve o que a opção **fecha**, como foi apresentado ao dono.

### C11 — `BE-INCR-REVIEW-LAYER-brief.md` §3 (6/6)

| Ref | Pergunta | Decisão | Rec. | Consequência |
|---|---|---|---|---|
| **F-C11-1** | Quem é "o profissional" | **(a)** `User` do escopo com `canManageData`; identidade = `reviewerName`+`reviewerCrc` no sign-off | = | Zero mudança em auth; (b) `Role.ACCOUNTANT` fica como ADR futuro (§6 do BRIEF) |
| **F-C11-2** | O que `DATA_EDIT` cobre | **(a)** ponteiro `targetType`+`targetId`; edição pelos serviços donos (chart, mapping, counterparty, DTO de geração) | = | Nenhum endpoint-proxy; os alvos já auditam |
| **F-C11-3** | Entrega (C6) exige sign-off | **(a)** sim — `buildPackage` devolve 409 `REVIEW_REQUIRED`/`REVIEW_REJECTED` sem revisão `SIGNED` do par | = | Toca C6 em 1 checagem; **C6b (F-C6b-1) lê o mesmo par** — C11 e C6b tocam `buildPackage`: **serial**, C11 antes |
| **F-C11-4** | Data do acerto (c) | **(a)** `postingDate` em qualquer período `OPEN`, extemporâneo (IN 2003 art. 8º) | = | Nunca bate no terminal `HARD_CLOSED`; `reopenIfSoftClosed` fica para C11 v2 |
| **F-C11-5** | Chave da revisão `OPEN` | **(a)** `@@unique([ecdJobId, ecfJobId])` + gate in-tx (NULL distinto no SQLite) | = | Mesma chave do `AccountingDeliveryLog`; `authoritative-gate-inside-tx` |
| **F-C11-6** | Troca de jobs após regerar | **(a)** `PATCH /jobs` substitui; trilha = evento `review.jobs_replaced` | = | Zero tabela de histórico |

### C12 — `BE-INCR-SPED-IDENTITY-MASKS-brief.md` §3 (4/4)

| Ref | Pergunta | Decisão | Rec. | Consequência |
|---|---|---|---|---|
| **F-C12-1** | Campo 04 `IDENT_QUALIF` | **(a)** derivado do código pela tabela; DTO `.strict()` rejeita o campo | = | Payload que mande `IDENT_QUALIF` passa a 400 — **quebra de compat declarada** |
| **F-C12-2** | Uma tabela ou duas (J930 × 0930) | **(a)** duas consts, uma por manual, num só arquivo, cada uma com fonte + sha256 | = | A transcrição §5 sai dos **dois** PDFs (ambos no disco: `Manual-ECD-Leiaute-9.pdf` `bc63f0a893ce`, `Manual-ECF-Leiaute-12.pdf` `7216ec2bd62d`) |
| **F-C12-3** | Formato de `IND_CRC` | **(a)** máscara CFC `UF-NNNNNN/O-D` igual à do contato (#305) | = | 400 nomeado com o formato esperado; risco aceito: inscrição legítima fora do padrão CFC é rejeitada |
| **F-C12-4** | `signers[].contactId` no DTO | **(a)** sim, resolvido no serviço por `contactTo*Signer` | = | Uma máscara só (BE); FE não duplica |

**[Adendo, sessão 2026-09-16 (tarde) — 3 forks nascidos da transcrição J930/0930, 3/3 na recomendação
(`AskUserQuestion`, 1 rodada); fonte: `BE-INCR-SPED-IDENTITY-MASKS-transcription-J930-0930.md` §5]**

| Ref | Pergunta | Decisão | Rec. | Consequência |
|---|---|---|---|---|
| **F-C12-5** | Derivação do campo 04 para `900` (tabela imprime "Contador/Contabilista"; `REGRA_TABELA_ASSINANTE_DESC` exige "Contador" ou "Contabilista") | **(i)** const transcrita literal + exceção de emissão `900 → 'Contador'` | = | Const verificável linha a linha; 1 linha de exceção nomeada; PVA (H1 2ª) é o oráculo |
| **F-C12-6** | CPF-11 quando `900` também na ECD (o manual ECD só tem a regra de assinatura 2, p. 198; a ECF tem `REGRA_CONTADOR_CPF`) | **(a)** sim — mesma regra nos dois DTOs | = | Item 6 da ECD = CPF-11 + `IND_CRC` + `EMAIL` + `FONE` + `UF_CRC` obrigatórios (p. 202) |
| **F-C12-7** | `REGRA_QUALIF_INV_RESP_LEGAL` + `REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE` (erro no PVA, ausentes no `superRefine`) | **(a)** entram como item 11 do C12 | = | Mesmo `superRefine` que o item 6 reescreve; C12 sobe a 11 comportamentos |

### C6b — `BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md` §3 (5/5)

| Ref | Pergunta | Decisão | Rec. | Consequência |
|---|---|---|---|---|
| **F-C6b-1** | Colunas fixas ECD/ECF do `AccountingDeliveryLog` | **(a)** ficam como núcleo + chave; extras = tabela filha; migração só aditiva + backfill de 2 itens | = | Zero rebuild (`migracao-sqlite-nao-e-transacional`); C11 F-C11-3 e o `@@unique` continuam lendo o par |
| **F-C6b-2** | Onde mora "configurável" | **(a)** `AccountingContact.packageProfile` (perfil por contato) | = | 1 coluna JSON; corpo do `build` pode sobrescrever |
| **F-C6b-3** | Validar período do extra | **(a)** `DataExchangeExportService` grava `periodStart/End` (colunas existentes) a partir de `asOf`/janela do DTO | = | Zero migração; extra fora do período = 400 nomeado |
| **F-C6b-4** | Idempotência com extras diferentes | **(a)** chave `@@unique([ecdJobId, ecfJobId, contactId])` inalterada; 2º build = 409 | = | 1 entrega por par/contato |
| **F-C6b-5** | Critério da amostra | **(a)** `n` por conta com movimento (resultado + patrimonial), semente determinística | = | Pacote regerado = mesma amostra |

### C8 — `BE-INCR-FIXED-ASSETS-brief.md` §3 (3/3 novos; F-FA1..9 já ratificados por delegação, cédula 14/09)

| Ref | Pergunta | Decisão | Rec. | Consequência |
|---|---|---|---|---|
| **F-FA10** | Chave de negócio da taxa (Anexo III IN 1.700) | **(a)** `@@unique([userId, unitId, source, sourceRow])` — ordinal da linha na fonte; `CUSTOM` sem unique de negócio | = | Única chave que a fonte garante (`tabela-transcrita-de-lei-conferir-redacao-vigente`); tela mostra `ncm + description` |
| **F-FA12** | NF-e mista (estoque + CFOP 1551/2551) | **(a)** permitir: payable com modo 3 + modo 4, dois débitos no mesmo entry | = | Evita a classe "CFOP lido e ignorado" (`param-aceito-e-ignorado-e-bug`) |
| **F-FA13** | Contrapartida da baixa com `proceedsCents > 0` | **(a)** `counterpartAccountId` obrigatório no comando (banco ou AR) | = | 400 nomeado se `proceeds > 0` sem conta; nenhum acoplamento automático ao AR |

### SEED-MY — `SEED-MULTI-EXERCICIO-brief.md` §3 (2/2)

| Ref | Pergunta | Decisão | Rec. | Consequência |
|---|---|---|---|---|
| **F-SEED-2** | Proteção do dado | **(a)** comando exige `--i-have-a-backup`; humano roda `db:backup`/B-4 antes | = | Gate humano permanece visível; sem a flag o comando para apontando o `RUNBOOK-B4` |
| **F-SEED-3** | Regime do tenant-fixture | **(b)** dois tenants: `seed-presumido` + `seed-real` | = | H1 1ª/H2 miram Presumido; H1 2ª passada mira Real; nenhum runbook troca regime (IN 2004 art. 7º §2º) |

## O que esta cédula destrava (e o que NÃO destrava)

| Nó | Estado antes | Estado depois | Próxima ação | Precisa de |
|---|---|---|---|---|
| **C11** | `plan` (6 forks) | ~~`ready`~~ **✅ `done` #334 `a2c974cb`** ("executa C11" dado na mesma sessão; review FAIL B1 → fix → PASS) | — | — |
| **C12** | `plan` (4 forks + transcrição) | ~~`ready` após transcrição~~ **`ready`** — transcrição ✅ 16/09 (`…-transcription-J930-0930.md`, sha256 conferidos) + F-C12-5..7 ratificados (adendo acima) | `sessao-feature` (11 comportamentos) | "executa" do dono |
| **C6b** | `plan` (5 forks) | **`ready`** (~~serial depois de C11~~ — C11 mergeado #334; o gate F-C11-3 já está em `AccountingDeliveryService`, C6b o herda) | `sessao-feature` | "executa" do dono |
| **C8** | `plan` (3 forks) | **`ready`** | `sessao-feature` (37 comportamentos; ADR C8 Proposed → Accepted no fold) | "executa" do dono |
| **SEED-MY** | `plan` (2 forks) + gate | forks fechados; **segue bloqueado por B-4** | `job-generator` só após assinatura | **B-4 assinado** (gate humano) |

**Ordem sugerida para o "executa" (R6 + regra 4 do grafo + dependência escrita acima):** C11 → C6b →
C12 → C8. Alternativa declarada: C12 e C8 têm write-set disjunto de C11/C6b (C12 = DTO/serviço de
geração SPED; C8 = tabelas novas + modo 4 do import NF-e) e **cabem em paralelo** por
`.claude/skills/_PARALLELIZATION-CONTRACT.md` se o dono quiser mais de uma sessão executora — decisão do dono, não deste doc.

## Não fazer (herdado do prompt-mãe, inalterado)

Nenhum código sem "executa"; nada em `reconcile_pending_items` (R9); não reabrir P-IA (R10); não
preencher evidência/desfecho/assinatura de runbook (B-4, H1, H2, H3, M2); não montar aparato de auditoria.
