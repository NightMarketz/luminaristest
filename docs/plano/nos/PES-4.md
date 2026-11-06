---
id: "PES-4"
tipo: "plataforma"
dominio: "pessoal"
titulo: "Departamento Pessoal (folha + eSocial) — núcleo first-class sempre ligado + submódulos opcionais com ativação por competência; fase 2 do F-PES-0"
estado: "planned"
estado_detalhe: "05/11: BRIEF do F2 (motor mensal) escrito em docs/accounting/BE-INCR-DP-F2-brief.md (64 itens, PR-0..PR-6), forks F-DPF-1..13 com RATIFICAÇÃO PENDENTE; achado: EC 141/2026 (42 h em 16/12/2026, 40 h em 16/12/2027, 2 dias de DSR) muda o divisor do salário-hora e o DSR (F-DPF-1/2). Próximo: o dono ratifica os forks; depois, autorização nova para o executa. Antes — 04/11: F0+F1 entregues na main (681ec26a), squash do #1041. F3..F6, o BRIEF do SST (núcleo, F-DP-13) e a ponte contábil (F-FOL-1..9) seguem pendentes"
depende_de: ["[[D-2026-11-02-DP-PRE-ADR]]", "[[D-2026-11-02-DP-BRIEF-F0-F1]]", "[[D-2026-10-12-QUESTIONARIO-DONO]]", "[[LEGAL-PARAMS]]", "[[IRRF-DISTRIBUICAO]]", "[[I6]]"]
autorizacao: "dono, chat, 2026-11-05: \"Sim, planeja o F2\" (resposta a \"Abro a sessão de planejamento do BRIEF do F2 (só o BRIEF, sem código)?\") — só o BRIEF do F2; não é executa. Antes — dono, chat, 2026-11-03: \"Executa PR-0 a PR-6\" (resposta a \"Abro a sessão 3 com o executa do BRIEF BE-INCR-DP-F0-F1?\") — executa do BRIEF de F0+F1 inteiro ([[D-2026-10-28-FLUXO-AUTONOMO]]); não cobre F2 em diante, o BRIEF do SST nem a ponte contábil (F-FOL-1..9). Antes — dono, chat, 2026-11-02: \"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief em outra e o executa na terceira\" + \"Sim, abre agora\" (resposta a \"Abro já a sessão 2 (nó PES-4 + BRIEF de F0 e F1) em cima do branch do #1009?\") — nó e BRIEF de F0+F1; forks do BRIEF por questionário ([[D-2026-11-02-DP-BRIEF-F0-F1]]). Não autoriza código: o 'executa' é da sessão 3"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §9: PR-0/PR-3/PR-5/PR-6 opus-baixo; PR-1/PR-2/PR-4 opus-medio"
atualizado: "2026-11-05"
write_set: ["server/src/features/dp/**", "server/src/controllers/dpModuleController.ts", "server/src/controllers/dpCadastrosController.ts", "server/src/controllers/dpVinculoController.ts", "server/src/controllers/__tests__/dp*.ts", "server/src/routes/dp.ts", "server/src/routes/docs/dp.paths.ts", "server/public/openapi.json", "server/src/__tests__/openapi-paths.test.ts", "server/prisma/schema.prisma", "server/prisma/migrations/**", "server/prisma/data/legal_parameters_dp_v1.sql", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/legalParameters/models/formatoLinha.ts", "server/src/features/legalParameters/dtos/__tests__/__dto-shapes__.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/test/helpers/templateDb.ts", "server/test/helpers/legalParams.ts", "server/.dependency-cruiser.cjs", "docs/adr/ADR-ARCH-BOUNDARIES.md"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts"]
prs: ["#1010", "#1014", "#1015", "#1016", "#1026", "#1032", "#1036", "#1041"]
---
# PES-4 — Departamento Pessoal: núcleo + submódulos

