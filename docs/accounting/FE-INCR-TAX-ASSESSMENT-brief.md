# FE-INCR-TAX-ASSESSMENT — tela de apuração IRPJ/CSLL (X7) e PIS/Cofins (X8) (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código.
> **Autorização:** dono, chat, 08/10: *"mostra o avisoParametroLegal na tela de apuração"* → constatado que **não existe
> tela de apuração** no my-app (nenhum serviço/componente chama `/api/accounting/tax-assessments` em `origin/main`) →
> questionário do mesmo dia: *"Planejar a tela completa (FE-INCR-TAX-ASSESSMENT)"* e forks F-1..F-8 ratificados (§3).
> **Sem "executa"** para o código — cada fatia começa com o "executa" do dono.
> **Nós vizinhos:** X7 (BE-INCR-TAX-ASSESSMENT), X8 (BE-INCR-PIS-COFINS), X9 (MIT), LEGAL-PARAMS (PR-4: snapshot +
> recálculo + `avisoParametroLegal`). **Base:** `origin/main`.

## 0. Insumos (fato consumado no BE)

| Rota | O que faz | Fonte |
|---|---|---|
| `POST /api/accounting/tax-assessments/preview` | prévia IRPJ+CSLL (T01..T04, A01..A12, A00) — não grava | X7 item 13; `TaxAssessmentPreviewSchema` |
| `POST /api/accounting/tax-assessments` | confirma (CAS `expectedAPagarCents`, `supersedesIds`), devolve `reconfirmar` (cascata) | X7 item 14 |
| `POST /api/accounting/tax-assessments/pis-cofins/preview` · `POST …/pis-cofins` | idem PIS/Cofins mensal M01..M12 (cascata desde LEGAL-PARAMS PR-4) | X8 itens 13–14; `PisCofinsDto` |
| `GET /api/accounting/tax-assessments?unitId&anoCalendario&periodo&tributo&status` | lista do ano (X7+X8), `TaxAssessmentView[]` | X7 item 17 |
| `GET /api/accounting/tax-assessments/:id?unitId` | detalhe com memória de cálculo | X7 item 17 |
| `POST /api/accounting/tax-assessments/:id/provisao` | reconcilia a provisão pendente | X7 item 16; X8 item 18 |
| `POST/GET /api/accounting/mit-exports` | arquivo do MIT (DCTFWeb) a partir das confirmadas | X9 itens 10–12 |

`TaxAssessmentView` (BE): id, tributo, periodo, modo, codigoReceita, base/devido/deducoes/aPagar/saldoNegativo/
diferencaPostergada (centavos em string), status CONFIRMED|SUPERSEDED, supersedesId, provisaoPendente, tabelaVersao,
**parametrosSha256**, **avisoParametroLegal**, memoria[], confirmedAt. Policy: ler = `canReadTaxAssessment`, gerir =
`canManageTaxAssessment` (régua do e-Lalur). Erros 409 com `code` (TAX_ASSESSMENT_CAS/_ORDER/_STALE/…).

## 1. Checklist de comportamentos ([F-n] = fork ratificado em §3)

1. Aba/área de apuração [F-1], escopo de tributos [F-2].
2. Visão do ano [F-3]: seletor de ano; IRPJ/CSLL por período (trimestral ou mensal+A00 conforme a forma do perfil) e
   PIS/Cofins por mês; por célula: a pagar, status, provisão pendente, **aviso de parâmetro legal**.
3. **`avisoParametroLegal` (pedido original):** selo na célula/linha + faixa de destaque no detalhe com o texto do BE;
   inclui as linhas SUPERSEDED que a cascata deixou com aviso [F-5].
4. Detalhe: memória de cálculo (linhas código/descrição/valor/fonte), snapshot (`parametrosSha256`, `tabelaVersao`),
   histórico de versões do período (supersedesId), autor (PLATFORM = recálculo automático).
5. Prévia → confirmação [F-4]: formulário de entrada [F-6], prévia com avisos do BE, confirmar com o CAS da prévia;
   409 traduzido por `code`; `reconfirmar` (cascata) listado com atalho para refazer na ordem.
