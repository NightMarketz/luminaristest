# ADR-P2 — O segundo vertical: provar a prensa

> **Status: Draft — PRE-ADR; F-P2-1 e F-P2-2 RATIFICADOS, F-P2-3/F-P2-4 PENDENTES.** Nada roteável sem
> ratificação do dono (ORCH-006). **Depende de ADR-P1 Accepted + implementado + golden test verde.**
>
> **RATIFICAÇÃO 2026-08-21 (dono, via AskUserQuestion): F-P2-1 → CLÍNICA ESTÉTICA.** Decisão
> corroborada a posteriori pelo achado OQ-1 do `docs/accounting/P2-DOSSIER-prova.md`: o
> `PresetMatcher` já resolveria "barbearia" para o preset `beautySalon` existente
> (`PresetKnowledgeBase.ts:17`) — a prova com barbearia seria trivialmente verdadeira sem exercitar
> a prensa. Clínica estética exige customização real (campos novos em `customers`) e por isso é a
> prova honesta do anel 1. F-P2-3 e F-P2-4 seguem abertos.
>
> **RATIFICAÇÃO 2026-08-22 (dono, via AskUserQuestion): F-P2-2 → (a) TENANT-FIXTURE INTERNO
> SINTÉTICO.** Isola a variável sob prova (a prensa, não o domínio) e não reabre o oráculo "dado real"
> que o Degrau 0 está tentando fechar — misturar as duas provas faria uma falha de dado real parecer
> falha da prensa. **F-P2-3 continua aberto POR DEPENDÊNCIA** (não por indecisão): depende do H1/PVA,
> que ainda não rodou. F-P2-4 segue aberto.
>
> **EMENDA 2026-08-22 (dono, via AskUserQuestion) ao §2 — `factory.ts` entra no perímetro zero-diff.**
> `server/src/lib/factory.ts` passa a fazer parte do perímetro da prova de saída (§2, item 2): todo
> `git diff` nesse arquivo entre o vertical 1 e o vertical 2 conta como falha da prensa, no mesmo grau
> que um diff em `features/dynamicTables` ou `features/accounting` núcleo. Esta é a emenda que o
> `PARECER-ARCHITECT-ADR-P2.md` §1.5 já recomendava ("INCLUIR... ou provar que pós-P1 a composição é
> genérica") e que nunca tinha sido incorporada ao texto ratificado — o texto anterior do §2 citava só
> motor+ledger+intérprete, sem mencionar `factory.ts` nem para incluir nem para excluir. A emenda só é
> **ALCANÇÁVEL** depois do alimentador (`ADR-INCR-BINDING-FEEDER.md`, Accepted 2026-08-22): antes dele,
> `factory.ts` MUDARIA por vertical por construção (import estático + entrada no array de mappers por
> setor), e exigir zero-diff nesse arquivo falharia trivialmente para qualquer vertical novo — não por
> a prensa ter falhado, mas por o alimentador ainda não existir. Ver `ADR-INCR-BINDING-FEEDER.md` para
> o achado, as seis decisões do alimentador e o que ele deixa aberto.
>
> **Origem:** `docs/ROADMAP-PLATAFORMA.md` Fase P2. **Classe:** PROVA DE PRODUTO (preset + binding;
> zero código de motor/ledger — se exigir código lá, a prova falhou).
>
> Criado: 2026-08-21.

---

## 1. Objetivo

Um setor novo sai da máquina **sem nenhum diff no motor DynamicTable, no ledger ou no intérprete de
runtime** — só: preset do setor + binding compilado na geração + (se preciso) contas novas no chart
**via papel** (F-P1-5). É a definição operacional da aspiração "Shopify dos sistemas de empresa".

## 2. Prova de saída (a definição de sucesso — objetiva e falseável)

1. O tenant do setor 2 percorre **entrevista → ERP operante → fechamento mensal → gera a própria ECD**.
2. `git diff` do motor (`features/dynamicTables`), do ledger (`features/accounting` núcleo), do
   intérprete **e de `server/src/lib/factory.ts`** (**EMENDA 2026-08-22** — ver blocos de ratificação
   acima) entre antes e depois do vertical é **vazio**. Um diff não-vazio não é "ajuste" — é defeito da
   prensa e volta para o P1 como lacuna (sessão de instrumentação → correção).
3. **Métrica instaurada: *time-to-first-ECD*** — do onboarding ao primeiro arquivo validável (análogo
   do "minutes to first sale" da Shopify). Registrada no runbook da prova.

A validação final da ECD do vertical 2 no PVA é **gate humano** (runbook `RUNBOOK-FORMAT.md`, assinatura
do dono) — o agente prepara o runbook em branco, não o preenche.

## 3. Forks a ratificar (ABERTOS)

| # | Pergunta | Opções | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-P2-1** ✅ RATIFICADO 2026-08-21 → (a) | Setor do vertical 2 | (a) anel 1 — serviço, Presumido, shape adjacente ao salão (barbearia / clínica estética) · (b) anel 2 — petshop/varejo (estoque comprado a prazo) | **(a)** — maximiza reuso de arquétipo e isola a variável sob prova (a prensa, não um domínio novo). (b) puxa o módulo operacional de Compras/AP (P4) — dois incrementos numa prova só |
| **F-P2-2** ✅ RATIFICADO 2026-08-22 → (a) | Tenant da prova | (a) tenant-fixture interno (dados sintéticos realistas) · (b) tenant real (operação de verdade do setor) | **(a) — RATIFICADO** para a prova zero-diff + time-to-first-ECD; (b) é o passo seguinte natural e reabre o oráculo "dado real" — não misturar as duas provas |
| **F-P2-3** | Profundidade da prova contábil | (a) até ECD gerada (arquivo existe e passa os gates internos) · (b) (a) + import PVA-limpo da ECD do vertical 2 | **(b)** — o PVA é o único oráculo que falseia o arquivo; sem ele a prova herda o mesmo déficit do vertical 1. Custo: mais uma rodada humana de PVA |
| **F-P2-4** | Onde registrar a métrica | (a) runbook manual da prova (doc) · (b) instrumentação no produto (timestamp de onboarding → timestamp do 1º EXPORT_SPED_ECD) | **(a)** para a prova única; (b) só quando houver mais de um tenant medindo — YAGNI antes disso |

## 4. Não-objetivos

- **Não** é um domínio contábil novo: nenhum arquétipo novo deveria nascer aqui (se nascer, registrar
  como achado — significa que o corpus do P1 estava incompleto).
- **Não** inclui módulo de Compras/AP operacional (P4; gatilho = vertical com estoque comprado a prazo).
- **Não** decide escala/multi-tenant de infraestrutura (P3; T11/T1 seguem travadas).
- **Não** autoriza marketing/venda do vertical — é prova de engenharia de produto.

## 5. Pré-condições de entrada

1. **ADR-P1 Accepted + implementado + golden test byte-idêntico verde.**
2. Vertical 1 validado (Parte A: PVA verde + sign-offs) — herdado da entrada do P1.
3. F-P2-1 ratificado (pode ser cedo — orienta o P1).

## 6. Próximos passos de governança

1. Ratificar **F-P2-1 agora** (barato, informa o P1); demais forks após o P1 fechar.
2. Parecer do `luminaris-accounting-architect` quando o preset do setor esboçar contas novas por papel.
3. Promover a Accepted → BRIEF (sessão de planejamento) → execução → runbooks humanos (PVA + prova).
