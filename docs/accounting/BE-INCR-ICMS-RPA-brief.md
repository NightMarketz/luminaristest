# BE-INCR-ICMS-RPA — BRIEF (nó ICMS-EFD): ICMS próprio e ICMS-ST da revenda no regime periódico de apuração (RPA), SP primeiro

- **Data:** 2026-11-21 · **Sessão:** `sessao-planejamento` (agente) · **Base:** `origin/main` = `43719baaf`
- **Status:** BRIEF escrito. Forks F-ICR-1..10 **RATIFICADOS pelo dono no questionário de 21/11**
  ([[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]]): nove na recomendação e **F-ICR-4 → (b), contra a recomendação**
  (débito lançado nota a nota). O item 23 foi reescrito para o (b). **Sem código, sem "executa".**
- **Dossiê legal:** [`pesquisas-legais/icms-revenda-regime-normal-sp/relatorio.md`](../../pesquisas-legais/icms-revenda-regime-normal-sp/relatorio.md)
  (D01–D30; as referências `[Dnn]` abaixo são desse dossiê).
- **PRE-ADR de origem:** [`PRE-ADR-ICMS-IPI-EFD.md`](PRE-ADR-ICMS-IPI-EFD.md) (10/10; F-ICMS-0..14 ratificados em lote
  em 12/10, [[D-2026-10-12-QUESTIONARIO-DONO]]). **Este BRIEF não reescreve o PRE-ADR.** A §1 diz, fork a fork, o que
  segue valendo, o que a decisão de 21/11 superou e o que volta a ser pergunta.

## TLDR (2 linhas)

O ICMS do regime normal não existe no código. A NF-e/NFC-e CRT 3 está **recusada de propósito** à espera deste nó
(`nfeIbsCbsMontagem.ts:13-19`, `CRT3_ICMS_SEM_SPEC`). O livro fiscal por item do F-ICMS-13 nunca nasceu: o parser da NF-e
não lê CST, base nem alíquota. Por isso o nó começa por dado, livro e montagem, e só depois apura.
**Risco principal:** o saldo credor só vale se estiver "regularmente apurado na escrituração fiscal" (LC 227 art. 132,
II [D29]), e em SP a declaração do RPA é a EFD ([D27] arts. 253–254; GIA dispensada desde 2026). Sem a EFD, a apuração
deste nó é conta certa sem efeito legal (F-ICR-10).

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `ICMS-EFD` ([[ICMS-EFD]], nasce nesta sessão pelo F-ICMS-1 (a)). Escopo do pedido: apuração
  de ICMS próprio e ICMS-ST da revenda de mercadoria fora do Simples, começando por SP.
- **Autorização:** dono, 2026-11-21, chat: *"Executa tudo pra liberar e poder rodar em xhigh até terminar"*. No
  questionário do mesmo dia, à pergunta *"Fork do ICMS: … Isso entra no escopo do go-live de 2027?"*, a resposta foi
  *"Entra, planejar já"*. A citação veio pela sessão que abriu este cartão (o handoff de 21/11 não é versionado), e o
  dono confirma ao iniciar o cartão. Ela está gravada em [[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]].