6. Substituir período confirmado (`supersedesIds` = as vivas do período) com aviso da cascata.
7. Reconciliar provisão pendente (botão por linha com `provisaoPendente`).
8. MIT [F-7].
9. Gates: i18n pt/en, `neutral-*`/`rounded-2xl`, tipos do contrato gerado (`@/types/contracts/accounting/TaxAssessmentDto.gen`,
   `PisCofinsDto.gen`), resposta à mão (decisão 9), build de produção (tela atrás de auth), vitest por comportamento.
10. Fatiamento [F-8].

## 2. Contratos (esboço)

```ts
// entrada: TaxAssessmentPreviewInput / TaxAssessmentConfirmInput / PisCofinsPreviewInput / PisCofinsConfirmInput (gerados)
interface TaxAssessment { id; tributo: 'IRPJ'|'CSLL'|'PIS'|'COFINS'; periodo; modo; codigoReceita; baseCents: string;
  devidoCents: string; deducoesCents: string; aPagarCents: string; saldoNegativoCents: string; diferencaPostergadaCents: string;
  status: 'CONFIRMED'|'SUPERSEDED'; supersedesId: string|null; provisaoPendente: boolean; tabelaVersao: string;
  parametrosSha256: string|null; avisoParametroLegal: string|null; memoria: { codigo; descricao; valorCents: string; fonte }[];
  confirmedAt: string }
type CelulaApuracao = { periodo: string; tributos: Record<string, TaxAssessment | undefined>; aviso: boolean; pendente: boolean };
```

## 3. Forks — ratificados 08/10 (questionário)

| Fork | Caminhos | Recomendação | Decisão (resposta literal) |
|---|---|---|---|
| **F-1** Onde | (a) aba "Apuração" na Contabilidade · (b) página própria | (a) | ✅ (a) — *"Aba 'Apuração' + grade do ano"* |
| **F-2** Tributos | (a) X7 + X8 · (b) + Simples (X14) | (a) | ✅ **(b) contra a recomendação** — *"X7 + x8 + Simples + botao do MIT"* |
| **F-3** Visão | (a) grade do ano período × tributo · (b) lista plana | (a) | ✅ (a) |
| **F-4** Confirmação | (a) prévia obrigatória → CAS da prévia · (b) direto | (a) | ✅ (a) |
| **F-5** Aviso nas SUPERSEDED | (a) também nas substituídas · (b) só nas vivas | (a) | ✅ (a) |
| **F-6** Entrada | (a) formulários completos · (b) só obrigatórios | (a) | ✅ (a) |
| **F-7** MIT | (a) botão "Gerar MIT do mês" na aba · (b) fora | (b) | ✅ **(a) contra a recomendação** (mesma resposta do F-2) |
| **F-8** Fatiamento | (a) 3 PRs · (b) 1 PR; com Simples+MIT: 5 PRs | (a) → 5 PRs | ✅ *"5 PRs: leitura → X7 → X8 → Simples → MIT"* |

### Fatias (F-8)

1. **PR-1 leitura + aviso** — aba, grade do ano (X7+X8), detalhe com memória/snapshot/histórico, `avisoParametroLegal`
   (vivas e substituídas), reconciliar provisão pendente. **Entrega o pedido original.**
2. **PR-2 X7** — formulário completo (deduções/retenções, modo do mês, estimativas pagas), prévia, confirmação com CAS,
   substituição + `reconfirmar` da cascata.
3. **PR-3 X8** — idem PIS/Cofins (ajustes de base, outros créditos, retenções, saldo credor; cascata do LEGAL-PARAMS PR-4).
4. **PR-4 Simples (X14)** — `/simples/apuracoes/{competencia}` (calcular, registrar DAS oficial, leitura) + entradas
   `/simples/historico`, `/simples/segregacao`, `/simples/parcerias` — **detalhado em §3.1**.
5. **PR-5 MIT** — botão "Gerar MIT do mês" (`POST /mit-exports`), lista dos gerados (`GET`), download do JSON, avisos
   do BE (409 LC 224 liminar, 422 nada a exportar).

