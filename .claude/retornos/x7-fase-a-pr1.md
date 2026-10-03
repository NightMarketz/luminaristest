# RETORNO — X7 Fase A PR-1 (perfil + parâmetros + funções puras, itens 1–11)

tarefa: executar o PR-1 da Fase A do X7 (F-TA-10 a) — itens 1–11 do BE-INCR-TAX-ASSESSMENT-A-brief.md, sem rota; PR-2/PR-3 fora
autorizacao: dono, 03/10/2026 — "Executa o PR-1 da Fase A do X7 — só esta fatia" (registrada no `autorizacao` de docs/plano/nos/X7.md)
agente: sessão principal (sessao-feature), worktree x7-fase-a-pr1-93c479; review por Agent isolado (general-purpose, model opus, worktree própria)
base: b5d6f2eb (origin/main no rebase, 03/10)
pr: https://github.com/NightMarketz/luminaristest/pull/478 — aberto, NÃO mergeado (merge só com OK do dono)
modelo: opus-5.5
perfil-previsto: opus-medio
rodadas-de-review: 1 — PASS COM RESSALVAS, 6 achados não-bloqueantes; 2 corrigidos (comentário de teste que afirmava corte do § 5º III que não ocorre; trava tratava PRESUMIDO nulo × TRIMESTRAL como troca), 4 registrados em Lacunas
custo: US$ 15.45 · claude-opus-5-5 US$ 15.45 · 452 min (scripts/session-cost.mjs na worktree; o revisor rodou em worktree própria — ~206k tokens, fora desta soma)
veredicto: PASSOU

### Checklist (BRIEF §1, itens 1–11)
| # | Status | Teste |
|---|---|---|
| 1 forma/trava/obrigatoriedade + allowlist | ✅ | CompanyFiscalProfileDto.test; taxAssessmentProfile.integration.test (D2: PUT/DELETE 400; REAL e PRESUMIDO nulo ≡ TRIMESTRAL) |
| 2 datas de atividade (§ 9º) | ✅ | Dto.test (calendário); calc `trimestresEmAtividade` |
| 2b chave da liminar | ✅ | Dto.test; integration (muda com trava; processo fora do evento); calc (acréscimo 0, linha LC224_SUSPENSO) |
| 3 contas da provisão | ✅ | integration (Expense/Liability/folha/inexistente → 400; FK Restrict) |
| 4 tabela versionada | ✅ | taxAssessmentParams.test (fonte ≠ ''; CSLL 0 em 31/03/2026 e 1000 em 30/06) |
| 5 arredondamento único | ✅ | taxAssessmentParams.test |
| 6 receitaBrutaPorAtividade | ✅ | testes da ECF Presumido verdes sem edição (23 h) |
| 7 resultadoAntesIrpjCsll | ✅ | AccountingReportService.resultadoAntesIrpjCsll.test (23 b; guarda de circularidade) |
| 8 Presumido | ✅ | calc (2025 sem LC 224; recusas D8 e caixa) |
| 9 LC 224 | ✅ | calc, um caso por parágrafo: §§ 3º, 4º, 5º I, 5º II, 5º III, 6º, 7º, 9º + fronteiras + liminar |
| 10 Real | ✅ | calc (A/E/P; códigos; 23 c adicional; 23 d D6 por tributo; pré-condições) |
| 11 deduções | ✅ | calc (só do tributo; OUTRA com documento; saldo negativo F-TA-9) |

