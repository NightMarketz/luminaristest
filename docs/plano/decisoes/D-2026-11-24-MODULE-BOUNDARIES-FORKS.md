---
id: "D-2026-11-24-MODULE-BOUNDARIES-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks do ADR-MODULE-BOUNDARIES (F-MB-1..12) — questionário do dono em 24/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Sim, abrir forks\" e \"Sim, retomar\"; questionário (AskUserQuestion) em 4 blocos. Respostas literais: F-MB-8 → \"Tudo já, com baseline\"; F-MB-1 → \"Pasta public/\"; F-MB-2 → \"Tudo via index\"; F-MB-9 → \"detalhar melhor\" e, na pergunta detalhada, \"Porta de leitura no motor (Recommended)\"; F-MB-3 → \"Aqui precisamos de muito mais detalhe\" e, na pergunta detalhada, \"Porta estreita de dados (Recommended)\"; F-MB-4 → \"domain/ + ports/ + adapters/ (Recommended)\"; F-MB-5 → \"Mover para domain/ (Recommended)\"; F-MB-6 → \"Nomear as 3 CLIs (Recommended)\"; F-MB-7 → \"Separar o kit (Recommended)\"; F-MB-10 → \"Mover para features/\"; F-MB-11 → \"Regra no ESLint do server (Recommended)\"; F-MB-12 → \"Mover as pastas no mesmo PR (Recommended)\". Escopo: ratificar forks. Não é 'executa'."
atualizado: "2026-11-24"
---
# D-2026-11-24-MODULE-BOUNDARIES-FORKS — forks do ADR-MODULE-BOUNDARIES

**Estado:** `decided`
**Autorização:** dono, 2026-11-24, questionário (respostas literais no cabeçalho). Escopo: **ratificar forks**.
Não autoriza BRIEF nem código: ligar regra e mover pasta pedem BRIEF (`sessao-planejamento`) e "executa".

Base: `docs/adr/ADR-MODULE-BOUNDARIES.md` §7 (forks F-MB-1..10, propostos em 20/10) e §10 (emenda de 24/11, com
F-MB-11 e F-MB-12, nascidos nesta rodada).

> **Colisão de nome.** `F-MB-1..6` também identifica os forks de
> [[D-2026-10-31-MODULOS-BASE-SUBMODULOS]] (módulos base e submódulos). São conjuntos diferentes. Fora deste arquivo
> e do ADR, cite estes como "F-MB-n do ADR-MODULE-BOUNDARIES".

## Origem

O dono colou uma proposta de arquitetura modular em base única (event store, outbox, process managers, schema por
módulo) e pediu a comparação. Conclusão da sessão: o núcleo de event sourcing bate no `ADR-DOMAIN-MOTOR-rejected.md`
e na decisão de ficar no SQLite; a parte aproveitável é o isolamento entre módulos, que já tinha destino neste ADR.
Dois contra-pareceres colados na sequência levaram à leitura do sync, do reconcile e dos plugins do motor, e a duas
decisões que o ADR de 20/10 não tinha: F-MB-11 (posse de model) e a opção nova do F-MB-3 (porta estreita).

## Forks

