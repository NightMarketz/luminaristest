# BE-INCR-TAX-ASSESSMENT-C — EMENDA RASTREIO (§C3 item 5): rastreabilidade da memória de cálculo

> Sessão `sessao-planejamento`. **Só BRIEF: sem código, sem branch de código, sem `executa`.**
> Forks F-RT-1..6 **ratificados pelo dono em 03/11** por questionário (§3.1); **F-RT-4 contra a recomendação** (coluna nova,
> com migração). Itens 1, 13 e o contrato §2.1 já estão na forma ratificada. Ainda sem `executa`.

## Contexto fixo

- **Item:** emenda ao [`BE-INCR-TAX-ASSESSMENT-C-brief.md`](BE-INCR-TAX-ASSESSMENT-C-brief.md) §C3 item 5 (forma da planilha
  `EXPORT_TAX_ASSESSMENT_MEMO`) e §2.1 (contrato `MemoLinhaExport`). Nó [[X7]].
- **Autorização:** dono, chat, 03/11/2026: *"Planeja a emenda"*, em resposta à pergunta "Autoriza planejar a emenda de
  rastreabilidade do X7-C §C3?". Cobre **exatamente** este BRIEF. Não autoriza código nem merge.
- **Origem do requisito:** resposta do contador à P-C1, triada em
  [`TRIAGEM-RESPOSTA-CONTADOR-2026-11-03.md`](TRIAGEM-RESPOSTA-CONTADOR-2026-11-03.md). A origem foi confirmada pelo dono em
  03/11 por questionário: *"Contador de fato"*. Saída (b), "aprovado com ajustes".
- **Critério de aceite da emenda (do contador):** conferir qualquer valor do IRPJ ou da CSLL e responder "de onde veio
  esse número, como foi calculado e qual informação contábil o sustenta", **sem consultar o código-fonte**.
- **Fato consumado (não rediscutir):** uma aba, formato longo, `RESUMO` antes de `MEMORIA` (F-TC-6 a), sem recálculo no
  export (§C3 item 4), centavos como string inteira (item 7), `substitui` = `supersedesId` (item 8). O contador confirmou
  os quatro.

### Insumos lidos (03/11, `origin/main` `f5dc79b7`; `server/` idêntico ao do branch)

| Artefato | O que fixa |
|---|---|
| `server/src/features/accounting/models/taxAssessmentMemoExport.ts` | `MEMO_COLUMNS` (16 colunas), `linhasDaApuracao` (prefixo de 11 campos + `tipoLinha` + 4 da linha), `linhaMeta` |
| `server/src/features/accounting/models/taxAssessmentCalc.ts` | `MemoriaLinhaSchema` `.strict()` com só `codigo`, `descricao`, `valorCents`, `fonte`; a conta aparece só no texto da descrição (ex.: `'Receita bruta de serviço do trimestre (conta 3.1)'`) |
| `schema.prisma`, `model TaxAssessment` | `memoria Json`; `tabelaVersao`; `parametrosIds Json?` e `parametrosSha256 String?` (BE-INCR-LEGAL-PARAMS PR-4) gravados e não exportados; `provisaoEntryId`; nenhum campo de vencimento ou pagamento |
| `server/src/features/accounting/services/receitaBrutaPorAtividade.ts` | a receita vem de `postingRepo.groupByAccount(scope, LEDGER_STATUSES, { from, to, excludeSourceTypes: [CLOSING_SOURCE_TYPE] })`: **o total por conta já é calculado** e depois somado por atividade (`segregar`) |
| `DataExchangeExportService.ts`, `EXPORT_GENERAL_LEDGER` | razão com `accountCode`, `accountName`, `date`, `entryId`, `entryNumber`, `description`, `status`, débito, crédito, saldo corrente; **sem** `sourceType`/`sourceId` (o documento). `EXPORT_ENTRY_SAMPLE` tem `sourceType`/`sourceId` |
| `server/src/lib/ibsCbsApuracao.ts` | `ultimoDiaUtilDoMesSeguinte(ano, mes, feriados, codMun)` — canônico de "último dia útil" com `FERIADO_NACIONAL` (`ehDiaUtil`, `profitDistribution.ts`) |
| Lei 9.430/1996, acervo (compilada, cópia de 13/10, sem alerta) — dossiê [`pc1-vencimento-darf-irpj-csll`](../../pesquisas-legais/pc1-vencimento-darf-irpj-csll/relatorio.md) [D01] | art. 5º caput e §§ 1º–2º (trimestral), art. 6º caput, § 1º I e § 3º (estimativa e ajuste), art. 28 (CSLL segue as mesmas regras) |