### Lacunas de spec
1. **Bloqueia o PR-2 (não este):** a segregação de receita (item 6) não exclui o lançamento de encerramento (`ExerciseClosingService` posta `closing` em 31/12 nas contas Revenue) → T04 do Presumido de exercício encerrado sai com receita 0, e o gate de exaustividade não vê conta não mapeada no ano encerrado. O item 6 exige "sem efeito de comportamento", então ficou. Grau: inferido por leitura de código, não executado. Chip de instrumentação aberto.
2. `copyFrom` copia forma, obrigatoriedade, datas de atividade e liminar (inclusive o nº do processo); não copia a trava. O BRIEF não fala da cópia. Revisor: datas copiadas de outro ano podem zerar o limite anual (achado 2).
3. Datas de atividade sem coerência (início ≤ encerramento, dentro do ano) — o BRIEF pede só calendário válido. Encerramento antes do ano ⇒ 0 trimestres ⇒ limite anual 0 (revisor, achado 2).
4. A trava compara a forma efetiva (REAL ou PRESUMIDO + nula ≡ TRIMESTRAL — D1); a 1ª versão só tratava o REAL (revisor, achado 3, corrigido).
5. `lucroRealObrigatorio` fora do REAL ⇒ 400 — lido do comentário "só REAL" do contrato §2.
6. Códigos de memória além da lista ilustrativa do §2: PRESUNCAO_REVENDA, LC224_ACRESCIMO_SERVICO/REVENDA, LC224_LIMITE_ANUAL, LC224_RECEITA_ACUMULADA, LC224_EXCEDENTE_ANUAL, LC224_EXCEDENTES_ANTERIORES, GUARDA_CIRCULARIDADE.
7. Encerramento de atividade antes do T04: o acerto do § 5º só roda no T04 (letra do BRIEF); "último trimestre do ano-calendário" para quem encerra no meio do ano é pergunta ao contador.
8. Trimestre confirmado sob liminar é recalculado no T04 também sem acréscimo (diferença 0) — derivado de "acréscimo 0 no trimestre apurado" + F-TA-3 a.
9. Rateio do excedente por atividade: serviço arredondado, revenda = resto. Rateio do § 5º II arredonda cada trimestre (soma pode diferir ±1 centavo do excedente anual — revisor, achado 4). `exc × E / S` lê "a razão do item 1" do § 5º II b do texto vigente da IN (relido em 03/10; revisor, achado 6: não verificável por ele).
10. O item 23 não está alocado a PR no F-TA-10; este PR cobre 23 (b), (c), (d), (h).
11. Trava responde 400 (BRIEF item 1), enquanto o REGIME_TRAVADO existente responde 409.

### Achados fora de escopo
- ECF Presumido não é closing-aware (lacuna 1) — bug provável em `main` hoje, chip aberto para `sessao-instrumentacao`.
- `prisma format` realinhou o bloco `AccountingDataExchangeJob` no schema (só espaço) — ruído no diff (revisor, achado 5).

### Checks executados
- `cd server && npx tsc --noEmit` → 0; `cd my-app && npx tsc --noEmit` → 0
- `npm run test:unit` → 3534 passed (antes do ajuste pós-review); `npm run test:integration` → 795/795
- `UPDATE_DTO_SNAPSHOT=1` (CompanyFiscalProfileDto, FiscalProfileDto) + tipos gerados do FE; `npm run docs:generate` sem mudança de conteúdo
- `npm run smoke:migration -- --db <dev.db real>` → OK, 2 migrações na cópia sem perda, original intocado
- `node scripts/plano-vault.mjs check` → vault íntegro
- mutações: trava desligada → 1 falha no integration; sobra do § 4º zerada → 1 falha no calc; restauradas

### Gates de envio OPS-001
- Caso adversarial tentado: o revisor refez 5 contas à mão contra a spec (§ 3º, § 5º II, § 4º, § 7º, Real) — bateram; e procurou linha `CA` chegando à Parte A (não chega: LalurService só grava `E`).
- Checagem que teria falhado se errado: as 2 mutações acima; a asserção nova do PRESUMIDO travado falha na versão anterior do `formaEfetiva`.
- Risco principal remanescente: o número não tem oráculo antes do H1/X5 × PVA (P-9); as leituras P-1 (multiplicativa), P-3 (sempre deduzir) e a do rateio do § 5º II são minhas, sobre o texto da IN.
- Viés (T8): completude — escolhi interpretações mínimas onde o código obrigava (lacunas 2–9) em vez de pausar; cada uma é reversível e está listada para ratificação.

### Fold pronto (pós-merge, não aplicado)
`id: X7` · `estado: planned` (Fase A em andamento) · `estado_detalhe: + "03/10: PR-1 da Fase A (itens 1–11) mergeado no #478"` · `prs: ["#478"]`

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-a-pr1-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest --selectProjects unit -- taxAssessment CompanyFiscalProfileDto resultadoAntesIrpjCsll dtoShapeSnapshot auditCanonical SpedEcf"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-a-pr1-unit.log
    sha256: db9748cb61f70b58065cb303d7c889be0a0a5725542d6fc180b770b7731587cf
  - command: "cd server && npx jest --selectProjects integration --runInBand --forceExit -- taxAssessmentProfile companyFiscalProfile"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-a-pr1-integ.log
    sha256: 874da878bd1e1ac6e4c9750679988d97651a15122752bae7f6523b35e2c888ed
VEREDITO: PASS
```
