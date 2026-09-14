# Cédula de decisão — 2026-09-14 — entrevista "fechar todas as decisões humanas"

> Dono, por questionário (`AskUserQuestion`, 4 rodadas × 4 perguntas, 16/16 respondidas), na sessão que
> executou o P0 de boot e o ensaio B-4 (PR #318). Cada linha abaixo é **autorização citável** (ORCH-006)
> para a sessão indicada. Contexto de cada pergunta: `BE-INCR-NFE-COST-REGIME-brief.md` §3 (F-X6),
> `CEDULA-DECISAO-2026-09-10-entrevista.md` §3 (R5–R8), grafo 11/09 §3 (R9/R10), fold #317 (X4-14),
> `RUNBOOK-H1-PVA.md` A1 (SEED-MY). R2 (pergunta 26) já estava ratificada em 11/09 — não reaberta.
> **Duas respostas foram CONTRA a recomendação do agente** (F-X6-3, R7) — marcadas ⚠️ e com a consequência
> escrita. Gates de execução humana (B-4 assinar, H1, H2, H3, X2, M2) e dado externo (D1/D1f/D8, D2, D5,
> D6, D-NFSE) **não são decisões** e seguem abertos.

## 1. Custo D3 por tenant — BRIEF `BE-INCR-NFE-COST-REGIME` (#309) — 6 forks RATIFICADOS

| Fork | Decisão | Consequência para a sessão de feature |
|---|---|---|
| F-X6-1 | **(a)** `FiscalProfile` Prisma por escopo, agora | Mesma entidade do F-DFE-6; DFE acrescenta colunas. Fase 0 do BRIEF destravada |
| F-X6-2 | **(a)** parser lê ICMS por item (MOC 7.0 grupo N) | Estender transcrição F0-2 + parser; fixture mista (itens com/sem crédito) obrigatória |
| F-X6-3 | ⚠️ **(b)** subtrair crédito de PIS/COFINS **já** — contra a recomendação | Ativa F-X6-4. Regra de implementação decidida na pergunta seguinte |
| F-X6-3 exceções | **Regra base + exceções como dado configurável**: 9,25% sobre (vProd − vICMS) só em `NAO_CUMULATIVO`; monofásico = flag por produto; IPI-na-base e fornecedor-do-Simples = flags no `FiscalProfile` com default **sem crédito** (conservador) | Nenhuma exceção vira `if` fixo (F-COB-1 → b). Contador valida os defaults depois (D1 item novo: "defaults do crédito PIS/COFINS") — vira linha no pedido ao contador |
| F-X6-4 | **(a)** monofásico = atributo do produto (NCM/flag) — **ativo** por causa do F-X6-3 (b) | Campo no preset `products` (DynamicTable) ou no `FiscalProfile`? → o BRIEF decide pela fronteira §2.1 (atributo de cadastro = preset) |
| F-X6-5 | **(a)** não reprocessar notas antigas | Zero código; `payables` real vazia |
| F-X6-6 | **(a)** bloquear 400 sem perfil fiscal | H2 (parte NF-e) e onboarding (I1/W) ganham o passo "cadastrar perfil fiscal" |

**Sessão:** `sessao-feature` sobre o BRIEF #309, com emenda prévia do BRIEF (docs) registrando F-X6-3 (b) +
regra de exceções. **Regras fiscais f1–f5 [NC]** do §4 continuam [NC] — o crédito entra com defaults
conservadores e pendência nomeada ao contador.

## 2. Plataforma / DFE / financeiro

| Ref | Decisão | Consequência |
|---|---|---|
| **R8** | **Instância = CNPJ raiz; unidade = filial com conta de emissão própria.** `units.cnpj` fica (matriz/filiais do mesmo cliente); chave do parceiro por instância, conta por unidade | **Emenda ao `ADR-INCR-DFE` F-DFE-2**: de "1 chave para N CNPJs" para "1 chave por instância, 1 conta por unidade/CNPJ". Critério de seleção D5 muda: parceiro precisa suportar N contas sob 1 chave. `FiscalProfile` por `unitId` (F-X6-1) fica coerente. R4 (onde vive a credencial) decorre: chave do parceiro no ambiente da instância; id da conta por unidade no `FiscalProfile` — **não é decisão nova, é consequência; confirmar na emenda do ADR** |
| **R9** | **(b)** tabela irmã `BankReturnPendingItem` (confirm/reject humano + policy financeira própria) | F7 BRIEF: não toca `ReconcilePending`/job de venda (#296/#308). 1 model + migração aditiva |
| **R10** | **Adiar o ADR P-IA até D6 (convênio bancário) existir** | Premissa registrada para o futuro ADR: *extração propõe, humano confirma, razão só aceita o confirmado*. Cruza com `docs/tech-debt/rag-vector-store-reanalysis.md` |
| **R5** | **Não contratar o Integra Contador agora; X7 nasce com adaptador (port)** | X7: gera dado + arquivo/entrada manual no MIT; envio atrás de interface para plugar Serpro quando houver tenant pagando |
| **R6** | **Manter F-M6 (contábil → financeiro → fiscal) + exceção da emissão quando D5 existir** | Status quo do grafo 11/09 §4 |

## 3. P2 (clínica)

| Ref | Decisão | Consequência |
|---|---|---|
| **R7** | ⚠️ **Emendar o perímetro zero-diff: autorizar tocar `DynamicTableService.installPresetAsSystem`** para gravar o T0 — contra a recomendação (controller) | Emenda ao `ADR-P2` §2 listando a exceção **antes** do código; `proveP2ZeroDiffCli.ts` ganha allowlist explícita **só desse símbolo**, com teste-guarda que falha se a allowlist crescer. Comportamento 11 sai de PAUSADO → `sessao-feature`. Risco declarado: a prova zero-diff deixa de ser absoluta — o guarda da allowlist é o que resta |

## 4. Autorizações de execução (fila)

| Item | Decisão | Sessão / ordem |
|---|---|---|
| **SEED-MY** | **Autorizado: entra na §5.1 Bloco A e executa ANTES do H1 2ª passada** — seed 2025+2026 (períodos, lançamentos, AP/AR, chart completo com `1.1.6/3.3/4.2`) | BRIEF curto (`sessao-planejamento`) → `job-generator`. Pré-condição: B-4 assinado (backup = rollback) |
| **X4-14** | **Autorizado agora**: aviso no diagnóstico para ajuste parcial sem M312 (4 agregados K155/K355 sobre postings) | `sessao-planejamento` (emenda BRIEF 3C) → `sessao-feature`; antes do H1 2ª passada |
| **#315** | **Review independente agora; merge no PASS** (loop ratificado: PASS + tsc + CI → merge) | agente isolado em worktree |
| **BRIEFs contábeis** | **Todos: C11 → C12 → C6b → ADR C8** | `sessao-planejamento` cada; forks voltam ao dono; nenhum código sem "executa" |

## 5. Ordem de execução resultante (agente, sem nova pergunta)

1. Review independente do **#315** → merge no PASS.
2. **SEED-MY** BRIEF → seed (após assinatura do B-4 pelo dono).
3. **X4-14** emenda + feature.
4. **X6** emenda do BRIEF (F-X6-3 b + exceções) → `sessao-feature`.
5. **C11 → C12 → C6b** BRIEFs → **C8** ADR.
6. Emendas docs decorrentes: `ADR-INCR-DFE` F-DFE-2 (R8), `ADR-P2` §2 (R7), pedido ao contador (+ defaults PIS/COFINS).
7. Fold do master map + grafo 14/09 com esta cédula.

**Continua do dono:** assinar B-4 (#318) · X2 · H1 2ª passada (PVA + D8) · H2 · H3 · M2 · canal com contador/parceiro.

Vieses deste registro: as recomendações foram do mesmo agente que vai executar — as duas respostas contra
(F-X6-3, R7) estão marcadas para que o revisor independente as leia como decisão do dono, não como desvio
do implementador.
