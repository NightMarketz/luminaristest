# BRIEF — BE-INCR-TAX-ASSESSMENT Fase C (X9/MIT, ISS por competência, memória de cálculo no pacote do contador) — nó X7

> Produzido em `sessao-planejamento` em 06/10/2026, sobre `origin/main` `cd338e0c`. Herda o esqueleto da §5
> (Fase C, itens C1–C3) do [`ADR-INCR-TAX-ASSESSMENT`](../adr/ADR-INCR-TAX-ASSESSMENT.md) (**Accepted** 02/10) e
> **reusa sem redesenhar** o `TaxAssessment` das Fases A/B (mergeadas: #478, #504, #509, #518, #525, #529, #539).
> "A-n"/"B-n" = item n dos BRIEFs [A](BE-INCR-TAX-ASSESSMENT-A-brief.md)/[B](BE-INCR-TAX-ASSESSMENT-B-brief.md);
> "E-n" = item n do [BRIEF da emenda 3.4 do C6b](BE-INCR-CONTADOR-PACKAGE-EMENDA-3-4-brief.md).
> **Este documento NÃO escreve código e NÃO ratifica fork.** Forks **F-TC-1..7 PENDENTES** (§3). Nenhum item vira
> código sem "executa" do dono (ORCH-006).
>
> **Alcance e risco, ditos antes de tudo:**
> - **C1 (X9/MIT) não tem item aqui: já está planejado e ratificado** no BRIEF do X9
>   ([`BE-INCR-MIT-EXPORT-brief.md`](BE-INCR-MIT-EXPORT-brief.md), F-MIT-1..3 ✅ 03/10). Esta sessão conferiu o
>   contrato C1 que aquele BRIEF consome contra o código mergeado (§0.3): **confirma**. Sobra a C2 (ISS) e a C3
>   (memória). A nota do X7 dizia "Fase C (X9/MIT, …) — sem BRIEF": a parte X9 já tinha BRIEF.
> - **Risco principal:** o relatório de ISS soma só as NFS-e que o **nosso** fluxo emitiu (`FiscalDocument`). Em SP
>   capital, regime normal, a nota é a Paulistana (ADR F-X7-12), fora do Emissor Nacional; para esse caso o relatório
>   sai **vazio sem estar errado**. E o `vIssCents` só existe quando a nota volta autorizada (retorno), então nota
>   sem valor de ISS é caso real (F-TC-2).
> - **Para o 1º cliente (Simples)** a memória de IRPJ/CSLL vale zero (ADR D12); o ISS dele vai no DAS (ver P-C3).

---

## 0. Contexto fixo (não rediscutir)

### 0.1 Item, autorização e cobertura

- **Item a planejar:** nó [`X7`](../plano/nos/X7.md), `estado_detalhe` de 05/10 (5): *"Próximo: Fase C do ADR (X9/MIT,
  ISS, memória no pacote do contador) — sem BRIEF; exige planejar + 'executa'"*. ADR §5 Fase C, linhas C1–C3.
- **Autorização (ORCH-006):** dono, chat, 06/10/2026: *"Autorizo planejar o BRIEF da Fase C do X7 —
  sessao-planejamento, sem 'executa'"* (ratificado pelo dono com *"Dispara em sequencia aqui tudo em opus medio"*).
- **Cobertura (passo 1):** cobre exatamente este BRIEF + o fold na nota do X7. **Não cobre:** código; ratificar
  F-TC-n; editar o ADR, o BRIEF do X9 ou o da emenda 3.4. **Divergência:** a ADR diz "cada item com autorização
  própria" (§5 Fase C); a autorização de 06/10 nomeia a Fase C inteira, então cobre C1–C3. Como o C1 já foi planejado
  sob o X9, o efeito prático é C2 + C3.

### 0.2 Forks herdados (fato consumado)

| Fork | Decisão | Fonte |
|---|---|---|
| F-X7-8 → (a) | X9 com ADR próprio; aqui só se nomeia a porta `EnvioMit` | ADR §8; [[D-2026-10-02-X7-TAX-ASSESSMENT-FORKS]] |
| F-X7-9 → (b) | arquivo JSON do MIT (migrou para o ADR do X9) | idem |
| F-X7-12 → (a) | ISS = *"relatório somente leitura por competência e município, somando o ISS dos `FiscalDocument` autorizados (ADR-DFE), com o retido separado e sem guia (é municipal), na Fase C"* | ADR §8 l.362 |
| decisão 16 (29/09) | 3.4 do C6b: *"memória de cálculo depois do X7"*; nome reservado `EXPORT_TAX_ASSESSMENT_MEMO` | E-§8 |
| F-TA-1 → (a) | X8/X9 **não fundem** no X7 | BRIEF A |