**Estado:** `planned` — 05/11: BRIEF do F2 (motor mensal) escrito em docs/accounting/BE-INCR-DP-F2-brief.md (64 itens, PR-0..PR-6), forks F-DPF-1..13 com RATIFICAÇÃO PENDENTE; achado: EC 141/2026 (42 h em 16/12/2026, 40 h em 16/12/2027, 2 dias de DSR) muda o divisor do salário-hora e o DSR (F-DPF-1/2). Próximo: o dono ratifica os forks; depois, autorização nova para o executa. Antes — 04/11: F0+F1 entregues na main (681ec26a), squash do #1041. F3..F6, o BRIEF do SST (núcleo, F-DP-13) e a ponte contábil (F-FOL-1..9) seguem pendentes  
**Autorização:** dono, chat, 03/11 — *"Executa PR-0 a PR-6"*: o `executa` do BRIEF de F0+F1 inteiro (sessão 3 de 3;
[[D-2026-10-28-FLUXO-AUTONOMO]]). Não cobre F2 em diante, o BRIEF do SST nem a ponte contábil. Antes: dono, chat, 02/11 —
nó + BRIEF de F0 e F1 (sessão 2 de 3).  
**Depende de:** [[D-2026-11-02-DP-PRE-ADR]] (forks do PRE-ADR), [[D-2026-11-02-DP-BRIEF-F0-F1]] (forks do BRIEF),
[[D-2026-10-12-QUESTIONARIO-DONO]] (F-PES-0..13), [[LEGAL-PARAMS]] ✅ (tabelas com vigência), [[IRRF-DISTRIBUICAO]] ✅
(`Partner`, o sócio do pró-labore), [[I6]] ✅ (`AccountingScopeResolver`). Lê, sem depender de estado:
`IRRF_PF_MENSAL` do [[RETENCOES-FONTE]] e `ENCARGO_FOLHA` do [[EFICIENCIA-FISCAL]] (as duas cargas já estão em `main`).  
**Desbloqueia:** os BRIEFs de F2 (motor mensal), F3 (folhas especiais), F4 (eSocial), F5 (fechamento, guias e ponte
contábil), do SST e dos submódulos `PES-4-<nome>`; o nó FE `FE-INCR-DP-CADASTROS` (a abrir).

## O que é

O DP entra pela mesma estrutura do resto do produto (F-DP-6): um **núcleo** first-class em Prisma, existente em toda
instância, que cobre o mínimo legal de qualquer empregador, inclusive a empresa só com sócio de pró-labore (F-DP-11);
e **submódulos opcionais** ligados por instância e por competência, sem deploy, com adaptador nulo quando desligados.
O núcleo nunca importa um opcional, e o `check:arch` reprova (F-DP-10). É a **fase 2 do F-PES-0 (c)**, aberta por
decisão do dono (F-DP-12); a importação da folha de outro software (PES-1) fica como caminho de migração.

Decisões que valem e não se reabrem aqui: SQLite; tenancy por `AccountingScope` sem multiempresa (R8: instância = raiz do
CNPJ = empregador; unidade = estabelecimento); sem outbox nem motor de orquestração (T11); dinheiro em centavos `BigInt`;
BYOK, sem contratar PSC (D5 de 30/10); vigência só por data de efeito, com o snapshot do cálculo guardado inteiro
(F-DP-8); rubricas em catálogo fechado em código e valores da CCT como dado (F-PES-9, F-PES-8); lançamento pelo
`postEntry` direto (F-DP-4).

## Fases e BRIEFs

| Fase (spec §11) | BRIEF | Estado |
|---|---|---|
| F0 — fundação | [`BE-INCR-DP-F0-F1-brief.md`](../../accounting/BE-INCR-DP-F0-F1-brief.md) PR-0, PR-1 | código em PR (03/11): PR-0 #1014, PR-1 #1015 |
| F1 — cadastros e tabelas legais | idem, PR-2..PR-6 | em execução (03/11): PR-2 #1016, PR-3 #1026; PR-4..PR-6 a fazer |
| SST (núcleo, F-DP-13) | `BE-INCR-DP-SST` | sem BRIEF (encaixe no §7 do BRIEF de F0+F1) |
| F2 — motor mensal | [`BE-INCR-DP-F2-brief.md`](../../accounting/BE-INCR-DP-F2-brief.md) PR-0..PR-6 | BRIEF escrito (05/11); forks F-DPF-1..13 pendentes; sem `executa` |
| F3 — folhas especiais | — | sem BRIEF |
| F4 — eSocial (pipeline agnóstico, `Null`/`Manual` primeiro, F-DP-3) | — | sem BRIEF |
| F5 — fechamento, guias, ponte contábil (F-FOL-1..9 pendentes) | — | sem BRIEF |
| F6 — submódulos opcionais (`PES-4-<nome>`) | — | sem BRIEF |