| Fork | Decisão | Recomendação seguida? |
|---|---|---|
| F-MB-1 forma da API pública | **(b)** pasta `features/<x>/public/` com arquivos explícitos | não (rec. era o barrel `index.ts`) |
| F-MB-2 `models/` e `dtos/` | **(a)** tudo pela API pública, sem liberar `models/`/`dtos/` como folhas. Baseline da M1 = 264 | não (rec. era liberar; 180) |
| F-MB-3 `dynamicTables/rules` | **(c), opção nova:** porta estreita `RuleDataAccess` no `RuleContext` (8 métodos de linha, presa à mesma transação) no lugar do `IDynamicTableRepository` inteiro (31 métodos); funções puras dos plugins vão para `domain/`; `rules/` entra no `LAYER_DIR` como pasta do motor, fora da D1 | sim (da pergunta detalhada) |
| F-MB-4 nomes das pastas | **(a)** `domain/` + `ports/` + `adapters/` | sim |
| F-MB-5 `fixtures/` de produção | **(a)** dado de kit/binding vai para `domain/`, depois de `computeCompiledFromHash` virar função pura | sim |
| F-MB-6 exceções do J1 | **(a)** as 3 CLIs de migração única e `jobs/repositories/` isentas por nome; `app.ts`/`server.ts` como composition roots | sim |
| F-MB-7 kit do `features/dashboard` | **(a)** UI genérica para `components/`, contrato de dado para `lib/`, com Contrato §0 e skills no mesmo PR | sim |
| F-MB-8 quando ligar | **(a)** todas as regras ligam já, com baseline | não (rec. era por fase) |
| F-MB-9 leitura do motor | **(a)** `DynamicTableReader` exposto pela API pública de `dynamicTables`, com a guarda de posse num lugar só | sim |
| F-MB-10 `Navbar → user.service` | **(b)** o `Navbar` sai de `components/` e vai para uma feature (sem exceção na U8) | não (rec. era exceção nomeada) |
| F-MB-11 posse de model do Prisma (novo) | **(a)** mapa model → feature dona versionado + regra no ESLint do server: mutação de um model só dentro de `repositories/` da dona. Exceção explícita à regra ⛔ do `CLAUDE.md` raiz, no molde do `no-console` (23/10) | sim |
| F-MB-12 M2 × presets (novo) | **(a)** o PR que liga a M2 já move as pastas (o passo P4 sobe para o começo); não há período com duas pastas | sim |

## Consequências que a combinação das respostas cria

1. **F-MB-1 (b) muda o texto de M1 e U9.** O alvo permitido deixa de ser `features/<x>/index.ts` e passa a ser
   `features/<x>/public/**`. O `analytics/index.ts` (que já tentava o barrel) migra para `public/`.
2. **F-MB-2 (a) + F-MB-8 (a):** com a M1 ligada já e sem `public/` em nenhuma feature, todo import novo entre
   features exige criar o arquivo em `public/` da feature alvo no mesmo PR. É o efeito pretendido, e é custo de todo
   PR que cruza feature a partir da ligação.
3. **F-MB-8 (a) + F-MB-12 (a):** a ordem de pagamento do §4 do ADR muda. P4 (mover pastas, ligar M2 + D1) deixa de
   ser o quinto passo e vai junto da ligação. `dynamicTables/presets` é choke point e tem PRs abertos
   (BUILDER-VERTICAIS PR-5/PR-6): o BRIEF precisa marcar a janela e a ordem de rebase.
4. **F-MB-3 (c)** mexe em `rules/RuleTypes.ts`, arquivo do motor. Não é o caso "PARE" do `CLAUDE.md` (nenhum serviço
   Prisma entra no `RuleContext`; o contrato encolhe). Fica aberto, e registrado na caixa: o plugin ainda grava em
   outra tabela sem passar pela validação dela, e a lógica de venda/CRM mora dentro da feature do motor.
5. **F-MB-11 (a)** é exceção nova à regra ⛔ ("não monte aparato de auditoria novo"): entra no `CLAUDE.md` raiz no
   mesmo PR que ligar a regra, com a data desta decisão.

## O que esta decisão não faz

- Não liga regra, não move arquivo, não cria `public/`. O ADR passa a **Accepted**, e o código espera BRIEF e
  "executa".
- Não reabre o `ADR-DOMAIN-MOTOR-rejected.md`. O critério técnico discutido na sessão para um outbox futuro ("efeito
  que não se reconstrói do estado persistido") é candidato a emenda do §3 daquele ADR, sem decisão.
- Os baselines citados (264, 45, 823, 16, 40) são a medida de 20/10 (`310a92b4`). O BRIEF mede de novo antes de
  gravar baseline.

## Lacunas registradas na mesma sessão (caixa do maestro)

- `L-20261124-121825-cd20` — relatórios e fechamento de período não enxergam pendência da ponte operacional → razão.
- `L-20261124-121825-c210` — sem medida de BP/DRE por volume nem limiar para saldo de fechamento.
- `L-20261124-122510-72d3` — `reconcilePayables`/`reconcileReceivables` só rodam por rota manual.
- `L-20261124-122512-aaf4` — pendência transitória só volta a ser tentada pelo rescan manual (fork).

- `L-20261124-132219-5a73` — plugin do motor grava em outra tabela sem a validação dela; lógica de venda/CRM dentro do motor (fork, aberto do F-MB-3 c).
