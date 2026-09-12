# ADR-INCR-SPED-ECF-FASE3 — ECF em Lucro Real (Blocos L/M/N + `HASH_ECF_ANTERIOR` + `0010` parametrizável)

- **Status:** **Accepted — forks fechados; Parte B (item 13 / BRIEF 3C) normatizada (EMENDA 2026-09-12, 3ª — D-P1..D-P4 + correções C1..C4, ao final); model do Fork 4→(b) normatizado (EMENDA 2026-09-11, 2ª — D-M1..D-M5).** [EMENDA 2026-09-12] BRIEF 3C 5/5 forks → (a) e 4 correções de forma (C1 linha-pai de fechamento · C2 `parentId` não-nulo nos filhos · C3 âncora implícita + guarda de continuidade · C4 PF/BC sem conta ⇒ 400) ratificados por dono, em sessão, 2026-09-12 (questionário); implementação autorizada na mesma data: *"sessao-feature do 3C — EMENDA 3ª ao ADR antes do model"*. [EMENDA 2026-09-11] Forks 2→(d), 3→(a), 4→(b), 6→(b) e 7→(a) ratificados por dono, em sessão, 2026-09-11 (questionário); detalhe e fontes na EMENDA ao final. BRIEF de execução: `docs/accounting/BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md`. **Implementação do restante segue exigindo autorização própria (ORCH-006).** Antes: **Accepted (parcial — esqueleto).** [EMENDA 2026-09-02] Forks 1 e 5 ratificados e o esqueleto (itens `[direto]` + `[cond:Fork 1]` + `[cond:Fork 5]` do BRIEF) autorizado por dono, em sessão, 2026-09-02: *"Ratifico Fork 1 (dedicado) e Fork 5 (trimestral), implementa o esqueleto. Dispara tbm mais passos que são de estruturação e não dessas decisões que estão pendentes somente de configs que dependem de informações de leis"*. Forks 2, 3 e 4 seguem `RATIFICAÇÃO PENDENTE`; blocos L/M/N permanecem marcadores vazios e `FORMA_TRIB` do Real entrou como parâmetro do DTO sem default e, na mesma data, ganhou **default `'1'`** ratificado pelo dono (artefato: `BE-INCR-SPED-ECF-layout-transcription.md:85`, Manual p. 13 §1.3; §5 item 6 fechado). Esqueleto **implementado** na PR #263 (`6af66557`; fold no cabeçalho do BRIEF). Antes: **Proposed.** Produzido em `sessao-planejamento` (preparação apenas — ORCH-006). **Nenhum
  código escrito, nenhuma branch criada.** Este ADR NÃO ratifica nenhum dos forks que lista — cada um
  segue **RATIFICAÇÃO PENDENTE** do dono. A execução (código) exige autorização própria, distinta desta.
- **Date:** 2026-09-02
- **Decision class:** PRISMA_FIRST_CLASS · **READ/EXPORT** (mesma classe do ADR-INCR-SPED-ECF FASE 2) —
  a menos que o Fork 4 (persistência de ajustes Lalur) seja ratificado na direção que introduz um model
  novo, caso em que a classe do incremento resultante passa a incluir uma migração (nomeado no Fork 4).
- **Depende de (tudo em `main`):** ADR-INCR-SPED-ECF (FASE 2, implementada — o serializer/DTO/serviço
  Presumido que este ADR estende, nunca substitui), ADR-INCR-SPED-APURACAO-encerramento (`ExerciseClosingService`
  + DRE closing-aware, INCR-4 `AccountingReportService.balanceSheet`/`incomeStatement`), ADR-INCR-REVENUE-SPLIT
  (irrelevante à base do Real — ver §1 — mas mantém a segregação `3.1`/`3.3` que o Presumido continua usando).