### 3.1 PR-4 Simples (X14) — detalhe

> **Autorização:** dono, chat, 2026-10-08 — *"Este pedido autoriza só detalhar o PR-4 no BRIEF, sem código."*
> **Insumos lidos (origin/main `824f1c9f`):** nota `docs/plano/nos/X14.md`; [`BE-INCR-SIMPLES-NACIONAL-brief.md`](BE-INCR-SIMPLES-NACIONAL-brief.md)
> (itens 10–24, B-1..B-4); `docs.paths.ts` (7 rotas `/api/accounting/simples/*`); `dtos/SimplesDto.ts`;
> `SimplesDto.gen.ts`; o tipo de resposta em `services/SimplesApuracaoService.ts` (`ApuracaoSimples`),
> `models/simplesCalc.ts` (`ApuracaoCalculada`, `AtividadeApurada`, `Janela`) e `models/simplesEspelho.ts`
> (`EspelhoAtividade`). **Regra:** a tela não decide regra fiscal — mostra e envia o que o BE do X14 decide; cada
> comportamento cita o item do BRIEF do X14 que o sustenta.

**Fatos do BE que moldam a tela (verificado lendo o código):**
- Só **ME/EPP**: `calcular` recusa perfil fora de `SIMPLES` com 400 ("o MEI é apurado pelo SIMEI");
  SIMEI/DASN-SIMEI/DEFIS são o PR-4 do X14, **sem "executa"** — não existem rotas.
- X7 recusa regime SIMPLES/MEI com 400 *"IRPJ/CSLL entram no DAS — DAS é da onda 3"* (`TaxAssessmentService.ts:710`).
- **Sem rota de lista** de apurações do Simples por ano: só `GET /simples/apuracoes/{competencia}`, que **recalcula**
  a cada chamada (`obter` = `calcular` + DAS registrado).
- **Sem GET** de histórico pré-adoção nem de segregação (só `PUT`); parcerias têm `GET ?unitId`.
- A substituída (`SimplesApuracao` SUPERSEDED) **não é exposta** por rota; o GET devolve só o DAS vigente.
- O Simples **não tem** `avisoParametroLegal`/`parametrosSha256`: a rastreabilidade é `tabela[]`
  (`legalParameterId`, `fonte`, `vigenteDesde`).
- Concorrência: não há CAS de valor; o registro do DAS relê as entradas dentro da tx e devolve **409** se mudaram
  depois do cálculo (item 20); alertas bloqueantes (`TIEOUT_DIVERGENTE`, `RBT12_INCOMPLETO`, `ATIVIDADE_SEM_ANEXO`)
  devolvem **400** com `details.alertas`.

> **Pré-requisitos do PR-4 criados pelos forks (08/10) — o PR-4 do FE NÃO começa antes deles, e cada um exige
> autorização própria do dono (ORCH-006; esta sessão não os planeja):**
> 1. **BE:** `GET /api/accounting/simples/historico/{competencia}?unitId` e `GET …/segregacao/{competencia}?unitId` (P4-3 → b).
> 2. **BE:** X14 PR-4 (SIMEI + DASN-SIMEI — itens 25–27) com "executa" e mergeado (P4-6 → b).
> Ordem das fatias (F-8) fica: PR-1 → PR-2 → PR-3 → **PR-5 MIT** pode passar à frente do PR-4, que espera os dois acima.
> (Inferência sobre o F-8; a ordem "leitura → X7 → X8 → Simples → MIT" é do dono — reordenar é decisão dele.)

#### Checklist do PR-4 (cada item testável isoladamente no vitest)

1. **Grade por regime** [P4-1] — o regime vem do `CompanyFiscalProfile` do ano selecionado. SIMPLES: linhas = 12
   competências, coluna única **DAS** (total calculado, DAS oficial, divergência, status), sem colunas IRPJ/CSLL/PIS/
   Cofins; PRESUMIDO/REAL: grade X7/X8 do PR-1 inalterada. A tela **não chama** a prévia do X7/X8 em ano SIMPLES (o
   400 "DAS é da onda 3" não chega ao usuário). Fonte: X14 item 18; ADR-INCR-TAX-ASSESSMENT D12 (via BE).
