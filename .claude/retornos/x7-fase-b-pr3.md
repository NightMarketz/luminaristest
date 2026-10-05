# RETORNO — X7 Fase B PR-3 (model + fluxo + provisão do Real anual)

tarefa: executar o PR-3 da Fase B do X7 (F-TB-8 a) — BE-INCR-TAX-ASSESSMENT-B-brief.md §3.1: itens 5, 6, 11, 13, 14, 15, 16, 17 + testes 26 b, c, m; PR-4 fora; `ANUAL` segue NÃO selecionável no DTO do perfil (F-TB-8.1)
autorizacao: dono, chat, 05/10/2026 — "Executa o PR-3 da Fase B do X7 — sessao-feature" (registrada no `autorizacao` de docs/plano/nos/X7.md pelo fold #528, ainda não mergeado)
agente: sessão principal (sessao-feature), worktree x7-fase-b-pr2-5919d1, branch claude/x7-fase-b-pr3; review por Agent isolado (worktree própria)
base: fc5cc884 (origin/main, 05/10 — inclui o #525)
modelo: opus-5.5

### Decisões do dono tomadas nesta sessão (questionário, 05/10 — antes do código; nota [[D-2026-10-05-X7-FASE-B-PR3-LACUNAS]] no #528)
1. **m\* por balancete** (lacuna 1 do PR-1): **contra a recomendação (400)** — o balancete no mês do excesso **calcula e grava** a diferença postergada dos meses a 16% (mesma conta do item 9) e ela entra nos "anteriores" dos balancetes seguintes. P-B6 (cobrança em dobro?) segue com o contador.
2. **Item 13 × Fase A**: **cascata**, como os trimestres (não o 409 da letra) — substituir `A0k` derruba `A0(k+1)..A12` e o `A00`, estorna as provisões deles e devolve `reconfirmar`.
3. **RETIDO_MESES** (lacuna 2 do PR-1): mantém todas as deduções dos meses (P-B10).
4. **`estimativasPagas` repetida** (lacuna 3 do PR-1): o DTO recusa com 400.
5. **Achado 1 do review (datas de atividade editáveis depois da trava)** — 2º questionário, 05/10: **trava** `inicioAtividadeEm`/`encerramentoAtividadeEm` junto com a forma (400 `FORMA_TRAVADA`), **neste PR**. Toca o perfil da empresa (nó vizinho), autorizado pela resposta. Fecha também o mesmo buraco nos trimestres da Fase A.

### Checklist (BRIEF B §1)
| # | Comportamento | Status | Teste |
|---|---|---|---|
| 5 | Receita do mês (`mesBounds`) com o gate de exaustividade da A-6 | ✅ | anual.integration A11 (6.000,00 / 2.880,00) |
| 6 | LAIR do período em curso (`periodoBounds`) com a guarda de circularidade | ✅ | anual.integration A12 balancete (33.500,00 período) e 26 (m) (LAIR igual antes/depois do crédito em despesa) |
| 11 | `periodo` `A00..A12`; `forma` ANUAL; `modo` dos 3 novos; coluna `diferencaPostergadaCents` (migração aditiva); DTO `modoMensal` obrigatório só em `A01..A12`, `estimativasPagas` só no `A00`; serviço `Txx` ⇔ TRIMESTRAL, `Axx` ⇔ ANUAL | ✅ | TaxAssessmentDto.test (refines); anual.integration "item 11"; taxAssessment.integration (T01 na forma ANUAL) |
| 13 | Ordem dos meses (A0m exige A0(m−1), salvo o 1º em atividade; A00 exige todos) + cascata (decisão 2) | ✅ | anual.integration "item 11" (409 de ordem), "item 13 (cascata)" (reconfirmar `['A00','A12']`, provisão do A12 estornada) |
| 14 | Trava da forma na 1ª confirmação (herdada da Fase A, na mesma tx) | ✅ | inalterado — taxAssessment.integration (Fase A) |
| 15 | Balancete exige os meses 01..m−1 em atividade SOFT/HARD_CLOSED **dentro da tx**; não semeado = aberto; o mês m pode estar aberto; a prévia só avisa | ✅ | anual.integration "item 15" (400 → fecha → 201) e "26 (b)" (aviso na prévia) |
| 16 | Provisão: A0m = devido + diferença no fim do mês; suspensão não lança nem fica pendente; A00 = devido anual − Σ (devido + diferença) dos meses (> 0 D despesa/C a recolher; < 0 D saldo negativo/C despesa; 0 nada) em 31/12; 2 FKs `Asset` no perfil fiscal da unidade + allowlist | ✅ | anual.integration A11, A12 (redução), suspensão, A00 = 0, **26 (m)**; calcAnual "item 16" |
| 17 | Leitura: filtro `periodo` alargado; a view ganha `diferencaPostergadaCents` (o `modo` já existia) | ✅ | por construção (mesmo `Periodo` do DTO) + respostas da integração |
| 26 b | Estimativa confirmada não muda com lançamento posterior; o balancete lê o devido confirmado; mês fechado recusa lançamento | ✅ | anual.integration "26 (b)" + "item 15" |
| 26 c | IRPJ e CSLL no mesmo modo | ✅ | anual.integration (A11, A12) |
| 26 m | Ajuste negativo debita saldo negativo, credita despesa; LAIR não muda | ✅ | anual.integration "26 (m)" |
| dec. 1 | Balancete em m\* grava a diferença; ela entra nos anteriores seguintes | ✅ | calcAnual "PR-3, decisão 1" (2.592 = 6 × 432; anteriores do A08 = 5.184) |
| 25 | Migração aditiva + smoke; snapshot (TaxAssessment, FiscalProfile, AccountingPolicyVersion) + `.gen.ts`; allowlist `tax.assessment.confirmed` (+modo, +diferencaPostergadaCents) e `fiscal_profile.updated` (+2 FKs); enums `periodo`/`modo` (+0 paths) | ✅ | dtoShapeSnapshot; openapi 244 paths antes e depois; smoke:migration OK |

### Diff resumido
- `prisma/schema.prisma` + migração `20261005120000_add_tax_assessment_anual_fields` (ADD COLUMN; o `prisma format` realinhou as colunas do `TaxAssessment`).
- `models/taxAssessmentCalcAnual.ts`: balancete com a diferença do m\* (decisão 1; entrada opcional `receitaMes`/`receitasMesesAnteriores`); ajuste anual grava `PROVISAO_AJUSTE_ANUAL` (valor com sinal da provisão do A00 — o serviço e o encerramento leem daqui, porque o valor depende dos meses).
- `services/TaxAssessmentService.ts`: forma × período; `calcularAnual` (receita bruta / balancete / ajuste); ordem por `ordem()` (A00 por último); `periodoAnterior`; gate do item 15 em-tx (`IAccountingPeriodRepository.findByYearMonth`, dep nova via factory); `valorProvisao`/`provisaoPendente` generalizados (o `ExerciseClosingService` herda); provisão com sinal e `fimDoPeriodo`; auditoria com `modo` e `diferencaPostergadaCents`.
- `dtos/TaxAssessmentDto.ts`: `PERIODOS_APURACAO`, `modoMensal`, `EstimativaPagaSchema`, `refinePeriodo` (preview e confirm).
- Perfil fiscal da unidade: DTO, repositório, `assertAssetAccount`, view, `ACCOUNT_KEYS` da política versionada, allowlist.
- `routes/docs.paths.ts`, `public/openapi.json`, snapshot + 3 `.gen.ts` do FE.

### Lacunas de spec
- Nenhuma aberta: as 4 que tocavam o PR-3 foram decididas pelo dono acima.
- Registro (não bloqueia): (a) o valor da provisão do `A00` mora numa linha nova da memória (`PROVISAO_AJUSTE_ANUAL`) — o item 16 define o valor, não onde guardá-lo; (b) no balancete de m\* não se aplica a recusa de revenda do item 9 (a decisão 1 só manda calcular a diferença); (c) aviso na prévia do A00 quando o ajuste é negativo e a conta de saldo negativo não está configurada (a provisão fica pendente, F-TA-7 a herdado).

### Asserções pré-existentes alteradas (com o motivo)
- `taxAssessmentProfile.integration.test.ts` (Fase A, item 1 D2 e item 2b): as **entradas** passaram a reenviar `inicioAtividadeEm: '2026-02-01'` (o PUT é substituição total e a data agora trava); nenhuma asserção mudou.
- `taxAssessment.integration.test.ts` (Fase A, 23 f): T01 com perfil ANUAL segue **400**; a mensagem esperada mudou de "forma anual é da Fase B" para "o período trimestral exige a forma TRIMESTRAL" (item 11).
- `TaxAssessmentDto.test.ts`: "período só T01..T04" (A01 ⇒ 400) passava por acidente (falta de `modoMensal`); virou T05 ⇒ 400, e os casos `A0x` foram para o bloco novo.

### Achados fora de escopo
- O FE do perfil fiscal não mostra nem reenvia as 2 contas novas; omitidas no PUT, o Prisma as preserva (`undefined` não escreve). Tela é nó vizinho.

### Review independente
- Veredito **PASS COM RESSALVAS**, 0 defeito no fluxo pedido. Rodou tsc, unit inteiro, integração `taxAssessment` (32/32), `closing`, `fiscalProfile`, `accountingPolicyVersion`, e 3 casos executados em arquivo temporário (m\* por balancete no serviço com a conta conferida; mês não semeado no gate; A00 × início de atividade).
- Achado 1 (latente até o PR-4): `inicioAtividadeEm` editável depois da trava deixa confirmar o A10 depois do A00 vivo, que não o conta → **decisão 5 acima; corrigido** com teste vermelho→verde (`taxAssessmentProfile.integration` "achado 1 do review").
- Achado 2: o cabeçalho `atomicUntil` citava um nome de teste que não existe → **corrigido** (`03ab98f8`).
- Achado 3: faltava teste da validação `Asset` das 2 contas novas → **corrigido** (`03ab98f8`, inclui a prova de que omitir os campos no PUT os preserva).
- **2ª rodada (delta `bdf648c3..ca0cce18`): PASS.** O revisor provou o teste novo vermelho contra o código anterior ao fix (400 esperado, 200 recebido) e verde depois; varreu os caminhos de escrita do perfil (upsert com a trava em-tx, copyFrom 409, remove recusado, onboarding antes da 1ª confirmação) — nenhum outro muda as datas depois da trava. Observação: não há como destravar (erro de digitação na data depois da 1ª confirmação não se corrige pela API, como o regime). Sugestão para o PR-4: no teste 26 (l), um caso `ANUAL` travado com troca de data.
- Achado 4 (observação, desenho herdado da Fase A): substituir um mês já FECHADO não estorna a provisão antiga e deixa a nova pendente; com o item 15, isso fica frequente no anual. O encerramento bloqueia com provisão pendente — sem perda silenciosa. Registrado, não alterado.

### Checks executados
- `cd server && npx tsc --noEmit` → 0; `cd my-app && npx tsc --noEmit` → 0; `npm run test:types` → 0
- `jest integration taxAssessment fiscalProfile closing accountingPolicyVersion` → 7 suítes (1 asserção da Fase A ajustada, ver acima); `taxAssessmentAnual.integration` → 8/8
- `npm run smoke:migration -- --db <dev.db real>` → OK, 5 migrações na cópia sem perda, original intocado
- `npm run docs:generate` → 244 paths (antes 244)
- `npm run test:unit` → 275 suítes, 3927 passed · `npm run test:integration` → 109 suítes, 905 passed (rodada única)
- depois dos achados 1–3 (`03ab98f8`, `9c281ea4`): `npm run test:unit` → 275 suítes, 3927 passed · `npm run test:integration` → 109 suítes, **907** passed (rodada única; +2 testes)

### Fold pronto (pós-merge, não aplicado)
`id: X7` · `estado: inflight` · `estado_detalhe: + "05/10: Fase B PR-3 mergeado no #<n> (itens 5, 6, 11, 13–17: estimativa por receita bruta, balancete com gate de meses fechados, ajuste anual, cascata mensal, provisão mensal + diferença do A00 com saldo negativo; ANUAL segue não selecionável). Decisões do dono 05/10 em D-2026-10-05-X7-FASE-B-PR3-LACUNAS. Próximo: PR-4 (ECF anual + liberação do ANUAL), exige 'executa'"` · `prs: + "#<n>"`
