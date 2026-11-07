---
id: "PES-4"
tipo: "plataforma"
dominio: "pessoal"
titulo: "Departamento Pessoal (folha + eSocial) — núcleo first-class sempre ligado + submódulos opcionais com ativação por competência; fase 2 do F-PES-0"
estado: "planned"
estado_detalhe: "05/11: BRIEF do F2 (motor mensal) escrito em docs/accounting/BE-INCR-DP-F2-brief.md (78 itens, PR-0R + PR-0..PR-6; revisto em 06/11 pela regra de parâmetro do dono: número de lei e escala viram dado com vigência, código só com a forma da regra), forks F-DPF-1..13 DECIDIDOS pelo dono em 06/11 (três contra a recomendação: F-DPF-1 divisor pela escala, F-DPF-7 salário-família calcula e avisa, F-DPF-8 outro emprego já no F2; [[D-2026-11-06-DP-BRIEF-F2]]); achado: EC 141/2026 (42 h em 16/12/2026, 40 h em 16/12/2027, 2 dias de DSR) muda o divisor do salário-hora e o DSR (F-DPF-1/2); 06/11: pesquisa das perguntas ao contador (dossiê pesquisas-legais/brief-pes4-f2-contador/, PR #1104) — F-DPF-3 revisto para truncar o INSS por faixa como o eSocial, itens 77–78 pela IN RFB 2.110, F-DPF-10 pela IN RFB 1.500 art. 63, 19 rubricas. Próximo: autorização nova do dono para o executa do F2. Antes — 04/11: F0+F1 entregues na main (681ec26a), squash do #1041. F3..F6, o BRIEF do SST (núcleo, F-DP-13) e a ponte contábil (F-FOL-1..9) seguem pendentes"
depende_de: ["[[D-2026-11-02-DP-PRE-ADR]]", "[[D-2026-11-06-DP-BRIEF-F2]]", "[[D-2026-11-06-DP-ESCOPO-LACUNAS]]", "[[D-2026-11-02-DP-BRIEF-F0-F1]]", "[[D-2026-10-12-QUESTIONARIO-DONO]]", "[[LEGAL-PARAMS]]", "[[IRRF-DISTRIBUICAO]]", "[[I6]]"]
autorizacao: "dono, chat, 2026-11-06: \"pode planejar de acordo com suas sugestões\" (regra de parâmetro: número de lei e escala como dado; BRIEF do F2 §0.1 e PR-0R) + questionário dos forks F-DPF-1..13 ([[D-2026-11-06-DP-BRIEF-F2]]) — só o BRIEF; não é executa. Antes — dono, chat, 2026-11-05: \"Sim, planeja o F2\" (resposta a \"Abro a sessão de planejamento do BRIEF do F2 (só o BRIEF, sem código)?\") — só o BRIEF do F2; não é executa. Antes — dono, chat, 2026-11-03: \"Executa PR-0 a PR-6\" (resposta a \"Abro a sessão 3 com o executa do BRIEF BE-INCR-DP-F0-F1?\") — executa do BRIEF de F0+F1 inteiro ([[D-2026-10-28-FLUXO-AUTONOMO]]); não cobre F2 em diante, o BRIEF do SST nem a ponte contábil (F-FOL-1..9). Antes — dono, chat, 2026-11-02: \"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief em outra e o executa na terceira\" + \"Sim, abre agora\" (resposta a \"Abro já a sessão 2 (nó PES-4 + BRIEF de F0 e F1) em cima do branch do #1009?\") — nó e BRIEF de F0+F1; forks do BRIEF por questionário ([[D-2026-11-02-DP-BRIEF-F0-F1]]). Não autoriza código: o 'executa' é da sessão 3 · **EXECUTA F2** (dono, chat, 2026-11-06, questionário): \"Executa o F2\" — BRIEF BE-INCR-DP-F2 inteiro (PR-0R e PR-0..PR-6), sessao-feature, sem merge; dado depois do merge do #1103 pelo #1106"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §9: PR-0/PR-3/PR-5/PR-6 opus-baixo; PR-1/PR-2/PR-4 opus-medio"
atualizado: "2026-11-07"
write_set: ["server/src/features/dp/**", "server/src/controllers/dpModuleController.ts", "server/src/controllers/dpCadastrosController.ts", "server/src/controllers/dpVinculoController.ts", "server/src/controllers/__tests__/dp*.ts", "server/src/routes/dp.ts", "server/src/routes/docs/dp.paths.ts", "server/public/openapi.json", "server/src/__tests__/openapi-paths.test.ts", "server/prisma/schema.prisma", "server/prisma/migrations/**", "server/prisma/data/legal_parameters_dp_v1.sql", "server/prisma/data/legal_parameters_dp_regras_v1.sql", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/legalParameters/models/formatoLinha.ts", "server/src/features/legalParameters/dtos/__tests__/__dto-shapes__.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/test/helpers/templateDb.ts", "server/test/helpers/legalParams.ts", "server/.dependency-cruiser.cjs", "docs/adr/ADR-ARCH-BOUNDARIES.md"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts"]
prs: ["#1010", "#1014", "#1015", "#1016", "#1026", "#1032", "#1036", "#1041", "#1101", "#1103", "#1104", "#1106", "#1125", "#1127", "#1128", "#1129"]
---
# PES-4 — Departamento Pessoal: núcleo + submódulos

