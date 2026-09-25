# Plano pós-resposta do contador — 2026-09-23

> Pedido do dono (23/09): *"Planeje na ordem com granularidade"*. Insumo:
> `TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`.
>
> **Este plano ordena o trabalho; ele não autoriza nada (ORCH-006).** Cada passo diz a sessão que o executa e a
> autorização que ainda falta. Os forks estão **PENDENTES**, com recomendação, e nenhum foi ratificado.

## Ordem e porquê

| Fase | O quê | Por que nesta posição |
|---|---|---|
| **0** | Verificações baratas + follow-up ao contador | Sem código e sem risco. Destrava o dimensionamento das fases 1, 3 e 4, e a pergunta volta ao contador enquanto o resto anda |
| **1** | Bugs de PIS/COFINS (C-1, C-3, IPI, C-2) | São erros **medidos** que afetam dinheiro do cliente (crédito calculado errado). O contador já deu a posição. Diff pequeno, no trilho instrumentação → correção |
| **2** | Assinatura XML da NF-e | É lacuna de segurança/integridade: produção aceita XML sem assinatura válida. Barato de instrumentar; a correção pede decisão |
| **3** | BRIEFs de domínio: destinação por item, benfeitoria + R$1.200, encargos/descontos, pacote do contador | São requisitos novos sem spec. Precisam de BRIEF com forks antes de código |
| **4** | ADR do X7 (apuração de tributos) | Já está autorizado como "só ADR" (F-M2). Depende da Fase 0 (V4) e de um fork sobre o F-M8 |
| **5** | BRIEF de governança do contador (item 0) | É o maior e o mais de produto. Não bloqueia o H1 (1ª passada com declarante fictício, G-2) |
| **6** | Registros sem código | Mantêm o vault fiel à resposta. Podem ir junto com qualquer fold |

