---
id: "D-2026-11-15-PAIS-NA-BORDA"
tipo: "decisao"
dominio: "plataforma"
titulo: "País fica na borda, sempre: contabilidade, DP e financeiro são conceitos universais no centro (direção do dono, 15/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-15: \"Na realidade vc já contou errado, precisamos definir uma regra onde o país fica na borda, sempre, pq conceitos de contabilidade, DP e financeiro são universais, temos que separar melhor\"; antes, 2026-11-14: \"deixar desacoplado desde já tudo é uma boa prática mesmo se não internacionalizar ainda\" — decide a direção e autoriza o PRE-ADR; não ratifica a redação da regra nem os forks F-PB-1..9; não é 'executa'"
atualizado: "2026-11-15"
---
# D-2026-11-15-PAIS-NA-BORDA — país na borda, sempre (15/11/2026)

**Estado:** `decided` quanto à **direção**. A redação da regra (R1–R6) e os forks F-PB-1..9 estão **RATIFICAÇÃO PENDENTE**
em `docs/adr/PRE-ADR-PAIS-NA-BORDA.md`. **Autorização:** dono, chat (frontmatter).
Contexto: [[LEGAL-REGRAS]], [[LEGAL-PARAMS]], [[PES-4]], [[D-2026-11-14-MOTOR-DE-LEIS]].

## O que o dono decidiu

1. Contabilidade, DP e financeiro são **conceitos universais**: ficam no centro.
2. O que é de um país fica **na borda, sempre**. Não é regra só do razão, nem só para quando houver segundo país.
3. A separação de hoje é insuficiente: *"temos que separar melhor"*.

## O que foi corrigido

A contagem de 14/11 (`docs/accounting/inventario-brasil-2026-11-14/`) media **termos em português**, não **país**, e por
isso classificou como "Brasil" conceitos universais (folha, rubrica, férias, alíquota, plano de contas). A conclusão
"175 de 402 arquivos da contabilidade são Brasil" foi **retirada**. Medida por conceito, no schema: 146 models — 19 com
instância brasileira no nome, 27 universais no nome com campo de instância brasileira, 100 sem instância (teto). Detalhe e
limites no PRE-ADR §3.

## O que não muda

- Não abre segundo país: a fase P-i18n e a decisão T9 (BRL-only) seguem com o gatilho que têm.
- [[R-motor-regras]] e [[R-motor-dominio]] continuam rejeitados.
- Nenhum código, nenhum BRIEF em curso (F2 do DP, motor de leis) é alterado por este registro.

## Revisão independente (15/11) — o que ficou para o dono

Relatório em `docs/adr/revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md`; incorporado ao PRE-ADR (§7 de lá).
A direção não mudou. Três perguntas são só do dono: (1) "desde já" inclui migrar o **dado existente** antes de haver
segundo país (F-PB-7)? (2) aceita dois regimes convivendo, e com que prazo (F-PB-9)? (3) o primeiro corte é razão ×
fiscal brasileiro dentro de `features/accounting` (F-PB-8)? A regra emenda o "nunca por completude de mapa" da fase
P-i18n para código e dado **novos**; estender ao dado existente é uma segunda emenda.

## Próximo passo

Ratificar a regra e os forks do PRE-ADR. Depois: ADR com a guarda no `check:arch`, classificação por leitura de
`features/accounting` e `features/dp` em centro × borda, e BRIEF por fatia.

**Publicação (24/11):** escrito em 14–15/11 na worktree `claude/personal-dept-coverage-c7fea7` e publicado em 24/11 sem mudar o conteúdo, só com esta nota e com o link ao PRE-ADR trocado por caminho em texto (o PRE-ADR entra pelo PR #1331). Os forks do país na borda (F-PB-1..9) foram ratificados em 24/11 (`docs/plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`, PR #1331), e a regra reescrita está em `docs/adr/ADR-PAIS-NA-BORDA.md` (PR da sessão de planejamento de 24/11, branch `claude/adr-pais-na-borda-emendas`). Lacuna de origem: `L-20261124-032018-f96d`.
