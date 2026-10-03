---
id: "D-2026-10-02-X7-FASE-B-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-TB-1..7 do BRIEF da Fase B do X7 (estimativa mensal + balancete de suspensão/redução)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02 (AskUserQuestion, sessão de planejamento da Fase B) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-X7-FASE-B-FORKS — cédulas da ratificação dos forks da Fase B

**Estado:** `decided` (F-TB: 7/7; 6 na recomendação, **F-TB-5 → (b) divergente**).
**Autorização:** dono, chat, 02/10/2026: *"Autorizo planejar o BRIEF da Fase B do X7 — estimativa mensal com
balancete de suspensão/redução (dono, 02/10) — sem 'executa'"*, com a instrução *"Forks novos via AskUserQuestion
comigo, lotes de até 4; registre em docs/plano/decisoes/"*. O agente apresentou as opções e o dono decidiu.
**Não é "executa"** (ORCH-006): o [[X7]] ganha autorização de **planejamento** da Fase B, não de código.

Documento dos forks: [`BE-INCR-TAX-ASSESSMENT-B-brief.md`](../../accounting/BE-INCR-TAX-ASSESSMENT-B-brief.md) §3.
Base: [`ADR-INCR-TAX-ASSESSMENT`](../../adr/ADR-INCR-TAX-ASSESSMENT.md) (Accepted 02/10) e
[[D-2026-10-02-X7-TAX-ASSESSMENT-FORKS]] (F-X7-1..14, F-TA-1..10).

## Lote 1 — os forks que mudam o desenho

### F-TB-1 — vocabulário dos períodos da forma anual
- **Opções:** (a) `A00..A12`, o mesmo do e-Lalur (F-X7-6 → a) e da ECF (`PER_APUR`) (**recomendada**) ·
  (b) `M01..M12` + `ANUAL`, como no esboço do ADR §6.
- **Resposta literal:** *"(a) A00..A12 (Recomendado)"* → ✅ (a).

### F-TB-2 — dedução das estimativas no ajuste anual
- **Opções:** (b) o payload do `A00` aceita as estimativas **pagas** por mês (opcional); se faltar, assume pago o
  devido confirmado, com aviso (**recomendada**) · (a) Σ do devido confirmado.
- **Resposta literal:** *"(b) Pago informado (Recomendado)"* → ✅ (b).

### F-TB-3 — provisão das estimativas
- **Opções:** (a) cada mês provisiona o devido; o `A00` provisiona só a diferença (positiva: despesa/a recolher;
  negativa: saldo negativo a compensar, ativo) (**recomendada**) · (b) antecipação no ativo, despesa só no ajuste ·
  (c) só o ajuste anual lança.
- **Resposta literal:** *"(a) Mensal + diferença (Recomendado)"* → ✅ (a).

### F-TB-4 — balancete × fechamento do mês
- **Opções:** (b) confirmar o balancete do mês m exige os meses 01..m−1 da unidade fechados (`SOFT_CLOSED` ou
  `HARD_CLOSED`) (**recomendada**) · (a) só aviso.
- **Resposta literal:** *"(b) Exige 01..m−1 fechados (Recomendado)"* → ✅ (b).

## Lote 2

### F-TB-5 — 16% para prestador exclusivo de serviço ≤ R$ 120 mil na estimativa
- **Opções:** (a) não modelar; usar 32%, porque o ajuste anual devolve o excesso (**recomendada**) · (b) modelar a IN
  1.700 art. 33 §§ 7º–10 (Lei 9.250 art. 40), com a diferença postergada.
- **Resposta literal:** *"(b) Modelar §§ 7º–8º"*
- **Checagem antes de registrar:** não há conflito com fork ratificado. O F-X7-14 → (a) diz *"não modelar na Fase A"*,
  e a Fase A só tem o Presumido trimestral. Nos dois textos, o § 7º trata do **pagamento mensal**, que é a estimativa,
  e a Fase B é a primeira a ter estimativa.
- **Registro:** ✅ (b), **divergente da recomendação**. Amplia o escopo da Fase B em:
  - um campo no perfil;
  - uma linha na tabela de parâmetros;
  - uma regra de cálculo, com a diferença postergada.

  Esta resposta é a autorização citável dessa ampliação, só para planejamento. Itens 3b e 9 do BRIEF. O que a lei
  deixa aberto foi para a §4 (P-B4..P-B6), e não virou decisão.

### F-TB-6 — trocar a forma com o e-Lalur do ano já preenchido
- **Opções:** (a) o perfil recusa (400), listando os lançamentos e fechamentos nos períodos da forma antiga
  (**recomendada**) · (b) permite.
- **Resposta literal:** *"(a) Perfil recusa (Recomendado)"* → ✅ (a).

### F-TB-7 — fatiamento
- **Opções:** (a) 3 PRs seriais, depois dos 3 PRs da Fase A (**recomendada**) · (b) 1 PR.
- **Resposta literal:** *"(a) 3 PRs seriais (Recomendado)"* → ✅ (a).

**BRIEF da Fase B: 7/7 forks ratificados (6 na recomendação, F-TB-5 divergente).**
