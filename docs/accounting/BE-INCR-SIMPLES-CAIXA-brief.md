# BE-INCR-SIMPLES-CAIXA — base do DAS pela receita recebida (regime de caixa, ME/EPP, até 2026) (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código. Nó: [X14-CAIXA](../plano/nos/X14-CAIXA.md).
> **Autorização:** dono, chat, 2026-10-15: *"Autorizo planejar o BRIEF do X14-CAIXA — sessao-planejamento, sem
> código, sem 'executa'"*. **Sem "executa".**
> **Escopo decidido no questionário desta sessão (dono, 2026-10-15):** *"Caixa completo para 2026"* (contra a
> recomendação, que era guarda + encerrar) e, para a transição de dez/2026, *"Registrar como pendente
> (Recomendado)"*.
> **Dossiê legal:** [`pesquisas-legais/simples-regime-caixa/relatorio.md`](../../pesquisas-legais/simples-regime-caixa/relatorio.md)
> (D01–D05, com hash).
> **Forks:** F-CX-1..7 e F-CX-2.1 ratificados no questionário do dono (chat, 2026-10-15); F-CX-2 (c) e F-CX-7 (a)
> contra a recomendação. **Base:** `origin/main` `8ba1ed8f`.

## 0. Fato novo que muda o nó: o caixa acaba em 31/12/2026

A Res. CGSN 190/2026 (DOU 10/08/2026, **efeitos em 01/01/2027**, art. 9º) dá ao art. 16 da Res. 140 a redação
"receita bruta total mensal **auferida**" e revoga o art. 16 § 1º, o art. 17 p.ú., o art. 18 § 1º, os arts. 19 e 20,
os arts. 77 e 78 e o art. 61 V (art. 8º IX–XII, XIX, XXII, XXIII) [D04]. A RFB confirma em notícia de 14/08/2026 [D05].
A LC 123 art. 18 § 3º não mudou [D01], mas a opção depende da forma "regulamentada pelo Comitê Gestor", que deixa de
existir.

**Consequência:** este incremento serve aos PAs **de 2026 e anteriores** (retificação incluída). As competências de
2026 ainda abertas são out, nov e dez. O PGDAS-D de dez/2026 vence em 20/01/2027 (art. 40). O nó já nasce com prazo
de validade. O perfil de 2027 em diante recusa CAIXA (item 2).

## 1. Fatos consumados