- **Roadmap:** `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5.1 Bloco B item 10 (`[EMENDA 2026-09-02 — ALVO
  RATIFICADO]`) e `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md` §1 item 5 / §3.
- **Supersedes:** none · **Emenda a:** nenhuma emenda de decisão já fechada do ADR-INCR-SPED-ECF (D1-D10
  seguem valendo **para o Presumido**); este ADR abre a fatia que aquele ADR **explicitamente deferiu**
  no seu §4 ("Lucro Real inteiro... regime raro + torre de ajustes própria... cada um ADR próprio").
- **Related:** `docs/accounting/BE-INCR-SPED-ECF-scope-brief.md` (BRIEF irmão da FASE 2, modelo de forma),
  `docs/accounting/BE-INCR-SPED-ECF-layout-transcription.md` (transcrição do Manual — cobre só 0/9/P/C/E/J/K,
  **não** cobre L/M/N).

> **Autorização citável desta preparação:** dono, em sessão, 2026-09-02: *"Prepara todas em sequencia em
> multi agents sonnets"*, aplicada à fila vigente (`PROXIMOS-PASSOS-2026-09-02.md` item 5). Essa autorização
> cobre **preparação** (este ADR em `Proposed` + o BRIEF irmão com forks `PENDENTE`) — **não** cobre
> implementação nem ratificação de fork. O alvo (Lucro Real) e a ordem (H1 Presumido → esta frente → 2ª
> passada do H1 em Real) foram ratificados separadamente em `ACCOUNTING-MASTER-MAP.md` §5.1 Bloco B item 10
> e reafirmados como "execução NÃO autorizada" no mesmo item — a citação exata está no BRIEF irmão §Contexto
> fixo.

---

## 1. Contexto — o delta medido (grau VERIFICADO, arquivo:linha)

O gerador de ECF em `main` é **Presumido MVP** — nada nele foi escrito pensando em Real; o próprio ADR
que o especificou (ADR-INCR-SPED-ECF, FASE 2) **defere explicitamente** o Real no seu §4: *"Lucro Real
inteiro: Bloco L... Bloco M (e-Lalur/e-Lacs — Parte A do LALUR)... Bloco N... Parte B do LALUR —
Regime raro + torre de ajustes própria."* Este ADR é esse "ADR próprio".

Evidência de código (lida nesta sessão):

- `server/src/lib/ecf.ts:145` — `build0010()` tem `formaTrib?: string` com **default `'5'`** (Presumido);
  o parâmetro **já é genérico na lib** (aceita qualquer valor), mas nunca é alimentado por Real.
- `server/src/lib/ecf.ts:152` — `HASH_ECF_ANTERIOR` é hardcoded `EMPTY` com o comentário *"(sistema; Lucro
  Real)"* — o código já **documenta** que esse campo é do Real, mas não implementa nada.
- `server/src/lib/ecf.ts:330-359` — `EMPTY_BLOCKS` inclui `L001/L990`, `M001/M990`, `N001/N990` como
  marcadores **sempre vazios** (`IND_DAD='1'`), ao lado de C/E/J/K (que são recuperados pelo PVA, não do
  Real). A distinção "vazio porque é doutro regime" (L/M/N) vs "vazio porque o PVA recupera" (C/E/J/K)
  **não existe no código** — as duas classes estão na mesma lista.
- `server/src/features/accounting/dtos/SpedEcfDto.ts:47-54` — `FiscalSchema` só expõe `indAliqCsll` e
  `indRecReceita`. **`formaTrib` não existe no DTO** (confirma o achado do master map §5.1 Bloco B item 10).
- `server/src/features/accounting/services/SpedEcfGenerationService.ts:24-26,91-125` — a base inteira do
  serviço é `Σ receita bruta por atividade (3.1/3.3) × trimestre`, lida via `postingRepo.groupByAccount`
  filtrado a **duas contas**. Não há caminho para "lucro líquido contábil ± ajustes Lalur" — a base do Real
  é estruturalmente diferente (ver §2).
- `server/src/lib/__tests__/ecf.test.ts:139-145` — pino explícito: `for (const b of ['C','E','J','K','L',
  'M','N','Q','S','T','U','V','W','X','Y']) expect(lines).toContain('|${b}001|1|')` — o teste **prova** que
  L/M/N são vazios hoje; qualquer mudança que os preencha tem de manter essa asserção **condicionada ao
  regime**, não removê-la (regressão do Presumido).
- `docs/accounting/BE-INCR-SPED-ECF-layout-transcription.md` (212 linhas) — cobre **só** blocos 0/9/P (e a
  reconciliação C/E/J/K); **zero menção a L100/L200/L300/M010/M300/M350/M500/N500/N600/N620/N630/N650/
  N660/N670**. O Manual de Orientação do Leiaute 12 (jul/2026, 621 p.) foi lido só nas seções necessárias
  ao Presumido — **as seções do Real não foram transcritas** (confirma a lacuna que o BRIEF irmão nomeia
  em "Insumos ausentes").
- `server/src/features/accounting/services/ExerciseClosingService.ts` + `ADR-INCR-SPED-APURACAO-encerramento.md`
  D3 — `AccountingReportService.incomeStatement(scope, asOf)` já é **closing-aware** (exclui `sourceType=
  'closing'`, mostra o resultado operacional) e `balanceSheet(scope, asOf)` já é **closing-inclusive**
  (pós-encerramento, o PL carrega o resultado). Essas DUAS primitivas — já existentes, já testadas — são
  a fonte natural de L300 (DRE fiscal) e L100 (balanço), respectivamente. Isto é o único pedaço do delta
  que **não** precisa de read novo.

---

## 2. O que o Lucro Real tem de fundamentalmente diferente do Presumido (o eixo que decide o design)

A tabela §2 do ADR-INCR-SPED-ECF já nomeia a distinção-chave para o Presumido; o eixo que falta,
**inferido de conhecimento fiscal geral (grau ASSUMIDO — sem artefato no repo, ver §6)**:

| Eixo | Presumido (`main`, FASE 2) | Real (este ADR) |
|---|---|---|
| Base de IRPJ/CSLL | Receita bruta × presunção-por-atividade (D2 do ADR-ECF) | **Lucro líquido contábil ± adições/exclusões do Lalur** (Bloco M) |
| Quem computa o imposto | O **PVA** (Emenda FASE 2 ponto 5 — Luminaris só emite linhas `E` de receita) | **A confirmar (Fork 3)** — mesmo padrão (PVA computa via linhas `E` de ajuste) é a hipótese mais consistente com a decisão já tomada, mas não verificado para Real |
| Persistência entre exercícios | Nenhuma (cada trimestre é independente) | **Prejuízo fiscal / base negativa CSLL têm de sobreviver entre exercícios** (Parte B do Lalur — trava de compensação de 30%, Lei 9.065/95) — Presumido não tem análogo |
| `HASH_ECF_ANTERIOR` | Sempre vazio (não se aplica) | **Preenchido pelo sistema** — precisa de uma fonte (Fork 2) |
| Blocos com dado além de 0/9 | Só P | **L + M + N** (três blocos novos, cada um com registros próprios) |

Esta tabela é o núcleo do porquê o Real **não é** "trocar `formaTrib` e reusar o resto" — é
estruturalmente um segundo gerador que compartilha só a casca (Bloco 0/9, declarante, signatários,
job/download/audit) com o Presumido.

---

## 3. Decisão proposta — o que muda, camada por camada

**Nenhum item desta seção está decidido.** Cada um depende de pelo menos um fork (§4) e, para o conteúdo
fiscal exato, de validação externa (§5). O que segue é a **estrutura** proposta, condicionada aos forks.

- **`server/src/lib/` (serializer puro):** um segundo arquivo `ecfReal.ts` (não editar `ecf.ts` do
  Presumido) com builders `buildL100`/`buildL300`/`buildM010`/`buildM300`/`buildM350`/`buildM500`/
  `buildN500`/`buildN600`/`buildN620`/`buildN630`/`buildN650`/`buildN660`/`buildN670` — **cada builder só
  é escrito depois de citar a página do Manual** (mesma disciplina I052 que `ecf.ts`/`sped.ts` já seguem).
  Reusa de `ecf.ts`: `spedLine`/`centsToSpedDecimal`/`spedDate` (via `sped.ts`, já compartilhados),
  `buildBlockOpen`/`buildBlockClose`, `build0000`/`build0030`/`build0930` (Bloco 0 comum aos dois
  regimes), `build9900`/`build9999` (Bloco 9 comum). **Não** reusa `build0010`/`build0020`/`buildP030`/
  `buildPLine`/`buildEcfFile` (são específicos do Presumido) — o Real monta seu próprio `buildEcfFileReal`.
- **DTO (`server/src/features/accounting/dtos/`):** shape condicionado ao Fork 1; reusa `DeclarantSchema`/
  `SignerSchema` já exportados de `SpedEcfDto.ts` (evita duplicar o shape do declarante/signatários,
  critério de reuso do projeto — mesmo objeto de domínio, ainda vivo dos dois lados).
- **Serviço:** condicionado ao Fork 1; se serviço novo, injeta `AccountingReportService` (via
  `getFactory().getAccountingReportService()`, já exposta em `factory.ts:874`) para `balanceSheet`/
  `incomeStatement` — **não** reimplementa agregação de saldo (`groupByAccount` direto), diferente do
  serviço Presumido que lê contas específicas (`3.1`/`3.3`) porque a base dele é só essas duas contas; o
  Real precisa do resultado/balanço **inteiros**.
- **Job/Audit:** `kind` novo em `AccountingDataExchangeJob` (String puro, zero migração, mesmo padrão D7
  do ADR-ECF). `eventType` de audit: reusa `sped.ecf_generated` — o allowlist em `auditCanonical.ts:101`
  (`['jobId','kind','year','sha256','lineCount']`) já é genérico o bastante (o campo `kind` distingue
  Presumido de Real); não precisa de entrada nova na allowlist **a menos que** o payload ganhe um campo
  PII novo (não previsto).
- **Rota/Controller/OpenAPI:** condicionado ao Fork 1 (rota nova vs parâmetro na existente); cadeia
  completa (Route → Controller → Service → Repository/ReportService → Prisma) + Policy (`canRead`, reuso
  de D8 do ADR-ECF: read-only, sem gate de período) + DTO `.strict()`.

---

## 4. Forks pendentes de ratificação — **Forks 1 e 5 ratificados em 2026-09-02; 2, 3 e 4 ratificados em 2026-09-11 (ver EMENDA 2026-09-11 — Forks 6 e 7 também)**

### Fork 1 — Superfície de regime: estender o endpoint existente ou criar um serviço/rota dedicados

- **(a) Estender `POST /sped/ecf/generate` + `SpedEcfGenerationService`** com um discriminador
  `dto.regime: 'presumido' | 'real'`, branch interno para montar `EcfFileInput` ou o equivalente Real.
  Path-count do openapi **não muda**.
- **(b) Serviço e rota dedicados** — `POST /sped/ecf/real/generate`, `SpedEcfRealGenerationService`, `kind
  ='EXPORT_SPED_ECF_REAL'`. Path-count do openapi **aumenta em 1** (gate mecânico, não bloqueador).
- **Recomendação: (b).** Mirrors o próprio D1 do ADR-INCR-SPED-ECF ("MVP regime único... Real fica FORA,
  ADR próprio") — o projeto já decidiu, para o Presumido, que cada regime é sua própria unidade de decisão.
  (b) mantém o serviço Presumido **já implementado e testado** (`ecf.test.ts`, `SpedEcfGenerationService.test.ts`)
  **inteiramente intocado** — menor blast radius sobre código que já passou por review independente. A
  duplicação de boilerplate do declarante/signatários é mitigada pelo reuso de `DeclarantSchema`/
  `SignerSchema` (§3). ~~**RATIFICAÇÃO PENDENTE.**~~ **RATIFICADO (b) — dono, em sessão, 2026-09-02: *"Ratifico Fork 1 (dedicado) e Fork 5 (trimestral), implementa o esqueleto. Dispara tbm mais passos que são de estruturação e não dessas decisões que estão pendentes somente de configs que dependem de informações de leis"*.**

### Fork 2 — Fonte do `0010.HASH_ECF_ANTERIOR`

- **(a) Input humano transiente no DTO** (`hashEcfAnterior?: string`) — mesma filosofia de D4/D5 do
  ADR-ECF (regime/declarante/recibo sempre transientes, nada persistido).
- **(b) Derivado do `sha256` já gravado em `AccountingDataExchangeJob`** do ano anterior (`kind` do Real,
  `year=year-1`) — zero input humano, reusa infraestrutura já existente, mas amarra o hash ao **arquivo que
  o Luminaris gerou**, não necessariamente ao **recibo de transmissão** que o campo pode exigir.
- **(c) Novo model persistido** dedicado ao histórico de ECF — reabre a discussão de cadastro que o D4 do
  ADR-ECF mandou parar (ADR próprio se tender a isso).
- **Recomendação: nenhuma sem resolver primeiro §5 (pendência externa) — o Manual precisa confirmar SE o
  hash é o SHA do `.txt` gerado (caso em que (b) serve) ou o hash/recibo de TRANSMISSÃO assinada (caso em
  que só (a), input humano, é viável — o dado de transmissão não existe neste ambiente).** Grau de
  abertura: MÉDIO se (a) ou (b); ALTO se (c). **RATIFICAÇÃO PENDENTE.**

### Fork 3 — Quem computa o Bloco N (IRPJ/CSLL do Real): Luminaris ou o PVA

- **(a) Mesmo padrão INVERTIDO do Presumido** (Emenda FASE 2 ponto 5): Luminaris só alimenta as linhas de
  ENTRADA (lucro líquido ajustado via L300, adições/exclusões via M300/M350); o PVA computa N500+ pelas
  fórmulas da RFB (linhas `CNA`/`CA`), mesma filosofia "fonte única de verdade = programa da RFB".
- **(b) Luminaris computa e emite IRPJ 15%+adicional 10%/CSLL 9% já calculados** nas linhas de cálculo do
  Bloco N — duplicaria lógica fiscal no código, o oposto do que a Emenda ponto 5 decidiu para o Presumido
  pelo mesmo motivo (risco de divergência com mudança de lei — já citado no ADR-ECF: *"a LC 224/25 já
  mudou fórmulas neste leiaute; duplicá-las seria dívida fiscal"*).
- **Recomendação: (a)**, por consistência direta com a decisão já ratificada e testada para o Presumido —
  mesmo raciocínio, mesmo risco de manutenção evitado. **Mas carece de confirmação**: o Presumido tinha a
  **Tabela Dinâmica oficial verificada** (`Tabelas_Dinamicas_ECF_Leiaute_12`) provando que P200/P300/P400/P500
  são `CNA/CA` (PVA-computados); a tabela equivalente para os registros N500-N670 do Real **não foi lida**
  nesta sessão (vai para §5). **RATIFICAÇÃO PENDENTE.**

### Fork 4 — Persistência dos ajustes Lalur (Bloco M Parte A) e do prejuízo fiscal/base negativa (Parte B) — **o fork mais caro de errar**

Hoje **nada no ledger** distingue lançamento contábil de ajuste fiscal (adição/exclusão) — busca nesta
sessão em `server/src` por `lalur|lacs|adição fiscal|exclusão fiscal|prejuízo fiscal|base negativa`
retornou **zero** ocorrência no domínio contábil.

- **(a) Input humano transiente por geração** — uma lista de ajustes (`{descricao, valorCents, tipo:
  'adicao'|'exclusao', natureza:'temporaria'|'definitiva'}`) no DTO, mesmo padrão D4/D5 do ADR-ECF. **Não
  sobrevive ao requisito de Parte B**: o controle de prejuízo fiscal/base negativa exige um **saldo
  acumulado entre exercícios** (compensação limitada a 30% da base positiva do exercício corrente, Lei
  9.065/95) — sem persistência, não há como saber o saldo do ano anterior a cada nova geração.
- **(b) Novo model Prisma persistido** (`TaxAdjustment`/`LalurEntry` + saldo de Parte B por exercício) —
  resolve a Parte B, mas é exatamente o tipo de decisão que o **D4 do ADR-INCR-SPED-ECF nomeia como "PARE,
  abra ADR próprio"** se a tendência for persistir cadastro/histórico de regime fiscal. Este SERIA esse
  ADR próprio — mas a decisão de criar o model ainda não foi tomada, só identificada como necessária.
- **(c) MVP zero-ajustes** — Bloco M emitido só com `M010` (abertura), sem nenhuma linha de adição/
  exclusão real (assume lucro contábil == base fiscal). Estruturalmente válido, **materialmente falso**
  para qualquer empresa com diferença book-tax real conhecida (o caso comum, não o de exceção) — mas seria
  suficiente para o **1º sign-off do H1 2ª passada** provar a cadeia estrutural, adiando a correção
  fiscal para quando houver um caso real com ajuste conhecido.
- **Recomendação: nenhuma.** As três pernas têm custo real e nenhuma é estritamente dominante: (a) é
  arquitetura mais simples mas quebra na primeira Parte B real; (b) é a única correta a médio prazo mas
  reabre uma decisão que o projeto já rejeitou uma vez no MVP anterior (T2, torre §4 do master map, mesma
  classe de risco); (c) desbloqueia o sign-off estrutural mas entrega um Bloco M enganoso se lido como
  "completo". Grau de abertura: **ALTO** — decisão de escopo/persistência, não só de leiaute.
  **RATIFICAÇÃO PENDENTE — decisão do dono, sem viés desta sessão.**

### Fork 5 — `FORMA_APUR` do Real: Trimestral (definitivo) vs Anual (com balancetes de suspensão/redução)

O Lucro Real admite dois regimes de apuração legalmente distintos: trimestral definitivo (estrutura mais
próxima do Presumido — 4 janelas fechadas) ou anual com antecipações mensais por estimativa e balancetes
de suspensão/redução (`MES_BAL_RED` do `0010`, hoje sempre vazio no `build0010` porque só existe quando
`FORMA_APUR≠'T'`).

- **(a) MVP trimestral.** Reusa a estrutura de janelas de `quarterWindows()` já existente em
  `SpedEcfGenerationService.ts:29-38` (a função é regime-agnóstica — 4 janelas de trimestre).
- **(b) MVP anual com estimativa mensal.** Estrutura de apuração mais comum na prática para empresas de
  porte maior, mas exige as regras de balancete de suspensão/redução (`MES_BAL_RED`) e antecipações
  mensais — superfície bem maior, sem precedente de janela no código atual (as primitivas de
  `getAccountBalances` suportam janela mensal arbitrária, mas a lógica de antecipação/ajuste não existe).
- **Recomendação: (a)**, por menor superfície e por reusar a única primitiva de janelamento já testada
  (`quarterWindows`) — mas **sem confirmação de qual modalidade é a exigida/mais comum para o perfil de
  cliente-alvo do produto** (ver §5). ~~**RATIFICAÇÃO PENDENTE.**~~ **RATIFICADO (a) Trimestral — dono, em sessão, 2026-09-02: *"Ratifico Fork 1 (dedicado) e Fork 5 (trimestral), implementa o esqueleto. Dispara tbm mais passos que são de estruturação e não dessas decisões que estão pendentes somente de configs que dependem de informações de leis"*.**

---

## 5. Pendente de validação externa — artefato exato que falta

Nenhum destes itens tem artefato citável no repositório; todos exigem o **Manual de Orientação do Leiaute
12 da ECF** (ou versão vigente ao ano-calendário-alvo) nas seções do **Lucro Real**, que não foram
baixadas/transcritas (`docs/accounting/BE-INCR-SPED-ECF-layout-transcription.md` cobre só 0/9/P/C/E/J/K).
Grau de todo item abaixo: **ASSUMIDO** onde há hipótese nomeada, **inverificável** onde não há.

1. **Matriz de obrigatoriedade por regime, coluna Real** — quais registros de L/M/N são obrigatórios vs
   condicionais para o perfil-alvo (PJ obrigada à ECD, sem SCP, sem operação no exterior).
2. **Layout campo-a-campo de L100/L200/L210/L300** (ordem/tamanho/obrigatoriedade de cada campo) — hoje
   só a hipótese de fonte (`balanceSheet`/`incomeStatement`, §1) está grounded; o mapeamento campo→origem
   não.
3. **Layout campo-a-campo de M010/M300/M350/M500** e a mecânica exata de Parte A (adições/exclusões por
   natureza temporária/definitiva) vs Parte B (controle de valores a excluir em períodos futuros/saldo de
   prejuízo).
4. **Layout campo-a-campo de N500/N600/N620/N630/N650/N660/N670** — cálculo de IRPJ/CSLL do Real,
   incluindo se são linhas `E` (nossas) ou `CNA/CA` (PVA) — decide o Fork 3.
5. **Semântica exata de `0010.HASH_ECF_ANTERIOR`** — hash do arquivo gerado vs hash/recibo de transmissão
   assinada — decide o Fork 2.
6. **Código exato de `FORMA_TRIB` para Real** na tabela oficial — o `build0010` da lib atual documenta só
   o Presumido (`'5'`); o valor para Real **não foi verificado nesta sessão** (evitar chutar o dígito).
7. **Regra de compensação de prejuízo fiscal/base negativa CSLL** (trava de 30%, Lei 9.065/95) — mecânica
   exata de registro no Bloco M Parte B, condicionada ao Fork 4.
8. **Qual `FORMA_APUR` (Trimestral vs Anual) é o alvo do MVP** — decide o Fork 5; sem um perfil de
   cliente-alvo real confirmado, a escolha entre as duas é heurística de menor superfície, não fiscal.

**Artefato que resolveria todos os itens acima:** as seções do Manual de Orientação do Leiaute 12 da ECF
referentes aos Blocos L/M/N (Lucro Real), baixadas e transcritas com a mesma disciplina do Passo A da
FASE 2 (`pdftotext -layout`, isolar a matriz de obrigatoriedade coluna Real + a seção de leiaute de cada
bloco, citando página em cada builder — lição I052, já citada 3× no ADR-ECF FASE 2).

---

## 6. Alternativas consideradas

- **Reusar `lib/ecf.ts` do Presumido, adicionando `if (regime==='real')` dentro dos builders existentes.**
  Descartada: misturaria duas bases de cálculo estruturalmente diferentes (§2) num único arquivo que já
  tem cobertura de teste fina (determinismo, contagem, block order) — o risco de regredir o Presumido ao
  editar o arquivo compartilhado é maior que o custo de duplicar a casca comum (Bloco 0/9). Ver Fork 1.
- **Computar o imposto do Real no próprio Luminaris (Fork 3 opção b) como default, sem esperar
  confirmação.** Descartada como *decisão default*: contradiz a lógica já ratificada para o Presumido
  (Emenda ponto 5) sem um motivo novo — a mesma "fonte única de verdade = RFB" se aplica ao Real salvo
  prova em contrário.
- **Pular Fork 4 e ir direto para (c) MVP zero-ajustes como decisão, não como opção.** Descartada como
  decisão desta sessão: regra de escopo 4 do formulário de planejamento probe decisão não coberta a ser
  registrada, não escolhida — mesmo (c) sendo a opção de menor esforço, decidir por ela aqui seria
  auto-ratificar um fork, o que o formulário proíbe.

---

## 7. Consequências

- **Se Fork 1 → (b):** o código Presumido em `main` (`ecf.ts`, `SpedEcfGenerationService.ts`,
  `SpedEcfDto.ts` e seus três arquivos de teste) permanece **intocado** por este incremento — nenhuma
  regressão possível no que já passou por review independente e está potencialmente perto do H1 (1ª
  passada). O custo é código novo paralelo (`ecfReal.ts`, novo serviço, nova rota) com alguma duplicação
  de casca mitigada por reuso de schema (§3).
- **Se Fork 4 → (b) (model persistido):** este incremento deixa de ser **zero migração** (diferente de
  todo o histórico de decisões D7 do ADR-ECF e D2 da ADR-APURACAO) — precisa reabrir a classe de risco
  "smoke-migration-gate" e o guarda-corpo de seed-backfill se algum dado precisar nascer para tenants
  existentes. Nomear explicitamente no BRIEF quando o fork for ratificado nessa direção.
- **Se Fork 4 → (c) (zero-ajustes) for a escolha do dono:** o H1 2ª passada em Real prova a cadeia
  **estrutural** (arquivo bem formado, aceito pelo PVA) mas **não** prova a correção material do Bloco M
  para uma empresa com ajustes reais — este resíduo tem de ficar registrado no runbook do H1 2ª passada
  quando ele for escrito (fora do escopo desta sessão — é gate humano).
- **Em qualquer direção dos forks:** a FASE 2 do Presumido (D1-D10 do ADR-INCR-SPED-ECF) **não é
  reaberta** — este ADR só adiciona, nunca revisita, as decisões já ratificadas para o Presumido.
- **Índice (`docs/adr/INDEX.md`) e master map (`ACCOUNTING-MASTER-MAP.md`):** não editados nesta sessão
  (regra 1 do formulário de planejamento). A linha de índice deste ADR fica para um **fold posterior**,
  registrado no BRIEF irmão.

---

## 8. Referências

- `docs/adr/ADR-INCR-SPED-ECF-file-generation.md` — ADR normativo do Presumido (D1-D10 + Emenda FASE 2);
  §4 é a fonte da moratória que este ADR resolve ("Real... ADR próprio").
- `docs/adr/ADR-INCR-SPED-ECD-file-generation.md` — precedente de serializer posicional puro + lição I052
  (disciplina campo-a-campo citando página do Manual).
- `docs/adr/ADR-INCR-SPED-APURACAO-encerramento.md` — fonte de `balanceSheet`/`incomeStatement`
  closing-aware (D3) que este ADR propõe reusar para Bloco L.
- `docs/adr/ADR-INCR-REVENUE-SPLIT-by-nature.md` — split `3.1`/`3.3`, irrelevante à base do Real (§2) mas
  mantido pelo Presumido, que este incremento não altera.
- `docs/accounting/BE-INCR-SPED-ECF-scope-brief.md` — BRIEF irmão da FASE 2 (modelo de forma para o BRIEF
  irmão deste ADR).
- `docs/accounting/BE-INCR-SPED-ECF-layout-transcription.md` — transcrição do Manual (só 0/9/P/C/E/J/K;
  a lacuna que fundamenta §5 deste ADR).
- `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5.1 Bloco B item 10 — autorização do alvo/ordem.
- `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md` §1 item 5, §2, §3 — fila vigente e autorização de
  preparação.