2. **Carga da grade do ano** [P4-2] — por célula: estado *carregando / sem perfil (400) / regra não regulamentada
   (422 `SIMPLES_REGRA_NAO_REGULAMENTADA`) / calculado sem DAS / DAS registrado / divergente*. Selo na célula para
   alerta bloqueante e para `provisaoPendente`.
3. **Detalhe da competência — leitura** (`GET /simples/apuracoes/{competencia}?unitId`): RBT12 + janela (`de`/`ate`/
   `regra`, ex. "LC 214 art. 517" a partir de 2027 — X14 item 5); por atividade: anexo, natureza, cTribNac, receita,
   faixa, alíquota nominal, parcela a deduzir, alíquota efetiva, fator R (quando houver — item 7) e tributos (item 6);
   **espelho do PGDAS-D** (`espelho[]`: item 1/5/7, atividade, detalhe, parcelas com qualificação por tributo — item
   18); total calculado; DAS oficial e **divergência** em destaque (F-SN-8 → b, regra silente nº 1: vale o oficial);
   tie-out (subrazão × razão — item 16); alertas com `codigo` traduzido + `detalhe` do BE; tabela de lei usada
   (`tabela[]` com fonte e vigência — substitui o `parametrosSha256` do X7).
4. **Calcular** (`POST …/calcular`) — botão no detalhe; resultado substitui a leitura na tela; nada gravado (B-2 → a).
5. **Registrar o DAS oficial** (`PUT …/das`) — formulário completo [F-6]: número do documento, valor (R$ → centavos,
   >0), vencimento (date-only com validação de calendário; sugestão dia 20 do mês seguinte, só sugestão — X14 item 19),
   PDF opcional como `SourceDocument` [P4-5]. **Prévia obrigatória [F-4]:** o botão só habilita depois de um
   *calcular* na sessão sem alerta bloqueante; mostra lado a lado calculado × oficial antes de enviar. 409 → mensagem
   "as entradas mudaram, calcule de novo" + recalcula; 400 com `details.alertas` → lista os bloqueantes. Re-registro
   na mesma competência avisa "substitui o DAS anterior e estorna a provisão dele" (item 19/21); mesmo número e valor
   = "completa a provisão pendente" (rota idempotente).
6. **Histórico mensal pré-adoção** (`PUT /simples/historico/{competencia}`) — formulário por competência: receita
   bruta, folha (opcional, para fator R — item 11), documento de origem opcional; atalho a partir do alerta
   `RBT12_INCOMPLETO` (abre o formulário já na competência faltante citada no `detalhe`). Formulário **pré-preenchido
   pelo `GET` que o BE vai expor** [P4-3 → b].
7. **Segregação manual** (`PUT /simples/segregacao/{competencia}`) — editor de até 50 parcelas: natureza
   (SERVICO/REVENDA/LOCACAO_MOVEL), receita (>0), motivo (MONOFASICO/ICMS_ST/ISS_RETIDO/MONOFASICO_E_ICMS_ST); a
   resposta mostra os tributos excluídos derivados (`excluir`, nunca digitados — `excluirDoMotivo`); texto fixo "ISS de
   outro município continua no DAS" (LC 123 art. 18 § 4º-A V, citado no DTO). Envio substitui o conjunto inteiro do mês.
   Alerta `SEGREGACAO_MANUAL` visível na grade/detalhe (item 12). Pré-preenchido pelo `GET` do BE [P4-3 → b].
8. **Parcerias salão-parceiro** (`GET/POST/PATCH/DELETE /simples/parcerias`) — lista da unidade + formulário completo:
   profissional (contato), cota do salão em % (→ bp 1..9999), natureza da cota (ALUGUEL_BEM_MOVEL / GESTAO),
   homologado em + sindicato (obrigatórios — Lei 12.592 art. 1º-A § 8º, X14 item 13), vigência (`vigenteAte ≥
   vigenteDesde`, nulo = aberto); 409 "outro contrato do profissional vigente no período"; remover = soft-delete com
   confirmação. Onde fica: [P4-4].