| Fato | Fonte | Grau |
|---|---|---|
| ME/EPP pode tributar a receita **recebida**, por opção irretratável no ano | LC 123 art. 18 § 3º (red. LC 155) [D01:710]; Res. 140 art. 16 caput e § 1º [D02] | V |
| O caixa vale só para a base mensal; RBT12, limites, sublimites e alíquota seguem por competência | Res. 140 art. 19 p.ú. [D02] | V |
| Art. 20 I (parcela não vencida até dez do ano seguinte ao da operação) e II a–c (encerramento, retorno à competência, exclusão) | Res. 140 art. 20 [D02] | V |
| Art. 20 IV: impedimento do art. 12 com o caixa mantido ⇒ a receita não recebida vai ao ICMS/ISS do mês anterior aos efeitos, recolhido direto ao ente | Res. 140 art. 20 IV [D02] | V |
| Registro de valores a receber: art. 77 I–VI, §§ 1º–6º; colunas do Anexo IX | [D02]; Anexo IX lido [D03] (PDF id 48460, sha `ddbae2fb68ef`) | V |
| Descumprir o art. 77 ⇒ caixa desconsiderado de ofício e recalculado por competência com acréscimos | Res. 140 art. 78 [D02] | V |
| Devolução/cancelamento no caixa deduzem só o valor efetivamente devolvido | Res. 140 arts. 17 p.ú. e 18 § 1º [D02] | V |
| Adiantamento é reconhecido no faturamento/entrega/prestação, "ainda que no regime de caixa" | Res. 140 art. 2º §§ 8º–9º [D02] | V |
| Fim do caixa em 01/01/2027 | Res. CGSN 190/2026 arts. 1º, 8º e 9º [D04]; [D05] | V |
| Perfil: `simplesRegimeApuracao` `COMPETENCIA`/`CAIXA` (default COMPETENCIA), **por ano**, sem trava de ano | `dtos/CompanyFiscalProfileDto.ts:71,127`; `schema.prisma:1674` | V |
| O campo só é lido em um ponto: o alerta `NFSE_DIVERGE_RECEITA` vira INFO/`REGIME_CAIXA`. **A base do DAS de quem está no CAIXA continua por competência e o DAS pode ser registrado** (bloqueantes = só `TIEOUT_DIVERGENTE`, `RBT12_INCOMPLETO`, `ATIVIDADE_SEM_ANEXO`) | `SimplesApuracaoService.ts:61,429,697` | V |
| A receita mensal do Simples vem de `ReceitaFiscalLinha` (gravada no `sale.finalized`, por competência do dia da venda) menos a cota do parceiro; o histórico pré-adoção cobre os meses sem subrazão | `SimplesApuracaoService.ts:277-297`; `schema.prisma:2791` | V |
| A venda do salão tem **um único pagamento integral**: `sale.settled` (D conta do meio / C 1.1.2 A Receber), `occurredAt` = `paidAt` da venda; meio ∈ Cash, Pix, Debit Card, Credit Card, Package Balance | `sync/mappers/SaleSettledMapper.ts:8-45`; `AccountingSyncPort.ts:247-270` | V |
| Cartão debita 1.1.2.02 (A Receber Cartão/Adquirente) pelo bruto. **Não existe fluxo de crédito da adquirente** (grep "adquirente/acquirer" sem baixa de 1.1.2.02) | `SaleSettledMapper.ts:40-41`; `ChartOfAccountsFixture.ts:37` | V |
| Package Balance consome o passivo 2.1.1 (adiantamento recebido antes) | `SaleSettledMapper.ts:43` | V |
| Perfil tem `encerramentoAtividadeEm`; **não tem** data de exclusão do Simples | `CompanyFiscalProfileDto.ts:107`; grep "exclus" vazio | V |
| `Receivable`/`ReceivableReceipt` (AR manual + ponte do CRM) **não** entram no subrazão do Simples | grep "Receivable" vazio em `ReceitaFiscalService.ts`/`SimplesApuracaoService.ts` | V |

## 2. Checklist

### PR-1 — fonte do recebimento + trava de ano (migração)

1. **Tabela `ReceitaFiscalRecebimento`** (Prisma first-class: imposto desenhado pela lei, liga razão e apuração;
   Contrato §2.1). Uma linha por recebimento de venda: `saleId`, `dia` (date-only do recebimento), `competenciaCaixa`
   (YYYY-MM do `dia`), `valorCents`, `meio`, `origem` (`SALE_SETTLED` | `PACKAGE_BALANCE`), `status` (`ACTIVE` |
   `REVERTED`), `@@unique([userId, unitId, saleId, origem])`. Fonte: F-CX-1. Teste: venda paga em Pix ⇒ 1 linha com
   o dia do `paidAt`; reprocessar não duplica.
2. **Trava de ano no perfil:** `simplesRegimeApuracao = 'CAIXA'` com `ano >= 2027` ⇒ 400 citando a Res. CGSN 190/2026
   arts. 1º (art. 16 caput) e 8º IX/XII. Teste: 2026 CAIXA = 200; 2027 CAIXA = 400; 2027 COMPETENCIA = 200.
3. **Gravação no seam de liquidação:** o `SaleSettlementBridge` (post-commit, best-effort como hoje) grava o
   recebimento depois do `sale.settled`. **Não** entra em `DynamicTableService`/`RulePlugin` (§2.1). Teste: falha da
   gravação não desfaz o pagamento; o reconcile refaz.
4. **Backfill/reconcile:** um passo idempotente lê os lançamentos `sale.settled` do escopo (data = `entryDate`, meio
   do evento) e cria as linhas que faltam. Roda no reconcile existente e sob demanda antes da apuração CAIXA. Teste:
   venda paga antes do PR ⇒ a linha aparece depois do reconcile, com o dia original.