### 0.3 Fatos de código (lidos em `cd338e0c`; grau V salvo indicação; caminhos sob `server/`)

| # | Fato | Onde |
|---|---|---|
| S1 | `TaxAssessment` tem `userId`, `unitId`, `anoCalendario`, `tributo`, `regime`, `forma`, `periodo`, `modo`, `codigoReceita`, `baseCents`, `devidoCents`, `deducoesCents`, `aPagarCents`, `saldoNegativoCents`, `diferencaPostergadaCents`, `memoria Json`, `tabelaVersao`, `status CONFIRMED\|SUPERSEDED`, `supersedesId`, `provisaoEntryId`, `confirmedAt`, `deletedAt` | `prisma/schema.prisma:2327-2358` |
| S2 | A memória é `MemoriaLinha { codigo, descricao, valorCents: string /^-?\d+$/, fonte }` `.strict()`, array | `src/features/accounting/models/taxAssessmentCalc.ts:25-34` |
| S3 | Códigos de receita da Fase B existem como constantes (236201, 599301, 248401, 243001, 245601, 677301, 236202…) | `src/features/accounting/models/taxAssessmentParams.ts:100-106` |
| S4 | Leitura existente: `GET /api/accounting/tax-assessments` (lista: `unitId`, `anoCalendario`, `periodo?`, `status?`) e `/{id}` (detalhe com memória) | `src/routes/taxAssessments.ts`; `docs.paths.ts:6439,6510`; `TaxAssessmentDto.ts:125-135` |
| S5 | Policy: `canReadTaxAssessment` e `canReadFiscalDocument` existem | `policies/IAccountingPolicy.ts:100,132` |
| S6 | `periodoBounds(year, periodo, inicioAtividadeEm?)` e `mesBounds` existem (Fase B PR-1) | `models/Lalur.model.ts:68,79` |
| S7 | `EXPORT_KINDS` (11) é String no banco: kind novo = zero migração; `ExportRequestSchema.kind = z.enum(IMPLEMENTED_EXPORT_KINDS)` | `models/DataExchange.model.ts:14-35`; `dtos/DataExchangeDto.ts:58` |
| S8 | `DELIVERABLE_EXPORT_KINDS` (6). **A emenda 3.4 (5 kinds novos) ainda não foi implementada** | `models/AccountingDelivery.model.ts:28-35` |
| S9 | Precedente de linha-meta `#` no topo + nomes de coluna na 1ª linha de `rows` | `services/DataExchangeExportService.ts:353-363` |
| S10 | `FiscalDocument`: `kind NFSE\|NFE`, `status SENT\|PROCESSING\|AUTHORIZED\|AUTHORIZED_DIVERGENT\|REJECTED\|CANCELLED`, `ambiente producao\|homologacao`, `dCompet AAAA-MM-DD` (data da prestação), `vServCents`, `baseIssCents?`, `aliqIssBp?`, `vIssCents?` (*"retorno"*), `tpRetISSQN 1\|2`, `cancelledAt?`, `deletedAt?`. **Não há coluna de município** | `prisma/schema.prisma:1552-1597` |
| S11 | `vIssCents`/`baseIssCents` só são gravados no `applyResult` da nota autorizada (valores do retorno) | `services/FiscalDocumentLifecycleService.ts:404-409` |
| S12 | O município da prestação vai no payload da DPS: `locPrest.cLocPrestacao = profile.cLocPrestacao ?? fp.codMun ?? '0000000'`; o payload da tentativa (`FiscalDocumentAttempt.payloadJson`) é imutável | `services/FiscalDocumentEmissionService.ts:904`; `dtos/DpsPayloadDto.ts:67`; `schema.prisma:1600-1609` |
| S13 | `ServiceFiscalProfile.cLocPrestacao` e `FiscalProfile.codMun` são **mutáveis** (perfil atual, não snapshot) | `schema.prisma:1393,1512` |
| S14 | `data_exchange.export_generated` já carrega `kind` na allowlist (E-S18) — kind novo não pede evento novo | `auditCanonical.ts` (E-§1 S18) |
| S15 | Contrato C1 lido pelo BRIEF do X9 (`aPagarCents`, `status`, `deletedAt`, `anoCalendario`, `modo`, `codigoReceita`, `diferencaPostergadaCents`; `lc224AcrescimoSuspenso`/`lc224LiminarReferencia` no perfil) **existe todo** no código | S1, S3; `schema.prisma:1458-1459` |