### Nós vizinhos

- Consome: `TaxAssessmentService` (confirmação grava a `memoria`), `receitaBrutaPorAtividade`, `IPostingRepository.groupByAccount`,
  tabela legal `FERIADO_NACIONAL`, `ultimoDiaUtilDoMesSeguinte`.
- É consumido por: pacote do contador (`DELIVERABLE_EXPORT_KINDS`, §C3 item 9) e pelo [[X8]] quando gravar PIS/COFINS no
  mesmo model (§C3 item 10: o builder não filtra tributo).

## 1. Checklist numerado

> Cada item é testável sozinho. Os forks estão ratificados (§3.1).

### A. Persistir a origem na confirmação (sem recálculo no export)

1. **Origem gravada em coluna própria (F-RT-4 b, ratificado).** `TaxAssessment` ganha `rastreio Json?` (migração aditiva,
   coluna nula), validada por `RastreioApuracaoSchema` (contrato §2.1), com uma entrada por `codigo` de linha da memória.
   `MemoriaLinhaSchema` **não muda**. Apuração anterior à emenda fica com `rastreio = null`. Migração no padrão da casa:
   SQLite sem transação ⇒ prólogo defensivo, e o smoke de migração roda (memórias `migracao-sqlite-nao-e-transacional`,
   `smoke-gate-s6-x-migracao-de-dado`; aqui não há backfill). Teste: confirmação grava `rastreio` válido; apuração antiga
   (`rastreio` nulo) exporta sem erro; `rastreio` com `codigo` que não existe na memória ⇒ erro na confirmação (não silencia).
2. **Linhas `RASTREIO` por conta, gravadas na confirmação.** Para cada linha da memória que vem do razão (receita de
   serviço 3.1, receita por não uso 3.4, revenda 3.3, receita hospitalar, despesas lidas no Real), a confirmação grava uma
   entrada de rastreio **por conta analítica** com movimento ≠ 0: `accountCode`, `accountName`, `from`, `to` (a janela
   usada) e o movimento em centavos. Fonte: o mesmo `groupByAccount` que o cálculo já fez (sem query nova para o
   movimento). (F-RT-1 a, ratificado.) Teste-tabela: trimestre com receita em 2 contas analíticas de 3.1 ⇒ 2
   entradas, e a soma delas = `valorCents` da linha `RECEITA_SERVICO`.
3. **Saldo do balancete.** (F-RT-2 a, ratificado.) Cada entrada de rastreio grava também o saldo da conta no
   fim da janela (`saldoFinalCents`), lido na confirmação e congelado. Teste: lançamento retroativo postado **depois** da
   confirmação não muda o saldo exportado.
4. **Período de origem das linhas que vêm de outra apuração.** Linha copiada de memória anterior (trimestres anteriores,
   `RECEITA_ACUMULADA_ANO`, `LC224_SOBRA_ANTERIOR`…) grava `origemApuracaoId` e `origemPeriodo`. Teste: a linha da sobra
   do T02 aponta a apuração T01 confirmada.
5. **Linhas de parâmetro, informado e cálculo.** Linha cuja fonte é parâmetro legal ou valor informado pelo usuário grava
   `origemTipo = PARAMETRO | INFORMADO` (sem conta). Teste: alíquota da CSLL ⇒ `PARAMETRO`; dedução informada ⇒ `INFORMADO`; presunção ⇒ `CALCULO`, e toda linha `CALCULO` diz a operação na `descricao` (F-RT-6 a).

### B. Exportar