- Código lido nesta sessão (citações completas no §1): `server/src/lib/ecf.ts`,
  `server/src/features/accounting/dtos/SpedEcfDto.ts`,
  `server/src/features/accounting/services/SpedEcfGenerationService.ts`,
  `server/src/controllers/spedController.ts`, `server/src/routes/accounting.ts`,
  `server/src/routes/docs.paths.ts`, `server/src/lib/factory.ts`,
  `server/src/features/accounting/audit/auditCanonical.ts`,
  `server/src/lib/__tests__/ecf.test.ts`.

## EMENDA (2026-09-03) — Fork 5 (trimestral) declarado como RESTRIÇÃO DE PRODUTO

Ratificado pelo dono em 2026-09-03 (**F-M8**, [CEDULA-DECISAO-2026-09-03-modulos.md](../accounting/CEDULA-DECISAO-2026-09-03-modulos.md) §B):
a apuração **trimestral** ratificada no Fork 5→(a) deixa de ser "escolha ainda aberta" e passa a **critério de
qualificação de cliente** — *o módulo atende Lucro Real com apuração trimestral; tenant em estimativa mensal
de IRPJ/CSLL fica fora até segunda ordem*. O futuro `ADR-INCR-TAX-ASSESSMENT` herda esta restrição. Reabrir
exige ADR + sinal humano (regra §1 do master map). Zero código.

