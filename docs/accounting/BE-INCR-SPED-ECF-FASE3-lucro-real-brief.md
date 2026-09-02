# BRIEF — BE-INCR-SPED-ECF-FASE3 (ECF em Lucro Real)

> **Estado [EMENDA 2026-09-02]: esqueleto AUTORIZADO.** Forks 1 → (b) dedicado e 5 → (a) trimestral ratificados por dono, em sessão, 2026-09-02: *"Ratifico Fork 1 (dedicado) e Fork 5 (trimestral), implementa o esqueleto. Dispara tbm mais passos que são de estruturação e não dessas decisões que estão pendentes somente de configs que dependem de informações de leis"*. A `sessao-feature` pode executar os itens `[direto]`, `[cond:Fork 1]` e `[cond:Fork 5]`; os itens `[cond:Fork 2/3/4]` e todo conteúdo fiscal de L/M/N seguem pausados (marcadores vazios; `FORMA_TRIB` sem default). Texto original abaixo mantido como histórico.
>
> **Estado original: preparação apenas.** Produzido em `sessao-planejamento`. Checklist e contratos abaixo NÃO
> autorizam código — cada fork listado em §4 segue `RATIFICAÇÃO PENDENTE`; vários comportamentos do
> checklist estão explicitamente condicionados a um fork ainda não resolvido. **A `sessao-feature` que
> eventualmente executar este BRIEF só pode avançar nos itens marcados `direto`**; os condicionados
> pausam no fork correspondente (regra 4 do formulário de planejamento).
> **ADR normativo (ler inteiro antes de qualquer código):** `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md`.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** ECF Fase 3 — Lucro Real (blocos L/M/N + e-Lalur/e-Lacs + `0010` parametrizável).
  `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5.1 Bloco B item 10; `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md`
  §1 item 5.
- **Autorização (alvo e ordem):** dono, ratificado 2026-09-02, citado em
  `ACCOUNTING-MASTER-MAP.md` §5.1 Bloco B item 10: *"[EMENDA 2026-09-02 — ALVO RATIFICADO] O dono fixou
  Lucro Real como regime-alvo do produto... Ordem ratificada: H1 roda agora em Presumido... → esta frente
  → 2ª passada do H1 em Lucro Real antes de operar cliente real... Abrir ainda exige ADR + sessão de
  planejamento com autorização própria (ORCH-006) — a ratificação acima fixa o ALVO e a ORDEM, não
  autoriza execução."* Reforçado em `PROXIMOS-PASSOS-2026-09-02.md` §3: *"Alvo e ordem ratificados;
  execução NÃO autorizada (ORCH-006). Primeiro passo é o ADR, não código."*
- **Autorização (desta sessão de preparação):** dono, em sessão, 2026-09-02: *"Prepara todas em sequencia
  em multi agents sonnets"*, aplicada à fila vigente. Cobre **preparação** (ADR `Proposed` + este BRIEF
  com forks `PENDENTE`). **Não cobre implementação nem ratificação de fork.**
- **Insumos existentes (lidos nesta sessão, não de memória):**
  - `server/src/lib/ecf.ts` (474 linhas) — serializer Presumido MVP; `FORMA_TRIB` fixo `:145`,
    `HASH_ECF_ANTERIOR` hardcoded vazio `:152`, L/M/N como marcadores vazios `:330-359`.
  - `server/src/features/accounting/dtos/SpedEcfDto.ts` — `FiscalSchema` sem `formaTrib` (`:47-54`).
  - `server/src/features/accounting/services/SpedEcfGenerationService.ts` — base = receita `3.1`/`3.3`
    por trimestre; gate de exaustividade da receita (`:91-109`), não aplicável ao Real (base é o lucro
    líquido inteiro, não duas contas).
  - `server/src/controllers/spedController.ts`, `server/src/routes/accounting.ts:127-130`,
    `server/src/routes/docs.paths.ts:2271-2329` — casca Route→Controller→Service da rota Presumido.
  - `server/src/lib/factory.ts:79,359,688,888` — wiring DI do serviço Presumido.
  - `server/src/features/accounting/audit/auditCanonical.ts:101` — allowlist `sped.ecf_generated`.
  - `server/src/lib/__tests__/ecf.test.ts` (184 linhas), `SpedEcfGenerationService.test.ts` (265 linhas),
    `SpedEcfDto.test.ts` (106 linhas) — suíte existente do Presumido; `ecf.test.ts:139-145` pina L/M/N
    vazios (regressão a preservar).
  - `docs/adr/ADR-INCR-SPED-ECF-file-generation.md` — ADR normativo do Presumido; §4 defere Real
    explicitamente ("ADR próprio").
  - `docs/adr/ADR-INCR-SPED-ECD-file-generation.md` — precedente serializer puro + lição I052.
  - `docs/adr/ADR-INCR-SPED-APURACAO-encerramento.md` — `AccountingReportService.balanceSheet`/
    `incomeStatement` closing-aware (D3) = fonte candidata do Bloco L.
  - `docs/adr/ADR-INCR-REVENUE-SPLIT-by-nature.md` — split `3.1`/`3.3`, mantido pelo Presumido, irrelevante
    à base do Real.
  - `docs/accounting/BE-INCR-SPED-ECF-scope-brief.md` — BRIEF irmão da FASE 2, modelo de forma.
  - `docs/accounting/BE-INCR-SPED-ECF-layout-transcription.md` (212 linhas) — cobre só 0/9/P/C/E/J/K;
    **zero linha sobre L/M/N** — a lacuna central deste BRIEF.
  - `docs/adr/INDEX.md` — só para copiar o padrão de cabeçalho/status (não editado).
- **Nós vizinhos:**
  - **Consome:** `AccountingReportService.balanceSheet(scope,asOf)`/`incomeStatement(scope,asOf)`
    (já closing-aware, `factory.ts:874`), `IAccountingPolicy.canRead`, `AccountingDataExchangeJob` +
    `storage` + rota de download (INCR-6), `AuditService.append`, `lib/sped.ts` primitivas
    (`spedLine`/`centsToSpedDecimal`/`spedDate`), `ExerciseClosingService` (pré-requisito indireto: L100
    pós-encerramento pressupõe o exercício fechado, mesma dependência que a ECD já tem).
  - **É consumido por:** o runbook `RUNBOOK-H1-PVA.md` (2ª passada, ainda não escrita — gate humano, fora
    desta sessão) e, indiretamente, pelo master map §5.1 Bloco B item 10 (fold ⏳→✅ pendente de um PR real).
  - **Não consome nem é consumido por:** nenhuma tela do frontend (`grep -rli ecf my-app/src` = 0
    ocorrências) — este incremento é **backend-only**; gate de paridade i18n **não se aplica**.

## Definição de pronto

Igual ao formulário: checklist numerado + contratos esboçados + forks listados (não decididos). Ver
seções abaixo.

---

## 1. Checklist de comportamentos

Cada item carrega uma tag: **[direto]** — implementável independente de fork (arquitetura/plumbing,
grounded em código já existente, regime-agnóstico); **[cond:Fork N]** — pausa até o Fork N ser ratificado;
**[pendente-externa]** — nenhum artefato citável no repo cobre o conteúdo fiscal, vai só para §3, **não**
entra como comportamento implementável.

1. **[cond:Fork 1]** Superfície de regime exposta ao caller (endpoint dedicado vs parâmetro no endpoint
   Presumido). Testável: `POST /sped/ecf/real/generate` (se (b)) retorna 201 com `job.kind` correto; ou
   `POST /sped/ecf/generate` com `regime:'real'` (se (a)) roteia para o branch Real.
2. **[direto, cond:Fork 1 quanto ao arquivo]** Novo arquivo `server/src/lib/ecfReal.ts` (serializer puro,
   sem model/I/O/Prisma) que **não edita** `server/src/lib/ecf.ts` — reusa `spedLine`/`centsToSpedDecimal`/
   `spedDate` de `lib/sped.ts` e `build0000`/`build0030`/`build0930`/`build9900`/`build9999` do próprio
   `ecf.ts` (Bloco 0/9 é comum aos dois regimes — reuso, não duplicação). Testável: import cruzado sem
   ciclo; `tsc --noEmit` limpo.
3. **[direto]** `DeclarantSchema`/`SignerSchema` de `SpedEcfDto.ts` exportados e reusados pelo DTO Real
   (não redigitar o shape do declarante/signatários — mesmo objeto de domínio). Testável: teste de shape
   do novo DTO importa os schemas em vez de redeclarar campos.
4. **[cond:Fork 1]** `AccountingDataExchangeJob.kind` ganha o valor novo (`'EXPORT_SPED_ECF_REAL'` se
   serviço dedicado) — **zero migração** (`kind` é `String` puro, mesmo padrão D7 do ADR-ECF). Testável:
   `prisma migrate diff` vazio; job criado com o `kind` novo é lido de volta sem erro de tipo.
5. **[direto]** Novo serviço (se Fork 1→b) injeta `AccountingReportService` via
   `getFactory().getAccountingReportService()` para `balanceSheet`/`incomeStatement`, em vez de
   reimplementar agregação de saldo via `IPostingRepository.groupByAccount` direto (diferente do serviço
   Presumido, que lê só duas contas). Testável: teste de serviço com mock de `AccountingReportService`
   confirma a chamada, não duplica lógica de somatório.
6. **[cond:Fork 2, pendente-externa quanto ao valor exato]** `0010.HASH_ECF_ANTERIOR` alimentado por uma
   fonte concreta (não mais hardcoded `EMPTY`) — a fonte exata (job anterior vs input humano) depende do
   Fork 2 e da confirmação externa (§3 item 5). Testável **só depois** de resolvido: 1ª geração de um CNPJ
   (sem ano anterior) emite `HASH_ECF_ANTERIOR` vazio sem erro; 2ª geração alimenta o campo pela fonte
   ratificada.
7. **[cond:Fork 3, pendente-externa quanto ao conteúdo]** Bloco N (N500...N670) emitido como marcadores
   vazios **ou** como linhas `E` de entrada (não como linhas de cálculo já resolvidas) — decisão exata
   depende do Fork 3; o comportamento TESTÁVEL genérico e regime-agnóstico é: **nenhuma alíquota/adicional/
   percentual de presunção é hardcoded no serializer Real sem constante de domínio citável** (mesma
   disciplina de `models/presumption.ts` planejada — nunca implementada — para o Presumido).
8. **[cond:Fork 4]** Bloco M (M010 sempre; M300/M350/M500 condicionados à direção do Fork 4). Testável
   **só depois de resolvido**: se (c) MVP zero-ajustes, `M001` abre com `IND_DAD` refletindo só `M010`;
   se (a)/(b), o DTO ou o model persistido alimenta M300/M350 e o teste cobre pelo menos 1 adição + 1
   exclusão não-cancelando-se.
9. **[cond:Fork 5, pendente-externa quanto à obrigatoriedade]** `0010.FORMA_APUR` deixa de ser sempre
   `'T'` — Real usa o valor determinado pelo Fork 5 (`'T'` se (a), outro código se (b)). Testável: `build0010`
   (ou o equivalente Real) recebe `formaApur` como parâmetro do DTO, não default fixo.
10. **[direto]** Regra de exaustividade da receita (D6 corrigido, gate do Presumido) **não é portada** para
    o Real como está — a base do Real cobre o lucro líquido inteiro (via `incomeStatement`), então toda
    conta `Revenue`/`Expense` já participa por construção; nenhum gate equivalente de "conta não-mapeada"
    é necessário **a menos que** o Fork 4 introduza contas de ajuste que precisem do mesmo tratamento.
    Testável: teste negativo confirma que uma conta `Revenue` fora de `3.1`/`3.3` **não** bloqueia a
    geração Real (diferente do Presumido).
11. **[direto]** `ecf.test.ts:139-145` (regressão Presumido) permanece verde **sem edição** se Fork 1→(b)
    (arquivo `ecf.ts` intocado); se Fork 1→(a), a asserção precisa ser condicionada por regime e vira gate
    vermelho→verde explícito no PR (par documentado, protocolo de conserto de gate). Testável: rodar a
    suíte `lib/__tests__` inteira antes e depois do diff, zero regressão de contagem/determinismo.
12. **[direto]** Novo(s) teste(s) de serializer Real espelham a disciplina de `ecf.test.ts`: determinismo
    byte-a-byte (sha256 de 2 gerações idênticas), CRLF em toda linha, `9900` auto-referente, datas por
    slice literal (nunca `toLocaleDateString`), valores por centavos/divmod (nunca float).
13. **[direto]** Audit: `eventType` reusa `sped.ecf_generated` (allowlist `auditCanonical.ts:101` já
    genérica — `kind`, não o eventType, distingue regime). **Sem edição na allowlist**, a menos que o
    payload ganhe um campo PII novo (não previsto por nenhum fork). Testável: teste-guarda existente do
    padrão #255/#258 (payload nunca carrega PII fora da allowlist) cobre o evento novo sem alteração.
14. **[cond:Fork 1]** `docs/routes/docs.paths.ts` — se rota nova, adiciona bloco `@openapi` citando página
    do Manual quando disponível (§3), evitando o bug de classe `: ` não-quotado (já mordeu 2× no projeto,
    citado no BRIEF irmão). `npm run docs:generate` + `server/src/__tests__/openapi-paths.test.ts`
    (path-count guard) atualizados **no mesmo PR**. Se Fork 1→(a), path-count **não muda** — gate confirma
    isso como regressão zero.
15. **[direto]** Policy: reusa `IAccountingPolicy.canRead` (mesmo policy do Presumido — D8 do ADR-ECF,
    read-only, sem gate de período in-tx). Nenhuma policy nova.
16. **[cond:Fork 1]** Factory: `getSpedEcfRealGenerationService()` em `lib/factory.ts`, mesmo padrão de
    `getSpedEcfGenerationService` (`:888`) — só se serviço dedicado.
17. **[direto]** Tenancy: geração cross-scope retorna erro (mesmo padrão `NotFoundError` dos outros
    serviços de export) — teste espelha o equivalente do Presumido.
18. **[cond:Fork 4]** Se o Fork 4 for ratificado na direção (b) (model persistido), este item vira
    obrigatório: gate de smoke-migration (reaberto, diferente de todo o histórico D7/D2 deste domínio) +
    guarda de seed-backfill se algum dado precisar nascer para tenants existentes (mesma disciplina da
    conta `2.3.1` na ADR-APURACAO D2).

---

## 2. Contratos esboçados (schema Zod-like) — **tentativos, condicionados aos forks**

### Entrada — se Fork 1 → (b) serviço/rota dedicados (recomendação do ADR)

```ts
// server/src/features/accounting/dtos/SpedEcfRealDto.ts — ESBOÇO, não implementar sem fork resolvido
const SpedEcfRealRequestSchema = z.object({
  unitId: z.string().min(1),
  year: z.number().int().gte(2015).lte(2100),
  declarant: DeclarantSchema,              // REUSADO de SpedEcfDto.ts — não redigitar (item 3)
  fiscal: z.object({
    formaApur: z.enum(['T', /* valor exato do Fork 5 — PENDENTE-EXTERNA */]).default('T'),
    // indAliqCsll/indRecReceita — mesmo shape do Presumido, reuso direto
    indAliqCsll: z.enum(['1', '4']).default('1'),
    indRecReceita: z.enum(['1', '2']).default('2'),
  }).strict(),
  // Fork 2 — só se ratificado na direção (a) input humano; se (b), campo NÃO existe (derivado do job).
  hashEcfAnterior: z.string().optional(),
  // Fork 4 — só se ratificado na direção (a) input transiente; se (b), campo NÃO existe (lido de model).
  lalurAdjustments: z.array(z.object({
    descricao: z.string().min(1),
    valorCents: z.number().int().positive(),
    tipo: z.enum(['adicao', 'exclusao']),
    natureza: z.enum(['temporaria', 'definitiva']),
  })).optional(),
  signers: z.array(SignerSchema).min(1).max(2),  // REUSADO de SpedEcfDto.ts
}).strict();
```

### Saída

Igual ao Presumido: `DataExchangeJobResponse` (reuso de `dataExchangeMappers.toJobResponse` — nenhum
shape novo). O artefato (`.txt`) baixa pela rota de job já existente (INCR-6) — **nenhuma rota de
download nova**, em nenhuma direção dos forks.

---

## 3. Forks pendentes de ratificação

Detalhados no ADR normativo §4. Resumo (ordem de custo de errar, do menor ao maior):

| # | Fork | Recomendação (não ratificada) | Grau de abertura |
|---|---|---|---|
| 5 | `FORMA_APUR` Trimestral vs Anual | ~~(a) Trimestral~~ **RATIFICADO (a) 2026-09-02** | fechado |
| 1 | Endpoint dedicado vs parâmetro no existente | ~~(b) dedicado~~ **RATIFICADO (b) 2026-09-02** | fechado |
| 2 | Fonte do `HASH_ECF_ANTERIOR` | Nenhuma sem confirmar §4 item 5 (externa) | MÉDIO a ALTO conforme a externa |
| 3 | Quem computa o Bloco N (Luminaris vs PVA) | (a) PVA, por consistência com o Presumido | MÉDIO — decide toda a lógica de cálculo do serviço |
| 4 | Persistência dos ajustes Lalur/prejuízo fiscal | **Nenhuma** — o mais caro de errar | **ALTO** — decide se o incremento reabre migração/torre de cadastro |

Nenhum fork se auto-ratifica. Todos aguardam decisão do dono, fora desta sessão.

---

## 4. Pendências de validação externa

Artefato único que resolveria os 8 itens: **Manual de Orientação do Leiaute 12 da ECF (ou versão vigente
ao ano-calendário-alvo) — seções dos Blocos L, M e N (Lucro Real)**, com a matriz de obrigatoriedade
coluna "Real". Lista completa (com o fork que cada um decide) está no ADR §5; resumida aqui:

> **Versão a usar [EMENDA 2026-09-02]:** **[RESOLVIDO 2026-09-02, fonte secundária — carimbo oficial `[DONO confere]`]** A versão vigente do Manual da ECF Leiaute 12 (Anexo ao ADE Cofis nº 2/2026) **não é nem 28/05 nem 25/07**: recebeu atualização em **23/07/2026**, superando a de 20/05/2026. Fonte: ATVI, citando o Sped como origem; a página oficial `sped.rfb.gov.br` bloqueia fetch automatizado, então o carimbo exato de "Atualização" no PDF ainda deve ser conferido pelo dono antes de fechar o `layoutVersion`. Ressalva registrada: a resposta é sobre o **Manual** (PDF); o XLSX das Tabelas Dinâmicas já baixado carrega `28_05_2026` no nome, e se a atualização de 23/07 republicou também o XLSX é parte do que o dono confere na página oficial. Ao transcrever as seções L/M/N (padrão "Passo A" da
> Fase 2 do Presumido), registrar no cabeçalho do doc irmão a data de atualização lida no PDF.

1. Matriz de obrigatoriedade por regime, coluna Real (quais registros de L/M/N são obrigatórios).
2. Layout campo-a-campo L100/L200/L210/L300.
3. Layout campo-a-campo M010/M300/M350/M500 + mecânica de Parte A vs Parte B.
4. Layout campo-a-campo N500/N600/N620/N630/N650/N660/N670 — decide o Fork 3.
5. Semântica exata de `HASH_ECF_ANTERIOR` (hash do arquivo vs recibo de transmissão) — decide o Fork 2.
6. Código exato de `FORMA_TRIB` para Real (não verificado nesta sessão — não chutar o dígito).
7. Regra de compensação de prejuízo fiscal/base negativa CSLL (trava 30%, Lei 9.065/95) — condicionada ao
   Fork 4.
8. Qual `FORMA_APUR` é o alvo do MVP — decide o Fork 5.

## 5. Insumos ausentes

- **O Manual de Orientação do Leiaute 12 da ECF não está commitado no repositório** (nenhum PDF/texto em
  `docs/`) — só a transcrição parcial (`BE-INCR-SPED-ECF-layout-transcription.md`, seções 0/9/P/C/E/J/K)
  existe. Baixar/transcrever as seções L/M/N é o primeiro passo de uma eventual FASE 2 desta frente
  (mesmo padrão do "Passo A" da FASE 2 do Presumido) — **fora do escopo desta sessão de planejamento**
  (regra 2 do formulário: registrar como insumo ausente, não sair varrendo).
- **Nenhum artefato de domínio fiscal geral** (lei, tabela RFB, parecer de contador) sobre a mecânica de
  Lalur/prejuízo fiscal/base negativa está no repositório — o que o ADR §2 descreve como distinção
  Presumido×Real é conhecimento de domínio geral, grau **ASSUMIDO**, não uma fonte citável.
- **Perfil do cliente-alvo** (porte, se opta por apuração trimestral ou anual) — não documentado em
  nenhum lugar do repo; decide o Fork 5 e não tem como ser inferido de código.

## 6. Achados fora de escopo

Nenhum novo. (O achado já conhecido — `CrmOpportunityWonMapper` credita tudo em `3.1`, registrado em
`ADR-INCR-SPED-ECF §5.2` — não é redescoberto aqui; é irrelevante à base do Real, que não depende do
split `3.1`/`3.3`, ver ADR §2.)

## 7. Divergência de autorização

Nenhuma. A autorização de preparação (*"Prepara todas em sequencia em multi agents sonnets"*) cobre
exatamente o par ADR+BRIEF que este item da fila pedia — não mais, não menos. A ratificação de alvo/ordem
(`ACCOUNTING-MASTER-MAP.md` §5.1 Bloco B item 10) é explícita em dizer que **não** autoriza execução; este
BRIEF respeita isso ao não implementar nenhum comportamento do checklist além do que está marcado
`[direto]`, e mesmo os `[direto]` não foram codados nesta sessão (a sessão de planejamento nunca escreve
código — regra de escopo 1).