9. **MEI** [P4-6 → b] — o PR-4 do FE entrega também o ano MEI (SIMEI mensal, DASN-SIMEI) **sobre as rotas que o X14
   PR-4 criar** (itens 25–27 do BRIEF do X14); contratos de resposta do MEI ficam a detalhar quando essas rotas existirem.
10. **Substituídas** [P4-7 → a] — a tela mostra só o DAS vigente; o F-5 não se aplica ao Simples (o BE não expõe a
    SUPERSEDED). O aviso de substituição é o texto do item 5 no momento do re-registro.
11. **Gates**: tipos de entrada de `@/types/contracts/accounting/SimplesDto.gen`; resposta à mão espelhando
    `ApuracaoSimples` (decisão 9); policy é do BE (`canReadTaxAssessment`/`canManageTaxAssessment`) — 403 esconde
    os botões de gerir; i18n pt/en (namespace novo entra no `ns` — memória i18n); `neutral-*`/`rounded-2xl`; reuso de
    `Modal`/`GenericTable`; build de produção; vitest por item.

#### Contratos do PR-4

```ts
// Entrada — gerados (my-app/types/contracts/accounting/SimplesDto.gen.ts):
//   SimplesHistoricoUpsertInput, SimplesSegregacaoUpsertInput (parcelas: SimplesSegregacaoParcelaInput[]),
//   SalaoParceriaContratoInput, SalaoParceriaContratoPatchInput, SimplesDasRegistroInput, SimplesUnitQueryInput
// calcular: body { unitId }   ·   GET apuração / GET parcerias / DELETE parceria: ?unitId

// Resposta — à mão, espelho de SimplesApuracaoService.ApuracaoSimples + simplesCalc + simplesEspelho:
type TributoSimples = 'IRPJ'|'CSLL'|'COFINS'|'PIS'|'CBS'|'IBS'|'CPP'|'ICMS'|'ISS'|'IPI';
type AnexoSimples = 'I'|'II'|'III'|'IV'|'V';
interface ApuracaoSimples {
  competencia: string; regime: 'SIMPLES'; rbt12Cents: number;
  janelaRbt12: { de: string; ate: string; regra: 'LC123-art18-§1' | 'LC214-art517' };
  atividades: Array<{ anexo: AnexoSimples; natureza: 'SERVICO'|'REVENDA'|'LOCACAO_MOVEL'; cTribNac: string|null;
    receitaCents: number; faixa: number; aliquotaNominal: string; parcelaDeduzirCents: number; aliquotaEfetiva: string;
    fatorR: string|null; tributos: Partial<Record<TributoSimples, number>> }>;
  totalCalculadoCents: number;
  tabela: Array<{ legalParameterId: string; fonte: string; vigenteDesde: string }>;
  espelho: Array<{ item: '1'|'5'|'7'; atividade: string; detalhe: string; anexo: AnexoSimples; receitaCents: number;
    parcelas: Array<{ receitaCents: number; qualificacoes: Partial<Record<TributoSimples, string>> }> }>;
  dasOficial: { id: string; numeroDocumento: string; valorCents: number; vencimento: string; provisaoPendente: boolean } | null;
  divergenciaCents: number | null;
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };
  alertas: Array<{ codigo: 'ATIVIDADE_SEM_ANEXO'|'RBT12_INCOMPLETO'|'LIMITE_ME_EXCEDIDO'|'LIMITE_EPP_EXCEDIDO'
    |'SUBLIMITE_ICMS_ISS'|'SEGREGACAO_MANUAL'|'TIEOUT_DIVERGENTE'|'HISTORICO_IGNORADO'; detalhe: string }>;
}
// SimplesHistoricoView, SimplesSegregacaoView (parcelas + excluir: TributoSimples[]), SalaoParceriaContratoView:
//   copiar os tipos exportados de server/src/features/accounting/dtos/SimplesDto.ts.
type CelulaSimples = { competencia: string; estado: 'carregando'|'semPerfil'|'naoRegulamentada'|'calculado'|'registrado'|'erro';
  apuracao?: ApuracaoSimples; bloqueante: boolean; divergente: boolean };
```