5. **Estorno:** cancelar a venda paga (reversal do `sale.settled`) ⇒ a linha vira `REVERTED`. Devolução ⇒ F-CX-4.
6. **Package Balance:** o consumo de pacote grava recebimento `PACKAGE_BALANCE` no dia da prestação (art. 2º § 9º:
   adiantamento reconhecido na prestação, "ainda que no regime de caixa"). A venda do pacote em si **não** é
   recebimento-base. Teste: pacote vendido em set, consumido em nov ⇒ base de nov.
7. **Exclusão do Simples (F-CX-3 a):** campo `simplesExclusaoEfeitosEm` (date-only, nullable) no perfil do ano,
   só no regime SIMPLES. Teste: 400 em outro regime; o campo aparece no evento de auditoria do perfil.
7a. **Prazo do cartão (F-CX-2 c + F-CX-2.1 a):** campos `simplesCaixaPrazoCartaoDebitoDias` e
   `simplesCaixaPrazoCartaoCreditoDias` (int 0..365, nullable) no perfil do ano. Com `simplesRegimeApuracao = CAIXA`,
   os dois são obrigatórios (400 sem eles). Com COMPETENCIA, ficam null (400 se vierem preenchidos). O recebimento de
   venda em cartão grava `dia = paidAt + N` do meio. Teste: crédito D+30 com venda em 15/11 ⇒ recebimento em 15/12;
   perfil CAIXA sem prazo ⇒ 400.

### PR-2 — base caixa na apuração ME/EPP

8. **Troca da base só no CAIXA:** em `montar`, quando `perfil(ano).simplesRegimeApuracao === 'CAIXA'`:
   `receitaPaCents` e as `parcelas` das atividades vêm dos recebimentos `ACTIVE` com `competenciaCaixa = PA`, e a
   natureza/`cTribNac`/segregação vêm das `ReceitaFiscalLinha` da mesma venda (pagamento integral ⇒ a composição da
   venda vale inteira). Cota do parceiro: o recebimento é da venda bruta, e a cota sai na mesma proporção da linha.
   **O mapa `receitas` (RBT12, limites, sublimites, faixa) continua por competência** (art. 19 p.ú.). Teste: venda
   de R$ 1.000 em out, paga em nov ⇒ base out = 0, base nov = 1.000; RBT12 de dez conta a venda em out.
9. **Art. 20 I (venda a prazo não recebida):** venda finalizada no ano Y e não recebida até dez/Y+1 entra na base de
   dez/Y+1 pelo saldo. Teste: venda de mar/2025 não paga ⇒ base de dez/2026.
10. **Art. 20 II a (encerramento):** `encerramentoAtividadeEm` no PA ⇒ toda receita auferida e não recebida entra na
    base desse PA. Teste com encerramento em nov/2026.
11. **Art. 20 II b (volta à competência):** perfil(Y) = CAIXA e perfil(Y+1) = COMPETENCIA, com **Y ≤ 2025** ⇒ o não
    recebido entra em dez/Y. **Y = 2026 (fim do caixa pela Res. 190) é a ambiguidade A1** e fica em §5, sem
    comportamento decidido.
12. **Art. 20 II c (exclusão):** com a data de efeitos da exclusão (F-CX-3), o não recebido entra no mês anterior.
13. **Art. 20 IV (impedimento com o caixa mantido; F-CX-7 a):** quando o impedimento do art. 12 produz efeitos (o
    `sublimiteExcedido` que `limites()` já calcula, com a data de efeito do § 1º), a receita auferida e não recebida
    até o mês anterior aos efeitos sai num bloco **fora do DAS**: `impedimentoCaixa = { mesBase, receitaNaoRecebidaCents,
    icmsCents, issCents }`. ICMS e ISS = receita × percentual efetivo do tributo na faixa do PA (art. 21 III; teto do
    ISS de 5% no art. 21 III a; arts. 22–24), pela mesma `apurar` com `sublimiteExcedido = false`. Alerta WARNING
    `IMPEDIMENTO_CAIXA_ICMS_ISS`: "recolher direto ao ente, na forma por ele estabelecida (art. 20 IV)". O valor
    **não** entra no total do DAS. Teste: EPP no CAIXA, sublimite excedido em > 20% em out ⇒ bloco no PA de out com
    ICMS/ISS da faixa; o total do DAS não muda.