Registrado na mesma data como achado de triagem (T5): `ECF_COD_VER = '0012'` é **constante** em
`server/src/lib/ecf.ts:43`; os fatos geradores de 2026 saem em Leiaute 13 — parametrizar por ano-calendário
(molde do `0010`) entra como item novo do BRIEF da Fase 3. E a versão vigente do Manual do Leiaute 12 é a
atualização de **20/05/2026** (índice oficial `sped.rfb.gov.br/pasta/show/1644`), não 23/07.

## EMENDA (2026-09-11) — Forks 2, 3 e 4 ratificados; Forks 6 e 7 abertos e ratificados; §5 resolvido na fonte

Ratificado pelo dono em 2026-09-11, em sessão, por questionário de forks (padrão INCR-DIM/NF-e), após a
reconferência do BRIEF contra o Manual do Leiaute 12 agora no corpus local
(`docs/accounting/RECONFERENCIA-ECF-FASE3-2026-09-10.md`) e o BRIEF de continuação
`docs/accounting/BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md`. **Status do ADR: Accepted parcial → Accepted
(forks fechados; implementação do restante segue exigindo autorização própria, ORCH-006).**

| Fork | Decisão | Fonte que a sustenta |
|---|---|---|
| **2** `HASH_ECF_ANTERIOR` | **(d) — nenhuma das três do §4.** O PVA preenche na recuperação da ECF anterior; o `.txt` emite vazio; o DTO **não** tem o campo. | Manual p.70 (campo 2: *"preenchido automaticamente pelo sistema"*, Obrigatório=Não); p.14 (regra de transmissão). Mesmo padrão dos Blocos C/E da Fase 2. |
| **3** Quem computa o Bloco N | **(a) PVA.** Luminaris emite `N001/N030/N990` + linhas `E` quando houver valor; nenhuma `CNA/CA`. | Tabelas Dinâmicas, aba `N630A`: `TIPO=CNA` com `FÓRMULA` (15%, adicional sobre `20000*MESES_PERIODO()`, teto 90% LC 224/25 em `6.1/8.1/10.1`); 15 CNA / 26 E. Deixa de ser analogia: é **VERIFICADO**. |
| **4** Persistência dos ajustes | **(b) model Prisma persistido** — `LalurEntry` (Parte A + linhas `E` de N) e `LalurParteBAccount` (M010). **Este é o "ADR próprio" que o D4 do ADR-ECF exigia; esta emenda o cumpre.** | Manual p.237: `M010.COD_CTA_B` é *"código unívoco atribuído pela pessoa jurídica"* — nosso, e precisa ser estável entre exercícios; p.44: `E020` (saldos da Parte B do ano anterior) é recuperado pelo PVA, Entrada=`N`. Input transiente não sobrevive à Parte B. Critério do dono (master map l.516): completude. |
| **6** Bloco L (novo) | **(b) `L001(IND_DAD=0)` + `L030`×4 + `L990`, sem `L100/L300`.** Sai a injeção de `AccountingReportService` do serviço Real; `ecfReal.test.ts:123` vira gate vermelho→verde. | Manual p.224 (*"saldo final será recuperado do registro K155/K156 … não são editáveis"*), p.232 (idem L300), p.41 (K construído da ECD recuperada). Corrige o §1 deste ADR, que chamava `balanceSheet/incomeStatement` de "fonte candidata do Bloco L". |
| **7** `ECF_COD_VER` por ano (novo, autorizado na EMENDA 03/09) | **(a) tabela `{2025:'0012'}` em `lib/ecf.ts`, erro explícito para ano sem leiaute, override opcional pelo caller.** | Índice oficial `pasta/show/1644`: Leiaute 12 é o último publicado em 2026-09-11; Leiaute 13 (AC 2026) ainda não existe. |