6. **Colunas novas na planilha**, ao fim de `MEMO_COLUMNS` (aditivo; ordem das 16 atuais preservada): ver contrato §2.2.
   Vazias quando a apuração é anterior à emenda. Teste: apuração antiga exporta com as colunas novas vazias e as 16
   antigas idênticas byte a byte ao export de hoje.
7. **`tipoLinha = 'RASTREIO'`**, logo depois da linha `MEMORIA` a que se refere, uma por entrada de rastreio, com
   `codigo` = o código da linha-mãe. Ordem por apuração: `RESUMO*` → (`MEMORIA` → `RASTREIO*`)\*. Teste: uma apuração com 2
   contas sai `RESUMO×6, MEMORIA, RASTREIO, RASTREIO, …`.
8. **Versão dos parâmetros legais:** colunas `parametrosIds` (ids ordenados, `;`-separados) e `parametrosSha256`, lidas do
   model (já gravadas desde o PR-4 do LEGAL-PARAMS). Teste: apuração com `parametrosSha256` sai com o hash; anterior ao
   PR-4 sai vazia.
9. **Vencimento do DARF (quota única)** em coluna própria no prefixo da apuração, calculado no export pela lei
   (função pura; `feriados` lidos uma vez por export). Regra, Lei 9.430 [D01]:
   - trimestral (`T01..T04`): último dia útil do mês seguinte ao fim do trimestre (art. 5º caput);
   - estimativa mensal (`A01..A12`): último dia útil do mês seguinte (art. 6º caput; dezembro ⇒ janeiro, § 3º);
   - ajuste anual (`A00`): último dia útil de março do ano seguinte (art. 6º § 1º I);
   - CSLL: as mesmas (art. 28).
   Reusa `ultimoDiaUtilDoMesSeguinte` (`codMun = null`: tributo federal, só feriado nacional). Teste-tabela: T01/2027,
   A12/2027, A00/2027, com um feriado nacional no último dia útil.
   (F-RT-3 a, ratificado: só a quota única; as 3 quotas do art. 5º § 1º ficam fora.)
10. **Linha-meta** ganha `rastreio=v1` (o leitor sabe que as colunas novas existem). Teste: 1ª linha contém `rastreio=v1`.

### C. Documento de origem

11. **(F-RT-1 a, ratificado)** O razão (`EXPORT_GENERAL_LEDGER`) ganha `sourceType` e `sourceId` ao fim das colunas
    (aditivo), para fechar a cadeia conta → lançamento → documento. Teste: lançamento de venda sai com o `sourceType` da
    venda e o id. Este item toca outro kind (aditivo), e entra porque o F-RT-1 (a) foi ratificado.

### D. Gates que o diff aciona

12. Snapshot de shape dos DTOs (`__dto-shapes__.json`) se o DTO de export mudar: inserir só o novo, sem reordenar
    (memória `dto-snapshot-update-reordena-no-windows`).
13. Nenhum `eventType` novo de auditoria (o export não audita linha); nenhuma rota nova. **Uma migração** (F-RT-4 b):
    `ALTER TABLE tax_assessments ADD COLUMN rastreio` nula, sem backfill; `npm run smoke:migration` verde.
14. `tsc` limpo em `server/` e `npm run check:arch` sem violação nova.

## 2. Contratos esboçados

### 2.1 Rastreio persistido (F-RT-4 b, ratificado: coluna própria)

```prisma
// model TaxAssessment — aditivo
rastreio Json? // RastreioApuracaoSchema; null nas apurações anteriores à EMENDA RASTREIO
```

```ts
// models/taxAssessmentCalc.ts (ou models/taxAssessmentRastreio.ts)
export const RastreioContaSchema = z.object({
  accountCode: z.string().min(1),
  accountName: z.string(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // janela usada no cálculo
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  movimentoCents: z.string().regex(/^-?\d+$/),
  saldoFinalCents: z.string().regex(/^-?\d+$/).optional(), // F-RT-2
}).strict();

export const RastreioLinhaSchema = z.object({
  codigo: z.string().min(1),                  // = MemoriaLinha.codigo
  origemTipo: z.enum(['RAZAO', 'MEMORIA_ANTERIOR', 'PARAMETRO', 'INFORMADO', 'CALCULO']),
  origemApuracaoId: z.string().optional(),    // MEMORIA_ANTERIOR
  origemPeriodo: z.string().optional(),       // MEMORIA_ANTERIOR: 'T01' | 'A03' …
  contas: z.array(RastreioContaSchema).optional(), // RAZAO
}).strict();
export const RastreioApuracaoSchema = z.array(RastreioLinhaSchema);
// MemoriaLinhaSchema: sem mudança.
```