## Docs

- [`BE-INCR-DP-F2-brief.md`](../../accounting/BE-INCR-DP-F2-brief.md) — 05/11: 64 itens em PR-0..PR-6; forks
  F-DPF-1..13 com RATIFICAÇÃO PENDENTE; dossiê `pesquisas-legais/brief-pes4-f2/` (inclui a EC 141/2026)
- [`BE-INCR-DP-F0-F1-brief.md`](../../accounting/BE-INCR-DP-F0-F1-brief.md) — 02/11: 62 itens em PR-0..PR-6; forks
  F-DPB-1..3 ratificados, D-1..D-9 pela casa; §7 lista os encaixes das fases seguintes
- [`PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md`](../../adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md) — Accepted 02/11, F-DP-1..14
- [`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`](../../accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) — F-PES-0..13
  (ratificados em 12/10); o DP é a fase 2 dele
- [`PRE-ADR-FOLHA-CONTABILIZACAO.md`](../../adr/PRE-ADR-FOLHA-CONTABILIZACAO.md) — F-FOL-1..9 pendentes (ponte contábil)
- [`docs/dp/SPEC-DP-2026-10-31-katz.md`](../../dp/SPEC-DP-2026-10-31-katz.md) — spec externa, insumo não ratificado
- Dossiês legais: `pesquisas-legais/pre-adr-dp-2026-11-02/` (CLT arts. 74 § 2º e 484-A) e
  `pesquisas-legais/brief-pes4-f0-f1/` (INSS de 2026, pró-labore, FGTS do aprendiz, aprendiz, férias, eSocial S-1.3)

## Trilhos, rejeitadas e diferidos tocados (sem reabrir)

[[T2]] (tenancy), [[T8]] (auditoria encadeada), [[T10]] (bridge explícita), [[T11]] (processo único, sem fila),
[[R8]], [[R-postgresql]], [[R-torre-multiempresa]], [[R-motor-dominio]], [[R-motor-regras]];
[[M5-subrazoes-restantes]] (de onde a folha saiu, pela [[D-2026-11-02-DP-PRE-ADR]]).

## Handoff da execução do BRIEF de F0+F1 (atualizado 04/11, depois do PR-4)

A sessão 3 fechou o PR-0 e o PR-1; a continuação dela (sessão 3b) fechou o PR-2 e parou por higiene de contexto
(CLAUDE.md, ~180k); a sessão 3c gravou os vereditos do #1015 e do #1016, fechou o PR-3 (#1026) e parou pelo mesmo motivo
antes do PR-4; a sessão 3d rebaseou a pilha depois do merge do #1009 e abriu o PR-4 (#1032). O `executa` (dono, chat, 03/11: *"Executa PR-0 a PR-6"*) segue valendo para o resto do BRIEF; a
sessão nova continua com a skill `sessao-feature`.

**Feito**