**§5 (pendências externas) — estado após o corpus:** itens 1, 2, 3, 4, 5 e 6 **resolvidos na fonte**
(Manual + XLSX no repositório; detalhe página a página na reconferência); item 7 (compensação 30%,
Parte B) e a mecânica de `M410/M500` ficam para o **Passo A** do BRIEF 3B (transcrição campo-a-campo);
item 8 já estava fechado (Fork 5). Duas pendências **só o PVA responde**: se rejeita `E990/M990/S990`
(Entrada=`N`/ausente — pp.44/47) e se cria `L030/M030/N030` sozinho — ambas viram passos do
`RUNBOOK-H1-PVA.md` 2ª passada, preparados pelo agente e preenchidos pelo humano.

**Consequências que esta emenda assume, nomeadas:** (i) migração nova + `smoke-migration-gate` reaberto
(primeira vez neste domínio desde D7/D2); (ii) `FE-INCR-LALUR` como incremento separado; (iii) o bloqueador
referencial (§5.1 do ADR-ECF, `3.3` sem código RFB) volta a valer **transitivamente** via ECD → K → L —
pertence ao X2, não a esta frente, mas quem operar a 2ª passada precisa saber.

---

## EMENDA (2026-09-11, 2ª) — Fork 4→(b): forma NORMATIVA do model persistido (pré-requisito do código)

O BRIEF 3B (§3, Fork 4) condiciona o primeiro código de model a *"emenda ao ADR commitada antes"*. A EMENDA
anterior ratificou a **direção** (model persistido); esta fixa a **forma** — o que o §2.2 do BRIEF esboçava
como "tentativo" vira decisão, com as duas correções que a sessão de feature levantou e o dono ratificou em
sessão (2026-09-11, questionário, ambas na opção (a) recomendada). Autorização de implementação: dono, em
sessão, 2026-09-11: *"implementa o BRIEF 3B, começando pela emenda ao ADR → model"*.

### D-M1 — Dois agregados, tenancy = `AccountingScope` (`userId` + `unitId`), sem torre nova

| Model | Registro ECF | Chave de negócio | Fonte |
|---|---|---|---|
| `LalurEntry` | `M300`/`M350` (Parte A) + linhas `E` de `N500`/`N630`/`N670` | `(userId, unitId, year, quarter, livro, codigo)` | M300 chave `CODIGO` sob `M030.PER_APUR` (p.244); N630/N670 chave `CODIGO` (pp.298/307) |
| `LalurParteBAccount` | `M010` (Parte B) | `(userId, unitId, codCtaB, codTributo)` | M010 chave `COD_CTA_B + COD_TRIBUTO` (p.237, lacuna 6) |