**Estado:** `planned` — 05/11: BRIEF do F2 (motor mensal) escrito em docs/accounting/BE-INCR-DP-F2-brief.md (78 itens, PR-0R + PR-0..PR-6; revisto em 06/11 pela regra de parâmetro do dono: número de lei e escala viram dado com vigência, código só com a forma da regra), forks F-DPF-1..13 DECIDIDOS pelo dono em 06/11 (três contra a recomendação: F-DPF-1 divisor pela escala, F-DPF-7 salário-família calcula e avisa, F-DPF-8 outro emprego já no F2; [[D-2026-11-06-DP-BRIEF-F2]]); achado: EC 141/2026 (42 h em 16/12/2026, 40 h em 16/12/2027, 2 dias de DSR) muda o divisor do salário-hora e o DSR (F-DPF-1/2); 06/11: pesquisa das perguntas ao contador (dossiê pesquisas-legais/brief-pes4-f2-contador/, PR #1104) — F-DPF-3 revisto para truncar o INSS por faixa como o eSocial, itens 77–78 pela IN RFB 2.110, F-DPF-10 pela IN RFB 1.500 art. 63, 19 rubricas. Próximo: autorização nova do dono para o executa do F2. Antes — 04/11: F0+F1 entregues na main (681ec26a), squash do #1041. F3..F6, o BRIEF do SST (núcleo, F-DP-13) e a ponte contábil (F-FOL-1..9) seguem pendentes  
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
| F2 — motor mensal | [`BE-INCR-DP-F2-brief.md`](../../accounting/BE-INCR-DP-F2-brief.md) PR-0R, PR-0..PR-6 | BRIEF escrito (05/11, revisto 06/11); forks F-DPF-1..13 decididos (06/11); sem `executa` |
| F3 — folhas especiais | — | sem BRIEF |
| F4 — eSocial (pipeline agnóstico, `Null`/`Manual` primeiro, F-DP-3) | — | sem BRIEF |
| F5 — fechamento, guias, ponte contábil (F-FOL-1..9 pendentes) | — | sem BRIEF |
| F6 — submódulos opcionais (`PES-4-<nome>`) | — | sem BRIEF |

## Lacunas de escopo (06/11) — [[D-2026-11-06-DP-ESCOPO-LACUNAS]]

Cruzamento do plano com a lei e com ERPs de referência. Entram nos BRIEFs que ainda não existem (nenhuma muda o F2):
- **F3:** TRCT; contrato de experiência/prazo determinado; vale-transporte no núcleo (sai do DP-BEN); adicionais de
  insalubridade/periculosidade; estabilidades provisórias no desligamento; férias coletivas; desconto sindical; PLR e
  gorjeta como rubricas.
- **F4:** processo trabalhista (S-2500/S-2501/S-3500/S-5501/S-5503); seguro-desemprego; opção de registro eletrônico
  (S-1000); S-2190, S-2205, S-2206, S-2298.
- **F5:** comprovante anual de rendimentos; alerta de cota de aprendiz/PCD e do Relatório de Transparência Salarial.
- **SST:** PGR, PCMSO, LTCAT, PPP eletrônico, ficha de EPI.

## Docs

- [`BE-INCR-DP-F2-brief.md`](../../accounting/BE-INCR-DP-F2-brief.md) — 05/11, revisto 06/11: 78 itens em PR-0R + PR-0..PR-6 (§0.1: regras legais e escala como dado); forks
  F-DPF-1..13 decididos em 06/11 ([[D-2026-11-06-DP-BRIEF-F2]]); dossiê `pesquisas-legais/brief-pes4-f2/` (inclui a EC 141/2026) e `pesquisas-legais/brief-pes4-f2-contador/` (perguntas ao contador, 06/11)
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

## Handoff da execução do BRIEF do F2 (07/11, depois do PR-2)

O `executa` do F2 (dono, chat, 06/11: *"Executa o F2"*, BRIEF inteiro, `sessao-feature`, sem merge; reconfirmado em
07/11, *"Pode seguir"*) segue valendo para PR-2..PR-6. A sessão do PR-1 parou por higiene de contexto (CLAUDE.md) depois
de abrir o #1128 e despachar o revisor.

**Feito**

| PR | Branch | Itens | Classe | Gates locais | Revisor |
|---|---|---|---|---|---|
| #1125 | `claude/dp-f2-pr0r-4904eb` (base `main` a39ea73a1) | 65–76 (70 parcial: o motor prova no PR-4) | vermelha (migração, parâmetro legal) | tsc, check:arch, 48 unit, 8 suítes de integração, smoke:migration verdes; CI do d98e8498 pegou 2 testes defasados (corrigidos no 321774bb8) | PASSOU (07/11, rodada 1, em 321774bb8: 5 sabotagens pegas; achado não bloqueante — 12×36 do F1 não renomeava — corrigido no 0fcb856b4) |
| #1127 | `claude/dp-f2-pr0` (base `claude/dp-f2-pr0r-4904eb`) | 1–12 | vermelha só pelo título (`classe-risco`: `revisor: não`) | tsc (src e testes), check:arch, 43 unit (`folha/__tests__`) verdes | não se aplica |
| #1128 | `claude/dp-f2-pr1` (base `claude/dp-f2-pr0`) | 13–22, 77–78 + as 5 rubricas `INFORMADO` do 23 | vermelha (migração, parâmetro legal, `auditCanonical`; `revisor: obrigatório`) | tsc (src e testes), check:arch, eslint, 12 suítes unit, 3 de integração, `migrate diff` sem diferença, smoke:migration verdes; snapshot de DTO à mão (só `dp`), CI prova | PASSOU (07/11, rodada 1, em c5ad55649: 5 sabotagens pegas; lacuna de teste do Tier-0 do sub-recurso fechada em b232f187d; `tx`→cliente global não pego, como #1026/#1041; ressalva ao tipo 11 curatelado vai ao contador) |
| #1129 | `claude/dp-f2-pr2` (base `claude/dp-f2-pr1`) | 23 (as 8 restantes: DSR, complementos, afastamento, adiantamento, salário-família; família `DERIVADO`), 24–26 + 8 calculadoras do PR-4 (dono, 07/11: "Escrever agora") | vermelha só pelo título (`classe-risco`: `revisor: não`) | tsc (src e testes), check:arch, eslint, 7 suítes unit, 1 de integração verdes | não se aplica |

O #1127 estava em conflito com a base (só a tabela desta nota) e por isso sem CI; mesclado o #1125 nele em 07/11
(`f03b231d2`), o CI passou a rodar.

**Pendente:** PR-3 (27–33) → PR-4 (34–47) → PR-5 (48–58; inclui marcar a folha desatualizada no lançamento, item 16/52) → PR-6 (59–64), em pilha sobre o #1129.

**Item 24, decidido pelo dono (chat, 2026-11-07: *"Escrever agora"*):** o PR-2 escreveu as calculadoras que o BRIEF punha no PR-4: `descontoFaltas`, `diasRepousoPerdidos`/`dsrPerdido` (36), `afastamentoEmpresa` (32), `adiantamento`/`descontoAdiantamento` (42–43), `salarioFamilia` (15/F-DPF-7, só a forma, aviso sem a tabela), `salarioHorista` (37) e `valorInformado` (38). Ficam em `models/folha/` e são ligadas pelo `rubricaCalculo.ts`. **O PR-4 só as consome.** O que o PR-3/PR-4 herdam: `diasRepousoPerdidos` pede as **datas** das faltas, e o lançamento `MANUAL` de `FALTAS` não tem data (lacuna para o snapshot e a porta). O `afastamentoEmpresa` não decide o motivo (fatiamento, item 32). O percentual do adiantamento chega como argumento (o `DpParametrosFolha` é do PR-5). O salário-família recebe a remuneração somada dos vínculos e a contagem de elegíveis; a proporcionalidade na admissão vai ao contador. O DSR do horista não tem rubrica própria. A ordem do item 35 não dá lugar ao `SALARIO_FAMILIA`.

**Leituras do PR-1 que os seguintes herdam** (13 lacunas no corpo do #1128): o reset não classifica os 3 models novos
(sem `userId`; bloqueiam via trabalhador/vínculo); todo write de lançamento e outra remuneração pede o chaveiro do DP
(F-DPF-9 b, 503 sem ele); `FALTAS` em minutos; HE só no 101 (CLT art. 432); `invalido`, `ordem` e
`categoriaOutraFonte` entraram no schema pelo item, não pelo §3.3; pela HTTP o lançamento é sempre `MANUAL`;
`DpPendenciaFolha` e `DP_PENDENCIA_CODIGOS` já existem em `models/folha/pendencias.ts` (o motor do PR-4 reusa);
`inssComOutrasFontes` (item 78) está em `models/folha/outrasRemuneracoes.ts`.

**Duas lacunas de spec (as duas decididas pelo dono em 07/11):**

1. **Ordem PR-1 × PR-2.** O item 17 valida o lançamento contra rubrica `INFORMADO` do catálogo, mas o catálogo de hoje
   só tem rubricas `CONTRATUAL` e `LEGAL`; `COMISSAO`, `FALTAS` e as HE chegam no PR-2 (item 23). Com a ordem do BRIEF, o
   PR-1 só consegue testar a recusa do `POST` de lançamento. Opções: (a) PR-2 antes do PR-1 na pilha; (b) PR-1 com os
   lançamentos testados só na recusa e o teste positivo no PR-2; (c) o PR-1 já traz as rubricas `INFORMADO` do item 23.
   **Decidido (dono, chat, 2026-11-07): *"PR-1 já com INFORMADO"*** → (c). O PR-1 traz, do item 23, as rubricas que o
   lançamento informa: `COMISSAO` e `FALTAS` (o item 23 as diz `INFORMADO`) e `HORA_EXTRA_50`, `HORA_EXTRA_100` e
   `ADICIONAL_NOTURNO` (as "rubricas de jornada" que o item 19 manda lançar em minutos; leitura, registrar no corpo do
   PR). Natureza e incidência de cada uma pelo dossiê §9, com `published.json` e o teste do item 52 do F0+F1. O resto do
   item 23 (`DERIVADO`, `ADIANTAMENTO`, `SALARIO_FAMILIA`, `AFASTAMENTO_EMPRESA_15D`) e os itens 24–26 ficam no PR-2.
2. **Tempo parcial no F-DPF-6 (PR-4).** O piso proporcional vale "só para `tipoJornada` de tempo parcial", mas o domínio
   `tpJornada` do S-2200 não tem esse código e a `DpJornada` não tem o `tmpParc`. O PR-0 entregou só a forma
   (`pisoProporcional`); falta decidir de onde o motor tira "é tempo parcial".
   **Decidido (dono, chat, 2026-11-07, questionário na sessão do PR-0R; repassado pela sessão dp-f2-executa):
   *"Campo novo na jornada (Recommended)"*** → booleano `tempoParcial` na `DpJornada`, como o `tmpParc` do S-2200 (CLT
   art. 58-A), marcado pelo operador e falso por padrão; o piso proporcional do F-DPF-6 só vale com ele verdadeiro. Entra
   no PR-4 (campo + migração + DTO da jornada). Na mesma rodada o dono confirmou a 1ª: *"PR-1 com as rubricas"*.

**Próximo comando:** sessão nova com `sessao-feature`: `git fetch` e `git checkout -b claude/dp-f2-pr3 origin/claude/dp-f2-pr2`; `node scripts/worktree-deps.mjs` e `cd server && npx prisma generate`; ler o BRIEF §2 PR-3 (itens 27–33: `DpSnapshotService.montar`, forma canônica e hash, PII fora, `fatiar`, dias devidos, afastamento no fatiamento); PR com `gh pr create --base claude/dp-f2-pr2`.

**Como o PR-1 fez o que o depósito defasado impede (repita):** snapshot de DTO — `UPDATE_DTO_SNAPSHOT=1` num commit WIP,
copiar só as entradas novas de `dp` e os `.gen.ts` novos, reverter o resto, e aplicar duas trocas (padrão do cuid
`^[cC][^\s-]{8,}$` → `^[cC][0-9a-z]{6,}$`; `anyOf [{type: X}, {type: null}]` sem outra chave → `type: [X, "null"]`),
conferindo que a troca reproduz as entradas já comitadas. OpenAPI — gerar só o `routes/docs/dp.paths.ts` com o
`swagger-jsdoc` de `server/`, conferir que os paths antigos saem idênticos e inserir os novos depois do último `/api/dp/*`.
`smoke:migration` pede `server/prisma/prisma/dev.db` copiado do checkout principal. **Model novo com `deletedAt`** entra
na allowlist de `server/src/jobs/PurgeDeletedRecords.ts` (o DP é `contabil-fiscal`), senão o `purgeAllowlist.test.ts`
reprova no CI (pegou o PR-1 no f7ce475a7; corrigido no b80cec8b1). Heredoc do Git Bash quebra Python
com `\n`/aspas: escreva o script com a ferramenta Write.

**Leituras do PR-0 que o motor (PR-4) herda** (detalhe no corpo do #1127): `jaContribuidoCents` do `inssEmpregado` é a
**base** já tributada (o `A` do item 78), não o INSS em reais; o último dia do mês conta como o dia 30 do mês comercial;
o salário-hora segue como fração exata e só o valor da rubrica arredonda.

**Armadilhas novas (07/11)**

- Worktree nova com o `node_modules` do depósito: o cliente Prisma sai em `server/generated/prisma` da própria worktree e
  pode nascer velho (tsc acusa `minutosPorDia` inexistente). Rode `cd server && npx prisma generate` antes do `tsc`.
- `Competencia` é tipo de marca (`brand`): nos testes, `'2026-03' as Competencia`.

- **Depósito de dependências defasado** (`~/.luminaris-deps/ws-6a1b638cfb55`): `zod` 4.1.8 (o `package.json` pede ^4.6.7),
  `@xmldom/xmldom` sem `package.json`, `glob` que não casa `\`. Efeitos no `HEAD`: `tsc` com erros em `nfe(s)Signature.ts`,
  57 schemas de outros domínios reprovando o snapshot de DTO, `openapi-paths` com 0 paths. O `worktree-deps.mjs` saiu 0 sem
  corrigir. Snapshot: aplique à mão sobre o `HEAD` só os campos novos (o regex de cuid e o `nullable` do zod local diferem do
  CI). OpenAPI: gere com as globs do `scripts/generate-openapi.js` convertidas para `/` (script no scratchpad da sessão:
  `options` exportado + `swagger-jsdoc` resolvido de `server/`) e copie só os paths `/api/dp/*`.
- **Criar jornada exige escala** (`diasTrabalho` + `minutosPorDia`); fixture nova de jornada leva os dois.
- `assertIdadeEPrazo(d, regras)` e `periodosDeFerias(..., meses)` agora pedem as regras: nos testes, `regrasIdadeDaCategoria`
  e `mesesFerias` sobre `legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP_REGRAS)`.
- Git Bash converte argumento `/api/...` em caminho do Windows: `MSYS_NO_PATHCONV=1`.

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

**Pendente:** o `executa` do BRIEF do F2 (forks F-DPF-1..13 decididos em 06/11), que pede autorização nova do dono. O `executa` de 03/11 cobria só F0+F1.

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