### 0.4 Nós vizinhos

- **Consome:** X7-A/X7-B (`TaxAssessment`), X10b/BE-INCR-DFE (`FiscalDocument`), C6/C6b (pacote: `resolveExtras`,
  `DELIVERABLE_EXPORT_KINDS`).
- **É consumido por:** FE-INCR-DELIVERY (rótulo do kind no `DeliveryPanel`/`ImportExportPanel`; **nó FE, fora**),
  contador (pacote).
- **Irmão em paralelo:** emenda 3.4 do C6b (E-n) mexe nas mesmas duas constantes (S7/S8). Ver §6.2.
- **X9:** consome o C1 pelo próprio BRIEF; nada aqui o altera. X8 (PIS/Cofins) sem código: a memória fica genérica
  por `tributo` (item 10).

---

## Definição de pronto

Checklist numerado (§1), contratos esboçados (§2), forks F-TC-1..7 listados com caminhos e recomendação, status
**RATIFICAÇÃO PENDENTE** (§3), validação externa (§4), insumos ausentes (§5), achados fora de escopo (§6).

---

## 1. Checklist de comportamentos

### C1 — X9/MIT (nenhum item novo)

0. **Confirma, sem item.** O contrato C1 (ADR §5 C1) é consumido pelo `BE-INCR-MIT-EXPORT` (porta `EnvioMit` =
   tipo + `montarArquivoMit` em `src/lib/mit.ts`, ADR-X9 D11). Os campos que ele lê existem (S15). As pré-condições
   de ordem dos PRs do X9 que dependiam do X7 (X7-A PR-2 e X7-B PR-2) estão satisfeitas; o PR-3 do X9 segue
   esperando o PR-2 do X8. Executar o X9 é "executa" próprio do nó X9 — não deste BRIEF.

### C3 — memória de cálculo no pacote do contador (`EXPORT_TAX_ASSESSMENT_MEMO`)

1. **Kind novo** `EXPORT_TAX_ASSESSMENT_MEMO` em `EXPORT_KINDS` e `IMPLEMENTED_EXPORT_KINDS` (zero migração, S7).
   Teste: `ExportRequestSchema` aceita o kind; snapshot de shape atualizado.
2. **Parâmetros:** exige `periodStart` e `periodEnd` (janela, como razão/conciliação); `asOf`, `accountCode`,
   `templateKind`, `perAccount`, `seed` ⇒ 400 (classe `param-aceito-e-ignorado`). Teste: cada campo extra ⇒ 400.
3. **Seleção:** `TaxAssessment` do escopo com `status = CONFIRMED`, `deletedAt = null`, cujo
   `periodoBounds(anoCalendario, periodo)` cabe na janela segundo **F-TC-5**. Ordem: `anoCalendario`, `periodo`,
   `tributo`. Reusa o repositório da lista (S4), sem query nova se o método atual aceitar o filtro; senão, um
   método de leitura no mesmo repo. Teste: SUPERSEDED e soft-deleted ficam fora; fora da janela fica fora.
4. **Sem recálculo:** as linhas vêm de `memoria` persistida (S2), parseada por `MemoriaCalculoSchema`; JSON inválido
   ⇒ 500 com o id (não silencia). Atende o requisito cruzado do E-§8 (*"exporte a memória sem recalcular"*). Teste:
   memória gravada com linha conhecida sai idêntica; `tabelaVersao` sai na linha.
5. **Forma da planilha:** formato longo, uma linha por `MemoriaLinha`, colunas no §2.1; uma planilha só (E-S1).
   Cabeçalho de cada apuração = linhas de resumo (`base`, `devido`, `deducoes`, `aPagar`, `saldoNegativo`,
   `diferencaPostergada`) **segundo F-TC-6**. Teste-tabela: 1 trimestral Presumido + 1 `A00` com saldo negativo.