14. **Devolução e cancelamento no caixa:** venda não paga e cancelada ⇒ nada a deduzir (nunca entrou na base). Venda
    paga e estornada ⇒ deduz o valor recebido no mês do estorno (arts. 17 p.ú. e 18 § 1º). As linhas negativas
    `CANCELAMENTO`/`DEVOLUCAO` da competência não entram na base caixa. Valor devolvido em devolução parcial: F-CX-4.
15. **Saída:** `ApuracaoSimples` ganha `regimeApuracao: 'COMPETENCIA' | 'CAIXA'` e, só no CAIXA,
    `baseCaixa: { recebidoPaCents, art20Cents: { parcelaVencida, encerramento, retornoCompetencia, exclusao },
    receitaAuferidaPaCents }`. O espelho do PGDAS-D usa a base caixa. Snapshot de shape atualizado (só os schemas
    novos; memória do UPDATE do snapshot no Windows).
16. **DAS já registrado por competência:** o `divergenciaCents` existente passa a comparar com a base caixa. Um alerta
    novo `REGIME_CAIXA_RECALCULO` (WARNING, não bloqueante) avisa quando o DAS oficial de um PA CAIXA foi registrado
    antes deste PR. Teste com DAS registrado e PA recalculado.
17. **Conferência NFS-e (F-CX-6 a):** no CAIXA, `conferirNfse` compara com a receita **auferida** do PA (a mesma da
    competência), e o ramo INFO/`REGIME_CAIXA` deixa de disparar. Atualiza o teste
    `simplesPr4Forks81012.integration.test.ts:102`, que hoje espera o INFO: a divergência real vira WARNING como na
    competência. `REGIME_CAIXA` continua no enum (compatibilidade do snapshot) sem emissor; a execução registra isso.
18. **Cartão (F-CX-2 c):** o dia do recebimento é `paidAt + N` do perfil (item 7a). Enquanto A2 (§5) não for
    respondida, toda apuração CAIXA com venda em cartão no PA traz o alerta INFO `CARTAO_RECEBIMENTO_ESTIMADO`
    ("prazo D+N informado no perfil; confira com os extratos da administradora — art. 77 § 3º").

### PR-3 — registro de valores a receber (Anexo IX) e incobráveis

19. **GET `/api/accounting/simples/registro-valores-a-receber?unitId&ano`** (Route → Controller → Service →
    Repository, Policy de leitura do Simples). Uma linha por venda finalizada no ano com saldo em algum momento,
    com as colunas do Anexo IX [D03]. Vendas em cartão vêm marcadas `dispensadaCartao: true` (art. 77 § 3º). Só para
    ano ≤ 2026 (400 depois). openapi + guard de path-count.
20. **Incobráveis (F-CX-5 a; art. 77 VI, §§ 5º–6º):** tabela `SimplesCreditoIncobravel` (venda, valor ≤ saldo,
    `meioCobranca` ∈ NOTIFICACAO_EXTRAJUDICIAL | PROTESTO | COBRANCA_JUDICIAL | CADASTRO_PROTECAO_CREDITO, data,
    referência da evidência) com POST e DELETE (soft-delete), eventos `tax.simples_incobravel.registrado`/`.removido`.
    Alimenta a coluna "valor considerado incobrável". **Não** tira a venda da base do art. 20 I. Teste: incobrável
    maior que o saldo ⇒ 400; venda incobrável de 2025 ainda entra na base de dez/2026.
21. **Auditoria:** todo eventType novo (do item 20, se houver) entra na allowlist do `auditCanonical.ts` no mesmo PR.

## 3. Contratos (esboço)