#### Forks do PR-4 — ratificados (dono, chat, 2026-10-08, questionário)

| Fork | Caminhos | Recomendação | Decisão |
|---|---|---|---|
| **P4-1** Grade × regime | (a) a grade troca de colunas pelo regime do perfil do ano (SIMPLES → coluna DAS; PRESUMIDO/REAL → X7/X8) · (b) colunas fixas de todos os tributos com "não se aplica" | (a) — o BE já recusa X7 no SIMPLES; colunas mortas só ocupam espaço | ✅ (a) — *"Troca colunas por regime (Recomendado)"* |
| **P4-2** Carga do ano | (a) 12 `GET` (um por competência, concorrência limitada), cada um recalcula · (b) grade só com o mês aberto; o ano não carrega · (c) esperar rota de lista no BE (frente nova) | (a) — usa o que existe; custo é 12 cálculos por abertura; (c) vai a "fora de escopo" | ✅ (a) — *"12 GETs, concorrência limitada (Recomendado)"* |
| **P4-3** Histórico/segregação sem GET | (a) formulário sempre em branco, com aviso "substitui o declarado" · (b) pedir `GET` ao BE antes do PR-4 (frente nova) · (c) pré-preencher a segregação pelo `espelho` (só parcial; o histórico continua em branco) | (a) agora + (b) registrado fora de escopo — (c) reconstrói dado do BE no FE | ✅ **(b) contra a recomendação** — *"Pedir GET ao BE antes do PR-4"* |
| **P4-4** Onde ficam as parcerias | (a) sub-painel "Parcerias" dentro da aba Apuração, visível em ano SIMPLES · (b) cadastro em outro lugar (ex. perfil fiscal) | (a) — o único efeito do contrato é na apuração | ✅ (a) — *"Sub-painel na aba Apuração (Recomendado)"* |
| **P4-5** PDF do DAS | (a) upload do PDF como `SourceDocument` no próprio formulário (reuso do fluxo existente) · (b) só número/valor/vencimento; anexar depois | (a) se o upload canônico de `SourceDocument` servir sem mudança; senão (b) | ✅ (a) — *"Upload no formulário (Recomendado)"* |
| **P4-6** MEI | (a) PR-4 só ME/EPP; ano MEI mostra estado vazio · (b) segurar o PR-4 do FE até o X14 PR-4 (SIMEI) ter "executa" e mergear | (a) — não trava o ME/EPP por uma rota que não existe | ✅ **(b) contra a recomendação** — *"Segurar até o SIMEI do BE"* |
| **P4-7** F-5 no Simples | (a) mostra só a vigente (o GET não diz se houve anterior); histórico de versões vira fora de escopo (BE não expõe) · (b) pedir rota de versões ao BE (frente nova) | (a) | ✅ (a) — *"Só a vigente (Recomendado)"* |

## 4. Pendente de validação externa

Nenhuma regra fiscal nova: a tela só mostra e envia o que o BE já decide. Os textos dos avisos vêm do BE.

## 5. Insumos ausentes

- Não há rota que diga quais períodos estão "em atividade" sem prévia (o BE devolve 409/400 na prévia); a grade mostra
  vazio até a primeira prévia ou confirmação.
- **PR-4:** sem `GET` de histórico pré-adoção/segregação, sem lista anual de `SimplesApuracao`, sem rota de versões
  substituídas, sem rotas do MEI (X14 PR-4). Componente canônico de seleção de contato (profissional da parceria) e de
  upload de `SourceDocument` — localizar na execução (P4-5).

## 6. Achados fora de escopo

- Nenhum (Simples e MIT entraram pelo F-2/F-7).
- **BE do X14 (frente nova, exige autorização):** `GET` de histórico/segregação — **pré-requisito do PR-4 pelo P4-3 → b**;
  lista anual de apurações (P4-2 c, não escolhida); versões substituídas (P4-7 b, não escolhida).