6. **Linha-meta** `# kind=EXPORT_TAX_ASSESSMENT_MEMO; periodStart=…; periodEnd=…; apuracoes=<n>; geradoEm=<ISO>`
   no topo (precedente S9). Teste: 1ª linha começa com `#`.
7. **Valores em centavos como string inteira** (mesma convenção do `valorCents`), sem float. Teste: valor > 2^53
   sai exato.
8. **Rastreio da substituição:** coluna `substitui` = `supersedesId` da apuração vigente (só id). Teste: apuração que
   substituiu outra traz o id da antiga.
9. **Entregável:** o kind entra em `DELIVERABLE_EXPORT_KINDS` (S8); `resolveExtras` já impõe período ⊆ núcleo
   `HARD_CLOSED` (E-S4) — nada novo ali. Teste de integração: pacote com o extra da memória monta; extra com período
   fora do núcleo ⇒ `EXTRA_PERIOD_OUT_OF_RANGE` (comportamento existente, só exercitado com o kind novo).
10. **Genérico por tributo:** o builder não filtra `tributo IN (IRPJ, CSLL)`; quando o X8 gravar PIS/COFINS no mesmo
    model (F-X8-2 → a), as linhas aparecem sem mudança. Teste só com IRPJ/CSLL (X8 sem código; não inventar
    fixture de PIS).
11. **Policy:** `export()` checa `canRead` (S7 do E) **e** `canReadTaxAssessment` (S5) para este kind. Teste: ator
    sem a policy de apuração ⇒ 403.
12. **Apuração vazia:** janela sem apuração confirmada ⇒ arquivo com meta + cabeçalho e 0 linhas, `apuracoes=0`
    (não 404). Teste.

### C2 — ISS por competência e município (F-X7-12 → a)

13. **Função pura** `agregarIssPorCompetencia(docs) → IssLinha[]` (em `src/features/accounting/models/issCompetencia.ts`),
    sem I/O, agrupando por `competencia` (`dCompet.slice(0,7)`, sem `new Date` — memória
    `motor-grava-date-como-iso-utc`) × `municipio` (F-TC-1) × `retido` (`tpRetISSQN = 2`). Soma `vServCents`,
    `baseIssCents`, `vIssCents`; conta documentos. Teste-tabela.
14. **Seleção dos documentos:** `kind = NFSE`, `ambiente = producao` (ADR-DFE D7: só produção vira documento
    fiscal), `deletedAt = null`, `dCompet` na janela; status segundo **F-TC-3** e **F-TC-4**. Método de leitura novo
    em `IFiscalDocumentRepository` (cadeia Repo → Prisma). Teste: NFE, homologação, REJECTED, SENT/PROCESSING
    ficam fora.
15. **Retido separado:** colunas distintas para ISS próprio (`tpRetISSQN = 1`) e retido pelo tomador
    (`tpRetISSQN = 2`), nunca somadas num total único. Teste.
16. **Nota autorizada sem `vIssCents`** (S11) segundo **F-TC-2**. Teste do ramo escolhido.
17. **Superfície** segundo **F-TC-7** (recomendação: kind `EXPORT_ISS_BY_COMPETENCE` no `DataExchangeExportService`,
    janela `periodStart/periodEnd`, mesma linha-meta do item 6, entregável). Se o F-TC-7 for (a)/(c), a rota GET
    entra em 2 toques (`index.ts` + `docs.paths.ts`) com Route → Controller → Service → Repo, DTO `.strict()`, e o
    guard de path-count do openapi sobe 1.