```ts
// PR-1 — persistência (Prisma)
model ReceitaFiscalRecebimento {
  id String @id @default(cuid())
  userId String; user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId String
  saleId String
  dia String              // YYYY-MM-DD do recebimento (paidAt; pacote = dia da prestação)
  competenciaCaixa String // YYYY-MM
  valorCents BigInt
  meio String             // Cash | Pix | Debit Card | Credit Card | Package Balance
  origem String           // SALE_SETTLED | PACKAGE_BALANCE
  status String @default("ACTIVE") // ACTIVE | REVERTED
  createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
  @@unique([userId, unitId, saleId, origem])
  @@index([userId, unitId, competenciaCaixa])
  @@map("receita_fiscal_recebimentos")
}

// PR-1 — perfil (superRefine no serviço, que conhece o ano)
// ano >= 2027 && simplesRegimeApuracao === 'CAIXA' ⇒ ValidationError (400)
// F-CX-3 (a): simplesExclusaoEfeitosEm: dateOnly.nullable().default(null)
// F-CX-2 (c) / 2.1 (a): simplesCaixaPrazoCartaoDebitoDias / simplesCaixaPrazoCartaoCreditoDias:
//   z.number().int().min(0).max(365).nullable().default(null) — obrigatórios com CAIXA, null com COMPETENCIA

// PR-3 — incobráveis (F-CX-5 a)
model SimplesCreditoIncobravel { id; userId; unitId; saleId; valorCents BigInt; meioCobranca String;
  data String; evidencia String; createdById String?; createdAt; deletedAt DateTime? }

// PR-2 — saída (acréscimo ao ApuracaoSimples)
const BaseCaixaSchema = z.object({
  recebidoPaCents: cents,
  receitaAuferidaPaCents: cents,          // conferência; RBT12 segue por competência
  art20Cents: z.object({
    parcelaVencida: cents,                 // art. 20 I
    encerramento: cents,                   // art. 20 II a
    retornoCompetencia: cents,             // art. 20 II b (Y ≤ 2025)
    exclusao: cents,                       // art. 20 II c
  }).strict(),
}).strict();
const ImpedimentoCaixaSchema = z.object({   // F-CX-7 (a) — fora do DAS
  mesBase: z.string().regex(/^\d{4}-\d{2}$/), receitaNaoRecebidaCents: cents, icmsCents: cents, issCents: cents,
}).strict();
// ApuracaoSimples += { regimeApuracao: z.enum(['COMPETENCIA','CAIXA']), baseCaixa: BaseCaixaSchema.nullable(),
//                      impedimentoCaixa: ImpedimentoCaixaSchema.nullable() }
// CODIGOS_ALERTA_SIMPLES += 'REGIME_CAIXA_RECALCULO', 'IMPEDIMENTO_CAIXA_ICMS_ISS'
// MOTIVOS_ALERTA_INFORMATIVO += 'CARTAO_RECEBIMENTO_ESTIMADO'

// PR-3 — Anexo IX
const RegistroValoresAReceberQuery = z.object({ unitId: z.string().min(1), ano: z.coerce.number().int().gte(2018).lte(2026) }).strict();
const LinhaAnexoIx = z.object({
  saleId: z.string(),
  dataOperacao: dateOnly,
  documentosFiscais: z.array(z.string()),  // art. 77 § 1º: registrados juntos
  valorTotalCents: cents,
  quantidadeParcelas: z.number().int().min(1),
  parcelas: z.array(z.object({
    numero: z.number().int().min(1), valorCents: cents, vencimento: dateOnly,
    dataRecebimento: dateOnly.nullable(), valorPagoCents: cents, saldoAReceberCents: cents,
    incobravelCents: cents,
  }).strict()),
  dispensadaCartao: z.boolean(),           // art. 77 § 3º
}).strict();
```

## 4. Forks — ratificados pelo dono no questionário (chat, 2026-10-15), sem "executa"

