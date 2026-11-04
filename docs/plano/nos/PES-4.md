---
id: "PES-4"
tipo: "plataforma"
dominio: "pessoal"
titulo: "Departamento Pessoal (folha + eSocial) — núcleo first-class sempre ligado + submódulos opcionais com ativação por competência; fase 2 do F-PES-0"
estado: "inflight"
estado_detalhe: "03/11: sessão 3 executando o BRIEF de F0+F1 (BE-INCR-DP-F0-F1-brief.md), um PR por fatia, empilhados sobre o #1010. Feito: PR-0 #1014 (itens 1–7; revisor-independente PASSOU), PR-1 #1015 (itens 8–19: registro dos 9 submódulos, ativação por competência em /api/dp/modules, porta JORNADA_APURADA com adaptador nulo) e PR-2 #1016 (itens 20–27: INSS_EMPREGADO 2026, FGTS do aprendiz, 4 tabelas do eSocial transcritas por script, leitor parametrosFolha). PR-3..PR-6 seguem em sessão nova pelo handoff no fim desta nota. F2..F6 e o BRIEF do SST (núcleo, F-DP-13) ainda sem BRIEF; F-FOL-1..9 da ponte contábil pendentes"
depende_de: ["[[D-2026-11-02-DP-PRE-ADR]]", "[[D-2026-11-02-DP-BRIEF-F0-F1]]", "[[D-2026-10-12-QUESTIONARIO-DONO]]", "[[LEGAL-PARAMS]]", "[[IRRF-DISTRIBUICAO]]", "[[I6]]"]
autorizacao: "dono, chat, 2026-11-03: \"Executa PR-0 a PR-6\" (resposta a \"Abro a sessão 3 com o executa do BRIEF BE-INCR-DP-F0-F1?\") — executa do BRIEF de F0+F1 inteiro ([[D-2026-10-28-FLUXO-AUTONOMO]]); não cobre F2 em diante, o BRIEF do SST nem a ponte contábil (F-FOL-1..9). Antes — dono, chat, 2026-11-02: \"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief em outra e o executa na terceira\" + \"Sim, abre agora\" (resposta a \"Abro já a sessão 2 (nó PES-4 + BRIEF de F0 e F1) em cima do branch do #1009?\") — nó e BRIEF de F0+F1; forks do BRIEF por questionário ([[D-2026-11-02-DP-BRIEF-F0-F1]]). Não autoriza código: o 'executa' é da sessão 3"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §9: PR-0/PR-3/PR-5/PR-6 opus-baixo; PR-1/PR-2/PR-4 opus-medio"
atualizado: "2026-11-04"
write_set: ["server/src/features/dp/**", "server/src/controllers/dpModuleController.ts", "server/src/controllers/dpCadastrosController.ts", "server/src/controllers/dpVinculoController.ts", "server/src/controllers/__tests__/dp*.ts", "server/src/routes/dp.ts", "server/src/routes/docs/dp.paths.ts", "server/public/openapi.json", "server/src/__tests__/openapi-paths.test.ts", "server/prisma/schema.prisma", "server/prisma/migrations/**", "server/prisma/data/legal_parameters_dp_v1.sql", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/legalParameters/models/formatoLinha.ts", "server/src/features/legalParameters/dtos/__tests__/__dto-shapes__.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/test/helpers/templateDb.ts", "server/test/helpers/legalParams.ts", "server/.dependency-cruiser.cjs", "docs/adr/ADR-ARCH-BOUNDARIES.md"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts"]
prs: ["#1010", "#1014", "#1015", "#1016", "#1026"]
---
# PES-4 — Departamento Pessoal: núcleo + submódulos