### 2.2 Planilha (`MemoLinhaExport`, aditivo ao fim)

```ts
type MemoLinhaExport = {
  /* 16 colunas atuais, mesma ordem */
  tipoLinha: 'RESUMO' | 'MEMORIA' | 'RASTREIO';
  // novas, ao fim:
  vencimentoDarf: string;      // AAAA-MM-DD, quota única (item 9); igual em todas as linhas da apuração
  parametrosIds: string;       // ids ';'-separados | ''
  parametrosSha256: string;    // | ''
  origemTipo: string;          // RAZAO | MEMORIA_ANTERIOR | PARAMETRO | INFORMADO | CALCULO | ''
  origemApuracaoId: string; origemPeriodo: string;
  accountCode: string; accountName: string;   // só em RASTREIO
  origemFrom: string; origemTo: string;        // só em RASTREIO
  saldoFinalCents: string;                     // só em RASTREIO (F-RT-2)
};
// RASTREIO: codigo = código da linha-mãe; descricao = accountName; valorCents = movimentoCents; fonte = 'razão'
```

### 2.3 Função de vencimento (pura)

```ts
// models/taxAssessmentMemoExport.ts (ou models/vencimentoIrpjCsll.ts)
export function vencimentoQuotaUnica(anoCalendario: number, periodo: LalurPeriodo, feriados: Feriados): string;
// T0n ⇒ ultimoDiaUtilDoMesSeguinte(ano, 3n, feriados, null)
// A01..A12 ⇒ ultimoDiaUtilDoMesSeguinte(ano, mes, feriados, null)
// A00 ⇒ ultimoDiaUtilDoMesSeguinte(ano + 1, 2, feriados, null)  // março do ano seguinte
```

## 3. Forks (ratificados em 03/11 — §3.1)

| Fork | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-RT-1** | Até onde vai o rastreio | Linha `RASTREIO` por **conta analítica** e janela; a cadeia segue no razão do pacote, que ganha `sourceType`/`sourceId` (item 11) | Ids de **todos os lançamentos** dentro da linha `RASTREIO` (lista) | Uma linha `RASTREIO` **por lançamento** na mesma aba | **(a).** Fecha a cadeia que ele desenhou (conta → lançamento → documento) com volume pequeno: a soma por conta já existe e o razão já lista os lançamentos. (b) faz célula sem teto. (c) pode dar milhares de linhas por trimestre num salão (inferido, não medido) e mistura razão com memória. Custo da (a): mexe no `EXPORT_GENERAL_LEDGER` (aditivo) |
| **F-RT-2** | "Saldo do balancete utilizado" | **Movimento e saldo final** da conta na janela, os dois congelados na confirmação | Só o movimento (o valor que entrou no cálculo) | Perguntar ao contador antes | **(a).** O movimento é o número que entrou no cálculo; o saldo final é o que ele vai achar no balancete. Gravar os dois custa uma leitura a mais na confirmação e responde as duas leituras. Se o dono preferir perguntar: "No saldo do balancete, você quer o saldo da conta no fim do período ou o movimento do período?" |
| **F-RT-3** | Quotas do trimestral (Lei 9.430 art. 5º § 1º) | Só o vencimento da **quota única** nesta emenda | As 3 quotas (vencimentos + juros SELIC do § 3º) | — | **(a).** O produto não modela a opção por quotas (nenhum `quota` no cálculo). As 3 quotas pedem decisão de produto e o cálculo dos juros: frente própria |
| **F-RT-4** | Onde guardar a origem | Campos **opcionais** dentro da `memoria` Json (`MemoriaLinhaSchema`) | Coluna nova `rastreio Json?` no `TaxAssessment` (migração) | — | **(a).** Zero migração, o JSON já é a "memória sem recálculo" do item 4, e a apuração antiga continua válida. (b) separa o dado do passo que ele explica |
| **F-RT-5** | Pagamento efetivo (data e valor recolhidos) | **Fora desta emenda**; registrar como frente própria | Entrar agora, lendo de onde o pagamento é lançado | — | **(a).** O próprio contador diz que o recolhimento "não precisa integrar a memória de cálculo". Além disso, a ligação apuração → pagamento não existe hoje (insumo ausente I1) |
| **F-RT-6** | "Fórmula ou regra de cálculo" | Basta o que existe: `descricao` com a operação + `fonte` com a base legal + `origemTipo`; um teste garante que toda linha `CALCULO` diz a operação na descrição | Coluna `formula` estruturada (ex.: `RECEITA_SERVICO * 0.32`) | — | **(a).** A descrição já traz a conta e o percentual (ex.: `` `Receita de serviço × ${pS.valor / 100}%` ``). Uma fórmula estruturada pede uma linguagem de expressão nova para as 42 chamadas de `linha(` do `taxAssessmentCalc.ts` (contadas em 03/11), sem ganho para quem confere a planilha |