| # | Decisão | Caminhos | Recomendação | Ratificado |
|---|---|---|---|---|
| F-CX-1 | De onde vem o recebimento | (a) tabela própria gravada no seam de liquidação + reconcile; (b) a apuração lê direto os lançamentos `sale.settled` do razão | **(a)**: o registro do Anexo IX e o estorno precisam de estado por venda (`REVERTED`), e a apuração não deve depender de varrer o razão. (b) é menor, mas acopla a apuração ao `sourceType` e não guarda o pacote. | ✅ **(a)** |
| F-CX-2 | Dia do recebimento do cartão | (a) dia da venda (`paidAt`) + alerta INFO; (b) baixa manual do crédito da adquirente (frente nova: lote/extrato); (c) D+N configurável por meio | **(a)**: antecipa o tributo, nunca gera falta de recolhimento, e o sistema não tem o crédito da adquirente. (b) é a leitura mais fiel (A2), mas abre uma frente de conciliação de cartão para 3 meses de vida útil. | ✅ **(c)**, **contra a recomendação** |
| F-CX-2.1 | Onde fica o D+N e o que acontece sem ele | (a) no perfil do ano: dias para débito e para crédito; com CAIXA e sem os prazos, salvar o perfil dá 400; (b) no perfil, com padrão D+1/D+30 | **(a)**: sem valor padrão escondido | ✅ **(a)** |
| F-CX-3 | Exclusão do Simples (art. 20 II c) | (a) campo `simplesExclusaoEfeitosEm` no perfil; (b) fora, com alerta | **(a)**: um campo date-only, e sem ele o gatilho II c não tem dado. | ✅ **(a)** |
| F-CX-4 | Valor devolvido na devolução de venda paga | (a) o valor da devolução (`SaleReturnedMapper`) = valor devolvido; (b) campo novo de reembolso efetivo | **(a)**: a devolução já tem o valor; o campo novo só importa se houver devolução sem reembolso, caso que o salão não registra hoje. A execução confere no `SaleReturnedMapper` se a devolução de venda paga credita caixa ou A Receber. | ✅ **(a)** |
| F-CX-5 | Créditos incobráveis (art. 77 VI) | (a) tabela própria (venda, valor, meio de cobrança do art. 77 § 6º, data, evidência) + evento de auditoria; (b) coluna sempre 0 + alerta | **(a)**: o Anexo IX tem a coluna, o § 5º exige prova da cobrança, e o dono quer completude. Incobrável **não** tira da base do art. 20 I (a lei não exclui). | ✅ **(a)** |
| F-CX-6 | Conferência NFS-e no caixa | (a) comparar a NFS-e com a receita **auferida** também no caixa, e o INFO `REGIME_CAIXA` deixa de disparar; (b) manter o INFO de D-2026-10-10-X14-ALERTA-INFORMATIVO | **(a)**: com a receita auferida disponível ao lado da base caixa, a divergência real reaparece. Mexe numa decisão ratificada, por isso é fork. | ✅ **(a)**: substitui o item do REGIME_CAIXA de D-2026-10-10-X14-ALERTA-INFORMATIVO |
| F-CX-7 | Art. 20 IV (impedimento do art. 12 com o caixa mantido) | (a) calcular o ICMS/ISS fora do DAS (percentuais efetivos, arts. 21–24); (b) alerta WARNING com o valor da receita não recebida, sem calcular o tributo do ente | **(b)**: o recolhimento é "na forma estabelecida" por cada ente; calcular aqui é legislação estadual/municipal fora do Simples. | ✅ **(a)**, **contra a recomendação** |

## 5. Pendente de validação externa

- **A1 — transição 2026 → 2027** (dono, 15/10: *"Registrar como pendente"*). A Res. 190 não tem regra de transição.
  A leitura mais segura: a receita de 2026 auferida e não recebida entra na base de **dez/2026** (art. 20 II b). Sem
  isso, nunca seria tributada. **Pergunta ao contador:** "Empresa no caixa em 2026 com receita auferida e não
  recebida até 31/12/2026: com a revogação do art. 20 pela Res. CGSN 190, essa receita entra no PGDAS-D de dez/2026
  como retorno ao regime de competência (art. 20 II b), ou o PGDAS-D trata de outro modo?" O item 11 fica parado para
  Y = 2026 até a resposta, e o PA de dez/2026 vence em 20/01/2027.