| PR | Branch | Itens | Classe | CI | Revisor independente |
|---|---|---|---|---|---|
| #1010 | `claude/dp-no-pes4-brief-f0-f1-90b7b4` (base `main` desde 04/11) | nó + BRIEF | vermelha | — | — |
| #1014 | `claude/dp-f0-f1-pr0-421c43` (base `claude/dp-no-pes4-brief-f0-f1-90b7b4`) | 1–7 | vermelha (ADR) | verde | PASSOU |
| #1015 | `claude/dp-f0-f1-pr1` (base `claude/dp-f0-f1-pr0-421c43`) | 8–19 | vermelha (prisma, contábil) | verde (17/17) | PASSOU (03/11, revisor despachado pela sessão 3b: gates 0, sabotagem do gate de sobreposição pega; 3 latentes abaixo) |
| #1016 | `claude/dp-f0-f1-pr2-d614b0` (base `claude/dp-f0-f1-pr1`) | 20–27 | vermelha (migração, parâmetro legal) | verde (17/17) | PASSOU (03/11: gates 0; 3 sabotagens — valor da FAIXA_2, vigência do INSS, filtro de data do leitor — pegas; a do filtro só pela integração) |
| #1026 | `claude/dp-f0-f1-pr3` (base `claude/dp-f0-f1-pr2-d614b0`) | 28–36 | vermelha (migração, contábil) | verde em 058c28fd (17/17, 03/11); head rebaseado 74e8105e em 04/11, CI de novo | PASSOU (03/11: gates 0; sabotagens de código duplicado, `TP_JORNADA`, Tier-0 do discriminador e PII na auditoria pegas; `tx`→cliente global NÃO pego — lacuna de teste, sem defeito) |
| #1032 | `claude/dp-f0-f1-pr4` (base `claude/dp-f0-f1-pr3`) | 37–49 + D-5 do item 30 | vermelha (migração, contábil) | gates locais verdes; CI do 8f762a3d vermelho (inventário do rekey: `DpVinculo` tem `unitId`; corrigido no 223da9fa), CI do head novo em curso em 04/11 — conferir com `gh pr checks 1032` | PASSOU (04/11, em 223da9fa: gates 0; 5 sabotagens — fechamento da véspera, PII na allowlist, D-5, guarda cross-tenant do `EmployeeRowLookup`, prazo do aprendiz — pegas, salvo a guarda cross-tenant, que o teste de rota não exercitava; o teste foi corrigido e passou a pegar) |
| #1036 | `claude/dp-f0-f1-pr5` (base `claude/dp-f0-f1-pr4`) | 50–55 | vermelha (só o título; sem migração) | gates locais verdes; rebaseado em 04/11 sobre o head 49ac41dd do #1032 (HMAC); conferir o CI com `gh pr checks 1036` | PASSOU (04/11, em 4f855f6f, antes do rebase: gates 0; 6 sabotagens — natureza inexistente, codIncCP 25 no pró-labore, incidência sem atualizar o `published.json`, policy removida, codIncCP 51 numa rubrica de 901/723, escopo montado à mão no controller — pegas; enquadramento coerente com as tabelas, conferência é do contador) |
| #1041 | `claude/dp-f0-f1-pr6` (base `claude/dp-f0-f1-pr5`) | 56–62 | vermelha (migração, contábil) | gates locais verdes (sobre o #1032 com HMAC); conferir o CI com `gh pr checks 1041` | PASSOU (04/11, em 8486aaa0: gates 0; sabotagens de `motivo` na allowlist, borda de 29/02, filtro EMPREGO, unicidade da implantação e vigência do motivo pegas; `tx`→cliente global no gate de sobreposição NÃO pego — lacuna de teste, sem defeito, como no #1026; concordou com as 8 lacunas de spec) |

**Latentes do revisor do #1015 (não bloqueiam; só aparecem com registro de teste, porque hoje todo opcional é
`disponivel: false` com `dependsOn: []` — decidir antes de ligar o primeiro opcional com dependência):** (1) `activate`
checa a dependência só em `competenciaInicio` e aceita o dependente sem fim mesmo com a dependência encerrando depois,
estado que o `end` recusaria (segue a letra do item 13); (2) `end` numa ativação já encerrada reabre e estende o fim e
sobrescreve o `motivoFim` (a spec não trata); (3) o `DEPENDENT_ACTIVE` do `end` olha só `dependsOn`, não `requiresOneOf`
(inferido pela leitura).

**Achado do revisor do #1026 (desenho do §3.2, não do executor; decidir antes de apagar usuário com DP):** apagar o `User`
falha com FK se ele tiver `DpConvencaoParametro` — o parâmetro não tem `userId` e o `Restrict` para a convenção barra o
cascade (mesma classe das ~90 FKs `Restrict` do schema). Soft-delete de sindicato com convenção viva e de cargo usado como
piso passam (spec não trata).

