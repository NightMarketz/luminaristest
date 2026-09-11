# BRIEF — BE-INCR-SPED-ECF-FASE3B (conteúdo dos Blocos L/M/N — o que falta da ECF em Lucro Real)

> **Estado: preparação apenas.** Produzido em `sessao-planejamento` (2026-09-11). Checklist e contratos
> abaixo **NÃO autorizam código** — cada fork em §3 está `RATIFICAÇÃO PENDENTE`. A `sessao-feature` que
> executar este BRIEF só avança nos itens `[direto]`; os `[cond:Fork N]` pausam no fork correspondente.
> **Este BRIEF é a continuação de `BE-INCR-SPED-ECF-FASE3-lucro-real-brief.md`** (esqueleto, mergeado
> #263) e **substitui** os itens 6, 7, 8 e 18 dele, que nasceram sem o Manual. O que lá era
> `[pendente-externa]` aqui tem página.
> **ADR normativo:** `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md` (Accepted parcial — esqueleto).
> Fork 4 na direção (b) exige **emenda ao ADR** antes de código (§3, Fork 4).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** ECF Fase 3 — o restante: Blocos **L** (períodos), **M** (e-Lalur/e-Lacs, Partes A e
  B), **N** (períodos + linhas de entrada), `HASH_ECF_ANTERIOR`, e `ECF_COD_VER` por ano-calendário.
  `ACCOUNTING-MASTER-MAP.md` §5.1 Bloco B item 10 (`origin/main` em 2026-09-11, linha 583): *"O que NÃO foi
  feito continua sendo o essencial: L, M, N e HASH_ECF_ANTERIOR"*.
- **Autorização (alvo e ordem):** dono, 2026-09-02, master map §5.1 item 10 — Lucro Real como regime-alvo;
  ordem H1 (Presumido) → esta frente → H1 2ª passada em Real.
- **Autorização (desta sessão de planejamento):** dono, em sessão, 2026-09-11: *"Pode criar o planejamento
  para seguir as implementações"*, dada imediatamente após a emenda dos itens 1/2/5 da reconferência
  (`866f0c34`). Cobre **planejar** o restante da Fase 3. **Não cobre implementar nem ratificar fork** — o
  master map em `origin/main` (linha 583) segue dizendo *"A execução do restante segue NÃO autorizada —
  Forks 2/3/4 pendentes de ratificação e do Manual"*; o Manual chegou, a ratificação não.
- **Autorização (item `ECF_COD_VER`):** ADR Fase 3, EMENDA 2026-09-03 (T5): *"`ECF_COD_VER = '0012'` é
  constante em `ecf.ts:43`; os fatos geradores de 2026 saem em Leiaute 13 — parametrizar por
  ano-calendário (molde do `0010`) entra como item novo do BRIEF da Fase 3"*.
- **Insumos existentes (lidos nesta sessão):**
  - `docs/accounting/RECONFERENCIA-ECF-FASE3-2026-09-10.md` — 8 achados com página; base de evidência
    deste BRIEF. Itens 1/2/5 da fila dele aplicados (`866f0c34`); 3/4/6/7/8/9 são o que este BRIEF planeja.
  - `docs/accounting/fontes-oficiais/Manual-ECF-Leiaute-12.pdf` (ADE Cofis 02/2026, 20/05/2026, 621 pp) e
    `RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx` (abas `L100A/B/C L210 L300A/B/C M300A/R/B/C M350A/R/B/C
    N500 N600 N610 N620 N630A/B/C N650 N660 N670`). Páginas citadas abaixo são as impressas no PDF.
  - `server/src/lib/ecfReal.ts` (177 linhas) — esqueleto: L/M/N em `EMPTY_BLOCKS_LMN` (`:107-111`);
    `EcfRealQuarter.l100Source/l300Source` chegam do serviço e **não são emitidos** (comentário `:44-49`).
  - `server/src/features/accounting/dtos/SpedEcfRealDto.ts` (62 linhas) — `formaTrib.default('1')`,
    `formaTribPer.length(4)` sem alfabeto, `formaApur: ['T']`; cabeçalho diz *"o alfabeto do código não é
    restringido porque não foi verificado"* — agora foi (p.71-72).
  - `server/src/features/accounting/services/SpedEcfRealGenerationService.ts` (186 linhas; em
    `origin/main` +6 linhas de `periodStart/periodEnd` do #305) — injeta `AccountingReportService` e chama
    `balanceSheet`/`incomeStatement` por trimestre (`:58-74`).
  - `server/src/lib/__tests__/ecfReal.test.ts:123-133` — crava que **nenhum valor dos trimestres chega ao
    arquivo**; vira gate vermelho→verde quando L/M/N ganharem dados.
  - `server/src/lib/ecf.ts` — `build0010`, `buildBlockOpen/Close`, `build9900/9999`, e o builder de
    **`P030`** (períodos do Presumido) = molde de `L030/M030/N030`; `ECF_COD_VER` constante `:43`;
    `EMPTY_BLOCKS` com `E990`/`M990` (`:343,348`).
  - `docs/accounting/BE-INCR-SPED-ECF-layout-transcription.md` — Passo A da Fase 2 (0/9/P/C/E/J/K);
    molde do doc irmão que este BRIEF manda escrever para L/M/N.
  - `docs/accounting/RUNBOOK-H1-PVA.md:227-236` — a 2ª passada em Real é o oráculo desta frente.
  - `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md` §4 (forks), §5 (pendências 1-8), EMENDA 03/09.
- **Nós vizinhos:**
  - **Consome:** `lib/sped.ts` (`spedLine`/`centsToSpedDecimal`/`spedDate`/`countRegisters`), `lib/ecf.ts`
    (Bloco 0/9, `P030`), `AccountingDataExchangeJob` + storage + rota de download (INCR-6), `AuditService`,
    `IAccountingPolicy.canRead`; se Fork 4→(b): Prisma + migração + `smoke-migration-gate.mjs`.
  - **É consumido por:** `RUNBOOK-H1-PVA.md` 2ª passada (gate humano); `BE-INCR-CONTADOR-DELIVERY` (#305)
    lê `periodStart/periodEnd` do job — **não muda** aqui; master map §5.1 item 10 (fold ⏳→✅).
  - **Não consome nem é consumido por:** frontend (`grep -rli "ecf/real\|lalur" my-app/src` = 0). Se Fork
    4→(b), a tela de cadastro de ajustes é **`FE-INCR-LALUR`, incremento separado** (regra da casa BE/FE).

## Definição de pronto

Checklist numerado + contratos esboçados + forks listados. Idêntico ao formulário.

---

## 1. Checklist de comportamentos

Tags: **[direto]** — implementável sem fork; **[cond:Fork N]** — pausa até o fork; **[cond:leitura Fork N]**
— o fork tem resposta na fonte primária e só espera o dono **ratificar a leitura**, não escolher.

### Passo A — transcrição (pré-requisito de todo builder; padrão da Fase 2)

1. **[direto]** Doc irmão `BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md` com, **por registro**, a
   página do Manual, a tabela de campos (nº/nome/tipo/tamanho/obrigatório) e as regras de validação:
   `L001 L030 L990` (pp.220-235), `M001 M010 M030 M300 M305 M310 M312 M350 M355 M360 M410 M500 M990`
   (pp.236-275), `N001 N030 N500 N630 N670 N990` (pp.276-309); e, **por aba do XLSX** (`M300A M350A N500
   N630A N670`), a contagem `E/CNA/CA/R` e a lista das linhas `E` com `DT_INI/DT_FIM`. Testável: o doc
   existe; cada builder do §1 cita `p.N` que consta nele; contagens batem com o XLSX (script em §2.4).
   Cabeçalho registra *"Atualização: maio/2026 (20/05/2026)"* lido do PDF — não de memória.

### Bloco 0 — o que a reconferência fechou

2. **[direto]** `formaTribPer` ganha o alfabeto do Manual (p.71-72, campo 7, `C 4`, `[0;R;P;A;E;S]`, um
   char por trimestre): `z.string().regex(/^[0RPAES]{4}$/)`. **Continua sem default** (decisão de
   2026-09-02 mantida). Testável: `'RRRR'` passa; `'PPPP'` passa (é válido no Manual — o que vaza é o
   *default*, não o valor); `'XXXX'` e `'RRR'` são 400; snapshot de shape do DTO atualizado no mesmo PR.
3. **[cond:leitura Fork 2]** `0010.HASH_ECF_ANTERIOR` **permanece vazio** e `hashEcfAnterior` **não entra**
   no DTO (Manual p.70: *"preenchido automaticamente pelo sistema"*, Obrigatório=Não). O comentário em
   `ecfReal.ts:31` deixa de dizer "Fork 2 pendente" e passa a citar p.70. Testável: teste existente do
   `0010` vazio ganha a citação; `SpedEcfRealRequestSchema` `.strict()` rejeita `hashEcfAnterior` (400).
4. **[cond:Fork 7]** `ECF_COD_VER` deixa de ser constante `'0012'` (`ecf.ts:43`) e passa a ser resolvido
   por ano-calendário (§3 Fork 7 decide onde a tabela vive). Testável: `year=2025` ⇒ `0012`; ano sem
   leiaute conhecido ⇒ erro explícito (nunca `0012` silencioso); Presumido (`ecf.ts`) recebe o mesmo valor
   — **é o único ponto em que `ecf.ts` é tocado**, e o teste `ecf.test.ts` existente segue verde para 2025.

### Bloco L — períodos

5. **[cond:Fork 6]** Bloco L emitido conforme o fork: (b) `L001(IND_DAD=0)` + `L030` × 4 trimestres +
   `L990`; **sem `L100/L300`** (saldos finais *"não são editáveis"*, recuperados do K155/K156 — pp.224/232).
   `L030` reusa o molde do `P030` (`ecf.ts`) com `PER_APUR ∈ T01..T04` e as janelas de `quarterWindows()`.
   Testável: as 4 linhas `L030` aparecem com `DT_INI/DT_FIN` das janelas; nenhuma linha `L100`/`L300`;
   `L990` conta 6.
6. **[cond:Fork 6]** `EcfRealQuarter.l100Source`/`l300Source` e a injeção de `AccountingReportService` no
   `SpedEcfRealGenerationService` (`:58-74`) **saem** se Fork 6→(a)/(b) — eram a "fonte candidata do
   Bloco L" (BRIEF anterior, item 5 `[direto]`), fonte que o Manual diz não alimentar L100/L300. Testável:
   o teste `ecfReal.test.ts:123` (*"não emite nenhum valor dos trimestres"*) é **reescrito** como gate
   vermelho→verde no mesmo PR (protocolo de conserto de gate): vermelho porque `quarters` deixa de ter
   `l100Source`; verde com o novo contrato. `factory.ts` deixa de passar o report service ao Real.

### Bloco M — o núcleo (é o que o PVA não tem como inventar)

7. **[cond:Fork 4]** `M001(IND_DAD=0)` + `M030` × 4 trimestres + `M990`, **sempre**, mesmo com zero
   ajustes — a estrutura de períodos é derivada do Bloco 0 (p.241: *"períodos necessários conforme
   definições de parâmetros do Bloco 0"*). Testável: arquivo sem ajustes tem `M030` × 4 e `M990 = 6`.
8. **[cond:Fork 4]** Parte A — `M300` (e-Lalur, IRPJ) e `M350` (e-Lacs, CSLL), uma linha por ajuste:
   `CODIGO` da tabela dinâmica (aba `M300A`/`M350A`), `DESCRICAO` **copiada da tabela** (não do usuário),
   `TIPO_LANCAMENTO` **derivado** da coluna `TIPO LANÇ` da linha (nunca input), `IND_RELACAO`, `VALOR`,
   `HIST_LAN_LAL`. Testável: ajuste com `codigo='7'` (custos não dedutíveis) emite `|M300|7|Custos não
   dedutíveis|A|...|`; o `TIPO_LANCAMENTO` do arquivo bate com o XLSX para **todo** código do catálogo
   (teste tabela-dirigida sobre o fixture do item 10).
9. **[cond:Fork 4]** Rejeição de código inválido: `codigo` fora do catálogo, ou com `DT_FIM` anterior ao
   exercício, ou cuja linha é `CNA`/`CA`/`R` (não é entrada) ⇒ **400 com o código e o motivo** — nunca
   drop silencioso (classe FAIL-1 do PR #66: omitir ajuste = base errada). Testável: `codigo='2'` (CNA,
   "Lucro Líquido Antes do IRPJ") é 400; `codigo='6.1'` com `DT_INI=01012026` é 400 para `year=2025`.
10. **[cond:Fork 4]** Catálogo das linhas `M300A`/`M350A`/`N630A`/`N670` como **fixture derivada do XLSX**
    por script (`scripts/ecf-tabelas-dinamicas-to-catalog.mjs`, molde do `rfb-referential-to-catalog.mjs`
    do INCR-9B): `{codigo, descricao, tipo, tipoLanc, dtIni, dtFim}` por aba, em
    `server/src/features/accounting/fixtures/ecf-l12-linhas.json`, com sha256 do XLSX de origem gravado no
    cabeçalho. Testável: rodar o script contra o XLSX do corpus reproduz o fixture byte-a-byte; contagens
    `E/CNA` batem com a reconferência (M300A 374 `E`, N630A 15 `CNA`/26 `E`).
11. **[cond:Fork 4 → (b)]** Model Prisma persistido (§2.2): `LalurEntry` (Parte A, por scope/exercício/
    trimestre/livro/código/valor) e `LalurParteBAccount` (M010: `codCtaB` nosso, estável) + cadeia completa
    `Route → Controller → Service → Repository → Prisma` + Policy (`canManageData` para escrever, `canRead`
    para gerar), DTO Zod `.strict()`, soft-delete, migração com prólogo `IF EXISTS`, `smoke-migration-gate`
    reaberto, `@@unique` por (scope, exercício, trimestre, livro, código) para fechar duplicidade
    (`REGRA_DUPLICIDADE_DESPREZADA` do Manual vira constraint nossa, não descarte do PVA). O gerador **lê**
    do model; o DTO de geração **não** carrega ajustes. Testável: CRUD de ajuste; geração com 1 adição + 1
    exclusão que não se cancelam; tenancy cross-scope = `NotFoundError`.
12. **[cond:Fork 4 → (a)]** Alternativa transiente: `lalurParteA`/`lalurParteB` no DTO de geração
    (contrato §2.1), sem model. Testável: mesmos casos do item 11 sem persistência. **Registrado como
    caminho, não como recomendação** (ver Fork 4).
13. **[cond:Fork 4, Parte B]** `M010` (uma por conta da Parte B), `M410` (lançamento sem reflexo na Parte
    A) e `M500` (controle de saldos) — **só após o Passo A transcrever os campos 5-10 de M010 e os de
    M410/M500** (item 1). Até lá, Parte B é `[pendente-externa]` de leiaute, não de decisão. Testável só
    depois: conta criada em T01 aparece em `M010` com `DT_AP_LAL` do trimestre; saldo de `M500` reconcilia
    com `M300.IND_RELACAO=1`.

### Bloco N — períodos + só o que é entrada

14. **[cond:leitura Fork 3]** `N001(IND_DAD=0)` + `N030` × 4 + `N990`; **nenhuma linha `CNA`/`CA`** é
    emitida (o PVA computa: aba `N630A`, 15 `CNA` com fórmula, ex. `N630(3) = SE (N630(1)>0) ENTAO
    N630(1)*0,15`). Testável: teste tabela-dirigido — para todo código `CNA`/`CA` de `N500/N630A/N670`, o
    arquivo **não** contém `|N630|<codigo>|`; nenhuma alíquota literal (`0,15`, `0,09`, `20000`) em
    `ecfReal.ts` (grep no teste, disciplina do item 7 do BRIEF anterior).
15. **[cond:Fork 4]** Linhas `E` de `N630`/`N670` (deduções/incentivos: PAT, cultura, audiovisual…) e a
    linha `E` de `N500` (compensação de prejuízo) **só quando houver valor** no model/DTO — mesma fonte dos
    ajustes (é o mesmo objeto de domínio: "valor informado pela PJ numa linha da tabela dinâmica"), com
    `livro: 'n630' | 'n670' | 'n500'` no discriminador. Testável: sem deduções, `N` tem só 001/030/990.

### Transversais

16. **[direto]** Determinismo byte-a-byte (sha256 de 2 gerações), CRLF em toda linha, `9900` auto-referente
    contando os registros novos (`L030 M030 M300 N030 …`), datas por slice literal, valores por centavos —
    espelho de `ecfReal.test.ts` já existente, estendido aos registros novos.
17. **[direto]** `ecf.ts` (Presumido) intocado **exceto** pelo item 4; `ecf.test.ts` 16/16 verde sem edição
    de asserção (o `ECF_COD_VER` de 2025 continua `0012`).
18. **[direto]** Audit: `sped.ecf_generated` reusado; payload ganha `lalurEntries: number` (contagem, não
    conteúdo) — **sem PII**, sem edição na allowlist de `auditCanonical.ts`. Testável: teste-guarda
    #255/#258 continua verde sem alteração.
19. **[direto]** OpenAPI: bloco `@openapi` de `POST /sped/ecf/real/generate` atualizado (DTO muda no item
    2); se Fork 4→(b), rotas novas de `LalurEntry` entram em `index.ts` + `docs.paths.ts` (2 toques) e o
    path-count guard (`openapi-paths.test.ts`) sobe **no mesmo PR**. `npm run docs:generate` commitado.
20. **[direto]** `RUNBOOK-H1-PVA.md` ganha, em branco (agente prepara, humano preenche — RUNBOOK-FORMAT),
    dois passos da 2ª passada: **(i)** "recuperar a ECF do período anterior no PVA antes de validar
    (p.14: obrigatório para `FORMA_TRIB=1` a partir do 2º exercício)"; **(ii)** "se a importação
    falhar acusando `E990`/`M990`/`S990`, remover a linha correspondente em `EMPTY_BLOCKS` e reimportar"
    (Tabela de Registros pp.44/47: Entrada=`N`; `S990` ausente da tabela). Testável: o runbook tem os
    dois passos com campo de evidência vazio e desfecho em 3 estados.

---

## 2. Contratos esboçados (schema Zod-like / Prisma-like) — **tentativos, condicionados aos forks**

### 2.1 DTO de geração — `SpedEcfRealDto.ts` (muda em todo caso; `lalur*` só se Fork 4→(a))

```ts
const FiscalRealSchema = z.object({
  formaTrib: z.string().regex(/^\d$/).default('1'),          // inalterado (ratificado 02/09)
  formaTribPer: z.string().regex(/^[0RPAES]{4}$/),            // item 2 — alfabeto p.71-72; SEM default
  formaApur: z.enum(['T']).default('T'),                      // Fork 5 (a) — restrição de produto (F-M8)
  indAliqCsll: z.enum(['1', '4']).default('1'),
  indRecReceita: z.enum(['1', '2']).default('2'),
}).strict();

// SÓ se Fork 4 → (a). Se (b), estes dois campos NÃO existem: o serviço lê do model.
const LalurLineSchema = z.object({
  livro: z.enum(['lalur', 'lacs', 'n500', 'n630', 'n670']),  // M300 | M350 | linhas E de N
  quarter: z.enum(['T01', 'T02', 'T03', 'T04']),
  codigo: z.string().min(1),                                 // validado contra o fixture (item 9/10)
  valorCents: z.number().int(),                              // NS — sinal: pendência externa 4
  histLancamento: z.string().max(500).optional(),            // M300.HIST_LAN_LAL
  contaParteB: z.string().optional(),                        // M300.IND_RELACAO=1 → M305.COD_CTA_B
}).strict();

export const SpedEcfRealRequestSchema = z.object({
  unitId: z.string().min(1),
  year: z.number().int().gte(2015).lte(2100),
  declarant: DeclarantSchema,
  fiscal: FiscalRealSchema,
  signers: z.array(SignerSchema).min(1).max(2),
  lalurParteA: z.array(LalurLineSchema).optional(),          // Fork 4 (a) apenas
  lalurParteB: z.array(/* M010 — só após Passo A */).optional(),
}).strict().superRefine(refineEcfSigners);
// NÃO EXISTE e não deve existir: hashEcfAnterior (Fork 2, leitura: PVA preenche — p.70).
```

### 2.2 Model persistido — **só se Fork 4 → (b)** (exige emenda ao ADR antes de código)

```prisma
model LalurEntry {                       // Parte A do e-Lalur/e-Lacs + linhas E do Bloco N
  id            String   @id @default(cuid())
  scopeId       String                   // AccountingScope (tenancy — sem torre nova)
  year          Int
  quarter       String                   // 'T01'..'T04'
  livro         String                   // 'lalur' | 'lacs' | 'n500' | 'n630' | 'n670'
  codigo        String                   // linha da tabela dinâmica — validado contra o fixture
  valorCents    BigInt                   // MAX_CENTS é política, não persistência (memória)
  histLancamento String?
  parteBId      String?                  // → LalurParteBAccount (IND_RELACAO = 1)
  deletedAt     DateTime?                // soft-delete
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([scopeId, year, quarter, livro, codigo, deletedAt])  // ver memória unique×soft-delete
}
model LalurParteBAccount {               // M010 — a conta é NOSSA (COD_CTA_B "atribuído pela PJ", p.237)
  id           String   @id @default(cuid())
  scopeId      String
  codCtaB      String                    // estável entre exercícios — reconcilia com E020 recuperado
  descricao    String
  dtCriacao    DateTime                  // M010.DT_AP_LAL
  // campos 5-10 de M010 (COD_PB_RFB, DT_LIM_LAL, COD_TRIBUTO, VL_SALDO_INI, IND_VL_SALDO_INI,
  // CNPJ_SIT_ESP): SÓ após o Passo A (item 1) — não esboçar de memória.
  deletedAt    DateTime?
  @@unique([scopeId, codCtaB, deletedAt])
}
```

### 2.3 Entrada do serializer — `ecfReal.ts` (muda em todo caso)

```ts
export interface EcfRealPeriod { perApur: 'T01'|'T02'|'T03'|'T04'; dtIni: string; dtFin: string; }
export interface EcfRealLalurLine {          // já resolvida contra o catálogo pelo serviço
  livro: 'lalur'|'lacs'|'n500'|'n630'|'n670';
  perApur: string; codigo: string; descricao: string;       // descricao vem do catálogo
  tipoLancamento?: 'A'|'E';                                 // derivado (M300/M350); ausente em N
  indRelacao?: '1'|'2'; valorCents: number; hist?: string; codCtaB?: string;
}
export interface EcfRealFileInput {
  declarant; fiscal; params; signers;
  periods: EcfRealPeriod[];                                 // substitui `quarters` (Fork 6)
  lalur: EcfRealLalurLine[];                                // vazio ⇒ M/N só com 001/030/990
  parteB: EcfRealParteBAccount[];                           // vazio ⇒ sem M010
  codVer: string;                                           // Fork 7 — resolvido fora do serializer
}
```

### 2.4 Fixture do catálogo — `ecf-l12-linhas.json` (item 10)

```json
{ "origem": "RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx", "sha256": "366b8d9030a0…", "leiaute": "0012",
  "abas": { "M300A": [ { "codigo": "7", "descricao": "Custos não dedutíveis", "tipo": "E",
                        "tipoLanc": "A", "dtIni": "2015-01-01", "dtFim": null } ] } }
```

### Saída

Inalterada: `DataExchangeJobResponse` (INCR-6). `periodStart/periodEnd` do #305 seguem = exercício inteiro.

---

## 3. Forks pendentes de ratificação

| # | Fork | Recomendação | Grau de abertura |
|---|---|---|---|
| 2 | Fonte do `HASH_ECF_ANTERIOR` | **(d) nenhuma das 3 do ADR — o PVA preenche; emitimos vazio** | leitura: **FECHADO na fonte** |
| 3 | Quem computa o Bloco N | **(a) PVA** — agora VERIFICADO | leitura: **FECHADO na fonte** |
| 4 | Persistência dos ajustes do Lalur | **(b) model persistido** | **ALTO** — reabre migração + exige emenda ao ADR |
| 6 | Bloco L: emitir ou deixar ao PVA | **(b) L001+L030, sem L100/L300** | MÉDIO — decide o item 6 (remover report service) |
| 7 | Onde vive `ECF_COD_VER` por ano | **(a) tabela ano→leiaute no código, erro em ano desconhecido** | BAIXO |

### Fork 2 — `HASH_ECF_ANTERIOR` (re-apresentado com a fonte)

O ADR oferecia (a) input humano, (b) sha256 do job anterior, (c) model. **Nenhuma é o que o Manual diz.**
p.70, campo 2: *"Campo preenchido automaticamente pelo sistema"*, Obrigatório=**Não**. p.14: na transmissão
o PVA verifica se existe ECF transmitida do período anterior com hashcode igual ao informado; **se não
existe, o campo tem de estar vazio**. É o mesmo padrão dos Blocos C/E (Fase 2 §2).
- **(d) O PVA preenche na recuperação; o `.txt` emite vazio; o DTO não tem o campo; o runbook ganha o passo
  de recuperação (item 20-i).** Residual humano: a partir do 2º exercício, operador que não recuperar a ECF
  anterior no PVA tem transmissão recusada — isso é runbook, não código.
- **Recomendação: (d).** O que o dono ratifica aqui é a **leitura**, não uma escolha. **RATIFICAÇÃO
  PENDENTE.**

### Fork 3 — Quem computa o Bloco N (re-apresentado com a fonte)

A recomendação (a) era analogia com o Presumido. A aba `N630A` do XLSX fecha: coluna `TIPO` com `CNA`
(Calculada Não Alterável, com `FÓRMULA` da RFB — 15%, adicional sobre `20000*MESES_PERIODO()`, teto de 90%
da LC 224/25 nas linhas `6.1/8.1/10.1` com `DT_INI=01012026`) contra `E` (entrada). `N630A` 15 CNA/26 E;
`N670` 5 CNA/26 E; `N500` 1 CNA/1 E.
- **(a) PVA computa; Luminaris emite períodos + linhas `E` quando houver valor** (itens 14-15).
- (b) Luminaris computa — descartada pela mesma razão da Fase 2, agora com evidência de que a fórmula muda
  por lei dentro do mesmo leiaute.
- **Recomendação: (a), VERIFICADO.** Ratifica-se a leitura. **RATIFICAÇÃO PENDENTE.**

### Fork 4 — Persistência dos ajustes (re-apresentado com a forma corrigida)

O ADR dizia *"Recomendação: nenhuma"*. Dois fatos novos mudam isso:
1. **A forma esboçada estava errada nas duas direções** (`{descricao, tipo, natureza}` → `{codigo}` da tabela
   dinâmica + Parte B como 2º agregado — emenda `866f0c34`).
2. **`M010.COD_CTA_B` é código que nós atribuímos e os saldos de abertura da Parte B chegam pelo `E020`
   recuperado pelo PVA** (p.44, Entrada=`N`). Um código que precisa ser **estável entre exercícios** e
   reconciliar com o que o PVA recupera **não sobrevive a input transiente por geração** — a perna (a) do
   ADR quebra na primeira conta de Parte B, e o ADR já dizia isso para o prejuízo fiscal.

- **(a) Transiente no DTO** — mais simples; quebra na Parte B (ADR + fato 2).
- **(b) Model persistido** (§2.2) — única perna que fecha Parte B; reabre migração e o `smoke-migration-gate`;
  **exige emenda ao ADR** (é o "ADR próprio" que o D4 do ADR-ECF mandou abrir); traz cadeia completa de camada
  (item 11) e um `FE-INCR-LALUR` separado.
- **(c) MVP zero-ajustes** — estruturalmente válido, materialmente falso; serve só para o 1º sign-off
  estrutural. **Não atende o critério do dono** (*"o mais completo que englobe todos os outros e produza
  prova de evidência que os runbooks exigem"*, master map linha 516).
- **Recomendação: (b)**, pela Parte B (fato 2) e pelo critério de completude ratificado. Custo real nomeado:
  migração + gate reaberto + emenda ao ADR + FE separado. **RATIFICAÇÃO PENDENTE — decisão do dono.**
  Se ratificado (b): a `sessao-feature` **não começa** antes da emenda ao ADR estar commitada.

### Fork 6 — Bloco L: emitir `L100/L300` ou deixar ao PVA (NOVO — ninguém tinha aberto)

O BRIEF anterior assumiu, sem perguntar, que `AccountingReportService.balanceSheet/incomeStatement` alimenta
`L100/L300` (item 5, `[direto]`, implementado no #263). O Manual: p.224 *"O saldo final [de L100] será
recuperado do registro K155/K156. Os saldos finais do registro L100 não são editáveis"*; p.232 idem para
`L300`; p.41 *"o bloco K pode ser construído automaticamente"* da ECD recuperada. A cadeia real é
**ECD → K → L100/L300 → `M300(2) = T_DRE(L300(…))` → N500 → N630**.
- **(a) `L001(IND_DAD=1)`+`L990` só** — tudo ao PVA. Risco: não sabemos se o PVA cria `L030` sozinho.
- **(b) `L001(IND_DAD=0)`+`L030`×4+`L990`**, sem `L100/L300` — períodos vêm do Bloco 0 (p.221), o PVA
  recupera os saldos. Consistente com `J/K/P100/P150` no Presumido.
- **(c) Emitir `L100/L300` do report service** (estado atual do plano) — importável (Entrada=`F`), mas os
  saldos finais são sobrescritos na recuperação: no melhor caso redundante, no pior divergente
  (é exatamente o risco que a Fase 2 §5 evitou para J/K).
- **Recomendação: (b).** Consequência: item 6 (remover `l100Source/l300Source` + injeção do report
  service). **O bloqueador referencial (§5.1, `3.3` sem código RFB) volta a valer transitivamente via
  ECD → K** — não é deste BRIEF, mas quem ratificar (b) precisa saber que a qualidade do L depende do
  mapeamento referencial da ECD. **RATIFICAÇÃO PENDENTE.**

### Fork 7 — `ECF_COD_VER` por ano-calendário (autorizado na EMENDA 03/09)

- **(a) Tabela `{ 2025: '0012' }` em `lib/ecf.ts`, com erro explícito para ano ausente** e override opcional
  pelo caller (`fiscal.codVer?`). Quando o Leiaute 13 for publicado, é uma linha + o corpus.
- (b) Só input do caller, sem tabela — empurra para o operador um dado que é função do ano.
- **Recomendação: (a).** É o molde do `0010`: parametrizado, sem default silencioso. **RATIFICAÇÃO PENDENTE.**

Nenhum fork se auto-ratifica. Forks 2 e 3 pedem ratificação de **leitura**; 4, 6 e 7 pedem **escolha**.

---

## 4. Pendências de validação externa

Todas têm agora **fonte no corpus** exceto as que só o PVA responde:

1. **[só o PVA]** Se a importação rejeita `E990`/`M990` (Entrada=`N`, pp.44/47) e `S990` (ausente da
   tabela) — item 20-ii prepara o passo; o H1 2ª passada é o oráculo.
2. **[só o PVA]** Se o PVA cria `L030/M030/N030` sozinho a partir do Bloco 0 quando o bloco vem só com
   `001(IND_DAD=1)` — decide entre (a) e (b) do Fork 6 de forma definitiva; (b) é seguro nas duas hipóteses.
3. **[Passo A, item 1]** Campos 5-10 de `M010`, e os registros `M305/M310/M312`, `M355/M360/M362`,
   `M410/M415`, `M500/M510`, `L030/M030/N030` campo-a-campo — bloqueia os itens 5, 7, 8, 13, 14.
4. **[Passo A, item 1]** Se `M300.VALOR` (`NS 19,2`) usa sinal ou vai sempre positivo com
   `TIPO_LANCAMENTO` dando a direção — Regras de Validação do M300 (p.244+). Até lá `z.number().int()`.
5. **[Passo A, item 1]** Obrigatoriedade de `M310` (contas contábeis relacionadas) quando
   `IND_RELACAO=2` — se obrigatório, o ajuste precisa apontar conta do razão (`accountId`), e o contrato
   §2.1/2.2 ganha esse campo.
6. **[fora do corpus]** Manual do **Leiaute 13** (AC 2026) — não publicado no índice oficial em 2026-09-11
   (`SPED-indice-manuais.html` lista até o 12). Item 4 falha explicitamente para `year=2026` até lá.
7. **[contador]** Quais linhas `E` de `M300A` este parque de clientes realmente usa (as 374 são o universo,
   não a prática) — insumo do `PEDIDO-CONTADOR`, não bloqueia código (o catálogo carrega todas).

## 5. Insumos ausentes

- **Nenhum que exija varredura.** O Manual e o XLSX estão no corpus; o que falta é **transcrever** (item 1),
  que é trabalho deste incremento, não descoberta.
- O texto extraído do Manual com marcador de página (`ecf-l12.txt`, 1,8 MB) foi gerado em scratchpad nesta
  sessão e **não está no repositório**; o Passo A regenera com `pdftotext -layout` (Fase 2) ou com o
  `pdf-parse` já em `server/node_modules` — registrar o comando no doc irmão.

## 6. Achados fora de escopo

- **`FE-INCR-LALUR`** — tela de cadastro de ajustes (se Fork 4→(b)); incremento FE separado.
- **`ADR-INCR-TAX-ASSESSMENT`** (apuração de tributos, F-M2) herda a restrição trimestral e consumirá o
  mesmo catálogo de linhas — não planejado aqui.
- **Bloqueador referencial via ECD → K** (Fork 6, consequência) — pertence ao X2/ECD, não a este BRIEF.
- **`E990`/`M990` no Presumido mergeado** (`ecf.ts:343,348`) — mesma classe do item 20-ii; se o PVA
  rejeitar na 1ª passada do H1 (Presumido), é `sessao-correcao` de uma linha, com o runbook como teste.

## 7. Divergência de autorização

**Nenhuma.** A autorização de 2026-09-11 cobre planejar o restante da Fase 3; este BRIEF planeja
exatamente isso (L/M/N + `HASH` + `ECF_COD_VER`, este último autorizado nominalmente na EMENDA 03/09) e
não implementa nem ratifica. O único ponto em que o plano **excede o esqueleto** é o Fork 4→(b) — e por
isso ele está condicionado a emenda do ADR, não embutido no checklist como se fosse decidido.
