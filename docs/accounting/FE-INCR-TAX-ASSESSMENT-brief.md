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
   `/simples/historico`, `/simples/segregacao`, `/simples/parcerias` conforme o BRIEF do X14 (ler antes de detalhar).
5. **PR-5 MIT** — botão "Gerar MIT do mês" (`POST /mit-exports`), lista dos gerados (`GET`), download do JSON, avisos
   do BE (409 LC 224 liminar, 422 nada a exportar).

## 4. Pendente de validação externa

Nenhuma regra fiscal nova: a tela só mostra e envia o que o BE já decide. Os textos dos avisos vêm do BE.

## 5. Insumos ausentes

- Não há rota que diga quais períodos estão "em atividade" sem prévia (o BE devolve 409/400 na prévia); a grade mostra
  vazio até a primeira prévia ou confirmação.

## 6. Achados fora de escopo

- Nenhum (Simples e MIT entraram pelo F-2/F-7). Detalhar o PR-4 exige ler o BRIEF do X14 — insumo do PR-4, não deste.