18. **Policy:** `canRead` + `canReadFiscalDocument` (S5). Teste 403.
19. **Sem guia, sem cálculo de alíquota:** o relatório não aplica alíquota nem gera DAM/guia (F-X7-12 → a: *"sem
    guia"*). Teste: nenhuma linha derivada de `aliqIssBp × base` (só soma do que veio do retorno).
20. **Escopo por unidade:** o relatório é do escopo (unidade = estabelecimento com IM própria, `FiscalProfile` 1 por
    unidade, `schema.prisma:1362`). Sem consolidação PJ (fora; ver §6.3).

### Gates que o diff aciona (em cada PR, na parte que ele toca)

21. Snapshot de shape do `ExportRequestSchema` (enum `kind`); enum `kind` em `docs.paths.ts` (+0 paths se F-TC-7 →
    b); allowlist: **nenhum evento novo** (S14) — conferir que `kind` novo não carrega PII; paridade i18n pt/en
    **só se** o BE tiver chave de mensagem nova; `tsc` limpo nos dois pacotes; integração com `--runInBand`.
22. Fatiamento: ver **§3.1** (2 PRs independentes). Não é fork: nenhum dos dois depende do outro, e juntar em 1 PR
    não muda desenho.

---

## 2. Contratos esboçados

### 2.1 Memória (C3)

```ts
// models/DataExchange.model.ts — aditivo
'EXPORT_TAX_ASSESSMENT_MEMO', // X7 Fase C (C3) — zero migração (coluna String)

// colunas da planilha (1ª linha de rows); centavos como string inteira
type MemoLinhaExport = {
  anoCalendario: string; periodo: string;          // 'T01' | 'A00' | 'A05' …
  tributo: string;                                 // IRPJ | CSLL (| PIS | COFINS quando o X8 gravar)
  regime: string; forma: string; modo: string; codigoReceita: string;
  tabelaVersao: string; confirmedAt: string;       // ISO
  apuracaoId: string; substitui: string;           // supersedesId ?? ''
  tipoLinha: 'RESUMO' | 'MEMORIA';                 // F-TC-6 (a)
  codigo: string; descricao: string; valorCents: string; fonte: string;
};

// DataExchangeDto.superRefine — aditivo
// kind === 'EXPORT_TAX_ASSESSMENT_MEMO' ⇒ periodStart && periodEnd obrigatórios; asOf/accountCode/templateKind/perAccount/seed ⇒ issue
```

### 2.2 ISS (C2)

```ts
// models/issCompetencia.ts (puro)
export const IssLinhaSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}$/),
  municipioIbge: z.string().regex(/^\d{7}$/),     // F-TC-1
  retido: z.boolean(),                            // tpRetISSQN === 2
  documentos: z.number().int().nonnegative(),
  documentosSemIss: z.number().int().nonnegative(), // F-TC-2 (a)
  vServCents: z.string().regex(/^\d+$/),
  baseIssCents: z.string().regex(/^\d+$/),
  vIssCents: z.string().regex(/^\d+$/),
}).strict();
export type IssLinha = z.infer<typeof IssLinhaSchema>;

export interface IssDocInput {
  dCompet: string; municipioIbge: string; tpRetISSQN: 1 | 2;
  vServCents: bigint; baseIssCents: bigint | null; vIssCents: bigint | null;
}
export function agregarIssPorCompetencia(docs: IssDocInput[]): IssLinha[];

// IFiscalDocumentRepository — aditivo
findForIssReport(scope: AccountingScope, from: string /*AAAA-MM-DD*/, to: string, statuses: readonly string[]):
  Promise<Array<FiscalDocumentRow & { cLocPrestacao: string | null }>>; // F-TC-1 (a): lido do payloadJson da tentativa corrente

// models/DataExchange.model.ts — aditivo se F-TC-7 → (b)
'EXPORT_ISS_BY_COMPETENCE',
```

---

## 3. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|---|
| **F-TC-1** | De onde vem o **município** do ISS de cada nota? | **(a)** `cLocPrestacao` do `payloadJson` da tentativa corrente (imutável, S12) · (b) coluna nova `cLocPrestacao` no `FiscalDocument` (migração aditiva + backfill do payload) · (c) perfil atual (`ServiceFiscalProfile.cLocPrestacao ?? FiscalProfile.codMun`) | **(a)**: é o que foi efetivamente enviado, sem migração. O (c) muda o passado quando o perfil muda (S13). O (b) é o (a) materializado; só vale se o relatório ficar lento (não medido). **Ressalva:** local da prestação ≠ município de incidência em exceções da LC 116 (P-C2) | médio em (c): ISS atribuído ao município errado em retroativo |
| **F-TC-2** | Nota **autorizada sem `vIssCents`** (S11: só o retorno preenche) | **(a)** soma zero e conta em `documentosSemIss`, com aviso na linha-meta · (b) calcula `baseIss × aliqIssBp` · (c) 422 no relatório inteiro | **(a)**: o F-X7-12 manda somar o que está nos documentos, sem calcular; (b) seria cálculo de ISS sem fonte legal no ADR (alíquota municipal, Simples). (c) bloqueia o relatório por um documento | médio em (b): ISS inventado |
| **F-TC-3** | Nota **cancelada** depois da competência | **(a)** status atual: `CANCELLED` sai (cancelamento anula a nota) · (b) reconstrói pela data: entra se `cancelledAt` > fim da janela | **(a)**: para o ISS a nota cancelada não é fato gerador declarável (**I**, P-C4); o relatório não é "posição na data". O (b) é a mesma classe do aging com `asOf` passado (E-§9 item 4) e só faz sentido se o contador pedir foto histórica | baixo |
| **F-TC-4** | `AUTHORIZED_DIVERGENT` (releitura divergente, F-MAN-2 c) | **(a)** entra, com coluna `divergentes` (contagem) · (b) fica fora · (c) 422 até resolver | **(a)**: a nota existe no fisco; esconder subdeclara. A contagem deixa o contador ver | médio em (b) |
| **F-TC-5** | Qual apuração entra na janela da memória? | **(a)** `periodoBounds` ⊆ janela (`A00` só numa janela que cubra o ano) · (b) interseção não vazia · (c) por `confirmedAt` | **(a)**: casa com a regra do pacote (extra ⊆ núcleo, E-S4) e evita meio trimestre. (c) mistura competências | baixo |
| **F-TC-6** | Resumo da apuração na planilha | **(a)** linhas `RESUMO` (base/devido/deduções/aPagar/saldo negativo/diferença postergada) antes das `MEMORIA` da mesma apuração · (b) só a memória (o resumo já está nela?) | **(a)**: não está provado que toda memória tenha linha de `aPagar` com código estável (**I**, não li todas as funções que a montam); o resumo vem das colunas do model (S1), sem depender disso | baixo |
| **F-TC-7** | Superfície do relatório de ISS | (a) rota JSON `GET /accounting/reports/iss` · **(b)** kind `EXPORT_ISS_BY_COMPETENCE` (CSV/XLSX, entregável) · (c) os dois | **(b)**: zero path novo, reusa o exportador canônico e entra no pacote, que é onde o contador consome. Tela própria é FE (nó vizinho); se vier, aí sim (c). Precedente: a emenda 3.4 também não abriu rota JSON (F-C6bE-10) | baixo |

### 3.1 Divisão em PRs (proposta; o dono pode juntar sem custo)

| PR | Itens | Pré-condição | Verificável por |
|---|---|---|---|
| **PR-1** memória (C3) | 1–12, 21 | nenhuma (X7-A/B mergeados) | teste-tabela do builder + integração do pacote com o extra |
| **PR-2** ISS (C2) | 13–20, 21 | F-TC-1..4 e F-TC-7 ratificados | teste-tabela da função pura + integração do repo com fixtures de `FiscalDocument` |

Os dois PRs não se tocam fora de `EXPORT_KINDS`/`DELIVERABLE_EXPORT_KINDS` (conflito textual trivial). Cada um exige o
próprio "executa".

---

## 4. Pendente de validação externa (não entra no checklist como decidido)

| # | O quê | Por que está aqui | Quem fecha |
|---|---|---|---|
| P-C1 | A forma da planilha de memória (longa, resumo + linhas) serve ao contador | Pedido da triagem 23/09 linha 12 (*"memória de cálculo … XLSX para ele"*); forma não validada | contador |
| P-C2 | Município do ISS = `cLocPrestacao` | Regra geral × exceções de incidência da LC 116 art. 3º **não foram lidas nesta sessão** (**A**, assumido); o ADR não cita a LC 116 | contador |
| P-C3 | ISS do Simples: o relatório lista o ISS da nota, mas o recolhimento é pelo DAS (exceto retido) | `regApTribSN` é *"pendente contador (5e)"* (`schema.prisma:1398`); regra do Simples não está no ADR (**I**) | contador |
| P-C4 | Nota cancelada não entra na competência (F-TC-3 a) | Inferido; sem fonte primária lida (**I**) | contador |
| P-C5 | Oráculo do relatório de ISS: soma × livro/declaração municipal do mês | Gate humano (RUNBOOK-FORMAT); o agente prepara em branco, não preenche nem assina | dono |
| P-C6 | Oráculo da memória: herda P-9 (Fase A) / P-B9 (Fase B) — X7 × PVA no H1/H1b/X5 | O export só transporta o que foi confirmado | dono |

## 5. Insumos ausentes (pausa registrada; não varri além do item)

1. **Estrutura do `payloadJson` na tentativa corrente** (`currentAttemptNo`): li o DTO (`DpsPayloadDto.ts:67`) e o
   ponto de montagem (S12), não um payload gravado. O executor confirma o caminho `…locPrest.cLocPrestacao` no
   payload persistido antes do item 14.
2. **Partner `manual`:** se a nota emitida no portal e registrada à mão passa pelo `applyResult` com `vIssCents`
   (S11 cobre o caminho do retorno lido). Não li o caminho manual inteiro; define a frequência do F-TC-2.
3. **Composição das memórias** por `modo` (que `codigo`s cada função grava): não li todas; é o motivo do F-TC-6 (a).
4. **Mapa de cobertura da emissão** (`MAPA-COBERTURA-EMISSAO-2026-10-02.md`): li o cabeçalho; a cobertura
   Paulistana × Emissor Nacional por cliente não foi conferida aqui.

## 6. Achados fora de escopo (registrados, não planejados)

1. **Plano × código (contradiz a nota):** a nota do X7 lista "X9/MIT" como parte pendente "sem BRIEF" da Fase C; o
   X9 tem BRIEF ratificado desde 03/10. E a nota do **X9** segue `blocked` com *"falta o executa (e o PR-2 da Fase A
   do X7)"*: o PR-2 da Fase A mergeou no #504 (05/10) e o PR-2 da Fase B no #525. O bloqueio restante do X9 é só o
   "executa" (e o X8 PR-2 para o PR-3 dele). Fold da nota do X9 é de outra sessão.