O `scopeId` do esboço §2.2 **é** o par `userId + unitId` — `AccountingScope` não é tabela (verificado:
`schema.prisma` não tem model de scope; precedente `Counterparty`/`DimensionDefinition`). FK `User` com
`onDelete: Cascade` (dado operacional; a trilha é o `AuditEvent` — exceção T8, precedente `Counterparty`).

### D-M2 — Soft-delete + rename-on-key (ratificado (a), 2026-09-11)

O esboço `@@unique([…, deletedAt])` **não fecha duplicidade viva no SQLite** (NULL é distinto em índice
único: duas linhas com `deletedAt = NULL` e o mesmo `codigo` passam). Decisão: `@@unique` **sem** `deletedAt`
+ archive na mesma tx reescreve a coluna-chave — `LalurEntry.codigo → deleted:<id>:<codigo>`,
`LalurParteBAccount.codCtaB → deleted:<id>:<codCtaB>` — precedente SEC-A1-4 (`Counterparty`) e D3 do
`Payable`. `REGRA_DUPLICIDADE_DESPREZADA` do Manual (aviso do PVA) vira constraint nossa (erro), como o
item 11 pede. Alternativas descartadas: hard-delete (contraria Contrato §2) e chave com `deletedAt`
(deixa o TOCTOU aberto).

### D-M3 — Linhas do Bloco N não carregam campos do M300 (ratificado (a), 2026-09-11)

`N500/N630/N670` só têm `REG, CODIGO, DESCRICAO, VALOR` (pp.280/298/307). Para `livro ∈ {n500, n630, n670}`
o DTO **proíbe** `indRelacao`, `contaParteB`, `accountId`, `histLancamento` (400 se vierem) e o `superRefine`
de `REGRA_RELACAO_INEXISTENTE` só roda em `lalur`/`lacs`. No model, `indRelacao` é **nullable** (NULL em N).
Corrige o §2.1 do BRIEF, que exigia `indRelacao` para todo `livro` (input aceito-e-ignorado — classe da
memória `param-aceito-e-ignorado-e-bug`).

### D-M4 — Colunas (fecha o §2.2 do BRIEF, lacunas 1-7 já dobradas)

```prisma
model LalurEntry {
  id             String   @id @default(cuid())
  userId         String   // AccountingScope.ownerUserId — FK User, Cascade
  unitId         String
  year           Int
  quarter        String   // 'T01'..'T04' (Fork 5→a)
  livro          String   // 'lalur' | 'lacs' | 'n500' | 'n630' | 'n670'
  codigo         String   // linha da tabela dinâmica; validado contra o fixture (item 9/10); rename-on-delete
  valorCents     BigInt   // ≥ 0 (p.244: negativo = "Erro no programa"); direção vem do TIPO_LANCAMENTO derivado
  indRelacao     String?  // '1'|'2'|'3'|'4' (p.245) em lalur/lacs; NULL em N (D-M3)
  histLancamento String?  // M300.HIST_LAN_LAL, C 500 (p.245); obrigatório com indRelacao=4 (p.247, leitura INFERIDA)
  parteBId       String?  // FK LalurParteBAccount, Restrict — indRelacao ∈ {1,3} (p.247)
  accountId      String?  // FK Account (id, não código) — indRelacao ∈ {2,3}; serializer resolve → M310.COD_CTA = I050/J050.COD_CTA (p.252)
  createdById    String?
  createdAt / updatedAt / deletedAt
  @@unique([userId, unitId, year, quarter, livro, codigo])
}
model LalurParteBAccount {                 // M010 campos 2-10 (p.237)
  id, userId (FK User Cascade), unitId
  codCtaB        String   // 2 COD_CTA_B — nosso, estável entre exercícios; rename-on-delete
  descricao      String   // 3 DESC_CTA_LAL
  dtCriacao      DateTime // 4 DT_AP_LAL — date-only (data FINAL do período em que nasceu)
  codPbRfb       String   // 5 COD_PB_RFB, C 6 — aba PARTEB_PADRAO (REGRA_M010_COD_PB_RFB_TRIBUTO)
  dtLimite       DateTime? // 6 DT_LIM_LAL — date-only
  codTributo     String   // 7 COD_TRIBUTO 'I' | 'C' — parte da chave (lacuna 6)
  saldoIniCents  BigInt   // 8 VL_SALDO_INI ≥ 0 — REGRA_DT_AP_ZERO: = 0 se dtCriacao ∈ exercício
  indSaldoIni    String   // 9 IND_VL_SALDO_INI 'D' | 'C'
  cnpjSitEsp     String?  // 10 CNPJ_SIT_ESP, 14 dígitos
  createdById, createdAt, updatedAt, deletedAt
  @@unique([userId, unitId, codCtaB, codTributo])
}
```

`MAX_CENTS` segue política de DTO (memória `max-cents-e-politica-nao-persistencia`); `≥ 0` é invariante de
DTO + teste (SQLite via Prisma não tem CHECK). Datas `date-only` seguem a convenção `Payable.issueDate`
(`isValidDateOnly` no DTO).

### D-M5 — O que esta emenda NÃO decide (fica para o item 13, com o dono)

- **N-1 (saldos da Parte B por período / `M500`)** — o BRIEF §2.2 manda a sessão do item 13 escolher entre
  `LalurParteBBalance` (espelho do M500) e recomputar do razão da Parte B. **Não entra nesta migração**; se
  for (i), é uma **2ª migração**, nomeada aqui para que o `smoke-migration-gate` não a receba como surpresa.
- **`M410`** (lançamento sem reflexo na Parte A) — mesma sessão do item 13; `M362/M415/M510` continuam sem
  seção própria na transcrição (BRIEF §4 item 3), logo `[pendente-externa]` de leiaute.

### Consequências

Migração `add_lalur_entries_and_parte_b_accounts` (tabelas novas — sem backfill; prólogo `DROP … IF EXISTS`
por `migracao-sqlite-nao-e-transacional`), `smoke-migration-gate` reaberto **nesta** frente; cadeia
`Route → Controller → Service → Repository → Prisma` + Policy (`canManageData` escreve, `canRead` gera),
DTO `.strict()`, rotas em 2 toques + path-count guard. O gerador da ECF Real **lê** do model; o DTO de
geração **não** carrega ajustes (item 11). Tela = `FE-INCR-LALUR`, separada.

---

## EMENDA (2026-09-12, 3ª) — Item 13 / BRIEF 3C: forma NORMATIVA da Parte B persistida (pré-requisito do código)

O BRIEF 3C (`docs/accounting/BE-INCR-SPED-ECF-FASE3C-parte-b-brief.md`) condiciona o primeiro código de
model a *"EMENDA 3ª ao ADR antes"* (Fork N-1, qualquer perna com tabela — mesma regra do Fork 4→(b)). A
D-M5 nomeou esta 2ª migração *"para que o `smoke-migration-gate` não a receba como surpresa"*. Os 5 forks
do BRIEF foram ratificados na opção (a) (dono, 2026-09-12, questionário); esta emenda fixa a **forma** —
o §2.2 do BRIEF ("tentativo, condicionado aos forks") vira decisão — com **quatro correções** que a
sessão de feature levantou lendo o esboço contra o `schema.prisma` real e o dono ratificou em sessão
(2026-09-12, questionário, 4/4 na opção recomendada). Autorização de implementação: dono, em sessão,
2026-09-12: *"sessao-feature do 3C — EMENDA 3ª ao ADR antes do model"*.

### D-P1 — Cinco models, tenancy = `AccountingScope`, um agregado por registro do Bloco M