### 3.1 Ratificação (dono, chat, 03/11/2026, questionário)

| Fork | Resposta do dono | Contra a recomendação? |
|---|---|---|
| F-RT-1 | "Por conta (Recomendado)" — linha `RASTREIO` por conta analítica; razão ganha `sourceType`/`sourceId` (item 11 entra) | não |
| F-RT-2 | "Movimento + saldo (Recomendado)" — `movimentoCents` e `saldoFinalCents`, congelados na confirmação | não |
| F-RT-3 | "Só quota única (Recomendado)" | não |
| F-RT-4 | **"Coluna nova"** — `rastreio Json?` no `TaxAssessment`, com migração | **sim** |
| F-RT-5 | "Fora, frente própria (Recomendado)" | não |
| F-RT-6 | "Descrição + fonte (Recomendado)" — mais um teste: toda linha `CALCULO` diz a operação na descrição | não |

Nenhum fork pendente. O BRIEF espera o `executa` do dono.

## 4. Pendente de validação externa

- Nenhuma regra legal nova fica sem fonte. O vencimento (item 9) está citado da Lei 9.430 no acervo (compilada, sem
  alerta). O § 4º do art. 5º (incorporação, fusão, cisão, extinção) fica fora: evento societário não é modelado no X7.
- Se o dono escolher perguntar no F-RT-2, a pergunta exata está na tabela de forks.

## 5. Insumos ausentes (pausa nesses trechos)

- **I1.** Onde o pagamento do DARF de IRPJ/CSLL é registrado hoje (baixa da provisão `provisaoEntryId`? contas a pagar?).
  Não varri. Só pesa se o F-RT-5 for (b).
- **I2.** Lista exata das linhas da memória que vêm do razão no Real (despesas, adições, exclusões do e-Lalur). Li a
  receita do Presumido (`receitaBrutaPorAtividade`); o caminho do Real ficou fora desta leitura. O implementador enumera
  na Fase A, item 2, antes de gravar.
- **I3.** Se `groupByAccount` com `to` = fim da janela e `from` = início do exercício dá o saldo final das contas de
  resultado (F-RT-2 a) sem pegar o lançamento de encerramento (`CLOSING_SOURCE_TYPE` já é excluído no movimento). Confirmar
  lendo o repositório na execução.

## 6. Achados fora de escopo (registrados, não planejados)

- As 3 quotas do trimestral com juros SELIC (Lei 9.430 art. 5º §§ 1º e 3º) — F-RT-3 (b).
- Ligação apuração → pagamento do DARF ("RECOLHIMENTO E HISTÓRICO" do contador) — F-RT-5 (b).
- O FE da tela de apuração não mostra o rastreio; só o export muda. Tela é nó `FE-INCR-*` próprio.