2. **Emenda 3.4 do C6b ainda sem código** (S8): ela e este BRIEF acrescentam kinds às mesmas duas constantes. Quem
   mergear depois rebaseia; sem conflito de desenho.
3. **Consolidação do ISS por PJ** (várias unidades/IM): fora; o relatório é por escopo.
4. **Conciliação apurado × contabilizado × pago** (`EXPORT_TAX_RECONCILIATION`, E-§8): não é C3 do ADR; o "pago"
   não existe no sistema (sem DARF/guia). Frente própria.
5. **FE:** rótulo dos kinds novos no `DeliveryPanel`/`ImportExportPanel` (E-S17) — nó FE-INCR-DELIVERY.
6. **ISS da Paulistana** (SP capital, regime normal): o relatório não o vê, porque a nota não passa pelo
   `FiscalDocument`. Importar NFS-e emitida fora é outra frente (cobertura de emissão).

## 7. Gates de envio [OPS-001]

1. **Objetivo:** o dono quer a Fase C executável sem invenção. C1 → item 0 (confirma; já planejado no X9); C2 →
   itens 13–20; C3 → itens 1–12.
2. **Grau:** fatos de código com `arquivo:linha` lidos em `cd338e0c` (V); regras legais só as do ADR (F-X7-12);
   LC 116 e regra do Simples marcadas A/I e empurradas para §4.
3. **Caso adversarial:** *"o C1 precisa de trabalho aqui"* — derrubado pela leitura do BRIEF do X9 e do schema (S15).
   *"o município está no documento"* — derrubado: `FiscalDocument` não tem coluna de município (S10) → F-TC-1.
   *"`vIssCents` está sempre lá"* — derrubado: só o retorno grava (S11) → F-TC-2.
4. **Checagem que teria falhado:** o grep dos códigos da Fase B em `taxAssessmentParams.ts` (S3) e dos campos do C1 no
   schema; se faltasse um, o item 0 viraria item de código.
5. **Duas primeiras linhas:** cabeçalho diz sem código e forks pendentes; o bloco de alcance diz que o C1 já está
   coberto e que o risco do ISS é o documento fora do nosso fluxo.

**Vieses (T8):** prefiro export a rota (F-TC-7) por coerência com o pacote, o que pode subservir uma tela futura;
tratei como "direto" o escopo por unidade (item 20) e o filtro genérico por tributo (item 10), que o dono pode querer
ver como fork; li o fluxo de emissão só nos pontos citados.