As Fases 0 e 1 podem rodar em paralelo. O C8 PR-4 (#368) segue independente.

---

## Fase 0 — Verificações e follow-up (agente; autorizada por este pedido de planejamento, sem código)

| # | Passo | Saída | Critério de pronto |
|---|---|---|---|
| 0.1 | ✅ **V1** ST no custo: `nfeCost.ts:48,64` soma `vST` ao custo bruto | confirma o 2a/7a | feito 23/09 (verificado) |
| 0.2 | ✅ **V2** Assinatura: nenhum `Signature`/xmldsig no parser em `server/src` | vira a Fase 2 | feito 23/09 (verificado por grep; confirmar lendo `lib/nfe.ts` no 2.1) |
| 0.3 | ✅ **V3** Limite de R$1.200 no C8: inexistente | vira o passo 3.2 | feito 23/09 (verificado por grep) |
| 0.4 | **V4** DIRF extinta? DCTFWeb absorveu IRPJ/CSLL/PIS/COFINS em 2025? GIA-SP/SAT? — nas fontes oficiais (corpus ou gov.br) | nota com fonte + data de cada um | 3 respostas com link oficial; o que não achar fica "não verificado" |
| 0.5 | **V5** Art. 10 da LC 214 (pagamento antecipado × pacote pré-pago) — texto da lei no corpus | trecho + leitura | trecho transcrito, com a leitura rotulada como inferida |
| 0.6 | **V6** Base do crédito de PIS/COFINS hoje inclui IPI? Ler `nfeCost.ts` (base do crédito, não do custo) | confirma ou vira caso do 1.4 | linha exata citada |
| 0.7 | **V7** Pacote pré-pago lança em passivo (adiantamento de cliente)? Localizar o fluxo no código | confirma ou vira achado | arquivo:linha |
| 0.8 | **Follow-up ao contador** (skill `luminaris-contador-liaison`, rascunho; **o dono envia**): (a) 13c reformulado — o M010 é aberto pela empresa **com** `COD_PB_RFB` da tabela PARTEB_PADRAO; qual dos 1071/2210/3130 ele usa; (b) códigos do referencial para juros/multa/descontos e imobilizado; (c) dados do declarante/signatários (D8); (d) `cClassTrib` dos serviços 6.01/6.02; (e) se ele aceita a leitura "monofásico como insumo dá crédito" sem solução de consulta (P4) | `PEDIDO-CONTADOR-2026-09-23-followup.md` | texto curto + critério de aceite interno por item |

## Fase 1 — PIS/COFINS (cadeia instrumentação → correção)

**Autorização que falta:** "instrumenta a Fase 1" e depois "corrige a Fase 1" (ou as duas juntas).

> **2026-09-25 — 1.1–1.6 instrumentados (PR #379, `f8029916`)**, autorização do dono 25/09. V6 (0.6) confirmou IPI na base via flag (`nfeCost.ts:130`) → 1.4 existe. 4 `it.failing` (GAP-MAP 10–13). **C-2 só a metade bebidas:** combustíveis BLOQUEADO — a Lei 9.718 art. 4º nomeia produtos, sem NCM (`fontes-oficiais/TRANSCRICAO-monofasico-bebidas-combustiveis-2026-09-25.md` §B). **Achado para 1.8:** Lei 13.097 art. 29 veda crédito só na revenda do varejista (art. 28/17); não-varejista credita pelo valor da nota (art. 30) — regra que o modelo não tem. Falta: "corrige a Fase 1" + F-PC-1/F-PC-2.

| # | Passo | Sessão | Arquivo | Critério |
|---|---|---|---|---|
| 1.1 | Registrar 4 lacunas no GAP-MAP (C-1, C-3, IPI-base se o V6 confirmar, C-2) | instrumentação | `docs/operating-manual/GAP-MAP.md` | 4 linhas com comando que prova |
| 1.2 | Teste-guarda **C-1**: NCM fora da lista + CST 04 → hoje `MONOFASICO`; esperado `TRIBUTADO` + alerta de CST divergente | instrumentação | `models/__tests__/pisCofinsMonofasicoNcm.test.ts` | `it.failing` vermelho pelo motivo certo |
| 1.3 | Teste-guarda **C-3**: NCM comum + CST 02 → hoje `UNKNOWN`/sem crédito; esperado crédito 1,65% + 7,6% sobre base sem ICMS e sem IPI, com alerta | instrumentação | idem + `lib/__tests__/nfeCost.test.ts` | idem |
| 1.4 | Teste-guarda **IPI** (só se o V6 mostrar IPI na base): vIPI > 0 → base do crédito sem IPI | instrumentação | `nfeCost.test.ts` | idem |
| 1.5 | **Transcrição** das Leis 13.097/2015 (bebidas frias) e da legislação de combustíveis, pela redação **vigente** e versão compilada, com chave = ordinal da fonte (memória `tabela-transcrita-de-lei`) | planejamento/insumo | corpus `fontes-oficiais/` + MANIFEST | sha da fonte registrado |
| 1.6 | Teste-guarda **C-2**: um NCM de bebida fria e um de combustível → hoje `TRIBUTADO`; esperado `MONOFASICO` | instrumentação | `pisCofinsMonofasicoNcm.test.ts` | `it.failing` vermelho |
| 1.7 | Correção C-1 + C-3 (+ IPI): NCM decide; CST divergente vira `warning`; CST 02 fora da lista credita pela alíquota básica | correção | `pisCofinsMonofasicoNcm.ts:115-137`, `nfeCost.ts` | 1.2/1.3/1.4 viram `it`; suíte X6 verde |
| 1.8 | Correção C-2: ampliar `PIS_COFINS_MONOFASICO_NCM` com a transcrição do 1.5 | correção | `pisCofinsMonofasicoNcm.ts` | 1.6 vira `it` |
| 1.9 | Review independente + CI Linux + merge; fold do X6 (emenda) e do GAP-MAP | integração | — | PASS + CI verde |

**Forks pendentes da Fase 1:**
- **F-PC-1** — Crédito de compra de fornecedor do Simples (`nfeCost.ts:111`, hoje zerado por default conservador). O contador toma o crédito integral (ADI 15/2007). (a) O default passa a ser "credita", configurável por cliente. (b) O default continua "não credita", e o cliente liga com a aprovação do contador. **Recomendação: (b)** — casa com o item 0, em que política é aprovada pelo contador, e não muda o comportamento de quem já usa.
- **F-PC-2** — O alerta de CST divergente aparece: (a) só no retorno da importação (`warnings`), ou (b) também persistido para a revisão do contador (C11). **Recomendação: (a) agora, (b) quando a Fase 5 existir.**

## Fase 2 — Assinatura XML da NF-e

**Autorização que falta:** "instrumenta a assinatura" e depois a decisão do fork.

| # | Passo | Sessão | Critério |
|---|---|---|---|
| 2.1 | Confirmar lendo `lib/nfe.ts` + `NfeImportService` que nenhuma assinatura é verificada | instrumentação | arquivo:linha |
| 2.2 | GAP-MAP + teste-guarda: XML com `<Signature>` adulterada (valor alterado após assinar) → hoje importa; esperado 400 | instrumentação | `it.failing` vermelho |
| 2.3 | BRIEF curto: verificação XMLDSig (lib já instalada? — checar antes de propor dependência nova) + modo fixture explícito, só em teste (como o contador sugeriu) | planejamento | BRIEF com forks |
| 2.4 | Implementação pelo BRIEF | feature | 2.2 vira `it` |

**Fork pendente:**
- **F-SIG-1** — (a) Verificar a assinatura em toda importação de NF-e. (b) Só avisar. **Recomendação: (a).** Contabilizar a partir de XML adulterado é o risco que o gate existe para impedir. Custo: as fixtures sintéticas atuais passam a precisar do modo fixture até o E9 trazer XML real.

## Fase 3 — BRIEFs de domínio (sessao-planejamento; sem código)

**Autorização que falta:** "planeja a Fase 3" (produz BRIEFs; forks ficam pendentes).

| # | BRIEF | Conteúdo mínimo | Depende de |
|---|---|---|---|
| 3.1 | **BE-INCR-ITEM-DESTINATION** — destinação por item na entrada (revenda × insumo do serviço) | efeito em estoque, X6 (crédito), ICMS uso e consumo; default por produto + override por item; migração | resposta do 0.8(e); ADR se mudar o modelo de Product |
| 3.2 | **Emenda C8** — benfeitoria em imóvel de terceiro (amortização pelo min(contrato, vida útil)) + bem até R$1.200 direto na despesa | campo `leaseEndDate`/prazo na classe; regra do limite (valor por item ou por nota?) | C8 PR-4 mergeado |
| 3.3 | **Emenda F7/X4** — multa de mora × multa punitiva (indedutível → adição no e-Lalur); desconto condicional × incondicional; receita financeira 0,65% + 4% | contas por tipo; vínculo com adição automática no X4 | códigos do referencial (0.8b) |
| 3.4 | **Emenda C6b / FE-INCR-DELIVERY** — memória de cálculo, créditos por nota e item, aging conciliado, ficha do imobilizado, inventário, conciliação apurado × contabilizado × pago; XLSX | quais relatórios já existem × faltam; XLSX (dependência nova?) | X7 para a memória de IRPJ/CSLL |

## Fase 4 — ADR do X7 (apuração de tributos)

**Autorização existente:** F-M2 (03/09) — **só ADR**. Nada de código.

| # | Passo | Critério |
|---|---|---|
| 4.1 | Insumos: tabela de obrigações do contador + V4 | V4 fechado |
| 4.2 | `ADR-INCR-TAX-ASSESSMENT` (Proposed): IRPJ/CSLL por estimativa mensal **e** trimestral por cliente; PIS/COFINS mensal; ISS; relação com DCTFWeb (X9) e EFD-Contribuições (X8); crédito de aluguel/energia (P8) | ADR com forks pendentes |

**Fork pendente:**
- **F-X7-1** — O F-M8 (03/09) fixou **trimestral**; o contador prefere **estimativa mensal com balancete de suspensão/redução** e pede as duas por cliente. (a) Reabrir o F-M8: as duas, escolhidas por cliente. (b) Manter só o trimestral no MVP. **Recomendação: (a).** A estimativa mensal é o caso comum de salão pequeno com resultado instável, e o ADR só desenha, sem custo de código agora.

## Fase 5 — Governança do contador (item 0)

**Autorização que falta:** "planeja a governança" (BRIEF).

| # | Passo | Critério |
|---|---|---|
| 5.1 | Inventário do que já existe: imutabilidade/estorno (ACC-*), trava de período (quem reabre hoje?), `SourceDocument` por lançamento, papéis/RBAC | tabela existe × falta, com arquivo:linha |
| 5.2 | BRIEF **BE-INCR-ACCOUNTANT-GOVERNANCE**: papel "contador responsável" com CRC; parâmetros de política versionados com aprovação; reabertura de período só pelo contador; bloqueio de alteração pelo operador do fornecedor; login do contador (C11) | BRIEF com forks |

**Fork pendente:**
- **F-GOV-1** — Consulta formal ao CRC-SP sobre a linha software × serviço contábil. **Decisão sua, fora do código.** Recomendação: fazer antes de vender "com contador incluso".

## Fase 6 — Registros sem código (vão em qualquer fold)

- **Z0-a**: pergunta respondida ("assina sob condições") → fold com ponteiro para a triagem.
- **M5-ibs-cbs**: DeRE fora (salão); controle extracontábil de IBS/CBS para conciliação.
- **X10a/D5**: NFC-e 65 para venda no balcão entra no critério do parceiro emissor.
- **X10i/D7**:
  - NFS-e do Simples obrigatória em 01/11/2026 (sem modo facultativo);
  - NBS obrigatório;
  - NF-e antecipada para 01/12/2026 para não contribuinte de ICMS;
  - gate que bloqueia o fechamento do mês com prestação sem nota.
- **D1f**: item LC 116 recebido (6.01/6.02/6.03; ISS no prestador). Faltam a alíquota (município) e o `cClassTrib`.

## Autorizações que destravam tudo, em uma linha cada

1. "Executa a Fase 0" (verificações V4–V7 + rascunho do follow-up ao contador).
2. "Instrumenta e corrige a Fase 1" + respostas a F-PC-1/F-PC-2.
3. "Instrumenta a assinatura" + F-SIG-1.
4. "Planeja a Fase 3".
5. "Abre o ADR do X7" + F-X7-1.
6. "Planeja a governança" (+ F-GOV-1 é seu, fora do código).