| Model | Registro ECF | Chave de negócio | Fonte |
|---|---|---|---|
| `LalurParteBMovement` | `M410` (nível 3 sob `M030`) | **nenhuma** (Manual p.268: "Campo(s) chave: —") | duplicata por duplo-submit é do FE |
| `LalurParteBClosing` | estado "trimestre fechado" (não é registro; é o que a N-1 exige) | `(userId, unitId, year, quarter)` | Fork N-1 (a) + correção C1 abaixo |
| `LalurParteBBalance` | `M500` (uma linha por conta × período; `M510` é agregação em memória) | `(closingId, parteBId)` — M500 chave `COD_CTA_B + COD_TRIBUTO` sob o período (p.271) | Fork N-1 (a) |
| `LalurProcess` | `M315` / `M365` / `M415` (nível 4/4/4 sob M300/M350/M410) | `(parentId, indProc, numProc)` — chave `IND_PROC + NUM_PROC` (pp.255/267/270) | Fork F-3C-4 (a) + correção C2 |
| `LalurEntryJournalEntry` | `M312` / `M362` (nível 5 sob M310/M360) | `(entryId, journalEntryId)` — chave `NUM_LCTO` (pp.254/266) | Fork F-3C-3 (a) |

Tenancy segue D-M1 (`userId` + `unitId`, FK `User` Cascade no que é agregado-raiz). **Nenhum ALTER** em
tabela existente: `LalurParteBAccount`/`LalurEntry`/`JournalEntry` só ganham relação reversa no schema
Prisma (a FK mora do lado novo) — a mesma propriedade da 1ª migração, e a que mantém o S6 do smoke gate
fora desta frente (correção C3 escolhida também por isso).

### C1 — "Fechado" é uma linha-pai, não a existência de saldos (ratificado (a), 2026-09-12)

O esboço só tinha `LalurParteBBalance`. Tenant com **zero** contas da Parte B fecharia o trimestre sem
gerar linha nenhuma; a geração (BRIEF item 11, "exige 4 trimestres fechados") ficaria bloqueada para
sempre, e o `sha256` do conjunto de saldos (item 10, auditoria) não teria onde morar. Decisão:
`LalurParteBClosing` **é** o fato "fechado"; os saldos são filhos (`closingId`, `onDelete: Cascade`) —
reabrir apaga a pai e as filhas na mesma tx, refechar substitui. Alternativa descartada: inferir de
`≥1` saldo no período (deixa o caso 0 contas como lacuna permanente).

### C2 — Filhos com pai nullable: chave por `parentId` denormalizado, sem soft-delete (ratificado (a), 2026-09-12)

O esboço `@@unique([entryId, movementId, indProc, numProc])` com **dois pais nullable** não fecha
duplicata no SQLite — NULL é distinto no índice único, exatamente a falha que a D-M2 corrigiu na 1ª
migração. Decisão: `LalurProcess.parentId String` **não-nulo** (= `entryId ?? movementId`, XOR
verificado no serviço — SQLite via Prisma sem CHECK) + `@@unique([parentId, indProc, numProc])`;
`entryId?`/`movementId?` permanecem como FKs (`Restrict`) para navegação. `LalurProcess` e
`LalurEntryJournalEntry` são **value-objects do pai** (precedente `Posting`/`PostingDimension`: sem
`deletedAt`): `processos[]` e `journalEntryIds[]` no DTO **substituem o conjunto** na mesma tx do
create/update; o soft-delete do pai cobre os filhos; a trilha da troca é o `AuditEvent` (contagens, não
os números). Alternativas descartadas: duas tabelas de processo (+1 tabela por zero coluna) e manter o
esboço + soft-delete (duplicata passa; update vira archive+recreate).

### C3 — Âncora do saldo inicial é IMPLÍCITA, com guarda de continuidade (ratificado (a), 2026-09-12)

`saldoIniCents` (M010 campo 8) passa a ser "saldo de abertura ancorado num exercício" (BRIEF item 9), mas
a perna (a) não tem coluna de exercício-âncora. Regra: para o exercício `N`,
`sdIni(N, T01) = balance(N−1, T04).sdFim` **se** o T04 de N−1 estiver fechado; **senão** `saldoIniCents`
(+ `REGRA_DT_AP_ZERO`: 0 se `dtCriacao ∈ N`). Guarda: existe **qualquer** `LalurParteBClosing` em
exercício `< N−1` **e** `(N−1, T04)` não está fechado ⇒ `ValidationError` "feche N−1 primeiro" — no
`close` de `(N, T01)` e na geração da ECF de N. Fecha o caso "fechou 2025, pulou 2026, gerou 2027".
Alternativa descartada: coluna `saldoIniYear` (é o ALTER que a perna (c) previa; S6 reprova por desenho).
`M010.VL_SALDO_INI`/`IND_VL_SALDO_INI` **emitidos** para N = esse `sdIni(N, T01)`, não a coluna crua —
é o que `REGRA_SALDOS_M010_E020` (p.237, erro) confere contra o E020 recuperado.

### C4 — PF/BC sem conta de prejuízo cadastrada ⇒ 400 nomeando o `COD_PB_RFB` (ratificado (a), 2026-09-12)

BRIEF item 6 decide `>1` conta viva de prejuízo por tributo (⇒ 400 pedindo manual). Caso **0**: o
fechamento recusa — *"cadastre a conta da Parte B com COD_PB_RFB 1000 (I) / 1003 (C) antes de fechar
Txx"*. Nenhuma conta nasce sem o usuário (`codCtaB` é dele; `dtCriacao` é data final do período em que
nasceu — REGRA_DT_AP_ZERO). Alternativa descartada: sistema cria a conta padrão (M010 ganha conta que o
usuário não cadastrou).

### D-P2 — Colunas (fecha o §2.2 do BRIEF com C1–C4)

```prisma
model LalurParteBMovement {                    // M410 (p.268) — 8 campos; nível 3 sob M030
  id, userId (FK User Cascade), unitId
  parteBId        String   // 2 COD_CTA_B — FK LalurParteBAccount, Restrict (obrigatório: Fork F-3C-2, §4 item 2 INFERIDO)
  year            Int
  quarter         String   // 'T01'..'T04' — o M030 sob o qual sai
  codTributo      String   // 3 COD_TRIBUTO — DERIVADO de parteB.codTributo no create (imutável na conta: é chave)
  valorCents      BigInt   // 4 VAL_LAN_LALB_PB ≥ 0 (invariante de DTO)
  indicador       String   // 5 IND_VAL_LAN_LALB_PB 'CR'|'DB'|'PF'|'BC'
  contrapartidaId String?  // 6 COD_CTA_B_CTP — FK LalurParteBAccount, Restrict; NULL com PF/BC (REGRA_NAO_PREENCHER_CTP); mesmo codTributo (REGRA_MESMO_TRIBUTO)
  historico       String   // 7 HIST_LAN_LALB, sem '|'
  indLanAnt       String   // 8 IND_LAN_ANT 'S'|'N'
  origem          String   // 'user' | 'system' (PF/BC derivado no fechamento — Fork F-3C-2 a)
  createdById, createdAt, updatedAt, deletedAt
  @@index([userId, unitId, year, quarter])
  @@index([deletedAt])
  // SEM @@unique — p.268 "Campo(s) chave: —"
}
model LalurParteBClosing {                     // estado "trimestre fechado" (C1) — Fork N-1 (a)
  id, userId (FK User Cascade), unitId
  year            Int
  quarter         String
  balancesSha256  String   // sha256 do conjunto ordenado de saldos (auditoria — item 10: nunca os valores)
  closedAt        DateTime
  closedById      String?
  balances        LalurParteBBalance[]
  @@unique([userId, unitId, year, quarter])
}
model LalurParteBBalance {                     // M500 (p.271) materializado — Fork N-1 (a)
  id
  closingId       String   // FK LalurParteBClosing, Cascade (reabrir apaga)
  parteBId        String   // FK LalurParteBAccount, Restrict
  sdIniCents      BigInt;  indSdIni     String   // 4/5   SD_INI_LAL   'D'|'C'
  vlParteACents   BigInt;  indVlParteA  String   // 6/7   VL_LCTO_PARTE_A
  vlParteBCents   BigInt;  indVlParteB  String   // 8/9   VL_LCTO_PARTE_B
  sdFimCents      BigInt;  indSdFim     String   // 10/11 SD_FIM_LAL
  @@unique([closingId, parteBId])              // uma linha por conta × período (M500 chave, p.271)
  @@index([parteBId])
  // SEM userId/unitId próprios (escopo vem da pai) · SEM deletedAt (snapshot: refechar substitui, reabrir apaga — precedente ReferentialMapping D5)
}
model LalurProcess {                           // M315/M365/M415 (pp.255/267/270) — Fork F-3C-4 (a) + C2
  id
  parentId        String   // = entryId ?? movementId (XOR no serviço) — chave não-nula
  entryId         String?  // FK LalurEntry, Restrict
  movementId      String?  // FK LalurParteBMovement, Restrict
  indProc         String   // 2 IND_PROC '1'|'2'
  numProc         String   // 3 NUM_PROC C 20, sem '|'
  @@unique([parentId, indProc, numProc])
  @@index([entryId]); @@index([movementId])
  // SEM deletedAt (value-object do pai — C2)
}
model LalurEntryJournalEntry {                 // M312/M362 (pp.254/266) — Fork F-3C-3 (a)
  entryId         String   // FK LalurEntry, Restrict
  journalEntryId  String   // FK JournalEntry, Restrict — só lançamento com entryNumber (I200.NUM_LCTO); ver D-P3
  @@id([entryId, journalEntryId])
  @@index([journalEntryId])
}
```

