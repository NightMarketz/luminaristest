# ADR-INCR-SPED-ECF-FASE3 — ECF em Lucro Real (Blocos L/M/N + `HASH_ECF_ANTERIOR` + `0010` parametrizável)

- **Status:** **Accepted (parcial — esqueleto).** [EMENDA 2026-09-02] Forks 1 e 5 ratificados e o esqueleto (itens `[direto]` + `[cond:Fork 1]` + `[cond:Fork 5]` do BRIEF) autorizado por dono, em sessão, 2026-09-02: *"Ratifico Fork 1 (dedicado) e Fork 5 (trimestral), implementa o esqueleto. Dispara tbm mais passos que são de estruturação e não dessas decisões que estão pendentes somente de configs que dependem de informações de leis"*. Forks 2, 3 e 4 seguem `RATIFICAÇÃO PENDENTE`; blocos L/M/N permanecem marcadores vazios e `FORMA_TRIB` do Real entrou como parâmetro do DTO sem default e, na mesma data, ganhou **default `'1'`** ratificado pelo dono (artefato: `BE-INCR-SPED-ECF-layout-transcription.md:85`, Manual p. 13 §1.3; §5 item 6 fechado). Esqueleto **implementado** na PR #263 (`6af66557`; fold no cabeçalho do BRIEF). Antes: **Proposed.** Produzido em `sessao-planejamento` (preparação apenas — ORCH-006). **Nenhum
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

## 4. Forks pendentes de ratificação — **Forks 1 e 5 ratificados em 2026-09-02; 2, 3 e 4 pendentes**

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