- **Divergências do passo 1** (registradas; nenhuma bloqueia, porque a autorização cobre o planejamento):
  1. **O F-ICMS-0 (c) "adiar com gatilho" foi superado.** O gatilho g3 do PRE-ADR (*"o dono contrata vertical de
     comércio/indústria contribuinte"*) disparou por decisão do dono (go-live de 2027). O §12 do PRE-ADR manda criar
     o nó `ICMS-EFD` com as arestas X10a, X14 e C8, e é o que esta sessão faz.
  2. **O pedido pede ST de substituto, e o F-ICMS-3 ratificado diz "(b) só substituído; (a) só com tenant
     substituto".** O ponto foi reaberto como F-ICR-5, e a ratificação de 12/10 vale até o dono responder.
  3. **O pedido pergunta se o nó absorve a EFD.** O F-ICMS-1 (a) ratificado já diz "um nó só, `ICMS-EFD`". A
     autorização de 21/11 cobre a apuração, não o gerador da EFD. O ponto foi reaberto como F-ICR-10, sem decidir.
  4. **O lugar do livro fiscal mudou.** O F-ICMS-13 (a) dizia que ele nasceria no PRE-ADR de IBS/CBS, mas o IBS/CBS
     foi feito sem ele (crédito por apropriação no título a pagar; grep `FiscalBook` em `server/` e no schema = 0). A
     decisão (a) segue valendo e o livro nasce aqui, no PR-1. Isso é consequência de execução, não fork.
- **Insumos lidos:** `docs/plano/README.md`; `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2.1 e §2.3;
  `docs/plano/nos/{X6,X7,X10a,LEGAL-PARAMS,EFICIENCIA-FISCAL,IBS-CBS-2027}.md`; o PRE-ADR inteiro; o
  `BE-INCR-NFCE-brief.md` (itens 19–20); o `BE-INCR-CICLO-FISCAL-brief.md` do PR #1322 (não mergeado); e o código
  listado na §2.
- **Nós vizinhos:** consome [[X10a]] (montagem NF-e/NFC-e, `ProductFiscalProfile`, `FiscalDocument`), [[X6]] (crédito
  do ICMS na entrada, `nfeCost.ts`), [[LEGAL-PARAMS]] (tabelas com vigência), [[IBS-CBS-2027]] (molde da apuração
  mensal), [[X14]] (sublimite), [[C8]] (imobilizado para o CIAP) e [[FIN-10]] (estoque, estorno por perda). É
  consumido pelo CICLO-FISCAL (PR #1322) (o vencimento entra no calendário, aresta pontilhada até o #1322 mergear), pela
  simulação (`taxSimulation.ts:368`, item do montador único) e pela EFD ICMS/IPI (lacuna `L-20261121-183239-3b81`).

## 1. O que vale do PRE-ADR (12/10) depois de 21/11

| Fork do PRE-ADR | Ratificado em 12/10 | Situação neste BRIEF |
|---|---|---|
| F-ICMS-0 estratégia | (c) adiar com gatilho + fundação | **Superado** por "Entra, planejar já" (g3). O nó nasce agora |
| F-ICMS-1 id e lugar | (a) nó único `ICMS-EFD`; documento em `docs/adr/` no fold | Id mantido. O PRE-ADR continua em `docs/accounting/` (mover é fold, não desta sessão). Absorver a EFD volta como **F-ICR-10** |
| F-ICMS-2 UFs | (a) SP primeiro, UF como dado; interestadual nacional | **Mantido** (itens 2–3) |
| F-ICMS-3 ST | (b) só substituído; substituto só com tenant substituto | **Reaberto: F-ICR-5** |
| F-ICMS-4 DIFAL | (b) só o de entrada; o de saída fica com o e-commerce | **Mantido.** Em SP, o DIFAL de entrada do RPA entra na própria apuração (RICMS/SP art. 117 [D15]); item 16 |
| F-ICMS-5 FCP | (a) linha na tabela de alíquota | **Mantido**, com a pergunta de lei L-ICMS-9 em aberto (§8) |
| F-ICMS-6 IPI | (b) só registrar a entrada | **Mantido** (fora deste BRIEF) |
| F-ICMS-7 Bloco H/K | (a) H do estoque, K fora | **Mantido.** É da EFD (F-ICR-10), não da apuração |
| F-ICMS-8 CIAP | (a) quando o gatilho disparar | **Mantido.** O gatilho disparou, e o CIAP vira o PR-7 |
| F-ICMS-9 GIA/DeSTDA | (b) fora em SP | **Mantido.** A GIA está dispensada no RPA de SP desde 2026 |
| F-ICMS-10 Simples fora do DAS | (a) restrita ao DIFAL "h"/antecipação "g" 2 | **Fora deste nó**, porque é Simples. Vai à caixa como lacuna (§10) |
| F-ICMS-11 fonte das tabelas | (a) `LegalParameter` | **Mantido** (itens 2–5) |
| F-ICMS-12 operação fiscal | (a) catálogo fechado em código → CFOP/CST | **Mantido** (item 11) |
| F-ICMS-13 livro fiscal | (a) `FiscalBookEntry/Item` | **Mantido; nasce aqui** (divergência 4) |
| F-ICMS-14 ordem com o IBS/CBS | (a) IBS/CBS primeiro | **Cumprido**: o IBS-CBS-2027 está `done` |

## 2. Fato consumado no código (lido nesta sessão)

| Fato | Evidência |
|---|---|
| Não há cálculo nem apuração de ICMS | grep `icms` em `server/src`: só o custo D3 (`lib/nfeCost.ts`), a segregação do DAS (`models/segregacaoNcm.ts`), a NF-e do Simples (`models/nfeMontagem.ts:156-160`, `ICMSSN102/500`) e o aviso da simulação (`models/taxSimulation.ts:368`) |
| NF-e CRT 3 recusada à espera deste nó | `nfeMontagem.ts:212` (`nfe_crt_nao_suportado`); `nfeIbsCbsMontagem.ts:13-19` (`CRT3_ICMS_SEM_SPEC`: "o ICMS00 … não tem alíquota no perfil nem item no BRIEF") |
| O schema do payload aceita `ICMS00` (vBC/pICMS/vICMS) e `ICMSSN102/500`; nada de `ICMS10/20/40/60` | `dtos/NfePayloadDto.ts:136-153`; regras rej. 382/386 em `:303-307` |
| `ProductFiscalProfile.cstIcms` aceita só `'00'` | `dtos/ProductFiscalProfileDto.ts:17`; `schema.prisma` (model `ProductFiscalProfile`) |
| A entrada credita ICMS próprio do item, nunca o ST, e o crédito vai para `icmsRecuperavelAccountId` | `lib/nfeCost.ts:161-163`; `services/NfeImportService.ts:209-218` |
| O parser da NF-e lê por item `vICMS`, `vICMSST`, `vIPI` e CST de PIS/COFINS. **Não lê** CST/CSOSN do ICMS, `orig`, `vBC`, `pICMS`, `vBCST`, `pMVAST`, `vICMSSTRet`, `pCredSN`/`vCredICMSSN`, FCP nem `ICMSUFDest` | `lib/nfe.ts:64-72, 235-245` |
| O `FiscalProfile` da unidade já tem `inscricaoEstadual`, `codMun` (que dá a UF), `icmsContribuinte` (= crédito na compra) e as séries | `schema.prisma` (model `FiscalProfile`, perto de `inscricaoEstadual`); `dtos/FiscalProfileDto.ts:41-49` |
| O `FiscalDocument` não guarda base, alíquota nem valor de ICMS | `schema.prisma` (model `FiscalDocument`) |
| A tabela `ICMS_ST_NCM_UF` tem 13 linhas, todas `DRAFT`, só cosméticos de SP, com vigência até 31/03/2026 | `prisma/data/legal_parameters_icms_st_ncm_uf_v1.sql` |
| Molde da apuração mensal com saldo, CAS, substituição em cascata e provisão em 2 commits + reconcile | `services/IbsCbsAssessmentService.ts:1-27`; `schema.prisma` (model `ConsumptionTaxAssessment`). **O molde não transporta saldo credor de um mês para o outro**: o saldo negativo fica no mês (`ibsCbsCompetencia.ts:235`) |

## 2b. Como Odoo e ERPNext modelam (código-fonte, não marketing)

| O quê | Onde | O que se lê | Grau |
|---|---|---|---|
| Contas de ICMS separadas por natureza | OCA `l10n-brazil` 18.0, commit `29ac3afb` (21/11/2026), `l10n_br_coa_generic/data/template/account.account-br_oca_generic.csv` | "2.1.7.1.03 ICMS a Recolher", "2.1.7.1.11 ICMS Substituição Tributária a Recolher", "2.1.7.1.12 ICMS Diferencial de Alíquota a Recolher", "1.1.4.1.02 ICMS a Compensar", "1.2.3.1.01 ICMS Ativo Imobilizado 1/48 Avos CIAP", e contas de ST/antecipado/DIFAL por classe de estoque | verificado |
| Lançamento **por documento** | `l10n_br_account/models/account_tax.py` (`compute_all`, linhas de repartição; o imposto `deductible` é o crédito) | O imposto de cada nota vai ao razão na própria nota, pela repartição do `account.tax` ligado ao grupo fiscal (`fiscal_tax_group.py`). É o modelo que o dono escolheu no F-ICR-4 (b) | verificado |
| Fechamento fiscal do período | `l10n_br_fiscal_closing/models/closing.py` e `README.rst` | O `l10n_br_fiscal.closing` só **exporta os documentos fiscais do período** (zip por mês/ano). Não calcula nem compensa imposto | verificado |
| Apuração mensal (E110: débitos − créditos, saldo credor transportado) | lista de módulos da 18.0 | Nenhum módulo de apuração de ICMS na 18.0 | **inferido**: só a lista e o `closing.py` foram lidos |
| Vigência, regra por UF × NCM, DIFAL em constante de código | `l10n_br_fiscal` (`tax_definition.py`, `icms_regulation.py`, `tax.py`) | Lidos no PRE-ADR (§2.4, commit `296438366ff2`, 10/10). A vigência é por `now()`, não pela data do fato, e esse é o defeito que a `LegalParameter` resolve | verificado em 10/10, não relido |
| ERPNext | `frappe/erpnext` develop | Sem localização brasileira; `Item Tax` com `valid_from` por linha, sem regra por UF | do PRE-ADR §2.4 (10/10), não relido |

**O que se aproveita:**
- as **contas separadas** (a recolher, ST a recolher, DIFAL, a compensar, CIAP) viram os campos de conta do perfil
  (item 5);
- o **lançamento por nota** é o F-ICR-4 (b);
- **a apuração não tem molde nos dois**, e por isso vem do RICMS/SP art. 87 e do serviço de IBS/CBS da casa.

## 3. Base legal (resumo; detalhe e trechos no dossiê)

| Regra | Norma | Grau |
|---|---|---|
| Não cumulatividade: crédito do cobrado nas entradas, inclusive ativo; sem crédito em entrada isenta/não tributada ou alheia | LC 87 arts. 19–20 [D01]; RICMS/SP arts. 59–61, 66 [D04–D06] | verificado (LC 87); RICMS lido só no título e no caput |
| Uso e consumo só credita a partir de 2033 (na prática, nunca) | LC 87 art. 33, I (red. LC 171/2019) [D01] | verificado |
| CIAP: 1/48 por mês × saídas tributadas ÷ totais | LC 87 art. 20 § 5º [D01] | verificado |
| Estorno do crédito (saída isenta imprevisível, perda, uso alheio) | LC 87 art. 21 [D01] | verificado no caput e no inciso I |
| Base "por dentro" (o imposto integra a base); frete, seguro e desconto condicional integram; **IS integra a partir de 2027**; IPI fora entre contribuintes | LC 87 art. 13 §§ 1º (I, II, III — LC 227/2026) e 2º [D01] | verificado |
| Apuração por estabelecimento e compensação na UF; vence no fim do período; saldo devedor paga, **saldo credor transporta** | LC 87 arts. 24 (I–III) e 25 [D01] | verificado |
| Quadro da apuração do RPA (alíneas a–l: débitos, outros débitos, estornos de crédito, créditos, outros créditos, estornos de débito, saldo devedor, deduções, a recolher ou saldo credor a transportar); mensal, no último dia | RICMS/SP art. 87, III e § 1º [D08] | verificado |
| Os valores do art. 87 III são **declarados** (arts. 253–258); prazo do art. 112 | RICMS/SP art. 87 § 2º [D08]; arts. 253–254 [D27] | verificado |
| Vencimento: dia do Anexo IV pelo código de prazo; o CPR é atribuído pela SEFAZ pela CNAE; CPR 1200 = dia 20 do mês seguinte; CNAE 47725 e 96025 no CPR 1200; ST retida → CPR 1200 | RICMS/SP arts. 112, 114 [D11]; Anexo IV arts. 2º VI, 3º V, § 1º [D20] | verificado; prorrogação em dia sem expediente (art. 566 [D26]) baixada e não lida |
| Alíquotas: 18% interna geral; 12% e 7% interestaduais; 4% importado; **25% para perfumes e cosméticos (3303, 3304, 3305, 3307, com exceções)** | RICMS/SP arts. 52 I–III e § 2º, 55 IV [D03] | verificado, com ressalva: a página da SEFAZ intercala redações antigas sem marcar o que está riscado, e o art. 55 IV aparece numa redação só |
| ST: o substituto recolhe (alíquota interna × base da ST) − imposto próprio; a base é o preço final fixado (40-A), o preço praticado + IVA-ST (41) ou o preço sugerido divulgado (43) | LC 87 arts. 6º, 8º, 9º [D01]; RICMS/SP arts. 40-A, 41, 43, 268 [D21, D10] | verificado |
| Lista das mercadorias sob ST em SP (com CEST): **Portaria CAT 68/2019**, Anexos I–XXII. O Anexo XI (perfumaria/higiene) foi revogado desde 01/04/2026 (SRE 94/2025), e a SRE 09/26 revoga mais itens a partir de 01/07/2026 | [D16] | verificado. **O percentual do IVA-ST não está na CAT 68**: sai em portarias SRE por setor (nota do art. 43 [D21]; Comunicado SRE-08/22) — insumo ausente (§9) |
| Substituído: saída sem destaque, com a indicação do art. 274; entrada com o ST nas "Observações", sem crédito | RICMS/SP arts. 274, 278 [D14, D24] | verificado |
| Complemento pelo substituído quando a venda final supera a base da retenção (Lei 17.293/20) | RICMS/SP art. 265 [D23] | verificado no caput; a disciplina (Portaria CAT 42/2018) não foi lida |
| Ressarcimento (venda final abaixo da base, fato gerador não realizado, saída isenta, saída interestadual) | RICMS/SP art. 269 [D12]; Portaria CAT 42/2018 (não lida) | verificado no art. 269 |
| Antecipação: o destinatário paulista recolhe antes a ST da mercadoria vinda de outra UF sem retenção | RICMS/SP art. 426-A [D25] | verificado no caput e no § 1º |
| DIFAL de entrada do RPA (uso, consumo, ativo) dentro da apuração: crédito do imposto pago na origem em "outros créditos" e alíquota interna em "outros débitos"; com fornecedor do Simples, crédito à interestadual | RICMS/SP art. 117, I, II e § 5º [D15]; LC 87 art. 12 XV [D01] | verificado |
| Imposto devido pelo destinatário na entrada (ex.: importação, diferimento encerrado) em "outros débitos" e crédito quando cabível | RICMS/SP art. 116 [D15] | verificado |
| Crédito do ICMS na compra de fornecedor do Simples (`pCredSN` informado na nota), para comercialização | LC 123 art. 23 § 1º [D19] | verificado |
| Transição: alíquotas a 9/10, 8/10, 7/10 e 6/10 em 2029–2032; extinção em 2033; ICMS fora da base do IBS/CBS; saldo credor de 2032 reconhecido se regularmente escriturado | EC 132, ADCT arts. 128, 129, 133, 134 [D18]; LC 227 art. 132 [D29] | verificado |
| **IBS/CBS na base do ICMS em 2027–2032** | CF art. 156-A § 1º IX e art. 195 § 17 [D30] listam os tributos de cuja base o IBS e a CBS não fazem parte, e **o ICMS (155, II) não está na lista**; a LC 87 art. 13 § 1º também não os menciona | **ambíguo** — F-ICR-9 |

## 4. Fatiamento proposto (F-ICR-8) — pilha em `integration/icms-rpa`, cada PR com `executa` próprio

| PR | Conteúdo | Itens |
|---|---|---|
| PR-0 | Dado: tabelas legais de ICMS (SP + interestadual nacional), perfil da unidade (regime de apuração do ICMS, CPR, contas) e CST do produto | 1–6 |
| PR-1 | Livro fiscal por item + parser da NF-e completo (entrada importada e saída emitida) | 7–10 |
| PR-2 | ICMS por item na saída (função pura) + montagem CRT 3 (`ICMS00/20/40/41/60`), que tira o `CRT3_ICMS_SEM_SPEC` | 11–14 |
| PR-3 | Apuração mensal do ICMS próprio (quadro do art. 87 III), saldo credor transportado, ajustes, DIFAL de entrada, estorno | 15–22 |
| PR-4 | Provisão no razão (2 commits + reconcile), vencimento pelo CPR, recálculo por mudança de parâmetro, rotas e superfície | 23–28 |
| PR-5 | ST de substituído completo: entrada sem crédito, saída CST 60, antecipação do art. 426-A, complemento e ressarcimento (F-ICR-6) | 29–33 |
| PR-6 | ST de substituto (F-ICR-5): base com IVA-ST, sub-apuração da ST, guia | 34–37 |
| PR-7 | CIAP (F-ICMS-8 a) | 38–41 |
| PR-8 | Transição 2029–2033 | 42–44 |

PR-0 → PR-1 → PR-2 → PR-3 → PR-4 em série (cada um lê o anterior). PR-5 depende do PR-3 e do PR-1. PR-6 depende do
PR-5. PR-7 depende do PR-3 e do C8. PR-8 depende do PR-3. A EFD (F-ICR-10) não está nesta tabela.

## 5. Checklist numerado (cada item = ≥ 1 teste)

Regra 3: item com regra legal cita a fonte. Item que depende de fork leva o fork. O que não tem fonte lida está na §8.

### PR-0 — dado

1. **[direto]** Tabela `ICMS_ALIQ_INTERNA` em `legal_parameters`: chave = UF (`'35'`), discriminador = prefixo de NCM
   ou `'*'`, valor `{ aliqBp, fcpBp?, artigo }`, com vigência pela data do fato. Linhas de SP só para o que o 1º
   tenant vende: `'*'` = 1800 (art. 52 I) e 3303/3304/3305/3307 = 2500 com as exceções do art. 55 IV como linhas de
   prefixo mais longo a 1800. Desempate: prefixo mais longo vence. Sem linha `PUBLISHED` para a NCM, o item vai a
   faltante nomeado e a nota não sai. Fonte: RICMS/SP arts. 52 e 55 [D03]. **Ressalva:** o art. 55 classifica pela
   "NBM/SH vigente em 31 de dezembro de 1996", e não pela NCM de hoje. Por isso as linhas de 25% entram `DRAFT` até a
   correspondência NBM/SH 1996 → NCM vigente ser conferida (§8 item 11). Teste: 3304.99.90 → 2500 (com a linha
   publicada); 3305.10.00 → 1800; NCM sem linha → faltante.
2. **[direto]** Tabela `ICMS_ALIQ_INTERESTADUAL` (nacional): chave `ufOrigem-ufDestino`, discriminador `origem`
   (0–8), valor em bp. Fontes: RICMS/SP art. 52 II, III e § 2º [D03] para a saída de SP; Res. Senado 22/1989 e 13/2012
   para as outras UFs, **insumo ausente** (§9). As linhas de origem fora de SP ficam `DRAFT` até a transcrição.
   Teste: SP→RJ = 1200; SP→BA = 700; origem 1 (importado) = 400.
3. **[direto]** Tabela `ICMS_ST_NCM_UF` regenerada por script a partir da Portaria CAT 68/2019 vigente (todos os
   anexos, com CEST, vigência e revogações, inclusive o Anexo XI até 31/03/2026 e os itens da SRE 09/26 até
   30/06/2026). As 13 linhas `DRAFT` do EF são superadas, não apagadas (`supersedesId`). Fonte: [D16]. Teste: NCM
   do Anexo XI em 2026-03-31 → linha; em 2026-04-01 → nenhuma.
4. **[direto]** Tabela `ICMS_PRAZO_CPR`: chave UF, discriminador CPR, valor `{ regra: 'DIA_MES_SEGUINTE', dia }`.
   Fonte: RICMS/SP art. 112 [D11] e Anexo IV art. 2º [D20]. Só os CPRs que o Anexo IV art. 2º lista. A prorrogação
   para dia útil fica pendente (art. 566 não lido, §8). Teste: CPR 1200 em out/2026 → 20/11/2026.
5. **[F-ICR-1, F-ICR-4]** Perfil da unidade (`FiscalProfile`, migração aditiva):
   - `icmsApuracao: 'SIMPLES_DAS' | 'RPA'`, **derivado e não digitado** (F-ICR-1);
   - `icmsCpr` (4 dígitos, obrigatório quando RPA; o padrão sai da CNAE pelo Anexo IV art. 3º, com o valor informado
     prevalecendo);
   - contas do contador (`icmsDeducaoAccountId` Revenue, `icmsRecolherAccountId` Liability,
     `icmsDifalCustoAccountId` Expense/Asset do DIFAL de uso e consumo ou ativo; mais tarde
     `icmsStRecolherAccountId` e `icmsCiapAccountId`);
   - `icmsStSubstituto` (bool, só se F-ICR-5 ≠ c).
   `icmsContribuinte` **mantém** o sentido de "crédito na compra" (X6). Regra nova no `refineFiscalProfile`: RPA sem
   IE → 400 nomeado. Teste: perfil PRESUMIDO + IE + 47725 → RPA, CPR 1200.
6. **[direto]** `ProductFiscalProfile.cstIcms` passa a aceitar `00, 20, 40, 41, 60` (e `10`, só com F-ICR-5 ≠ c).
   Regra cruzada: CST 60 só para NCM com linha `ICMS_ST_NCM_UF` vigente na data da venda (senão aviso, porque o
   perfil não tem data). Fonte: MOC 7.0 Anexo I, grupo N. Só o `ICMS00` está transcrito
   (`TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md`), e transcrever `ICMS20/40/60` (e `ICMS10`) é o 1º passo do PR-2
   (§9). O grupo da redação de base (CST 20)
   lê `pRedBC` da tabela do item 1 (`reducaoBp`), não do produto. Teste: 60 em NCM fora da lista → aviso.

### PR-1 — livro fiscal por item (F-ICMS-13 a) e parser

7. **[direto]** O parser da NF-e lê, por item: CST/CSOSN do ICMS, `orig`, `modBC`, `vBC`, `pICMS`, `pRedBC`,
   `vBCST`, `pMVAST`, `vICMSST`, `vBCSTRet`, `vICMSSTRet` (ICMS60), `pCredSN`/`vCredICMSSN`, `vFCP`/`vFCPST` e
   `ICMSUFDest`. Todos opcionais e em centavos. Grupo desconhecido → aviso, nunca silêncio (fecha a dívida T3 do
   `M5-ibs-cbs`). Teste: um XML por grupo (00, 10, 20, 40, 60, 101, 500, 900).
8. **[direto]** Models `FiscalBookEntry` + `FiscalBookItem` (contrato na §6.1). Idempotência pela chave de acesso com
   `@@unique` e sem soft-delete na chave (memória `unique-de-idempotencia-x-soft-delete`). Gravados:
   (a) na importação da NF-e de entrada, na **mesma tx** do subrazão do `NfeImportService` (o razão segue em 2
   commits, AC-2.3-1);
   (b) na transição do `FiscalDocument` para `AUTHORIZED` (saída);
   (c) cancelamento ou denegação → `situacao` muda; nada se apaga.
   Teste: reimportar a mesma chave → sem 2ª linha; cancelar → `CANCELADA`.
9. **[F-ICR-2]** Saída emitida **fora** do Luminaris: importação do XML de saída (`direction = SAIDA`, emitente =
   CNPJ da unidade) pela mesma rota de upload de NF-e. A nota não vira `Payable`; vira livro de saída. Venda finalizada
   sem documento no mês → alerta `SAIDA_SEM_DOCUMENTO_FISCAL` na apuração (o fato gerador é a saída, LC 87 art. 12 I,
   e não a nota). Teste: XML de saída próprio → livro de saída; venda sem nota → alerta com o `saleId`.
10. **[direto]** Crédito do fornecedor do Simples: `vCredICMSSN` entra como crédito do item só se a destinação for
    REVENDA (LC 123 art. 23 § 1º [D19]). `nfeCost.ts` passa a tirar do custo o `vCredICMSSN` do contribuinte, e isso
    só muda o custo de quem tem `icmsContribuinte=true`. Teste: CSOSN 101 com `vCredICMSSN` → crédito; insumo → 0.

### PR-2 — ICMS na saída e montagem CRT 3

11. **[direto]** CFOP de saída por catálogo fechado (F-ICMS-12 a): venda de mercadoria adquirida de terceiros 5102/6102;
    com ST retida anteriormente (substituído) 5405; devolução de compra 5202/6202. O CST vem do produto e o CFOP do par
    (natureza × dentro/fora da UF × CST). Fonte: tabela de CFOP do Convênio s/nº de 15/12/1970 (SINIEF), **não
    transcrita** (§9). A lista fechada entra com a transcrição, no PR-2. Teste: CST 60 + interna →
    5405; CST 00 + RJ → 6102.
12. **[direto]** Função pura `icmsDoItem({ cst, valorOperacaoCents, freteCents, seguroCents, outrasCents,
    descontoIncondCents, aliqBp, reducaoBp? })`. Saída: `{ modBC: 3, vBC, pICMS, vICMS, pRedBC? }`.
    - Base = valor da operação + frete + seguro + outras − desconto incondicional, "por dentro" (o preço já contém o
      imposto; LC 87 art. 13 § 1º I e II [D01]).
    - `vICMS = round(vBC × aliq)`, meio para cima no centavo, com a mesma regra de arredondamento da validação
      (rej. 5xx).
    - CST 40/41/60 → sem destaque (art. 274 [D14]).
    - IS: a partir de 2027 entra na base (art. 13 § 1º III), mas só quando houver IS na nota (fora do salão).
    - IBS/CBS na base: **F-ICR-9 → (a)**. Chave `icmsBaseIncluiIbsCbs` na política versionada do contador
      (`AccountingPolicyVersion`, molde F-E6-1), com padrão `false` (fora, como o leiaute). Com a chave `false`, a
      nota CRT 3 de fato ≥ 2027 com grupo `IBSCBS` leva o aviso `ICMS_BASE_SEM_IBS_CBS_CONFERIR` até o contador
      confirmar. Com `true`, o `vBC` soma `vIBS + vCBS` do item. A pergunta exata ao tributarista está no §8 item 8.
    Teste: tabela de casos com o centavo de arredondamento, e a mesma venda com a chave `false` × `true`.
13. **[direto]** `nfeMontagem` aceita CRT 3: grupos `ICMS00`, `ICMS20`, `ICMS40`, `ICMS60` (`vBCSTRet`/`vICMSSTRet`
    = os da última entrada do item, se o livro tiver; senão zero com aviso, porque o leiaute admite) e `ICMSTot`
    somado (`vBC`, `vICMS`, `vBCST`, `vST`). `CRT3_ICMS_SEM_SPEC` sai. O `NfePayloadDto` ganha os subgrupos com as regras
    de rejeição citadas, no molde das rej. 382/386. Teste: nota CRT 3 PRESUMIDO com item 00 e item 60 → payload válido;
    totais = Σ itens.
14. **[direto]** NFC-e CRT 3 pelo mesmo caminho (`kind=NFCE`), com o CFOP no subconjunto do `[NFCE-CFOP]`. Teste: NFC-e
    CRT 3 → `ICMS00`; CFOP fora da lista → 400.

### PR-3 — apuração mensal do ICMS próprio

15. **[F-ICR-3]** Model `IcmsApuracao` (contrato na §6.1): uma linha por (PJ, estabelecimento `unitId`, ano, mês,
    tipo `PROPRIO`). As colunas seguem o quadro do RICMS/SP art. 87 III a–l [D08] mais o
    `saldoCredorAnteriorCents`. Status `CONFIRMED | SUPERSEDED`, `supersedesId`, `parametrosIds`/`Sha256`,
    `entradaInformada`, `avisoParametroLegal`, `provisaoEntryId`. Teste: unicidade lógica de uma viva por chave.
16. **[direto]** Débito (alínea a) = Σ `vICMS` dos itens do livro de **saída** com `situacao = REGULAR` no mês, por
    `dataEntradaSaida` (cai para `dataEmissao`). Crédito (alínea e) = Σ crédito dos itens do livro de **entrada** com
    direito a crédito:
    - `vICMS` próprio destacado, ou `vCredICMSSN`;
    - destinação REVENDA, ou IMOBILIZADO pelo CIAP (PR-7);
    - **nunca** USO_CONSUMO (LC 87 art. 33 I) nem INSUMO_SERVICO (X6 item 5);
    - nunca ST (art. 278 [D24]).
    Teste: mês com 2 saídas e 3 entradas (revenda, uso e consumo, entrada com ST) → só a de revenda credita.
17. **[direto]** DIFAL de entrada do RPA (F-ICMS-4 b) **dentro da apuração**:
    - entrada interestadual destinada a USO_CONSUMO ou IMOBILIZADO;
    - outros créditos (alínea f) = imposto destacado na origem;
    - outros débitos (alínea b) = alíquota interna (item 1) × base;
    - fornecedor do Simples → crédito à alíquota interestadual (§ 5º).
    Fonte: RICMS/SP art. 117 I, II e § 5º [D15]. Teste: compra de RJ, uso e consumo, R$ 1.000 a 12% → crédito 120,
    débito 180, líquido 60.
18. **[direto]** Saldo credor transportado (LC 87 art. 24 III [D01]; art. 87 III "l"):
    - `saldoCredorAnteriorCents` do mês M = `saldoCredorTransportarCents` da apuração viva de M−1;
    - apuração de M sem M−1 confirmada → 409 nomeado `icms_mes_anterior_nao_confirmado`, salvo o 1º mês do perfil
      RPA, em que o saldo inicial é informado com memória;
    - substituir M derruba M+1.. em cascata, devolvidos em `reconfirmar` (molde IBS/CBS).
    Teste: M com saldo credor 50 → M+1 começa com 50; substituir M → M+1 `SUPERSEDED`.
19. **[direto]** Devoluções e cancelamento:
    - devolução de venda (entrada CFOP 1202/2202) → **crédito pelas entradas (alínea e)** pelo `vICMS` da nota de
      devolução, escriturada no livro de entrada como qualquer entrada com crédito (não é alínea g, que fica só para o
      estorno de débito informado);
    - devolução de compra (saída 5202/6202, com destaque) → **débito pelas saídas (alínea a)**;
    - nota cancelada no próprio mês → fora da apuração, e o lançamento da nota (item 23) é estornado;
    - nota cancelada depois de confirmada a apuração do mês → estorno do lançamento da nota e aviso `RECONFIRMAR` na
      apuração do mês de origem.
    Fonte: LC 87 arts. 19–20 [D01]; art. 87 III [D08]. Teste: cancelar depois de confirmar → estorno no razão + aviso na
    apuração.
20. **[F-ICR-7]** Estorno de crédito por perda, roubo ou deterioração da mercadoria creditada (LC 87 art. 21 [D01]):
    baixa de estoque por perda (FIN-10) no mês → estorno (alínea c). Teste: perda de 2 unidades com crédito médio de 18
    cada → estorno 36.
21. **[direto]** Ajustes informados pelo contador (outros débitos, outros créditos, deduções — alíneas b, f, g, j),
    cada um com `{ alinea, descricao, valorCents, fundamento, contrapartidaAccountId }` (contrapartida pelo item 23b). O
    fundamento é obrigatório: sem ele, 400. Os códigos
    da Tabela 5.1.1 de SP ficam para a EFD (F-ICR-10). Teste: ajuste sem fundamento → 400.
22. **[F-ICR-1]** Gate de regime: apuração só com `icmsApuracao = RPA` no mês. Simples abaixo do sublimite → 400
    `icms_no_das` (LC 123 art. 13 [D19]). Teste: perfil SIMPLES sem excesso → 400.

### PR-4 — provisão, vencimento, superfície

23. **[F-ICR-4 → (b), dono 21/11, contra a recomendação]** Débito **nota a nota**, em 2 commits + reconcile
    (`FiscalBookService`, cabeçalho `atomicUntil`, AC-2.3-1/2). Regra de contas única, que vale para o 23 e o 23b:
    - **U1:** todo débito fiscal (alíneas a, b, c) credita `icmsRecolherAccountId`;
    - **U2:** todo crédito fiscal (alíneas e, f, g) debita `icmsRecuperavelAccountId`. A entrada com crédito já faz isso
      na importação (X6);
    - **U3:** a compensação do 23b move min(créditos totais + saldo anterior, débitos totais) do a-recuperar para o
      a-recolher. O que sobra no a-recuperar é o saldo credor a transportar.
    Lançamentos por nota (`sourceType='icms_saida'`, `sourceId=<FiscalBookEntry.id>`, na `dataEntradaSaida`):
    - **venda** (5102/6102 com destaque): D `icmsDeducaoAccountId` / C a recolher (U1);
    - **devolução de compra** (5202/6202): D o fornecedor do `Payable` de origem, achado pela chave referenciada (`refNFe`)
      / C a recolher (U1). O ICMS destacado é cobrado do fornecedor. Sem a nota de origem, o lançamento fica pendente
      com o alerta `ICMS_DEVOLUCAO_SEM_ORIGEM`;
    - **devolução de venda** (entrada 1202/2202, na importação): D a recuperar / C `icmsDeducaoAccountId` (U2). É a
      única entrada que este nó lança, porque não tem `Payable`;
    - **commit 2:** CAS de `FiscalBookEntry.debitoEntryId` (`where null`), num `runTransaction` próprio;
    - **cancelamento** (`situacao` → `CANCELADA`): estorno do lançamento da nota, achado pela fonte. Ele sai na data da
      nota se o período dela estiver aberto, e **na data do cancelamento** se estiver fechado. Neste caso, a apuração do
      mês de origem ganha o aviso `RECONFIRMAR` (item 19);
    - **período fechado na data da nota:** o livro é gravado e o lançamento fica pendente, no alerta
      `ICMS_NOTA_SEM_LANCAMENTO`. O reconcile lança quando o período reabrir (gate dentro da tx do `postEntry`);
    - **reconcile** `reconcileIcmsSaidas()`: read-first e idempotente. Lança as notas sem `debitoEntryId`, inclusive as
      gravadas no PR-1, antes deste PR existir.
    Teste: o kit do IBS/CBS por nota (commit 1, CAS, crash entre os dois, reconcile idempotente, 2ª chamada sem
    lançamento novo), mais cancelamento com período aberto e fechado, devolução sem origem → pendente.
23b. **[F-ICR-4 → (b)]** Lançamento da **apuração** (`IcmsAssessmentService`, `sourceType='icms_assessment'`), no
    último dia do mês, em 2 commits + reconcile. Ele **não** relança as notas (alíneas a e e já estão no razão pelo 23
    e pelo X6). Lança só:
    - **b, c (U1):** DIFAL do art. 117 II → D `icmsDifalCustoAccountId` / C a recolher. Estorno por perda (item 20) →
      D a conta de perda do estoque (FIN-10) / C a recolher. Ajuste informado → D a contrapartida do ajuste / C a
      recolher;
    - **f, g (U2):** crédito do art. 117 I → D a recuperar / C `icmsDifalCustoAccountId`, porque o ICMS de origem de uso
      e consumo ficou no custo (X6 item 5) e o DIFAL líquido fica no custo. Parcela do CIAP (PR-7) → D a recuperar / C
      `icmsCiapAccountId`. Ajuste informado → D a recuperar / C a contrapartida;
    - **compensação (U3):** D a recolher / C a recuperar.
    Cada ajuste (item 21) passa a ter `contrapartidaAccountId` obrigatória. A substituição estorna o lançamento da
    substituída antes do `postEntry`, e o gate de período fica dentro da tx. Enquanto houver nota do mês sem
    `debitoEntryId`, a confirmação recusa com 409 `icms_notas_sem_lancamento`, para o razão não divergir da apuração.
    Teste: tie-out do mês (invariante 5) num mês com venda, compra, devolução de compra, devolução de venda, DIFAL e
    perda; substituição estorna e reposta.
24. **[direto]** Vencimento = regra do CPR do perfil (item 4) aplicada ao mês seguinte. Fica gravado na apuração e
    vai para o calendário do CICLO-FISCAL (PR #1322) como origem `ICMS` (aresta: o calendário lê a apuração; este nó não
    edita o job). Teste: CPR 1200 → dia 20.
25. **[direto]** Recálculo por mudança de parâmetro (LEGAL-PARAMS PR-4): `parametrosIds`/`Sha256` das linhas usadas
    (alíquota, interestadual, ST); a troca de linha marca `avisoParametroLegal`, e o job existente reconfirma com
    `entradaInformada`. Teste: publicar nova linha de 3304 → aviso na apuração do mês afetado.
26. **[direto]** Rotas `POST /accounting/icms-assessments/preview`, `POST …/confirm` (CAS de `expectedSupersedesId`,
    409), `GET …?unitId&ano` e `GET …/:id` (memória + rastreio por documento e item, molde EMENDA RASTREIO do X7).
    Route → Controller → Service → Repository (+ Policy `canManageAccounting`), DTO Zod `.strict()`, factory.
    Teste: integração por rota.
27. **[direto]** Gates do diff: snapshot de shape dos DTOs, `auditCanonical.ts` (eventType `ICMS_ASSESSMENT_CONFIRMED`
    e `ICMS_ASSESSMENT_SUPERSEDED` na mesma mudança), path-count do openapi, paridade i18n das mensagens nomeadas,
    `check:arch`. Teste: os próprios gates.
28. **[direto]** Matriz de obrigações (`obrigacoesPorRegime.ts`): o RPA ganha a linha "ICMS — apuração mensal, CPR do
    perfil". A linha da EFD ICMS/IPI segue **fora** até o F-ICR-10 (F-XP-7 a). Teste: perfil RPA → linha ICMS; nenhuma
    linha de EFD.

### PR-5 — ST de substituído (o caso do varejo)

29. **[direto]** Entrada com ST retida (CST 10/60 ou `vICMSST > 0` do fornecedor substituto) → `FiscalBookItem` com
    `vIcmsStCents`/`vBcStCents`, sem crédito (art. 278 [D24]), e o ST no custo (X6, já é assim). Teste: entrada CST 10
    → crédito 0, ST no custo.
30. **[direto]** Saída de mercadoria recebida com ST → CST 60, CFOP 5405, sem débito na apuração. A indicação
    "Imposto Recolhido por Substituição — Artigo … do RICMS" vai em `infCpl` (art. 274 [D14]). Teste: venda de item
    com ST → débito 0, `infCpl` com a indicação.
31. **[F-ICR-6]** Antecipação na entrada interestadual sem retenção (RICMS/SP art. 426-A [D25]): item com
    `ICMS_ST_NCM_UF` vigente, vindo de outra UF, sem `vICMSST`, e com o destinatário paulista no RPA. Calcula
    (imposto próprio + ST) com o IVA-ST do item 34 quando a linha estiver `PUBLISHED`. Sem linha, alerta
    `ANTECIPACAO_SEM_IVA` e registro manual da guia paga. A guia é de recolhimento especial, e o prazo vem do Anexo IV
    (§8). Teste: entrada de MG com NCM sob ST e sem retenção → antecipação ou alerta.
32. **[F-ICR-6]** Complemento (art. 265 [D23]) e ressarcimento (art. 269 [D12]) por item vendido a consumidor final:
    preço de venda × base da retenção da entrada (`vBCSTRet` do livro). A disciplina da Portaria CAT 42/2018 **não
    foi lida** (§8): o cálculo só entra com a portaria transcrita. Até lá, o relatório mensal mostra a diferença e não
    lança nada. Teste: venda acima da base → linha "complemento estimado" no relatório.
33. **[direto]** Estoque de ST na troca de lista (saída da ST em 01/04/2026 e em 01/07/2026): relatório das unidades
    em estoque na véspera, com o ST pago, para o tratamento da Portaria CAT 28/2020 / CAT 44/08. O tratamento em si
    fica pendente (§8). Teste: item do Anexo XI em estoque em 31/03/2026 → linha no relatório.

### PR-6 — ST de substituto (só se F-ICR-5 ≠ c)

34. **[F-ICR-5]** Tabela `ICMS_ST_IVA`: chave UF, discriminador CEST (ou NCM), valor `{ ivaBp, portaria, setor }`.
    Fonte: portarias SRE de IVA-ST por setor (insumo ausente, §9). Linhas `DRAFT` até a transcrição, e sem linha
    `PUBLISHED` o cálculo de ST recusa com motivo nomeado. Teste: CEST sem linha → 400 `icms_st_sem_iva`.
35. **[F-ICR-5]** Base e valor da ST na saída do substituto: base = preço praticado + encargos × (1 + IVA-ST)
    (RICMS/SP art. 41), ou preço final fixado (40-A), ou preço sugerido divulgado (43). ST = alíquota interna × base −
    ICMS próprio (art. 268 [D10]). Grupo `ICMS10`, com o destaque no campo próprio (art. 273 [D13]). Teste: preço
    100, IVA 50%, alíquota 18% → base 150, ST 27 − 18 = 9.
36. **[F-ICR-5]** Apuração `tipo = ST` separada da própria (débito da ST retida nas saídas, ressarcimentos e créditos
    da ST), com recolhimento pelo CPR 1200 (Anexo IV art. 3º § 1º [D20]). Teste: mês com ST retida → apuração ST
    própria, vencimento dia 20.
37. **[F-ICR-5]** Provisão da ST: D `icmsDeducaoAccountId` / C `icmsStRecolherAccountId`, no lançamento da apuração
    `ST`. Teste: kit de 2 commits.

### PR-7 — CIAP (F-ICMS-8 a)

38. **[direto]** Model `IcmsCiapAsset` ligado ao `FixedAsset` (C8) e ao `FiscalBookItem` da entrada, com o crédito
    total (ICMS próprio + DIFAL do art. 117 para o ativo), a data de entrada e as parcelas apropriadas (≤ 48). Fonte:
    LC 87 art. 20 § 5º [D01]. Teste: ativo de R$ 4.800 com ICMS 864 → 48 parcelas de 18 × fator.
39. **[direto]** Parcela mensal = 1/48 × crédito × (saídas tributadas ÷ saídas totais do mês, do livro), em outros
    créditos (alínea f) da apuração própria. Teste: mês com 50% de saídas isentas → metade da parcela.
40. **[direto]** Alienação antes de 48 meses interrompe as parcelas (§ 5º V); no 48º mês o saldo é cancelado (VII).
    Teste: baixa do `FixedAsset` no mês 20 → parcelas 21+ = 0.
41. **[direto]** Bem com entrada ≥ 01/01/2029 ganha a marca `homologacaoPendente` no mês da 1ª parcela, para o pedido
    de homologação (LC 227 art. 134 § 1º I, verificado no PRE-ADR em 10/10; a regulamentação de SP não existe:
    L-ICMS-7). Teste: entrada em 2029 → marca.

### PR-8 — transição 2029–2033

42. **[direto]** Tabela `ICMS_TRANSICAO_FATOR` (chave = ano; 2029 = 9/10, 2030 = 8/10, 2031 = 7/10, 2032 = 6/10). A
    alíquota do item 1 é multiplicada pelo fator do ano do fato (EC 132 ADCT art. 128 [D18]). Teste: 18% em 2030 →
    14,4%.
43. **[direto]** Fato gerador ≥ 2033 → 400 `icms_extinto` na montagem e na apuração (ADCT art. 129 [D18]). Teste:
    venda em 2033-01-02 → recusa.
44. **[direto]** Saldo credor de 31/12/2032 segregado (CIAP × demais, LC 227 art. 136, verificado no PRE-ADR) e
    exportável com a memória por apuração. Teste: dezembro de 2032 com saldo → relatório com as duas parcelas.

## 6. Contratos esboçados

### 6.1 Prisma (forma, não decisão)

```prisma
// PR-1 — livro fiscal por item (F-ICMS-13 a; PRE-ADR §6 com os campos que faltavam)
model FiscalBookEntry {
  id               String   @id @default(cuid())
  userId           String   // a PJ (R8)
  unitId           String   // estabelecimento (IE) — LC 87 art. 25
  direction        String   // ENTRADA | SAIDA
  modelo           String   // 55 | 65
  chaveAcesso      String
  serie            String
  numero           String
  participanteDoc  String?  // CNPJ/CPF (nunca em log — PII, ADR-OBSERVABILIDADE)
  participanteUf   String?  // cUF IBGE
  participanteCrt  Int?     // 1 = Simples (crédito pelo vCredICMSSN)
  dataEmissao      String   // AAAA-MM-DD
  dataEntradaSaida String?
  situacao         String   // REGULAR | CANCELADA | DENEGADA
  totaisJson       Json     // ICMSTot inteiro + IBSCBSTot
  sourcePayableId  String?  // entrada importada
  fiscalDocumentId String?  // saída emitida pelo Luminaris
  origem           String   // IMPORTADA | EMITIDA | SAIDA_IMPORTADA (F-ICR-2)
  debitoEntryId    String?  // F-ICR-4 (b): lançamento da nota (commit 2, CAS where null); saída e devolução
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  items            FiscalBookItem[]
  @@unique([userId, unitId, direction, chaveAcesso]) // idempotência real; sem deletedAt na chave
  @@index([userId, unitId, dataEntradaSaida])
}

model FiscalBookItem {
  id               String @id @default(cuid())
  entryId          String
  entry            FiscalBookEntry @relation(fields: [entryId], references: [id], onDelete: Restrict)
  nItem            Int
  productRef       String?
  ncm              String
  cest             String?
  cfop             String
  origem           Int
  cstIcms          String?  // CRT 3
  csosn            String?  // CRT 1 (entrada de fornecedor do Simples)
  destinacao       String?  // REVENDA | INSUMO_SERVICO | IMOBILIZADO | USO_CONSUMO (ITEM-DESTINATION)
  vProdCents       BigInt
  vBcIcmsCents     BigInt @default(0)
  pIcmsBp          Int?
  pRedBcBp         Int?
  vIcmsCents       BigInt @default(0)
  vCredIcmsSnCents BigInt @default(0) // LC 123 art. 23 § 1º
  vBcStCents       BigInt @default(0)
  vIcmsStCents     BigInt @default(0)
  vBcStRetCents    BigInt @default(0) // ICMS60 — base do complemento/ressarcimento
  vIcmsStRetCents  BigInt @default(0)
  vFcpCents        BigInt @default(0)
  vFcpStCents      BigInt @default(0)
  vIpiCents        BigInt @default(0)
  creditoIcmsCents BigInt @default(0) // o que a apuração credita (derivado na gravação, com a regra do item 16)
  ibsCbsJson       Json?
  @@unique([entryId, nItem])
}

// PR-3 — apuração (F-ICR-3 a); colunas = RICMS/SP art. 87 III a–l
model IcmsApuracao {
  id                          String   @id @default(cuid())
  userId                      String
  user                        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId                      String   // CHAVE (estabelecimento), não só proveniência
  anoCalendario               Int
  mes                         Int
  tipo                        String   // PROPRIO | ST (PR-6)
  debitoSaidasCents           BigInt   // a
  outrosDebitosCents          BigInt   // b (DIFAL art. 117 II, art. 116, ajustes)
  estornoCreditosCents        BigInt   // c (LC 87 art. 21)
  creditoEntradasCents        BigInt   // e
  outrosCreditosCents         BigInt   // f (art. 117 I, CIAP, ajustes)
  estornoDebitosCents         BigInt   // g (devolução de venda, ajustes)
  saldoCredorAnteriorCents    BigInt   // LC 87 art. 24 I
  deducoesCents               BigInt   // j
  aRecolherCents              BigInt   // l (≥ 0)
  saldoCredorTransportarCents BigInt   // l (≥ 0); exclusivo com aRecolher
  vencimento                  String?  // AAAA-MM-DD pelo CPR
  memoria                     Json     // linhas por alínea, com documento/item (rastreio)
  ajustes                     Json     // [{ alinea, descricao, valorCents, fundamento }]
  parametrosIds               Json
  parametrosSha256            String
  entradaInformada            Json?
  avisoParametroLegal         String?
  status                      String   // CONFIRMED | SUPERSEDED
  supersedesId                String?
  provisaoEntryId             String?
  confirmedById               String
  confirmedAt                 DateTime
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
  deletedAt                   DateTime?
  @@index([userId, unitId, anoCalendario, mes, tipo])
  @@map("icms_apuracoes")
}
```

### 6.2 Zod / TS (esboço)

```ts
export const ICMS_APURACAO = ['SIMPLES_DAS', 'RPA'] as const;           // derivado (F-ICR-1)
export const ICMS_TIPO_APURACAO = ['PROPRIO', 'ST'] as const;
export const ICMS_ALINEA_AJUSTE = ['b', 'f', 'g', 'j'] as const;        // RICMS/SP art. 87 III

export const IcmsAjusteSchema = z.object({
  alinea: z.enum(ICMS_ALINEA_AJUSTE),
  descricao: z.string().min(3).max(200),
  valorCents: z.coerce.bigint().positive(),
  fundamento: z.string().min(3).max(200),                               // item 21: obrigatório
  contrapartidaAccountId: z.string().min(1),                             // item 23b
}).strict();

export const IcmsAssessmentPreviewSchema = z.object({
  unitId: z.string().min(1),
  ano: z.number().int().min(2027),            // ≥ go-live; ver §8 (2026 só se o dono pedir)
  mes: z.number().int().min(1).max(12),
  tipo: z.enum(ICMS_TIPO_APURACAO).default('PROPRIO'),
  ajustes: z.array(IcmsAjusteSchema).max(200).default([]),
  saldoCredorInicialCents: z.coerce.bigint().nonnegative().optional(), // só no 1º mês RPA (item 18)
}).strict();

export const IcmsAssessmentConfirmSchema = IcmsAssessmentPreviewSchema.extend({
  expectedSupersedesId: z.string().min(1).nullable(),                    // CAS (409)
}).strict();

// Função pura (PR-2, item 12)
export interface IcmsItemEntrada {
  cst: '00' | '20' | '40' | '41' | '60';
  valorOperacaoCents: bigint; freteCents: bigint; seguroCents: bigint; outrasCents: bigint;
  descontoIncondCents: bigint; aliqBp: number; reducaoBp?: number;
}
export interface IcmsItemSaida { modBC: 3 | null; vBC: bigint; pICMSBp: number; vICMS: bigint; pRedBCBp?: number }

// Linha legal (PR-0)
export const IcmsAliqInternaJsonSchema = z.object({
  aliqBp: z.number().int().min(0).max(10000),
  fcpBp: z.number().int().min(0).max(400).optional(),
  reducaoBp: z.number().int().min(0).max(10000).optional(),
  artigo: z.string().min(3),
}).strict();
export const IcmsPrazoCprJsonSchema = z.object({ regra: z.literal('DIA_MES_SEGUINTE'), dia: z.number().int().min(1).max(31) }).strict();
```

O `z.coerce.boolean()` não entra em query (memória `zod-coerce-boolean-inverte-query-string`); `.partial()` não entra
em update de perfil sem tirar o `default` (memória `zod4-partial-aplica-default-reseta-campo`).

### 6.3 Rotas

`POST /api/accounting/icms-assessments/preview` · `POST /api/accounting/icms-assessments/confirm` ·
`GET /api/accounting/icms-assessments?unitId&ano` · `GET /api/accounting/icms-assessments/:id` ·
`POST /api/nfe/import` (existente; aceita a saída própria pelo F-ICR-2) · `GET /api/accounting/icms-st/relatorio?unitId&ano&mes`
(itens 32–33).

## 7. Forks — RATIFICADOS em 21/11 ([[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]])

Cada um com caminhos, recomendação e o que a alternativa deixa aberto (regra do dono de 21/11: a recomendação padrão é a
estrutural).

### F-ICR-1 — Quem apura ICMS no RPA
- **RATIFICADO 21/11: (a) — "Inclui o Simples impedido (Recomendado)".**
- **(a)** Presumido/Real com IE **e** o optante do Simples impedido de recolher o ICMS no DAS por excesso de sublimite
  (LC 123 art. 13-A, na redação da LC 214, e art. 20 § 1º). `icmsApuracao` é derivado do regime e do sublimite que o
  `simplesCalc` já calcula.
- **(b)** Só Presumido/Real com IE. O Simples impedido fica com o contador.
- **Recomendação: (a).** O impedido apura no RPA a partir do mês seguinte ao excesso, e o sistema já sabe quando isso
  acontece. Deixá-lo de fora é o buraco "o DAS fica barato no valor do ICMS" da lacuna `38c0`. A data exata do início
  é a pergunta de lei L-ICMS-2 do PRE-ADR (§8 item 7), e até lá o aviso usa "mês seguinte ao excesso".

### F-ICR-2 — De onde vem o débito
- **RATIFICADO 21/11: (a) — "Livro de saída + XML externo (Recomendado)".**
- **(a)** Livro de saída gravado na autorização do `FiscalDocument` **e** pela importação do XML de saída emitido fora,
  com alerta `SAIDA_SEM_DOCUMENTO_FISCAL` para a venda sem nota.
- **(b)** Débito pela venda (`sales`), com ou sem nota, à alíquota do produto.
- **(c)** Só as notas emitidas pelo Luminaris.
- **Recomendação: (a).** A apuração é sobre o que foi escriturado (art. 87 [D08]). A venda sem nota é infração, não
  base alternativa, e o alerta a mostra sem inventar débito. (b) duplica a conta da nota e diverge dela no centavo. (c)
  deixa de fora o tenant que hoje emite em outro sistema, e a emissão do Luminaris segue desligada em produção
  (`selectDfeEmissor.ts:69-73`, X10a).

### F-ICR-3 — Persistência da apuração
- **RATIFICADO 21/11: (a) — "Model novo IcmsApuracao (Recomendado)".**
- **(a)** Model novo `IcmsApuracao` (§6.1), no molde do IBS/CBS (CAS, cascata, provisão), com o estabelecimento como
  chave, o saldo credor transportado e as colunas do art. 87 III.
- **(b)** Reusar `ConsumptionTaxAssessment` com `tributo='ICMS'` e colunas novas.
- **(c)** `TaxAssessment` com `periodo='Mnn'` (o que o PRE-ADR §6 sugeria).
- **Recomendação: (a).** Pelo critério de reuso, só se reusa o mesmo objeto de domínio. O shape aqui diverge em três
  pontos que a lei impõe: o estabelecimento é a chave (LC 87 art. 25), o saldo credor passa para o mês seguinte (art. 24
  III; o IBS/CBS não transporta, `ibsCbsCompetencia.ts:235`) e o quadro tem 11 alíneas. (b) poria colunas de ICMS em
  linha de IBS/CBS, e o "≥ 2027" e o `tributo` IBS|CBS do model mudariam de sentido. O que se reusa é o padrão do
  serviço, e não a tabela.

### F-ICR-4 — Momento contábil do débito
- **RATIFICADO 21/11: (b), contra a recomendação (a) — "Um lançamento por nota". O que o (b) abria (estorno por cancelamento, nota em período fechado, 3º caminho de lançamento) está tratado no item 23; o item 23b deixa a apuração só com ajustes e compensação, e a invariante 5 amarra os dois.**
- **(a)** Um lançamento por apuração, no fim do mês (molde IBS/CBS): D dedução / C a recolher pelos débitos, e no
  mesmo lançamento D a recolher / C a recuperar pela compensação.
- **(b)** Um lançamento por nota, na autorização (molde OCA: `account.tax` por documento).
- **Recomendação: (a).** É o padrão já ratificado no IBS/CBS (F-IBS-8 c), passou no `check:arch` e põe o razão igual à
  apuração confirmada. O crédito já entra por nota, na importação (X6). (b) cria um 3º caminho de lançamento fiscal e
  um estorno por cancelamento de nota.

### F-ICR-5 — ST de substituto (reabre o F-ICMS-3 b)
- **RATIFICADO 21/11: (a) — "Planejar já, atrás de chave (Recomendado)". Supera o F-ICMS-3 (b) de 12/10.**
- **(a)** Planejado neste BRIEF (PR-6), atrás de `icmsStSubstituto` no perfil, calculando só com linha de IVA-ST
  `PUBLISHED`. A tabela entra `DRAFT` até a transcrição das portarias SRE.
- **(b)** Manter o ratificado: só substituído agora. O substituto fica como nó futuro "quando houver tenant substituto".
- **(c)** Fora.
- **Recomendação: (a).** É a versão incremental da estrutural: o código nasce com a regra e com a recusa nomeada, e o
  dado chega quando a fonte for transcrita. Varejo (o 1º caso) é substituído. Quem vira substituto em SP é a indústria,
  o importador, o atacadista nomeado ou o contribuinte com regime especial (Portaria SRE 17/25, nota do art. 269
  [D12]). Também vira quem antecipa pelo art. 426-A, e essa conta é a mesma do substituto (item 31). O que (b) deixa
  aberto: o art. 426-A fica sem cálculo para o varejo que compra de outra UF.

### F-ICR-6 — Antecipação, complemento e ressarcimento do substituído
- **RATIFICADO 21/11: (a) — "Calcular, com trava de fonte (Recomendado)".**
- **(a)** Antecipação (426-A) calculada com o IVA-ST do F-ICR-5 e alerta sem ele. Complemento e ressarcimento
  (arts. 265 e 269) calculados **só** depois de transcrita a Portaria CAT 42/2018; até lá, relatório da diferença sem
  lançamento.
- **(b)** Só registrar as guias pagas e acusar a entrada interestadual sem retenção.
- **(c)** Fora (o contador cuida).
- **Recomendação: (a).** O complemento é obrigatório em SP desde a Lei 17.293/20 (art. 265 [D23]): ficar fora é
  pagar multa sem saber. Sem a CAT 42 lida, o cálculo não tem fonte, e por isso começa como relatório (regra 3).

### F-ICR-7 — Estorno de crédito por perda de estoque
- **RATIFICADO 21/11: (a) — "Automático pelo estoque (Recomendado)".**
- **(a)** Automático: o estoque guarda o crédito médio por unidade (coluna nova no `InventoryItem`, alimentada pela
  importação). A baixa por perda gera o estorno na apuração do mês.
- **(b)** Ajuste informado (alínea c) pelo contador, com alerta quando houver baixa por perda no mês.
- **Recomendação: (a).** O estorno é obrigação (LC 87 art. 21 [D01]), e o sistema já sabe da perda (FIN-10). (b) é o
  remendo: depende de alguém lembrar. A versão incremental de (a) é o alerta de (b) no PR-3 e a coluna no PR-5, se o
  raio do `InventoryItem` pesar.

### F-ICR-8 — Fatiamento
- **RATIFICADO 21/11: (a) — "Pilha em integration/icms-rpa (Recomendado)".**
- **(a)** A tabela da §4: 9 PRs em pilha em `integration/icms-rpa`, cada um com `executa` próprio. PR-0..PR-4 fecham o
  ICMS próprio. PR-5/PR-6 a ST. PR-7 o CIAP. PR-8 a transição.
- **(b)** O mesmo, com o PR-1 (livro fiscal) direto na `main` como contrato, porque o IBS/CBS e a EFD também o leem.
- **Recomendação: (a).** O livro só tem leitor neste nó por enquanto, e a regra de 10/11 manda tema com 2+ PRs para a
  integração.

### F-ICR-9 — IBS/CBS na base do ICMS (2027–2032) — **ambiguidade de lei**
- **RATIFICADO 21/11: (a) — "Política do contador, padrão 'fora' (Recomendado)".**
- **Leituras:** (i) **fora** da base: a NF-e destaca IBS/CBS "por fora" e o leiaute não os soma no `vBC` do ICMS;
  (ii) **dentro**: a base do ICMS é "o valor da operação" (LC 87 art. 13 I), e nem a CF (art. 156-A § 1º IX e art. 195
  § 17 listam os tributos de cuja base o IBS e a CBS não fazem parte, **sem o ICMS** [D30]) nem a LC 87 art. 13 § 1º
  [D01] os excluem. O IS ganhou regra expressa de inclusão (§ 1º III); o IBS/CBS não ganhou nenhuma.
- **Caminhos:**
  - **(a)** Política versionada do contador (molde F-E6-1), com padrão "fora" e aviso, mais a pergunta ao tributarista;
  - **(b)** padrão "dentro" (erra para mais imposto, molde da decisão 2 da segregação);
  - **(c)** esperar resposta antes do PR-2.
- **Recomendação: (a)**, com a pergunta exata no §8 item 8. O padrão "fora" segue o leiaute oficial que o PVA e a SEFAZ vão
  conferir, e o contador troca por política sem PR. (b) cobra a mais, por item, em todo o varejo, sem norma que mande.

### F-ICR-10 — A EFD ICMS/IPI (lacuna `3b81`)
- **RATIFICADO 21/11: (a) — "Absorver neste nó, BRIEF próprio (Recomendado)". A EFD continua sem autorização: o BRIEF dela é pedido próprio.**
- **Fatos (verificados):** a apuração do RPA é **declarada** (art. 87 § 2º [D08], arts. 253–254 [D27]). Em SP, a
  declaração do RPA é só a EFD desde jan/2026 (GIA dispensada, PRE-ADR §2.3; Portaria SRE 2/2025 lida pelo portal). E o
  saldo credor de 2032 só vale "regularmente apurado na escrituração fiscal" (LC 227 art. 132 II [D29]).
- **(a)** Absorver (F-ICMS-1 a): a EFD é a última fase deste nó, com **BRIEF próprio e autorização própria**, lendo o
  livro fiscal do PR-1. A lacuna `3b81` (parte ICMS/IPI) passa a apontar para este nó.
- **(b)** Nó separado `EFD-ICMS-IPI`, com `depende_de` neste.
- **(c)** Fora: o contador gera a EFD em outro sistema a partir dos XMLs.
- **Recomendação: (a).** A apuração e a EFD fecham pelo mesmo E110 e têm o mesmo oráculo (PVA). Separar cria dois nós
  que não se validam sozinhos. (c) deixa o tenant do RPA dependente de um 2º sistema para cumprir a obrigação
  principal. **A autorização de 21/11 não cobre o BRIEF da EFD**: só o dono abre essa frente.

## 8. Pendente de validação externa (não entra no checklist sem fonte ou resposta)

1. **Portaria CAT 42/2018** (complemento e ressarcimento): ler a redação vigente antes do item 32. Fonte:
   legislacao.fazenda.sp.gov.br.
2. **Portarias SRE de IVA-ST por setor** (a que vale para cada CEST da CAT 68): fonte do percentual dos itens 31 e 34.
3. **RICMS/SP art. 566** (dia sem expediente) [D26 baixado, não lido] e Anexo IV para a guia de recolhimento especial
   (antecipação, item 31).
4. **Portaria CAT 28/2020 e CAT 44/08** (estoque na saída e na entrada da ST): tratamento do item 33.
5. **Res. Senado 22/1989 e 13/2012**: alíquotas interestaduais das outras UFs (item 2).
6. **Alíquotas internas de SP além de 18% e 25%** (arts. 53, 53-A, 54, reduções de base do Anexo II, FCP): só entram
   como linha quando o tenant vender a NCM. A redação vigente de cada uma tem de ser conferida, porque a página da
   SEFAZ intercala redações antigas.
7. **L-ICMS-2** (PRE-ADR): mês de início do RPA do Simples impedido (LC 123 arts. 13-A e 20 §§ 1º, 1º-A e 3º, na redação
   da LC 214 [D19]; a redação mostra "Vide LC 214").
8. **F-ICR-9 — pergunta exata ao tributarista/contador:** *"Em 2027–2032, numa NF-e de venda de mercadoria em SP com
   IBS e CBS destacados, o valor do IBS e da CBS integra a base de cálculo do ICMS próprio (LC 87 art. 13 I e § 1º)? A
   CF art. 156-A § 1º IX e art. 195 § 17 não incluem o ICMS entre os tributos de cuja base o IBS e a CBS não fazem
   parte."*
9. **Contas contábeis** (dedução "ICMS sobre vendas", ICMS a recolher, ST a recolher, CIAP): código do contador de
   cada tenant (P-5 do X7, molde).
10. **NT 2025.002 / MOC 7.0 — conferido em parte (21/11, depois do questionário):**
    - a UB16-10 manda **subtrair o `vICMS`** da base do IBS/CBS, o que bate com o ADCT art. 133;
    - o leiaute cria um total separado, `vNFTot` (W60, "Valor total da NF-e com IBS / CBS / IS"), ao lado do `vNF`, o que
      indica que o `vNF` e o `vProd` não carregam IBS/CBS (`TRANSCRICAO-NT2025002-v152-UB-2026-10-26.md:703, 979-995`).
    Isso apoia a leitura (i) do F-ICR-9 como prática do leiaute. **Inferido**: nenhuma regra da NT diz o que entra no `vBC`
    do ICMS. A resposta do dono ao F-ICR-9 fica de pé, e a pergunta do item 8 continua necessária.
11. **Correspondência NBM/SH 1996 → NCM vigente** para as posições do art. 55 IV (3303, 3304, 3305, 3307 e as
    exceções 3305.10, 3307.20, 3307.10.0100, 3307.90.0500 e anti-solares de 3304). Até a conferência, as linhas de 25%
    ficam `DRAFT` (item 1).

## 9. Insumos ausentes (registrados, não varridos)

- Texto das portarias SRE de IVA-ST (§8-2), da CAT 42/2018 (§8-1) e da CAT 28/2020 (§8-4).
- Transcrição dos subgrupos `ICMS10/20/40/60` do MOC 7.0 Anexo I (o X10a transcreveu só `ICMS00` e `ICMSSN102/500`).
  É o 1º passo do PR-2.
- Tabela de CFOP (Convênio s/nº de 15/12/1970, SINIEF) para o catálogo fechado do item 11.
- Guia Prático da EFD ICMS/IPI vigente (L-ICMS-6): só importa no F-ICR-10.
- O BRIEF do CICLO-FISCAL está no PR #1322, ainda não mergeado: a aresta do item 24 assume a forma "o calendário lê a
  apuração", e isso tem de ser conferido quando o #1322 entrar.

## 10. Achados fora de escopo (na caixa de lacunas)

1. **ICMS do Simples fora do DAS** (F-ICMS-10 a ratificado: DIFAL "h", antecipação "g" 2, DeSTDA) sem nó. As lacunas
   `6aa2` e `38c0` da calculadora tocam a conta, mas não o módulo. → `L-20261121-220641-5322` (feature).
2. **O PRE-ADR-ICMS-IPI-EFD continua em `docs/accounting/`, com status "Proposed"** (F-ICMS-1 a manda movê-lo para
   `docs/adr/`). Este BRIEF cria o nó; mover o arquivo e atualizar o cabeçalho fica para o fold. →
   `L-20261121-220642-d46e` (débito).
3. **O calendário do CICLO-FISCAL** (PR #1322, F-CF-9 a) não tem o ICMS do RPA. O vencimento pelo CPR entra quando o
   PR-4 existir. → `L-20261121-220644-18f2` (spec).
4. **A simulação** (`taxSimulation.ts:368`) passa a poder ler o ICMS do RPA quando o PR-3 existir. Isso é item do
   montador único (sessão própria), não deste nó. → `L-20261121-220645-2c9e` (spec).
5. **Exclusão do ICMS da base do PIS/COFINS** (Tema 69, Lei 14.592) para a revenda: já está como emenda do X8 no EF D10.
   Fica só registrado aqui, sem lacuna nova.
6. **EFD-Contribuições:** continua fork na lacuna `L-20261121-183239-3b81`. Só a metade ICMS/IPI foi respondida
   (F-ICR-10).

## 11. Write-set

| PR | Arquivos (globs) |
|---|---|
| PR-0 | `server/src/features/legalParameters/models/legalParameter.ts`, `server/src/features/legalParameters/models/formatoLinha.ts`, `server/prisma/data/legal_parameters_icms_*.sql`, `server/prisma/migrations/**`, `server/src/features/accounting/dtos/FiscalProfileDto.ts`, `server/src/features/accounting/dtos/ProductFiscalProfileDto.ts`, `server/src/features/accounting/models/icms*.ts`, `scripts/gerar-icms-*.mjs` |
| PR-1 | `server/src/lib/nfe.ts`, `server/src/lib/nfeCost.ts`, `server/src/features/accounting/services/NfeImportService.ts`, `server/src/features/accounting/services/FiscalBookService.ts`, `server/src/features/accounting/repositories/*FiscalBook*`, `server/src/features/accounting/services/FiscalDocumentEmissionService.ts` |
| PR-2 | `server/src/features/accounting/services/AccountingPolicyVersionService.ts`, `server/src/features/accounting/services/policyVersionApply.ts`, `server/src/features/accounting/dtos/AccountingPolicyVersionDto.ts` (F-ICR-9 a), `docs/accounting/fontes-oficiais/TRANSCRICAO-*ICMS*`, `server/src/features/accounting/models/nfeMontagem.ts`, `server/src/features/accounting/models/nfeIbsCbsMontagem.ts`, `server/src/features/accounting/models/nfePrecondicoes.ts`, `server/src/features/accounting/dtos/NfePayloadDto.ts`, `server/src/features/accounting/models/icmsItem.ts` |
| PR-3/4 | `server/src/features/accounting/models/icmsApuracao.ts`, `server/src/features/accounting/dtos/IcmsAssessmentDto.ts`, `server/src/features/accounting/services/IcmsAssessmentService.ts`, `server/src/features/accounting/repositories/*IcmsApuracao*`, `server/src/controllers/*Icms*`, `server/src/features/accounting/policies/**`, `server/src/features/accounting/models/obrigacoesPorRegime.ts` |
| PR-5/6 | `server/src/features/accounting/models/icmsSt*.ts`, `server/src/features/accounting/services/IcmsAssessmentService.ts`, `server/src/features/accounting/services/InventoryService.ts`, `server/src/features/accounting/repositories/*Inventory*` (F-ICR-7 a) |
| PR-7 | `server/src/features/accounting/models/icmsCiap.ts`, `server/src/features/accounting/services/IcmsCiapService.ts` |
| PR-8 | `server/src/features/accounting/models/icmsTransicao.ts` |

**Choke points (PAR-001):** `server/prisma/schema.prisma`, `server/src/lib/factory.ts`, `server/src/routes/accounting.ts`,
`server/src/routes/docs/accounting.icms-assessments.paths.ts`, `server/src/routes/docs.paths.ts`, `server/public/openapi.json`,
`server/src/features/accounting/audit/auditCanonical.ts`, `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts`,
`server/test/helpers/db.ts`.

**Colisão conhecida:** o PR-2 edita `nfeMontagem.ts` e `NfePayloadDto.ts`, que são do X10a (inflight). O PR-2 roda em
série com qualquer PR aberto do X10a nesses arquivos.

## 12. Invariantes (cada uma vira teste)

1. Saldo devedor e saldo credor a transportar nunca são positivos ao mesmo tempo (art. 87 III "l").
2. `saldoCredorAnterior(M) = saldoCredorTransportar(M−1 vivo)`, ou o informado com memória no 1º mês RPA.
3. Σ débito por item do livro de saída `REGULAR` do mês = alínea a, sem arredondamento no total (o arredondamento é por
   item, igual ao `vICMS` da nota).
4. Nenhum crédito de item `USO_CONSUMO`, `INSUMO_SERVICO` ou com ST.
5. Tie-out do mês (F-ICR-4 b, regras U1–U3 do item 23).
   - **a-recolher:** Σ créditos no a-recolher do mês (notas `icms_saida` vivas + alíneas b/c do 23b) − compensação =
     `aRecolherCents`.
   - **a-recuperar:** Σ débitos no a-recuperar do mês (entradas X6 + devoluções de venda + f/g do 23b) − compensação =
     `saldoCredorTransportarCents` − `saldoCredorAnteriorCents`.
   - Passa com a apuração substituída estornada e com a nota cancelada estornada.
6. Fato gerador ≥ 2033 nunca gera débito (ADCT 129).
7. Nenhum cálculo de ST, antecipação ou complemento usa linha `DRAFT`.

## 13. Fold desta sessão

- Nota nova `docs/plano/nos/ICMS-EFD.md` (`estado: planned`, `write_set`, `registros`).
- Decisão [[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]] com a citação da autorização e as respostas F-ICR-1..10.
- Dossiê legal versionado (manifest + `.txt`).
- Estado de nenhum outro nó muda.
- A lacuna `3b81` ficou `aberta`, com o destino "metade ICMS/IPI absorvida pelo ICMS-EFD (F-ICR-10 a)".
- Próximo passo: `executa` do PR-0 (pedido do dono), pela `sessao-feature`.