**Estado:** `inflight` — 03/11: sessão 3 executando o BRIEF de F0+F1 (BE-INCR-DP-F0-F1-brief.md), um PR por fatia, empilhados sobre o #1010. Feito: PR-0 #1014 (itens 1–7; revisor-independente PASSOU), PR-1 #1015 (itens 8–19: registro dos 9 submódulos, ativação por competência em /api/dp/modules, porta JORNADA_APURADA com adaptador nulo) e PR-2 #1016 (itens 20–27: INSS_EMPREGADO 2026, FGTS do aprendiz, 4 tabelas do eSocial transcritas por script, leitor parametrosFolha). PR-3..PR-6 seguem em sessão nova pelo handoff no fim desta nota. F2..F6 e o BRIEF do SST (núcleo, F-DP-13) ainda sem BRIEF; F-FOL-1..9 da ponte contábil pendentes  
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
| F2 — motor mensal | — | sem BRIEF |
| F3 — folhas especiais | — | sem BRIEF |
| F4 — eSocial (pipeline agnóstico, `Null`/`Manual` primeiro, F-DP-3) | — | sem BRIEF |
| F5 — fechamento, guias, ponte contábil (F-FOL-1..9 pendentes) | — | sem BRIEF |
| F6 — submódulos opcionais (`PES-4-<nome>`) | — | sem BRIEF |

## Docs

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

## Handoff da execução do BRIEF de F0+F1 (atualizado 03/11, depois do PR-2)

A sessão 3 fechou o PR-0 e o PR-1; a continuação dela (sessão 3b) fechou o PR-2 e parou por higiene de contexto
(CLAUDE.md, ~180k). O `executa` (dono, chat, 03/11: *"Executa PR-0 a PR-6"*) segue valendo para o resto do BRIEF; a
sessão nova continua com a skill `sessao-feature`.

**Feito**

| PR | Branch | Itens | Classe | CI | Revisor independente |
|---|---|---|---|---|---|
| #1014 | `claude/dp-f0-f1-pr0-421c43` (base `claude/dp-no-pes4-brief-f0-f1-90b7b4`) | 1–7 | vermelha (ADR) | verde | PASSOU |
| #1015 | `claude/dp-f0-f1-pr1` (base `claude/dp-f0-f1-pr0-421c43`) | 8–19 | vermelha (prisma, contábil) | verde (17/17) | PASSOU (03/11, revisor despachado pela sessão 3b: gates 0, sabotagem do gate de sobreposição pega; 3 latentes abaixo) |
| #1016 | `claude/dp-f0-f1-pr2-d614b0` (base `claude/dp-f0-f1-pr1`) | 20–27 | vermelha (migração, parâmetro legal) | verde (17/17) | PASSOU (03/11: gates 0; 3 sabotagens — valor da FAIXA_2, vigência do INSS, filtro de data do leitor — pegas; a do filtro só pela integração) |
| #1026 | `claude/dp-f0-f1-pr3` (base `claude/dp-f0-f1-pr2-d614b0`) | 28–36 | vermelha (migração, contábil) | ver PR | REVISOR_1026 |

**Latentes do revisor do #1015 (não bloqueiam; só aparecem com registro de teste, porque hoje todo opcional é
`disponivel: false` com `dependsOn: []` — decidir antes de ligar o primeiro opcional com dependência):** (1) `activate`
checa a dependência só em `competenciaInicio` e aceita o dependente sem fim mesmo com a dependência encerrando depois,
estado que o `end` recusaria (segue a letra do item 13); (2) `end` numa ativação já encerrada reabre e estende o fim e
sobrescreve o `motivoFim` (a spec não trata); (3) o `DEPENDENT_ACTIVE` do `end` olha só `dependsOn`, não `requiresOneOf`
(inferido pela leitura).

**Pendente:** PR-4 (37–49; leva também a trava D-5 da jornada do item 30, `DP_JORNADA_EM_USO`, que depende de `DpVinculoVersao`), PR-5 (50–55), PR-6 (56–62), cada um empilhado no anterior, com o fold
aqui no próprio PR e o revisor-independente em cada um (D-2026-10-28, PR vermelho).

**Próximo comando exato** (num worktree novo, depois de conferir com `gh pr view` se algum PR de baixo foi mergeado —
se foi, rebase sobre `main`):

```bash
git fetch origin && git checkout -b claude/dp-f0-f1-pr3 origin/claude/dp-f0-f1-pr2-d614b0
cd server && npm ci && npx prisma generate && printf 'OPENAI_API_KEY=ci-dummy-openai-key\n' > .env
cd ../my-app && npm ci
```

**Armadilhas medidas (valem para PR-3..PR-6)**

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
