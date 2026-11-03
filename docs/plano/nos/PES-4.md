---
id: "PES-4"
tipo: "plataforma"
dominio: "pessoal"
titulo: "Departamento Pessoal (folha + eSocial) — núcleo first-class sempre ligado + submódulos opcionais com ativação por competência; fase 2 do F-PES-0"
estado: "inflight"
estado_detalhe: "03/11: sessão 3 executando o BRIEF de F0+F1 (BE-INCR-DP-F0-F1-brief.md), um PR por fatia, empilhados sobre o #1010. Feito: PR-0 #1014 (itens 1–7: feature dp, competência e vigência puras, DpErrorReason, regra D1 no check:arch com emenda datada e prova por plantio). A seguir: PR-1..PR-6. F2..F6 e o BRIEF do SST (núcleo, F-DP-13) ainda sem BRIEF; F-FOL-1..9 da ponte contábil pendentes"
depende_de: ["[[D-2026-11-02-DP-PRE-ADR]]", "[[D-2026-11-02-DP-BRIEF-F0-F1]]", "[[D-2026-10-12-QUESTIONARIO-DONO]]", "[[LEGAL-PARAMS]]", "[[IRRF-DISTRIBUICAO]]", "[[I6]]"]
autorizacao: "dono, chat, 2026-11-03: \"Executa PR-0 a PR-6\" (resposta a \"Abro a sessão 3 com o executa do BRIEF BE-INCR-DP-F0-F1?\") — executa do BRIEF de F0+F1 inteiro ([[D-2026-10-28-FLUXO-AUTONOMO]]); não cobre F2 em diante, o BRIEF do SST nem a ponte contábil (F-FOL-1..9). Antes — dono, chat, 2026-11-02: \"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief em outra e o executa na terceira\" + \"Sim, abre agora\" (resposta a \"Abro já a sessão 2 (nó PES-4 + BRIEF de F0 e F1) em cima do branch do #1009?\") — nó e BRIEF de F0+F1; forks do BRIEF por questionário ([[D-2026-11-02-DP-BRIEF-F0-F1]]). Não autoriza código: o 'executa' é da sessão 3"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §9: PR-0/PR-3/PR-5/PR-6 opus-baixo; PR-1/PR-2/PR-4 opus-medio"
atualizado: "2026-11-03"
write_set: ["server/src/features/dp/**", "server/src/controllers/dpModuleController.ts", "server/src/controllers/dpCadastrosController.ts", "server/src/controllers/dpVinculoController.ts", "server/src/controllers/__tests__/dp*.ts", "server/src/routes/dp.ts", "server/src/routes/docs/dp.paths.ts", "server/public/openapi.json", "server/src/__tests__/openapi-paths.test.ts", "server/prisma/schema.prisma", "server/prisma/migrations/**", "server/prisma/data/legal_parameters_dp_v1.sql", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/legalParameters/models/formatoLinha.ts", "server/src/features/legalParameters/dtos/__tests__/__dto-shapes__.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/test/helpers/templateDb.ts", "server/test/helpers/legalParams.ts", "server/.dependency-cruiser.cjs", "docs/adr/ADR-ARCH-BOUNDARIES.md"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts"]
prs: ["#1010", "#1014"]
---
# PES-4 — Departamento Pessoal: núcleo + submódulos

**Estado:** `inflight` — 03/11: sessão 3 executando o BRIEF de F0+F1 (BE-INCR-DP-F0-F1-brief.md), um PR por fatia, empilhados sobre o #1010. Feito: PR-0 #1014 (itens 1–7: feature dp, competência e vigência puras, DpErrorReason, regra D1 no check:arch com emenda datada e prova por plantio). A seguir: PR-1..PR-6. F2..F6 e o BRIEF do SST (núcleo, F-DP-13) ainda sem BRIEF; F-FOL-1..9 da ponte contábil pendentes  
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
| F0 — fundação | [`BE-INCR-DP-F0-F1-brief.md`](../../accounting/BE-INCR-DP-F0-F1-brief.md) PR-0, PR-1 | em execução (03/11): PR-0 #1014 |
| F1 — cadastros e tabelas legais | idem, PR-2..PR-6 | em execução (03/11) |
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
