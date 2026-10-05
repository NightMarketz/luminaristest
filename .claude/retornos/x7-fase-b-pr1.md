# RETORNO — X7 Fase B PR-1 (parâmetros + janelas + funções puras do Real anual)

tarefa: executar o PR-1 da Fase B do X7 (F-TB-8 a) — BE-INCR-TAX-ASSESSMENT-B-brief.md §3.1, itens 3, 3b, 4, 7, 8, 9, 10; sem rota, sem mudar serviço vivo; PR-2..4 fora
autorizacao: dono, 04/10/2026 — "Executa o PR-1 da Fase B do X7 (dono, data do dia) — sessao-feature … PR-2..4 fora. Entrega: PR + review independente, merge só com o meu OK; fold do X7."
agente: sessão principal (sessao-feature), worktree item-destination-pr2-60b7bc; review por Agent isolado (general-purpose, opus, worktree própria)
base: 95f9894a (origin/main)
modelo: opus-5.5
rodadas-de-review: 1 — PASS COM RESSALVAS, 5 achados não-bloqueantes; 1 corrigido (achado 4), 4 registrados em Lacunas

### Checklist (BRIEF B §1)
| # | Status | Teste |
|---|---|---|
| 3 códigos de receita | ✅ | calcAnual "item 3" (cada modo × obrigatoriedade = 1 código; IRPJ nulo ⇒ 400; balancete usa o da estimativa, P-B2) |
| 3b perfil + migração + trava + allowlist + tabela | ✅ | Dto.test; taxAssessmentProfile.integration (grava, audita `'true'`, travado ⇒ 400 citando o campo); smoke:migration |
| 4 periodoBounds / mesBounds | ✅ | calcAnual "item 4" (A03 × março; T02 = quarterBounds; A00; início de atividade) |
| 7 estimativa por receita bruta | ✅ | calcAnual "item 7" + 26 (e) |
| 8 balancete (cálculo) | ✅ | calcAnual "item 8": 26 (d), 26 (f), janeiro, início de atividade, D6, CSLL |
| 9 16% do prestador exclusivo | ✅ | calcAnual "item 9" = 26 (h): abaixo do limite, m* = 7, adicional no recálculo, balancete no meio, revenda ⇒ 400, CSLL 32% |
| 10 ajuste anual (cálculo, estimativasPagas) | ✅ | calcAnual "item 10": saldo 0, 26 (i), balancete suspenso, retenções/saldo negativo, pré-condições |
| `ANUAL` não selecionável (F-TB-8.1) | ✅ | Dto.test |

### Lacunas de spec (para ratificação)
1. **Mês do excesso m\* apurado por balancete** (review, achado 1 — bloqueante ANTES do PR-3): a diferença postergada do § 8º não é gravada em lugar nenhum (o balancete não a calcula; o mês seguinte por receita bruta já não é m\*). Segui a letra "só no modo RECEITA_BRUTA". Decisão do dono: 400, ou calcular a diferença no balancete.
2. **Retido dos meses no ajuste** (`RETIDO_MESES`): somei `deducoesCents` inteiro dos meses (inclui `OUTRA`), para "o pago + o retido reconstruírem o devido mensal"; o BRIEF cita só IRRF/CSLL_RETIDA.
3. **Pago informado > confirmado**: deduz o pago informado (letra do F-TB-2 b / art. 2º § 4º IV "pago"); mês duplicado em `estimativasPagas` — vale a 1ª entrada (review, achado 2). O DTO do PR-3 deveria recusar a duplicata.
4. **`A00`** = o ano cheio, sem deslocar pelo início de atividade (letra do item 4).
5. **`periodoBounds('A0m', início depois de m)`** devolve janela invertida sem erro (review, achado 3); sem chamador no PR-1 — quem chamar no PR-2/3 checa atividade antes.
6. **Teto pela Parte B (item 8 "C acima do saldo inicial ⇒ 400")** fica no e-Lalur (item 12, PR-2), como o trimestral da Fase A.
7. **Mês fora de atividade** ⇒ 400 nas três funções (guarda de entrada; n do balancete dependeria disso). Ajuste ignora meses fora de atividade que vierem na entrada (review, achado 4, corrigido).
8. **`prestadoraExclusivaServicos`** aceito em qualquer regime (o BRIEF não restringe); só o cálculo do Real anual o lê.
9. **`TAX_ASSESSMENT_TABELA_VERSAO`** → `2026-10-04` (linhas novas); confirmações trimestrais novas gravam a versão nova com os mesmos números (review, achado 5).

### Achados fora de escopo
- 1ª rodada da `test:unit` teve 6 falhas em 2 suítes não capturadas; 3 rodadas seguintes 3888/3888 verdes.
- Integração: timeouts de hook em suítes alheias (CounterpartyBackfill, CounterpartyIdentityNormalization, bankSettlementController) durante a rodada concorrente com o revisor — ver Checks.

### Checks executados
- `cd server && npx tsc --noEmit` → 0; `cd my-app && npx tsc --noEmit` → 0
- `npm run test:unit` → 3888 passed (3 rodadas)
- `jest unit taxAssessment` → 48/48 (pós-achado 4)
- `UPDATE_DTO_SNAPSHOT=1 … dtoShapeSnapshot` → diff só `prestadoraExclusivaServicos` (snapshot + `.gen.ts` do FE)
- `npm run smoke:migration -- --db <dev.db real>` → OK, 3 migrações na cópia sem perda, original intocado
- revisor: versão antiga × nova de `taxAssessmentCalc.ts` em 3.936 entradas do trimestral → saída idêntica (exceto `tabelaVersao`)

### Fold pronto (pós-merge, não aplicado)
`id: X7` · `estado: inflight` · `estado_detalhe: + "05/10: Fase B PR-1 (itens 3, 3b, 4, 7–10: parâmetros, janelas, funções puras; ANUAL segue recusado) mergeado no #<n>. Lacuna 1 (m* por balancete) pede decisão antes do PR-3"` · `prs: + "#<n>"`