Domínio das colunas-enum vive em `Lalur.model.ts` (`LALUR_MOV_INDICADORES`, `LALUR_ORIGENS`,
`LALUR_IND_PROC`), como `LALUR_TRIBUTOS`/`LALUR_QUARTERS` hoje. `MAX_CENTS` segue política de DTO; `≥ 0`
é invariante de DTO + teste. `LalurParteBBalance` guarda **magnitude + indicador** (convenção do M010/M500),
nunca inteiro com sinal — o sinal só existe na aritmética do serviço (D-P3).

### D-P3 — Regras de derivação que o model pressupõe (grau por linha; oráculo = PVA, H1 2ª passada 2P-4)

1. **Aritmética do saldo (VERIFICADO na fonte, p.250/p.271 + BRIEF item 7).** Sinal interno: `D = +`, `C = −`.
   Parte A (`M305/M355` do período, REGRA_PEA): `A`/`L` **+valor**, `E`/`P` **−valor**. Parte B (`M410`):
   `DB`/`PF`/`BC` **+valor** na conta; `CR` **−valor**; movimento com `contrapartidaId` aplica o **oposto**
   na contrapartida (transferência, p.268 campo 6) — daí a propriedade Σ_contas(vlParteB com contrapartida)
   = 0. `sdFim = sdIni + ΣA + ΣB`; emitido como `|valor|` + indicador (`0` ⇒ indicador `C`, convenção do
   `M010.saldoIni = 0` já em `main` — INFERIDO, PVA confirma).
2. **Transporte intra-exercício (VERIFICADO, p.271).** `sdIni(N, Tn) = sdFim(N, Tn−1)` lido da linha
   materializada; `close(N, Tn)` exige `(N, Tn−1)` fechado (T01 exige C3). Refechar `(N, Tn)` exige
   nenhum `(N, Tk>n)` fechado (400 nomeando) — ordem limpa, precedente F-W2F-5. Gate **dentro da tx**
   (`authoritative-gate-inside-tx`).
3. **PF/BC (Fork F-3C-2 a — INFERIDO, §4 item 6 do BRIEF).** No `close`, por tributo:
   `base = resultado(T) + ΣA − ΣE` das `LalurEntry` vivas do período no livro do tributo, onde
   `resultado(T) = incomeStatement(fim T) − incomeStatement(fim T−1)` (DRE YTD closing-exclusive, janela de
   `quarterWindows`); linhas `P` e `L` **não** entram na base do prejuízo. `base < 0` ⇒ um movimento
   `origem='system'`, `indicador = PF (I) | BC (C)`, `valorCents = |base|`, `historico` fixo, `indLanAnt='N'`,
   na **única** conta viva com `codPbRfb ∈ {1000,1001,1002}` (I) / `{1003,1004}` (C) — `>1` ⇒ 400 (BRIEF item
   6), `0` ⇒ 400 (C4). `base ≥ 0` ⇒ nenhum `system` PF/BC vivo no período (o refechamento arquiva o que
   houver). Movimento `system` não aceita PATCH de `valorCents`/`indicador`; só archive.
4. **M312/M362 (Fork F-3C-3 a — DERIVADO do schema).** `JournalEntry.entryNumber` é `Int?`, nulo em
   `Draft`/`PendingApproval` (`schema.prisma:536`); `NUM_LCTO` é `Obrig.=Sim` (p.254). Logo `journalEntryIds[]`
   exige `entryNumber != null`, mesmo escopo, `date` dentro da janela do trimestre — 400 caso contrário.
   `Reversed` **permanece** elegível (o lançamento e seu estorno estão ambos no I200 da ECD).
5. **Saldo negativo da Parte B (BRIEF item 13 — INFERIDO).** `sdFim < 0` em qualquer conta ⇒ 400 no
   create/update do ajuste `P` **e** no `close`. O teto de 30% (Lei 9.065/95 art. 15) é da apuração
   (`ADR-INCR-TAX-ASSESSMENT`), não daqui.

### D-P4 — O que esta emenda NÃO decide

- **Ordem intra-período** M300…M350…M410…M500 sob o mesmo M030 (BRIEF §4 item 3) e **M500 para conta sem
  movimento e saldo zero** (§4 item 4): o serializer emite na ordem hierárquica da p.236 e **uma linha
  por conta viva** (p.271 "visão sintética"); o PVA decide, e a mudança é só no `ecfReal.ts`.
- **`M410.COD_CTA_B` vazio** (§4 item 2): DTO exige; relaxar só com caso do PVA/contador.
- **Apuração por atividade** (1002/1004, M300A 174): frente própria (BRIEF §6 item 2).
- Fechamento fiscal **não** acopla ao `AccountingPeriod` mensal nem ao `closeExercise` (D2 do BRIEF): um
  trimestre pode ser fechado com meses contábeis abertos; o diagnóstico (`GET …/balances`) acusa a
  divergência posterior e a geração recusa (BRIEF item 11).

### Consequências

Migração `add_lalur_parte_b_movements_closings_processes` — **5 CREATE TABLE, zero ALTER**, prólogo
`DROP … IF EXISTS` na ordem filha→mãe (`LalurProcess`, `LalurEntryJournalEntry`, `LalurParteBBalance`,
`LalurParteBMovement`, `LalurParteBClosing`), sem backfill; `smoke:migration` sobre cópia do `dev.db`
real. Cadeia `Route → Controller → LalurService → LalurRepository → Prisma` (mesmo serviço — BRIEF item
4), Policy `canManageData`/`canRead`, DTO `.strict()`, rotas em 2 toques + path-count guard (166→170 CRUD
de movimento + `close`/`reopen`/`balances` = **173**), 5 eventos novos na allowlist
(`lalur.movement_{created,updated,archived}`, `lalur.parte_b_{closed,reopened}`). `ecfReal.ts` ganha
`buildM312/M315/M362/M365/M410/M415/M500/M510`; `M010.VL_SALDO_INI` passa a vir de C3. Tela =
`FE-INCR-LALUR` (botão "fechar trimestre" + diagnóstico), separada.