**Rebase de 04/11 (merge do #1009):** `rebase --onto origin/main` em cada degrau, com `--force-with-lease`. O driver `merge=regen` do `.gitattributes` mantém um lado sem avisar e tinha apagado o lado da pilha no `server/public/openapi.json` e no `__dto-shapes__.json` de `accounting`. A cascata foi refeita com `git -c merge.regen.driver="git merge-file -L ours -L base -L theirs %A %O %B" rebase --onto`, e o diff de cada degrau nos arquivos gerados foi conferido por script contra o de antes. **Num próximo rebase de pilha, use esse `-c`.**

**Achados do revisor do #1032 que ficam para o dono (não bloqueiam o merge):**
1. *Hash reversível* (defeito do item 45 / F-DPB-3, não da execução): o `hashCampos` é SHA-256 sem sal, como o BRIEF manda. Para um campo só (`salarioCents`, `nascimento`, `cpf`), o valor sai por força bruta (o revisor recuperou o salário em 288 ms e o nascimento em 57 ms). Isso esvazia o "sem os valores" do §3.7. **Decidido (dono, chat, 2026-11-04):** *"Trocar por HMAC"*; questionário seguinte: chave = *"Chaveiro próprio"* (variável `DP_AUDIT_KEYRING`, no formato e com o `loadKeyring` versionado do PSC; a versão da chave entra no evento) e sem chave = *"Recusa com 503"* (falha fechada na correção de trabalhador e de versão; criar e ler seguem funcionando; teste e dev usam chave fixa de teste). A implementação vai no #1032 (PR-4).
2. O `PATCH` do trabalhador não revalida os vínculos que já existem. Trocar `nascimento` ou `pcd` pode tirar um aprendiz do item 41; trocar o `cpf` ou zerar o `partnerId` pode deixar um 723 sem o sócio. A spec só fala da criação; vira pergunta ao dono.

**Lacunas de spec do PR-4 (registradas no corpo do #1032, sem bloquear; o revisor concordou com as 4):** aniversário em 29/02; `PATCH` do trabalhador emite `updated` + `corrected`; unidade 7 com salário > 0; categoria do núcleo sem linha vigente na Tabela 01 dá 400 sem `reason`.

**Entregue (04/11):** o lote entrou na main como 681ec26a, squash do #1041 com os 8 PRs (gates verdes e revisor PASSOU em todos). Os outros 7 aparecem como *Closed* no GitHub, e não *Merged*, porque foram absorvidos pelo #1041; o head de cada um foi conferido como contido no que entrou. Os branches ficaram no remoto.

**Pendente:** a ratificação dos forks F-DPF-1..13 do BRIEF do F2 (escrito em 05/11) e o `executa` dele, que pede autorização nova do dono. O `executa` de 03/11 cobria só F0+F1.

**Lacunas de spec do PR-6 (registradas no corpo do #1041, sem bloquear):** `dataRef` obrigatória no `GET /ferias`
(o BRIEF não diz de onde vem); "até `dataRef`" lido como "aquisitivo que começa até `dataRef`" (inclui o período em
curso) e, com término, não abre aquisitivo depois dele, sem proporcionalizar; vínculo TSVE devolve lista vazia e a
implantação dá 400 `DP_FERIAS_PERIODO_INEXISTENTE`; implantação duplicada dá 409 sem `reason` (o §3.6 não tem código);
afastamento sem código próprio para motivo fora da Tabela 18 e início antes da admissão (400 sem `reason`); o
`aquisitivoInicio` da implantação não muda no PATCH; implantação de período futuro é aceita (sem relógio no serviço).

**Armadilhas medidas (valem para PR-4..PR-6)**

- **PR-4 herda do PR-3:** a trava D-5 (`DP_JORNADA_EM_USO`: `minutosSemanais`/`tipoJornada` não mudam com versão de vínculo
  apontando para a jornada) vai no `DpCadastroService.updateJornada`, com método novo no `IDpCadastroRepository` sobre
  `DpVinculoVersao` e teste 409. Os FKs `Restrict` da versão para lotação/cargo/jornada/sindicato entram no schema do PR-4.
- **Molde dos CRUDs do PR-3:** `controllers/dpCadastrosController.ts` tem `handler`/`crud` genéricos; o bloco OpenAPI do
  PR-3 saiu de um gerador Python (fora do repo). Para mesclar o openapi: copie o commitado, rode `npm run docs:generate`,
  guarde o gerado, restaure o commitado e substitua só as chaves `/api/dp/*` no mesmo lugar (o diff fica só de inserções).
- **Snapshot de DTO:** salvar os JSON/`.gen.ts` gerados, `git checkout` de tudo e aplicar por chave só o nó cujo
  conteúdo canônico mudou (o PR-3 fez assim: `DpCadastrosDto.ts` no `dp` e `AccountingResetDto.ts` no `accounting`).
- **Heredoc com Python longo quebra no Git Bash** (`unexpected EOF`): escreva o script num arquivo e rode `python -I`.
- **`change_directory` não funciona nesta família de sessões** (worktree isolada): o `isolation: worktree` do revisor falha
  se o cwd da sessão sair do repo; despache o revisor sem isolation, mandando-o criar o próprio `git worktree add --detach`.

- **Filtro do jest:** `npx jest --selectProjects unit <padrão>` roda a suíte inteira neste ambiente; use
  `--runTestsByPath <arquivos>` (integração: `--selectProjects integration --runInBand --forceExit --runTestsByPath`).
- **Snapshot de DTO:** o `UPDATE_DTO_SNAPSHOT=1` reordena os JSON e os `.gen.ts` de todos os domínios no Windows.
  Reverta tudo que não é do PR e, no JSON de domínio já existente, aplique só o nó que mudou sobre o arquivo do `HEAD`
  (o PR-1 fez isso com um `node -e` que compara as chaves ordenadas e grava `JSON.stringify(…, null, 2)`).
- **`public/openapi.json`:** o `docs:generate` regenera o arquivo inteiro e mexe em paths alheios (o commitado está
  defasado). Gere num arquivo à parte e copie para o commitado só os paths `/api/dp/*`. O `BASELINE` do
  `openapi-paths.test.ts` está congelado (dono, 16/10): não sobe.
- **Classificação do "Resetar sistema":** todo model novo com `userId` reprova o `accountingResetClassification.test.ts`
  até ser classificado. A regra do arquivo é "tabela nova nasce BLOCKING" (o PR-1 pôs `DpModuloAtivacao` assim). Isso
  muda o enum `ACCOUNTING_RESET_BLOCKING_REPORT` ⇒ +1 linha no `__dto-shapes__.json` de `accounting` e 2 linhas no
  `my-app/types/contracts/accounting/AccountingResetDto.gen.ts`. O arquivo não está no `write_set`; é consequência
  mecânica do gate (registrado no corpo de cada PR). Se o dono preferir os modelos do DP em `NAO_CONTABEIS`, é decisão
  dele.
- **`npx prisma format` reformata o schema inteiro:** não rode. A migração sai de
  `npx prisma migrate diff --from-schema-datamodel <schema do commit anterior> --to-schema-datamodel prisma/schema.prisma --script`,
  com o prólogo `DROP TABLE IF EXISTS` da tabela nova.
- **`resetDb` (test/helpers/db.ts):** model classificado no reset contábil exige `deleteMany()` no `resetDb()` (guarda
  `test/helpers/__tests__/resetDb.accounting.integration.test.ts`); o PR-1 pôs `dpModuloAtivacao` antes do `user`. Nos
  PR-3..PR-6, cada model novo entra ali em ordem de FK (filhos antes dos pais: versão → vínculo → trabalhador, que
  aponta para `Partner` com `Restrict`). O arquivo também fica fora do `write_set` e vira registro no PR.
- **Revisor-independente:** custa ~130k tokens por PR; despache em background com `isolation: worktree`.
- **Domínios do leiaute (`tpJornada` no PR-3, `undSalFixo` no PR-4):** saem do HTML do S-2200 no dossiê (`docs/D09_index-html.html`),
  como os de `codIncCP`/`codIncFGTS` no PR-2: a célula do campo tem `id="2200_..._<campo>"` e os itens vêm como
  `<strong>N</strong> - descrição<br>`. A função `dominio_s1010` do `pesquisas-legais/brief-pes4-f0-f1/gerar_carga.py` é o
  molde; o BRIEF manda "transcrito no PR", com a linha do dossiê citada.
- **Hash dos arquivos do dossiê:** os HTML do eSocial foram baixados em CRLF e o INSS e a lei em LF; o git guarda tudo em LF
  e o `core.autocrlf` devolve CRLF. O `gerar_carga.py` confere o SHA-256 do manifest nas duas formas.
- **`fotografiaSemente()` não traz o salário mínimo:** a semente do `SALARIO_MINIMO` está nas cargas do Simples
  (`SIMPLES_SEED_FILES`), fora de `LEGAL_PARAMS_SEED_FILES`. Teste unitário que lê o mínimo soma as duas listas.
- **Commit interrompido:** uma chamada de commit+push caiu no meio sem resultado; confira `git log` e `git ls-remote`
  antes de repetir.