- **A2 — dia do recebimento no cartão.** O art. 77 § 3º sugere o crédito da administradora, mas não diz. **Pergunta
  ao contador:** "No caixa do Simples, venda no cartão de crédito parcelado ou de débito entra na base no mês da
  venda ou no mês do crédito da administradora?" O dono escolheu D+N (F-CX-2 c), que segue a leitura do crédito
  da administradora por estimativa; a resposta confirma ou derruba essa leitura.
- **A3 — transição competência → caixa** (dono, questionário, 2026-10-16: *"Só vendas de ano no caixa"*;
  [D-2026-10-16-X14-CAIXA-LACUNAS](../plano/decisoes/D-2026-10-16-X14-CAIXA-LACUNAS.md)). A Res. CGSN 140 arts. 16–20
  (redação vigente) e o Manual do PGDAS-D de 17/06/2025 (§5.1) não tratam da entrada no caixa. O PR-2 tira da base
  caixa (e do art. 20) as vendas auferidas em ano por competência e mostra o valor no alerta INFO
  `RECEBIMENTO_DE_VENDA_TRIBUTADA_POR_COMPETENCIA`. **Pergunta ao contador:** "Empresa no regime de competência em
  2025 que optou pelo caixa em 2026: o recebimento em 2026 de venda auferida (e já tributada) em 2025 entra na receita
  recebida do PGDAS-D de 2026?"
- **F-CX-7 (a) e o "percentual efetivo":** a redação revogada do art. 20 IV falava em "percentuais efetivos máximos"; a
  vigente (Res. CGSN 142/2018) remete aos arts. 21 a 24. O item 13 usa o percentual efetivo da faixa do PA (leitura
  direta dos arts. 21–24, grau I). O recolhimento segue "a forma estabelecida" por cada ente, então o valor calculado
  é referência, não guia.
- **Oráculo:** o runbook X14-DAS (D3 de D-2026-10-10) precisa de um caso CAIXA no PGDAS-D real.

## 6. Insumos ausentes

- Manual do PGDAS-D: como as telas pedem a receita recebida × a auferida no caixa (não lido).
- Res. CGSN 194/2026: texto integral não lido; pela ementa, só prazos de opção para 2027.
- Fluxo de crédito da adquirente: não existe no código (ver F-CX-2).

## 7. Achados fora de escopo

1. **Receita do AR fora do Simples:** `Receivable` (AR manual e ponte do CRM) credita conta de receita, mas não gera
   `ReceitaFiscalLinha`. Para qualquer regime, a receita do CRM/AR não entra na base do Simples (grau I: grep, sem
   teste). Precisa de nó próprio.
2. **O DAS de 2026 já está errado hoje para quem está no CAIXA:** até este PR-2 entrar, a apuração calcula por
   competência e permite registrar o DAS sem alerta bloqueante. Um alerta WARNING imediato seria uma correção de 1
   linha, mas fica fora daqui (`sessao-instrumentacao` → `sessao-correcao`, se o dono quiser).
3. **Sha do Planalto:** a LC 123 baixada hoje tem sha `316d1f9c07ff`, igual ao "sha anterior" do MANIFEST, e o atual
   registrado é `07ee7d3adc22`. O Planalto alterna entre versões; nenhum trecho daqui depende disso.

## 8. Divisão e ordem

PR-1 (migração + trava + seam + reconcile) → PR-2 (base caixa, art. 20, alertas) → PR-3 (Anexo IX + incobráveis).
O FE (emenda do [FE-INCR-SIMPLES](FE-INCR-SIMPLES-brief.md)) vem depois do PR-2. Cada PR precisa de `executa` próprio.
Prazo prático: o PR-2 precisa estar em `main` antes de 20/11/2026 (PGDAS-D de out/2026) para servir às competências
ainda abertas.
