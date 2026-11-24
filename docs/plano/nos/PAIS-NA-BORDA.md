---
id: "PAIS-NA-BORDA"
tipo: "plataforma"
dominio: "plataforma"
titulo: "País na borda: centro em inglês, país em features/<dominio>/paises/<cc>/; guarda P1/P2 no check:arch e fatias F0–F8 do existente (ADR-PAIS-NA-BORDA)"
estado: "planned"
estado_detalhe: "24/11: ADR-PAIS-NA-BORDA Accepted (R1–R7, F-PBA-1..7 na recomendação, F-PNT-PB-1 → b; [[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]]). Os 5 BRIEFs com executa foram emendados pela regra (PR #1338). Fatias F0–F8 com prazo (F-PBA-6 a); a F0 (guarda) é o item 0 do PR-0 do montador único; F1..F8 pedem BRIEF e executa próprios. Próximo: BRIEF da F1 (razão × fiscal BR) e o da F3 (registro de formato de LegalParameter por domínio e país), que vem antes do PR-0 do CICLO-FISCAL e do PR-P0 da ponte do DP (F-PBA-7 a)"
depende_de: ["[[D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA]]", "[[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]]"]
autorizacao: "dono, chat, 2026-11-24, questionário (AskUserQuestion) a pedido dele: ratifica o ADR-PAIS-NA-BORDA e os prazos e o dono das fatias (F-PBA-6 a: o nó nasce neste fold) — não é executa de nenhuma fatia; a F0 roda dentro do executa do BRIEF do montador único (D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA §4 e §6)"
ancora_sdd: "§IV.1 (P-i18n, lei preventiva)"
atualizado: "2026-11-24"
prs: [1338, 1334]
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "cada fatia F1..F8 pede BRIEF próprio; a F0 está no BRIEF do montador único (item 0)"
write_set: ["docs/adr/ADR-PAIS-NA-BORDA.md", "docs/adr/ADR-ARCH-BOUNDARIES.md", "server/.dependency-cruiser.cjs", "server/src/features/*/paises/**", "server/src/features/*/ports/**"]
registros: ["server/src/lib/factory.ts", "server/prisma/schema.prisma"]
---
# PAIS-NA-BORDA — conceito universal no centro, país na borda

**Estado:** `planned`. **ADR:** [`ADR-PAIS-NA-BORDA.md`](../../adr/ADR-PAIS-NA-BORDA.md), Accepted em 24/11/2026.
**Autorização:** frontmatter. Cada fatia pede `executa` próprio do dono.

## Fatias (ADR §5; prazos ratificados, F-PBA-6 a)

| # | Fatia | Prazo | Onde está |
|---|---|---|---|
| F0 | Guarda `P1`/`P2` + ajustes G1–G5 | com o 1º PR de código emendado | item 0 do PR-0 do montador único (`EFICIENCIA-FISCAL`) |
| F1 | Razão × fiscal BR em `features/accounting` | 18/12/2026 | sem BRIEF |
| F2 | Primitivas de plataforma, allowlist por domínio, slots de moeda e fuso | 29/01/2027 | sem BRIEF |
| F3 | Registro de formato de `LegalParameter` por domínio e país; vigência em código depois do F-ML-0 | **antes** do PR-0 do ciclo e do PR-P0 da ponte | sem BRIEF |
| F4 | Formato de documento do motor DynamicTable por registro | 26/02/2027 | sem BRIEF |
| F5 | Fiscal BR com nome de instância e o escopo `LEGADO_BR` | 31/03/2027 | sem BRIEF |
| F6 | Models mistos (27), um por mês | 04/2027 a 09/2027 | sem BRIEF |
| F7 | DP existente | junto do F3 do DP | sem BRIEF |
| F8 | Libs fiscais puras de `lib/` | 30/06/2027 | sem BRIEF |
| — | Fim da convivência (`LEGADO_BR` vazio) | 31/12/2027 | — |

## Docs

- [`ADR-PAIS-NA-BORDA.md`](../../adr/ADR-PAIS-NA-BORDA.md) e [`PRE-ADR-PAIS-NA-BORDA.md`](../../adr/PRE-ADR-PAIS-NA-BORDA.md).
- Decisões: `D-2026-11-15-PAIS-NA-BORDA` (publicada no PR #1334), [[D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA]], [[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]].
- BRIEFs emendados pela regra (24/11): [[EFICIENCIA-FISCAL]] (montador único), [[CICLO-FISCAL]], [[NFSE-PAULISTANA]],
  [[PES-4]] (ponte do DP), [[SIMULACAO-CENARIO]] (PR-0).
