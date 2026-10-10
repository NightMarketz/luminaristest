# PRE-ADR-ICMS-IPI-EFD — Escopo da apuração de ICMS/IPI e da EFD ICMS/IPI: UFs, ST/DIFAL, FCP, CIAP e qual vertical primeiro

- **Data:** 2026-10-10
- **Status:** **Proposed** — F-ICMS-0..14 com **RATIFICAÇÃO PENDENTE**. Nenhum código autorizado. Sem "executa".
- **Autorização:** dono, chat, 2026-10-10, questionário: *"PRE-ADR EFD ICMS/IPI"*, opção descrita como *"PRE-ADR de
  escopo da apuração de ICMS/IPI e da EFD: quais UFs, ST/DIFAL e qual vertical de comércio primeiro."* Escopo: só
  documento, sem código, sem "executa".
- **Divergências registradas (passo 1 da `sessao-planejamento`):**
  1. **Onde a citação está.** A sessão que me despachou repassou a citação. Ela **não** está na nota
     `docs/plano/decisoes/D-2026-10-10-QUESTIONARIO-DONO.md`, que cobre Q1–Q7 de outro questionário. O fold na nota de
     decisão fica para quem integrar este documento.
  2. **Caminho.** O pedido fixa `docs/accounting/`. Os exemplares (`PRE-ADR-SIMPLES-NACIONAL-CALCULO.md`,
     `PRE-ADR-NUCLEO-KIT-DE-SETOR.md`) estão em `docs/adr/`. Segui o pedido e registrei como F-ICMS-1(b).
  3. **"EFD-Contribuições (X8)" no contexto do pedido.** O nó X8 diz outra coisa: *"F-X8-1 → (a): apuração mensal +
     provisão + valor para o X9, **sem gerador de EFD-Contribuições** (diferido)"* (`docs/plano/nos/X8.md`, frontmatter).
     O repo gera ECD e ECF. **Não gera nenhuma EFD.** Isso pesa no F-ICMS-0: não há gerador de EFD para reaproveitar.
  4. A autorização cobre **escopo**: UFs, ST/DIFAL e vertical. Ela não cobre BRIEF, nó nem código, e por isso este
     documento não propõe nenhum dos três como decidido.
- **Nó:** nenhum. O item é PROPOSTO em `destino/06-catalogo-completo-de-modulos-16-dominios.md:86` (*"EFD ICMS/IPI; ST
  e DIFAL"*). Pela regra do vault (`docs/plano/README.md`, última linha), ele só vira nota em `nos/` **depois** de um
  PRE-ADR ratificado. A proposta de id está no F-ICMS-1.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `845d79ce` (10/10). Fontes externas lidas em 10/10/2026 (URLs no §2.3).

## TLDR

**Verdade principal.** Hoje nenhum tenant é obrigado à EFD ICMS/IPI, e o 1º cliente também não é. Ele é ME/EPP do
Simples em SP, com IE, e está **dispensado** pelo Protocolo ICMS 3/2011, cláusula segunda, II. A exceção é o optante
*"impedido de recolher o ICMS por este regime"*, ou seja, quem estoura o sublimite. Em SP, o RPA (regime periódico de
apuração) entrega **só** a EFD desde jan/2026: a GIA foi dispensada pela Portaria SRE 2/2025, conforme o portal da
SEFAZ-SP. O ICMS sai do jogo por etapas. As alíquotas caem para 9/10 em 2029, 8/10 em 2030, 7/10 em 2031 e 6/10 em 2032,
e o imposto é **extinto em 2033** (EC 132, ADCT arts. 128 e 129). O IPI tem alíquota **zero desde 2027**, salvo produto
com industrialização incentivada na ZFM (ADCT art. 126, III, "a"). Tudo verificado em fonte primária nesta sessão.

**Risco principal.** O ICMS não morre limpo em 2033:

- O saldo credor de 31/12/2032 só vale se estiver *"regularmente apurado na escrituração fiscal"* (LC 227/2026,
  art. 132, § 1º, II).
- O crédito de ativo (CIAP) entrado **a partir de 2029** exige pedido de homologação *"no mesmo período de apuração em
  que tiver início o aproveitamento"* (art. 134, § 1º, I).
- Esse crédito segue compensando contra o IBS até 2037 ou depois (art. 137, I).

Logo, um tenant contribuinte do RPA que entrar entre 2027 e 2032 precisa de EFD e de CIAP corretos **desde o 1º mês**.
Se não, ele perde crédito.

**Recomendação F-ICMS-0 → (c) com gatilho, mais duas peças sem arrependimento:**

1. **Não** construir agora a apuração do RPA nem o gerador de EFD.
2. Fixar os gatilhos objetivos que abrem o BRIEF (§4, F-ICMS-0). O mais provável é o próprio 1º cliente cruzar o
   sublimite.
3. Construir antes, dentro do PRE-ADR de IBS/CBS (F-ICMS-13), o **livro fiscal por item** (entradas e saídas
   persistidas com NCM/CEST/CFOP/CST/valores). Ele serve a ICMS, IBS/CBS e EFD.
4. Tratar já o **ICMS fora do DAS do Simples** (DIFAL de entrada, antecipação/ST, DeSTDA em SP) como fork próprio
   (F-ICMS-10). Ele depende do perfil de compras do 1º cliente.

---

## 1. Objetivo (sob a letra)

A letra é "PRE-ADR de escopo do ICMS/IPI e da EFD". O objetivo é decidir **quanto investir em ICMS/IPI, quando e em
que ordem**. O tributo tem prazo de morte constitucional. Os clientes reais de hoje são de serviço e do Simples. E o
produto promete, no destino, cobrir de MEI a Lucro Real, inclusive comércio e indústria (`destino/03`, `destino/11`).

"Completude, não MVP" (regra do dono) entra aqui de um jeito preciso. Completude é **não deixar buraco que custe
dinheiro ou crédito ao tenant**. Não é construir hoje o que nenhum tenant pode usar. Por isso a recomendação é
**gatilho + fundação compartilhada**, e não "nada" nem "tudo".

**O oráculo não é este sistema.** A EFD é validada pelo PVA da RFB/SEFAZ, e a apuração do ICMS é conferida pela SEFAZ.
O que o Luminaris produziria é escrituração que passa no PVA e apuração que bate com ela. O critério de aceite de
qualquer BRIEF que sair daqui é **PVA sem erro + revisão do contador**, como no H1/X5 da ECD/ECF.

## 2. Evidência

Grau: **V** = lido nesta sessão, no arquivo ou na norma · **I** = inferido · **NV** = não verificado.

### 2.1 Plano e decisões

| Claim | Grau | Evidência |
|---|---|---|
| EFD ICMS/IPI, ST e DIFAL são **PROPOSTO** no catálogo. "Motor de regras… por NCM/NBS/CFOP/CST" leva um ⟨corr⟩: *"o PRE-ADR deve provar que é tabela versionada (dado), não engine em runtime"* | V | `docs/plano/destino/06-catalogo-completo-de-modulos-16-dominios.md:85-88` |
| Destino da reforma: *"2029–2032: Transição gradual ICMS/ISS → IBS com alíquotas por ano em tabela versionada por vigência (dado, não código)"*; *"2033: obrigações legadas desligadas por data de vigência"* | V | `docs/plano/destino/10-brasil.md:12-13` |
| Rejeitadas: Motor de Regras Contábeis (template gera lançamento), Motor de Domínio (DAG/fila), Torre multiempresa | V | `docs/plano/rejeitadas/R-motor-regras.md`, `R-motor-dominio.md`, `R-torre-multiempresa.md` |
| IBS/CBS está **diferido**, sem autorização; para o salão é "controle extracontábil para conciliação" | V | `docs/plano/diferidos/M5-ibs-cbs.md` |
| A ingestão de NF-e está feita (#267) | V | `docs/plano/diferidos/M5-cnab-nfe.md` |
| X6: custo por regime, com o ICMS próprio saindo do custo **só** para quem tem `icmsContribuinte=true`; o ICMS-ST nunca sai | V | `docs/plano/nos/X6.md`; `server/src/lib/nfeCost.ts:140-155` |
| ITEM-DESTINATION: revenda × insumo do serviço × imobilizado por item; no insumo, o ICMS fica no custo | V | `docs/plano/nos/ITEM-DESTINATION.md`; `nfeCost.ts:153-155` |
| FIN-10: estoque perpétuo + CMV | V | `docs/plano/nos/FIN-10.md` |
| X8: apuração de PIS/COFINS **sem** gerador de EFD-Contribuições (diferido) | V | `docs/plano/nos/X8.md` |
| X10a: BRIEF da NFC-e com `ProductFiscalProfile` (NCM, CEST, origem, CFOP, CSOSN/CST ICMS) **ratificado, sem "executa"** | V | `docs/plano/nos/X10a.md`; `docs/accounting/BE-INCR-NFCE-brief.md:198-206, 373-382` |
| X13: a matriz de obrigações deixa **EFD-Contribuições e EFD ICMS/IPI de fora "até ter fonte"** (F-XP-7 a) | V | `server/src/features/accounting/models/obrigacoesPorRegime.ts:6` |
| X7: *"GIA-SP dispensada desde 2026"* já registrado | V | `docs/plano/nos/X7.md`, estado_detalhe (29/09) |
| 1º cliente: Simples, SP capital, **com IE, vende produto no balcão**. Perfumaria/higiene **saíram da ST em SP em 01/04/2026** (Portaria SRE 94/2025) | V | `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md:25, 102-103` |
| O PRE-ADR do Simples deixou o **DIFAL** de compra interestadual como pendência (§8 item 10, art. 13 § 1º XIII "h") | V | `docs/adr/PRE-ADR-SIMPLES-NACIONAL-CALCULO.md` §8 |

### 2.2 O código (fato consumado)

Confirmado por grep de `icms` em `server/src`: **não existe cálculo de ICMS**. O que existe:

| Claim | Grau | Evidência |
|---|---|---|
| O parser da NF-e lê por item `ncm`, `cfop`, `vICMS`, `vICMSST`, `vIPI`, CST de PIS/COFINS. **Não lê** `CST`/`CSOSN` do ICMS, `orig`, `CEST`, `vBC`, `pICMS`, `pMVAST`, `vBCST`, FCP nem DIFAL (`ICMSUFDest`) | V | `server/src/lib/nfe.ts:56-72, 199-238` |
| Os totais lidos são `vICMS`, `vST`, `vIPI`, `vProd`, `vDesc`, `vFrete`, `vSeg`, `vOutro`, `vNF` | V | `nfe.ts:252-262` |
| `FiscalProfile` (por unidade) tem `icmsContribuinte` (**significa "crédito de ICMS na compra"**, não "tem IE") e `icmsRecuperavelAccountId`. **Não tem IE, UF nem CRT** | V | `server/prisma/schema.prisma:1404-1416`; grep `inscri` só acha `inscricaoMunicipal` (`:1462`) |
| `SIMPLES && icmsContribuinte` ⇒ 400 (LC 123 art. 23) | V | `server/src/features/accounting/dtos/FiscalProfileDto.ts:9, 118` |
| A NF-e importada vira **um `Payable`** com `inventoryItems`/`fixedAssetItems`/`insumoItems` e `recoverableTaxLines`. **Não há livro fiscal de entradas persistido** por item (C100/C170) | V | `server/src/features/accounting/services/NfeImportService.ts` (≈ linhas 136-176); `schema.prisma:862-882` (`SourceDocument.rawJson` é opcional) |
| `FiscalDocument` é o documento **emitido** (NFS-e hoje; `DfeKind = 'NFSE' \| 'NFE'`) | V | `schema.prisma:1661`; `dfe/DfeEmissorPort.ts:13` |
| Estoque: `InventoryItem` por `[userId, unitId, productRef]` com custo médio em centavos; `productRef` aponta para linha de DynamicTable | V | `schema.prisma:1286-1302` |
| Imobilizado (C8): `FixedAsset` com `ncmPrefix`, `sourceDocumentId`; o ICMS da aquisição vai **ao custo**; **CIAP fora do escopo** do C8 | V | `schema.prisma:1914-1944`; `BE-INCR-FIXED-ASSETS-brief.md:26, 67, 300, 320` |
| Parâmetros legais versionados por vigência: `LegalParameter` com 23 tabelas, inclusive `CFOP_IMOBILIZADO`, `LEIAUTE_SPED`, as do Simples. **Nenhuma de ICMS** (alíquota, MVA, FCP) | V | `server/src/features/legalParameters/models/legalParameter.ts:9-34` |
| A apuração do Simples já detecta **sublimite excedido** e tira ICMS/ISS (e IBS a partir de 2027) do DAS | V | `server/src/features/accounting/models/simplesCalc.ts:309-320` |
| `TaxAssessment` (X7/X8) guarda a apuração confirmada de tributo, com `tributo` String e `memoria` Json | V | `schema.prisma:2505-2549` |
| Geradores SPED existentes: ECD (`SpedGenerationService`, `lib/sped.ts`) e ECF (`SpedEcf*`, `lib/ecf*.ts`). Nenhum gerador de EFD | V | `ls server/src/features/accounting/services`, `server/src/lib` |
| O plano de contas padrão não tem "ICMS a recolher" nem "ICMS a recuperar" (o a-recuperar é conta configurada no perfil) | V | `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts` (grep `ICMS`: nada) |
| Produto: preset DynamicTable **sem NCM/CFOP/origem** | V (via BRIEF) | `BE-INCR-NFCE-brief.md:58, 113` |

### 2.3 A norma (lida em 10/10/2026; texto tachado descartado pela regra `tabela-transcrita-de-lei-conferir-redacao-vigente`)

Baixei as compiladas do Planalto para o scratchpad (não commitadas) e extraí o texto descartando `<strike>` e
`line-through`. Os dispositivos abaixo são **V**, salvo marcação.

| Fonte / dispositivo | O que diz (resumo) | URL |
|---|---|---|
| **EC 132/2023**, ADCT art. 126, III, "a" | A partir de 2027 o IPI *"terá suas alíquotas reduzidas a zero, exceto em relação aos produtos que tenham industrialização incentivada na Zona Franca de Manaus"* | <https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm> |
| EC 132, ADCT art. 128 | ICMS/ISS em 2029–2032 a 9/10, 8/10, 7/10, 6/10 das alíquotas; benefícios reduzidos na mesma proporção (§ 1º) | idem |
| EC 132, ADCT art. 129 | ICMS e ISS *"extintos, a partir de 2033"* | idem |
| EC 132, ADCT art. 134, § 3º, I | Saldo credor de ICMS homologado, compensado com IBS: CIAP *"pelo prazo remanescente"* do art. 20 § 5º da LC 87; demais créditos em 240 parcelas | idem |
| **LC 227/2026**, arts. 132–137 (Título IV, "Disposições relativas à transição do ICMS") | Saldo credor reconhecido se *"regularmente apurado na escrituração fiscal"* (132 § 1º II); pedido de homologação em até 5 anos desde 01/01/2033 (134 I); **CIAP de bem entrado a partir de 01/01/2029: pedido "no mesmo período de apuração em que tiver início o aproveitamento"** (134 § 1º I); segregação CIAP × demais (136); compensação com IBS (137) | <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm> |
| **LC 87/1996**, art. 20 § 5º | CIAP: crédito do ativo à razão de 1/48 por mês, multiplicado pela razão saídas tributadas / saídas totais; alienação antes de 4 anos interrompe | <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm> |
| LC 87, art. 33, I | Crédito de uso e consumo *"a partir de 1º de janeiro de 2033"* (red. LC 171/2019). Com a extinção em 2033, **na prática nunca** (**I**) | idem |
| LC 87, art. 8º | Base da ST com *"margem de valor agregado, inclusive lucro"* (MVA) | idem |
| **LC 190/2022** (altera LC 87: arts. 4º § 2º, 11 V e § 7º, 12 XIV–XVI, 13 IX–X e §§ 3º, 6º, 7º, 20-A, 24-A) | DIFAL em operação interestadual a consumidor final: o contribuinte é o **destinatário** se for contribuinte, o **remetente** se não for. Base de cálculo por dentro, conforme a UF de destino (art. 13 §§ 6º-7º). Portal nacional do DIFAL (24-A) | <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp190.htm> |
| **EC 87/2015** | Partilha do DIFAL a não contribuinte (origem de fundo constitucional) | <https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc87.htm> |
| **LC 123/2006**, art. 13 § 1º XIII "a"–"h" | ICMS **fora do DAS**: ST (lista inclui *"cosméticos; produtos de perfumaria e de higiene pessoal"*), por terceiro, desembaraço aduaneiro, antecipação nas aquisições interestaduais com ou sem encerramento ("g"), e **diferença entre a alíquota interna e a interestadual** nas aquisições interestaduais não sujeitas à antecipação ("h") | <http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm> |
| LC 123, art. 20 § 1º | EPP que ultrapassa o sublimite fica *"automaticamente impedida de recolher o ICMS e o ISS na forma do Simples Nacional, a partir do mês subsequente"* (a leitura da compilada intercala redações: **conferir** — L-ICMS-2) | idem |
| **Res. CGSN 140/2018**, arts. 63–65 (corpus `docs/accounting/fontes-oficiais/Res-CGSN-140-2018.txt`) | Livros do optante contribuinte de ICMS (Entradas, Inventário). Sped do optante **só** para EPP acima do sublimite e em perfil que não exija apuração (art. 64 § 4º I). Escrituração fiscal digital estadual com pré-escrituração e programa gratuito (art. 65) | corpus (MANIFEST) |
| **Ajuste SINIEF 2/2009** (redação consolidada CONFAZ) | Cláusula primeira § 3º: a EFD substitui os livros de Entradas, Saídas, Inventário, Apuração do IPI e do ICMS, o **CIAP** e o **Registro de Controle da Produção e do Estoque** (Bloco K). Cláusula terceira: obrigatória para contribuintes do ICMS/IPI, com dispensa por Protocolo. Cláusula quarta: arquivo **mensal**, com a "totalidade das informações". Cláusula quinta: **perfil** atribuído pela UF (default "A"). Cláusula décima segunda: envio até o dia 5, e a UF pode alterar. § 7º: Bloco K escalonado por CNAE e faturamento | <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2009/AJ_002_09> |
| **Protocolo ICMS 3/2011**, cláusula segunda (red. Prot. 91/13) e parágrafo único (red. Prot. 49/15) | Dispensa da EFD o MEI/SIMEI e a **ME/EPP do Simples, "salvo o que estiver impedido de recolher o ICMS por este regime na forma do § 1º do art. 20 da LC 123"**. A dispensa não vale onde a UF estabeleceu a obrigatoriedade até o 1º trimestre de 2014 (LC 123 art. 26 § 4º-C). SP é signatário | <https://www.confaz.fazenda.gov.br/legislacao/protocolos/2011/pt003_11> |
| **Portaria CAT 147/2009** (SP), arts. 1º e 10 (redação vigente) | Obrigado é quem está relacionado no Protocolo; o não relacionado fica dispensado (§ 1º). Credenciamento voluntário (§ 5º). Envio **até o dia 20** do mês seguinte (art. 10, efeitos desde abr/2016) | <https://legislacao.fazenda.sp.gov.br/Paginas/pcat1472009.aspx> |
| **Portaria SRE 2/2025** (SP), via portal SEFAZ-SP | GIA dispensada para **todos** os contribuintes do RPA nas operações a partir de 01/01/2026; GIA de período anterior continua exigível | <https://portal.fazenda.sp.gov.br/servicos/gia/Paginas/DispensadasGIA.aspx> (o texto da portaria **não** foi lido: NV) |
| **DeSTDA** em SP (Ajuste SINIEF 12/2015; Portaria CAT 23/2016), via portal SEFAZ-SP | Exigida de **todo** optante do Simples com IE paulista (salvo MEI), pelo SEDIF-SN, até o **dia 28** do mês seguinte, e dispensada sem valores a declarar | <https://portal.fazenda.sp.gov.br/servicos/simples/Paginas/destda.aspx> (a Portaria CAT 23/2016 **não** foi lida: NV) |
| **Guia Prático da EFD ICMS/IPI** | A pasta oficial do SPED lista como mais recente o **3.2.2**. Notícias citam 3.2.3 (06/05/2026) e **3.2.4** (Ato COTEPE/ICMS 86, de 09/09/2026). A 3.2.2 traz a exceção 11 do C100: documento só com tributos da reforma, sem ICMS/IPI, **não** se escritura | <http://sped.rfb.gov.br/item/show/1573> (lista lida); 3.2.2 = <http://sped.rfb.gov.br/item/show/8112> (PDF **não** baixado: NV no conteúdo). Notícias: [Fenacon](https://fenacon.org.br/noticias/nova-versao-do-guia-pratico-e-do-programa-da-efd-icms-ipi-entram-em-vigor-em-janeiro-de-2026/), [Senior](https://documentacao.senior.com.br/exigenciaslegais/noticias/federal/2026/2026-03-26-sped-efd-icms-ipi-nova-versao-3-2-2-do-guia-pratico-da-efd-icms-ipi-para-2026), [Jornal Contábil 3.2.4](https://jornalcontabil.com.br/noticia/publicada-nova-versao-3-2-4-do-guia-pratico-efd-icms-ipi/) |

**LC 214/2025** (compilada, já com a LC 227): o grep de "ICMS" acha só o Simples, benefícios e IS (art. 70 §§ 5º-6º).
**Não** há cronograma de extinção do ICMS na LC 214: ele está na EC 132 (ADCT 128–129). A transição do saldo credor
está na LC 227. O pedido citava "cronograma LC 214/2025 de extinção do ICMS": a fonte correta é a EC 132.

Estrutura da EFD (blocos 0, B, C, D, E, G, H, K, 1, 9; registros C100/C170/C190, E110/E111/E116, E200/E210 para ST,
E300/E310 para DIFAL/FCP, G110/G125 para CIAP, H010 para inventário, K200/K230 para produção): **I**, de memória do autor.
O Guia não foi baixado nesta sessão (§9).

### 2.4 Referência de código aberto (código-fonte, não marketing)

**OCA `l10n-brazil`, branch 18.0, commit `296438366ff2` (09/10/2026)**, módulo `l10n_br_fiscal/models/`:

| O que | Onde | Como modela (lido) |
|---|---|---|
| Operação fiscal | `operation.py`, `operation_line.py` | `Operation` (natureza: venda, compra, devolução, com `return_fiscal_operation_id`/`inverse_fiscal_operation_id`) → `OperationLine` com **`cfop_internal_id` / `cfop_external_id` / `cfop_export_id`** (o CFOP sai do par operação × destino), filtros por `partner_tax_framework`, `company_tax_framework`, `ind_ie_dest`, `product_type`, `icms_origin`, mais `tax_definition_ids` |
| Regra de tributo | `tax_definition.py:67-274` | `TaxDefinition`: tax group + `tax_id` (alíquota) + `cst_id`, condicionado por `state_from_id`/`state_to_ids`, `ncm_ids`/`cest_ids`/`nbm_ids`/`product_ids`, `ind_final`, `is_benefit`, `cfop_id`; tem `date_start`/`date_end` e `state` (draft/review/approved) |
| Regulamento de ICMS por UF | `icms_regulation.py:162-427` | Um `IcmsRegulation` com abas geradas **por UF** (interno, externo, ST, FCP, FCP-ST, benefício). A busca (`_build_map_tax_def_domain`) filtra `state='approved'`, UF de origem/destino e NCM/CEST/NBM. O desempate (`_tax_definition_search`) é benefício > específico por NCM/CEST/produto > genérico. DIFAL em `map_tax_def_icms_difal` |
| Cálculo | `tax.py:264-703` | MVA é campo do **registro de alíquota** (`icmsst_mva_percent`, `:225`), não da regra. DIFAL (`:481-552`) usa base única ou dupla conforme **lista de UFs em constante de código** (`ICMS_DIFAL_UNIQUE_BASE`/`DOUBLE_BASE`). `_compute_icmssn` (`:669`) para o Simples. IBS/CBS/IS já presentes (`:721-789`) |
| EFD ICMS/IPI | `l10n_br_sped_efd_icms_ipi` | Existe **só na 16.0**, `development_status: Alpha`. O README diz: *"o mapeamento dos dados a partir das transações do Odoo é um trabalho parcial e em andamento"*. **Não foi portado** para 17.0/18.0, onde só há `l10n_br_sped_base` |

**Três achados de código que pesam aqui**, todos V pelo fonte acima:

1. **Vigência por "agora", não pela data do fato.** `_build_map_tax_def_domain` não filtra `date_start`/`date_end`
   (grep: os campos só aparecem na declaração). `operation.py:226-230` compara com `fields.Datetime.now()`. A partilha
   do DIFAL usa `fields.Date.today().year` (`tax.py:525`). Reprocessar um mês passado com regra nova dá número errado.
   O `LegalParameter` do Luminaris já resolve isso pela data do fato (`linhasVigentesDaTabela(…, data)`,
   `legalParameter.ts:100`).
2. **Regra configurável em runtime.** A `TaxDefinition` é um motor de regras editável pelo usuário (draft → approved),
   e isso colide com `R-motor-regras`/`R-motor-dominio`. O que dá para aproveitar é o **vocabulário** e a **chave de
   busca** (UF origem × UF destino × NCM/CEST × indicador de consumidor final × benefício), como **dado versionado**,
   não como regra editável.
3. **A EFD no OCA é a parte mais fraca.** O projeto de código aberto mais maduro do Brasil escreve a estrutura dos
   registros e deixa o mapeamento "parcial", com a complementação manual no PVA ou pelo escritório. É exatamente o
   caminho (b) do F-ICMS-0, e é sinal do custo do caminho (a).

**ERPNext (`frappe/erpnext`, branch develop):** não há localização brasileira (`erpnext/regional/` tem australia,
italy, south_africa, turkey, united_arab_emirates e united_states). O imposto por item é `Item Tax` (child) com
`item_tax_template`, `tax_category` e **`valid_from`** (`erpnext/stock/doctype/item_tax/item_tax.json`): vigência por
linha, sem regra por UF. Serve só para confirmar que "alíquota por item com vigência" é o padrão mínimo. Para ICMS, a
referência útil é o OCA.

## 3. Colisões verificadas

| Regra | Colide? | Como este PRE-ADR respeita |
|---|---|---|
| Motor de regras/domínio **rejeitado** | Sim, se F-ICMS-12 → (b) | Recomendação (a): tabelas `LegalParameter` geradas por script (UF × NCM/CEST × vigência) + função pura. Nada de regra editável em runtime, DSL ou DAG. O "motor de regras tributárias" do `destino/06` é lido como **tabela versionada**, como pede o ⟨corr⟩ |
| DynamicTable × Prisma (Contrato §2.1, AC-2.1-B2) | Não | Livro fiscal, apuração, CIAP e perfil fiscal do produto são Prisma first-class. O produto continua no preset; o dado fiscal dele fica em `ProductFiscalProfile` (X10a, F-NFCE-3 b) |
| Torre multiempresa rejeitada | Não | A EFD é **por estabelecimento** (IE). O `unitId` já é "filial do mesmo CNPJ raiz" (`schema.prisma:1408`, R8). A IE entra no perfil da unidade, sem torre |
| X10a (NFC-e, `ProductFiscalProfile`) | Aresta, não colisão | Este PRE-ADR **consome** o `ProductFiscalProfile` do BRIEF da NFC-e. Se ICMS-RPA vier antes da NFC-e executada, o model nasce aqui com os mesmos campos (F-ICMS-12) |
| `icmsContribuinte` (decisão 5 de 29/09 → conserto no X10a) | Aresta | O campo quer dizer **crédito na compra**. A IE, o CRT e "apura ICMS pelo RPA" são outros fatos. Proposta: campos separados no perfil da unidade (§6), sem mexer na semântica do X6 |
| X14 (Simples) | Aresta | O sublimite excedido já é detectado (`simplesCalc.ts:309-320`). Ele é o **gatilho 1** do F-ICMS-0 |
| Regra ⛔ (sem aparato de auditoria novo) | Não | Nada aqui cria gate, rodada ou revisor. O oráculo continua sendo PVA + contador |

## 4. Forks (todos com RATIFICAÇÃO PENDENTE)

### F-ICMS-0 — Estratégia

- **(a) Apuração própria completa + EFD.** Para o RPA (Presumido/Real com IE): cálculo de ICMS próprio, ST (substituto
  e substituído), DIFAL, FCP, CIAP, E110/E111 com ajustes da Tabela 5.1.1 da UF, Bloco H, Bloco K quando houver
  indústria, e gerador da EFD que passe no PVA. Custo **alto**:
  - 27 legislações, com uma tabela de MVA/CEST por UF e protocolo;
  - Tabela 5.1.1 de ajustes por UF;
  - um oráculo (PVA + SEFAZ) que não existe sem cliente real.

  O retorno é limitado a 2027–2032: o imposto cai a 9/10 a partir de 2029 e acaba em 2033.
- **(b) EFD a partir dos documentos, com apuração importada ou informada.** Gera C100/C170/C190/D100 a partir das NF-e
  de entrada importadas e das emitidas. E110 = Σ dos documentos, mais ajustes digitados pelo contador (E111). Bloco H
  do `InventoryItem`. Sem cálculo de ST/DIFAL: o valor vem do XML. É o que o OCA faz (§2.4). Custo **médio**. Só tem
  uso com tenant obrigado.
- **(c) Adiar até haver tenant contribuinte do RPA**, com **gatilhos objetivos** que abrem o BRIEF:
  - (g1) tenant do Simples com IE cruza o sublimite: `simplesCalc` acusa `sublimiteExcedido` e, a partir do mês
    seguinte, o ICMS sai do DAS (LC 123 art. 20 § 1º);
  - (g2) tenant Presumido/Real **com IE** entra no onboarding (X13 já captura regime × porte);
  - (g3) o dono contrata vertical de comércio/indústria contribuinte.
- **(d) Priorizar IBS/CBS no lugar.** O IBS substitui o ICMS. Construir o motor por item para IBS/CBS (2026 teste,
  2027 CBS plena) e só "pendurar" o ICMS nele.

**Recomendação: (c) + a fundação comum de (d), mais o F-ICMS-10 já.** Por quê:

1. **Nenhum tenant é obrigado hoje** (Prot. ICMS 3/11, cl. 2ª II; o 1º cliente é Simples). Construir (a) sem oráculo
   produz código que não se valida: é a classe do `ORACLE-DEFICIT.md`.
2. **O que é comum aos dois mundos é o livro fiscal por item** (NCM, CEST, CFOP, CST/CSOSN, base, alíquota, valor,
   por documento e por item). O IBS/CBS precisa dele de qualquer jeito (crédito amplo por nota de entrada em 2027,
   `destino/10`), e o ICMS reaproveita. Fazer esse livro dentro do PRE-ADR de IBS/CBS (F-ICMS-13) é o investimento
   sem arrependimento.
3. **Quando um gatilho disparar, entra (b) antes de (a).** A EFD por documentos cobre o caso comum de comércio, em
   que a ST e o DIFAL vêm destacados no XML do fornecedor. O cálculo próprio de ST/DIFAL só é necessário quando o
   tenant é **substituto** ou **remetente a não contribuinte**.
4. **O risco de crédito de 2029–2032 (LC 227 arts. 132–134) torna o gatilho urgente quando dispara.** Por isso os
   gatilhos ficam escritos e monitoráveis (g1 já é um campo calculado), e não "quando der".

Contra a recomendação (viés nomeado): "completude" puxa para (a). Mas sem tenant obrigado, (a) não é completude, é
estoque de código sem oráculo. Se o dono quiser o produto vendável para comércio **antes** do 1º cliente de comércio,
a resposta muda para (b) já, em SP. É um fork de produto, e não de engenharia.

### F-ICMS-1 — Id do nó e lugar deste documento

- (a) Nó `ICMS-EFD` (um só, fases internas). (b) Dois nós: `ICMS-APUR` e `EFD-ICMS-IPI`. Documento em
  `docs/adr/` (padrão dos exemplares) **ou** em `docs/accounting/` (onde está, por pedido).

**Recomendação: (a), e mover para `docs/adr/` no fold.** A apuração e a EFD se fecham pelo E110: separar cria dois
nós com o mesmo oráculo. Os outros PRE-ADRs estão em `docs/adr/`.

### F-ICMS-2 — UFs iniciais

- (a) **SP primeiro**, com UF como **dado** (chave `ufOrigem × ufDestino` nas tabelas), sem código por UF.
- (b) Todas as UFs desde o início.
- (c) SP com código específico por UF.

**Recomendação: (a).** Os clientes são de SP. A chave por UF no dado (como o OCA faz em `state_from_id`/`state_to_ids`)
deixa a 2ª UF virar "carregar tabela", e não PR de código. A **alíquota interestadual** (4/7/12%, Res. Senado) entra
para todas as UFs desde o início, porque é nacional e pequena. Sem ela, nem o DIFAL de entrada do Simples (F-ICMS-10)
se calcula.

### F-ICMS-3 — ST/MVA

- (a) Calcular ST como **substituto** (base com MVA por UF × CEST/NCM, MVA ajustada interestadual, FCP-ST).
- (b) Só **substituído**: registrar a ST que vem no XML de entrada (`vICMSST` já é lido, `nfe.ts:69`) e escriturar a
  saída com o CST de ST retida, sem recalcular.
- (c) Fora.

**Recomendação: (b) no 1º BRIEF, (a) só com tenant substituto** (indústria/importador/atacadista nomeado em protocolo).
Varejo e serviço são substituídos. Calcular MVA exige a tabela de MVA por UF × CEST, que muda por portaria. É o item mais
caro da lista e o que mais rápido envelhece. A tabela entraria como `LegalParameter` (F-ICMS-11).

### F-ICMS-4 — DIFAL (EC 87/2015 + LC 190/2022)

Há dois DIFAL distintos na lei (LC 87 art. 12 XV × XVI):
- **Entrada:** contribuinte compra de outra UF para uso, consumo ou ativo (art. 12 XV; base no destino, art. 13 IX "b",
  § 6º).
- **Saída:** venda a não contribuinte de outra UF (art. 12 XVI; o remetente recolhe, art. 4º § 2º II; portal do art.
  24-A).

Caminhos:
- (a) Os dois.
- (b) Só o de entrada no 1º BRIEF; o de saída com vertical de e-commerce/venda à distância.
- (c) Fora.

**Recomendação: (b).** O de entrada atinge todo contribuinte que compra material de outra UF (salão incluído, se tiver
fornecedor de fora). O de saída só atinge quem vende para fora a consumidor final, e balcão não faz isso. A base "por
dentro" difere por UF (base única × dupla). O OCA põe isso numa **constante de código** (`tax.py:509-516`). Aqui seria
**coluna da tabela por UF** (dado com vigência).

### F-ICMS-5 — FCP

- (a) FCP como linha adicional na mesma tabela de alíquota (UF × NCM × vigência; FCP e FCP-ST).
- (b) Modelo próprio.
- (c) Fora.

**Recomendação: (a).** O FCP é um percentual adicional, condicionado por UF e produto, com a mesma chave da alíquota. O
OCA o modela como mais um `tax_group` na mesma `TaxDefinition` (`icms_regulation.py`, abas FCP/FCP-ST). Quais produtos
pagam FCP em SP é uma pergunta de lei (L-ICMS-9).

### F-ICMS-6 — IPI

- (a) Apuração de IPI + Bloco E200-like do IPI (E500/E510/E520).
- (b) Só registrar o IPI das entradas (custo, já feito no X6) e escriturar o C170 com o valor do XML.
- (c) Fora.

**Recomendação: (b), e (a) nunca**, salvo vertical ZFM. O IPI tem alíquota zero desde 2027 (EC 132, ADCT art. 126 III
"a"), menos a ZFM. Um tenant de serviço ou de comércio não é contribuinte de IPI, salvo equiparação (importação direta:
L-ICMS-10). Investir em apuração de IPI em 2026 serve a um ano e meio de vida útil.

### F-ICMS-7 — Bloco K e Bloco H

- (a) Bloco H (inventário) a partir do `InventoryItem`/`StockMovement`; Bloco K fora até haver indústria.
- (b) Os dois.
- (c) Nenhum.

**Recomendação: (a).** O Bloco H é obrigatório para todo contribuinte que entrega a EFD (inventário de fevereiro com
posição de 31/12, conforme o Guia: **I**) e o estoque perpétuo já tem quantidade e custo por produto × unidade
(FIN-10). O Bloco K, pelo Ajuste SINIEF 2/09 cl. 1ª § 7º, é de **estabelecimento industrial**, escalonado por CNAE e
faturamento. Sem vertical de indústria, não há tenant.

### F-ICMS-8 — CIAP (liga com o imobilizado C8)

- (a) Subrazão CIAP ligado ao `FixedAsset`: 1/48 por mês × fator saídas tributadas/totais (LC 87 art. 20 § 5º),
  baixa na alienação antes de 48 meses, Bloco G na EFD, **e marcação de bem entrado ≥ 01/01/2029** para o pedido de
  homologação no mês do 1º aproveitamento (LC 227 art. 134 § 1º I).
- (b) Continuar com o ICMS do ativo no custo (estado atual) e deixar o CIAP com o contador.
- (c) Só o controle das 48 parcelas, sem o fator de saídas.

**Recomendação: (a) quando o gatilho disparar; até lá, (b).** Para o Simples, (b) é o certo, porque ele não credita
(LC 123 art. 23). Para o RPA, (b) **perde crédito**, e depois de 2032 o saldo do CIAP continua compensando com IBS pelo
prazo remanescente (EC 132 ADCT art. 134 § 3º I; LC 227 art. 137 I). É o único pedaço do ICMS que vive além de 2033.
Por isso o desenho precisa segregar CIAP × demais créditos (LC 227 art. 136 I/II) desde o 1º lançamento.

### F-ICMS-9 — GIA / GIA-ST / DeSTDA por UF

- (a) Gerar a declaração estadual de cada UF que ainda a exija.
- (b) Fora em SP (GIA dispensada no RPA desde 2026; GIA-ST dispensada para contribuinte de outra UF desde jul/2025:
  **NV**, só notícia). DeSTDA tratada no F-ICMS-10.
- (c) Fora em todas.

**Recomendação: (b).** Em SP, a EFD é a única obrigação do RPA (SEFAZ-SP, Portaria SRE 2/2025). A GIA-ST não foi
lida em fonte primária. As outras UFs ficam para quando houver tenant nelas (F-ICMS-2).

### F-ICMS-10 — Simples: ICMS fora do DAS (ST, antecipação, DIFAL de entrada) e DeSTDA

Contexto V: o optante paga ICMS fora do DAS nas hipóteses do art. 13 § 1º XIII (ST, antecipação "g", diferencial de
alíquota "h") e, em SP, entrega a **DeSTDA** pelo SEDIF-SN até o dia 28, dispensada sem valores a declarar. Desde
01/04/2026, perfumaria e higiene saíram da ST em SP. O cosmético comprado **dentro** de SP não gera ST para o salão.

Caminhos:
- (a) Calcular o DIFAL/antecipação de cada entrada interestadual (alíquota interna SP − interestadual, *"vedada a
  agregação de qualquer valor"*, art. 13 § 1º XIII "g" 2) e montar o espelho da DeSTDA.
- (b) Registrar a guia paga (GARE/valor oficial) por competência e acusar **entrada interestadual sem guia
  registrada**. Sem calcular.
- (c) Fora: o contador cuida.

**Recomendação: (a) restrita ao DIFAL "h" e à antecipação "g" 2, condicionada ao insumo §8-1.** O cálculo é
aritmética simples: duas alíquotas, sem MVA. Os dados vêm da NF-e de entrada que já é importada (UF do emitente, NCM,
valor). E o custo do ICMS pago entra no custo do item (o Simples não credita). Se o 1º cliente **não** compra de fora
de SP, cai para (b) com o alerta. Pagar DIFAL sem saber é a classe de buraco que custa dinheiro ao tenant. Se SP cobra
o DIFAL do Simples nas compras para uso e consumo, e como, é pergunta de lei (L-ICMS-3).

### F-ICMS-11 — Fonte das tabelas (NCM, CEST, alíquota interna, interestadual, MVA, FCP por UF)

- (a) **`LegalParameter`**, com tabelas novas (`ICMS_ALIQ_INTERNA`, `ICMS_ALIQ_INTERESTADUAL`, `ICMS_ST_MVA`,
  `ICMS_FCP`, `ICMS_DIFAL_BASE`, `CEST_SEGMENTO`) geradas por script a partir da fonte oficial, chave `uf × ncm/cest`,
  vigência pela data do fato.
- (b) `const` TS gerada por script (técnica do `pisCofinsMonofasicoNcm.ts`).
- (c) Tabela de fornecedor comercial (API paga de regra fiscal).

**Recomendação: (a).** Já é o canônico (LEGAL-PARAMS, 23 tabelas, recálculo por mudança de parâmetro), resolve a
vigência pela data do fato (o defeito do OCA, §2.4 achado 1) e passou pela revisão do dono em 07/10. A guarda
"tabela nova no enum só com consumidor que a lê" (`legalParameter.ts:37-44`) segura o crescimento: só entra a tabela
que o 1º BRIEF consome. (c) colide com "Focus = referência, não fornecedor" (memória do dono, 07/10) e põe a régua
fiscal fora do repo.

### F-ICMS-12 — Modelo da operação fiscal (CFOP/CST por operação)

- (a) **Catálogo fechado em código** de naturezas de operação (venda interna, venda interestadual a contribuinte, a
  não contribuinte, devolução, transferência, remessa, compra para revenda, uso e consumo, ativo) → CFOP por
  `(natureza × dentro/fora da UF × destinação do ITEM-DESTINATION)`. O CST/CSOSN vem do `ProductFiscalProfile`.
  Alíquota e MVA vêm do `LegalParameter`.
- (b) Modelo configurável à la OCA (`Operation` → `OperationLine` → `TaxDefinition` editáveis pelo tenant).
- (c) O usuário digita o CFOP/CST em cada documento.

**Recomendação: (a).** É o vocabulário do OCA (`cfop_internal_id`/`cfop_external_id`, filtros por regime do parceiro e
`ind_ie_dest`) **sem** a regra editável que o plano rejeita. A destinação por item (ITEM-DESTINATION) já decide
revenda × insumo × imobilizado, que é metade da escolha do CFOP de entrada. Natureza nova = PR. Ela é rara, e é
decisão fiscal, não configuração do usuário.

### F-ICMS-13 — Livro fiscal por item persistido (a fundação comum)

Hoje a NF-e de entrada vira `Payable` + alocações. Não há registro fiscal de entradas por item (§2.2). A EFD (C100/C170)
e a apuração de IBS/CBS precisam dele.

- (a) Model `FiscalBookEntry` (cabeçalho: documento, modelo, chave, participante, UF, datas, totais) + `FiscalBookItem`
  (NCM, CEST, CFOP, CST/CSOSN ICMS, origem, base/alíquota/valor de ICMS, ST, IPI, FCP, DIFAL; e as colunas de
  IBS/CBS/cClassTrib). Gravado na importação da NF-e e na emissão. Nasce **no PRE-ADR de IBS/CBS**.
- (b) Nasce só quando o gatilho do ICMS disparar.
- (c) Nunca: reler o XML guardado na hora de gerar.

**Recomendação: (a).** É a peça "sem arrependimento" do F-ICMS-0. Sem ela, nem IBS/CBS nem EFD têm de onde ler. Com
ela, a EFD (b) vira um gerador sobre dado que já existe. (c) depende de o XML ter sido guardado: `rawJson`/attachment é
opcional (`schema.prisma:870-871`). E reparsear na geração esconde divergência entre o que foi escriturado no razão e
o que vai para o fisco. **Pré-requisito:** o parser passa a ler os campos que hoje ignora (`CST`/`CSOSN`, `orig`,
`CEST`, `vBC`, `pICMS`, ST, FCP, `ICMSUFDest`, grupo `IBSCBS`), e isso também fecha a dívida T3 registrada em
`M5-ibs-cbs.md` (grupos `IBSCBS` "ignorados em silêncio").

### F-ICMS-14 — Ordem em relação ao IBS/CBS

- (a) PRE-ADR de IBS/CBS primeiro (com o F-ICMS-13 dentro); o ICMS espera o gatilho.
- (b) ICMS primeiro.
- (c) Os dois juntos.

**Recomendação: (a).** A CBS é plena em 2027 para todo regime normal, e o Simples entra com IBS/CBS no DAS em 2027
(PRE-ADR do Simples, TLDR). O ICMS não tem tenant. O livro fiscal desenhado já com as colunas do ICMS evita a
migração dupla.

## 5. Comportamentos candidatos dos futuros BRIEFs (esqueleto — não é checklist executável)

Regra 3 da sessão: o comportamento leva a fonte. Onde a aplicação é **I**, fica "confirmação do contador".

| # | Comportamento | BRIEF | Classe | Fonte / fork |
|---|---|---|---|---|
| 1 | Parser da NF-e lê CST/CSOSN do ICMS, `orig`, CEST, vBC, pICMS, vBCST, pMVAST, FCP, `ICMSUFDest`, IBSCBS | B0 (no IBS/CBS) | direto | MOC NF-e (transcrição existente do X10a) · F-ICMS-13 |
| 2 | `FiscalBookEntry/Item` gravado na importação e na emissão, idempotente por chave de acesso (`@@unique`, sem soft-delete na chave; ver memória `unique-de-idempotencia-x-soft-delete`) | B0 | fork | F-ICMS-13 |
| 3 | Perfil da unidade ganha `inscricaoEstadual`, `uf`, `crt`, `icmsApuracao ∈ {SIMPLES_DAS, RPA}`, `efdPerfil ∈ {A,B,C}`; `icmsContribuinte` mantém o significado de crédito | B1 | fork | Ajuste SINIEF 2/09 cl. 5ª; F-ICMS-12 |
| 4 | Tabela `ICMS_ALIQ_INTERESTADUAL` (nacional) + `ICMS_ALIQ_INTERNA` de SP, no `LegalParameter` | B1 | fork | F-ICMS-2, F-ICMS-11 · **fonte a transcrever** (Res. Senado; RICMS-SP) |
| 5 | Simples: DIFAL "h" / antecipação "g" 2 por entrada interestadual, memória por item, custo do item acrescido; espelho DeSTDA mensal; "sem valores" = dispensa | B-SN-ICMS | fork · **confirmação do contador** | LC 123 art. 13 § 1º XIII; DeSTDA SP; F-ICMS-10; L-ICMS-3/4/5 |
| 6 | Alerta "entrada interestadual sem guia registrada" (se F-ICMS-10 → b) | B-SN-ICMS | fork | F-ICMS-10 |
| 7 | Gatilho g1: o Simples com `sublimiteExcedido` gera aviso "a partir de {mês+1} o ICMS sai do DAS e a EFD passa a ser exigível" | B-SN-ICMS | direto · **data confirmar** | LC 123 art. 20 § 1º; Prot. 3/11 cl. 2ª II; L-ICMS-2 |
| 8 | Apuração mensal de ICMS do RPA por estabelecimento: débitos (C190 das saídas) − créditos (C190 das entradas com crédito) ± ajustes informados → E110; reusar `TaxAssessment` (`tributo='ICMS'`, `periodo='Mnn'`)? | B2 (gatilho) | fork | LC 87 arts. 19–20; F-ICMS-0; reuso como F-SN-13 |
| 9 | Gerador EFD ICMS/IPI perfil A/B: blocos 0, C (C100/C170/C190), D (se houver CT-e/comunicação), E (E100/E110/E116), H (inventário), 1 (1010), 9; validação no PVA | B3 (gatilho) | fork | Ajuste SINIEF 2/09; Guia Prático (versão a confirmar, §9) |
| 10 | ST substituído: escriturar ST retida da entrada e saída com CST 60/CSOSN 500 | B3 | fork | F-ICMS-3 (b) |
| 11 | DIFAL de entrada do RPA (uso e consumo e ativo) → E300/E310 | B3 | fork | LC 87 art. 12 XV, 13 IX "b" §§ 3º, 6º; F-ICMS-4 |
| 12 | CIAP: subrazão por `FixedAsset`, 1/48 × fator, baixa por alienação, Bloco G, flag ≥ 2029 para homologação | B4 (gatilho) | fork | LC 87 art. 20 § 5º; LC 227 arts. 134 § 1º, 136, 137; F-ICMS-8 |
| 13 | Provisão contábil do ICMS a recolher / a recuperar (bridge, 2 commits, reconcile), contas no perfil | B2 | fork | molde F-X7-4 / F-SN-10 |
| 14 | Transição 2029–2032: fator de redução da alíquota por ano como linha de `LegalParameter`; 2033: apuração bloqueada com motivo nomeado; saldo credor de 31/12/2032 exportável segregado | B5 | direto · **regulamentação estadual NV** | EC 132 ADCT 128–129; LC 227 arts. 132–137 |

## 6. Contratos esboçados (forma, não decisão)

```prisma
// F-ICMS-13 (a) — nasce no PRE-ADR de IBS/CBS; colunas do ICMS já presentes
model FiscalBookEntry {
  id            String   @id @default(cuid())
  userId        String   // a PJ (R8)
  unitId        String   // estabelecimento (IE) — EFD é por estabelecimento
  direction     String   // ENTRADA | SAIDA
  modelo        String   // 55 | 65 | 57 | NFSE ...
  chaveAcesso   String?
  serie         String?
  numero        String
  participanteDoc String? // CNPJ/CPF
  participanteUf  String?
  dataEmissao   DateTime
  dataEntradaSaida DateTime?
  situacao      String   // REGULAR | CANCELADA | DENEGADA | COMPLEMENTAR ... (COD_SIT)
  totaisJson    Json     // vProd, vDesc, vICMS, vST, vIPI, vFCP, vIBS, vCBS ...
  sourcePayableId String? // entrada importada
  fiscalDocumentId String? // saída emitida
  createdAt     DateTime @default(now())
  items         FiscalBookItem[]
  @@unique([userId, unitId, direction, chaveAcesso]) // idempotência real (AC-2.1-B5); NFS-e sem chave → fork no BRIEF
}

model FiscalBookItem {
  id           String @id @default(cuid())
  entryId      String
  entry        FiscalBookEntry @relation(fields: [entryId], references: [id], onDelete: Restrict)
  nItem        Int
  productRef   String?   // linha do preset (string, como InventoryItem)
  ncm          String
  cest         String?
  cfop         String
  origem       String    // 0–8
  cstIcms      String?   // CRT 3
  csosn        String?   // CRT 1
  destinacao   String?   // REVENDA | INSUMO_SERVICO | IMOBILIZADO | USO_CONSUMO (ITEM-DESTINATION)
  vBcIcmsCents BigInt  @default(0)
  pIcmsBp      Int?     // basis points
  vIcmsCents   BigInt  @default(0)
  vBcStCents   BigInt  @default(0)
  vIcmsStCents BigInt  @default(0)
  vFcpCents    BigInt  @default(0)
  vFcpStCents  BigInt  @default(0)
  vDifalDestCents BigInt @default(0)
  vIpiCents    BigInt  @default(0)
  ibsCbsJson   Json?    // CST/cClassTrib/valores — desenhado pelo PRE-ADR de IBS/CBS
  @@unique([entryId, nItem])
}

// F-ICMS-8 (a) — só no gatilho
model IcmsCiapAsset {
  id              String @id @default(cuid())
  userId          String
  unitId          String
  fixedAssetId    String  // FK FixedAsset, onDelete: Restrict
  fiscalBookItemId String
  creditoTotalCents BigInt
  entradaEm       DateTime
  parcelasApropriadas Int @default(0)   // ≤ 48
  baixadoEm       DateTime?
  homologacaoProtocolo String?          // LC 227 art. 134 § 1º I (entradas ≥ 2029-01-01)
}
```

Apuração (B2): reusar `TaxAssessment` com `tributo='ICMS'`, `periodo='M01'..'M12'`, `memoria` = linhas E110
(débitos, créditos, ajustes, saldo credor transportado). A coluna `unitId` passa a ser chave (estabelecimento), e não
só proveniência: diverge do F-X7-7 e vira fork no BRIEF B2. Tabelas `LegalParameter` (chave · discriminador · valor):

| Tabela | chave | discriminador | valor |
|---|---|---|---|
| `ICMS_ALIQ_INTERESTADUAL` | `ufOrigem-ufDestino` | `origem` (importado = 4%) | bp |
| `ICMS_ALIQ_INTERNA` | `uf` | `ncm` (prefixo) ou `*` | bp + `fcpBp?` |
| `ICMS_DIFAL_BASE` | `uf` | — | `UNICA` \| `DUPLA` |
| `ICMS_ST_MVA` | `uf` | `cest`/`ncm` | `mvaBp`, `mvaAjustadaRegra` (só com F-ICMS-3 a) |
| `ICMS_TRANSICAO_FATOR` | `ano` | — | 10/10, 9/10 … 6/10, 0 (EC 132 ADCT 128) |

## 7. Sequência de BRIEFs por caminho do F-ICMS-0

| Caminho | BRIEFs, em ordem | Observação |
|---|---|---|
| **(c) + fundação (recomendado)** | **B0** livro fiscal por item + parser (dentro do PRE-ADR de IBS/CBS) → **B-SN-ICMS** DIFAL/antecipação do Simples + DeSTDA + gatilho g1 (se o insumo §8-1 confirmar compra interestadual) → *[gatilho]* **B1** perfil IE/UF/CRT + tabelas de alíquota → **B3** EFD por documentos (perfil A, SP) → **B2** apuração E110 + provisão → **B4** CIAP → **B5** transição 2029–2033 | B0 e B-SN-ICMS servem o 1º cliente e o IBS. O resto só abre com g1, g2 ou g3 |
| (a) completo | B0 → B1 → B2 → ST substituto (F-ICMS-3 a) → DIFAL entrada + saída → FCP → B3 com todos os blocos → B4 CIAP → IPI → Bloco K → 2ª UF → B5 | 9+ BRIEFs sem oráculo até haver tenant |
| (b) EFD por documentos | B0 → B1 → B3 (E110 = Σ documentos + E111 digitado) → B4 | Molde OCA. Sem cálculo próprio de ST/DIFAL |
| (d) IBS/CBS no lugar | PRE-ADR IBS/CBS (com B0) → nada de ICMS até g1/g2/g3 | Igual a (c) sem o B-SN-ICMS |

## 8. Pendente de validação externa (não entra em checklist sem fonte ou resposta)

Contador e dado do cliente. Vira pedido pela `luminaris-contador-liaison`; quem envia é o dono.

1. **Perfil de compras do 1º cliente:** compra de fornecedor de fora de SP? De quê (revenda, uso e consumo, ativo)?
   Decide o F-ICMS-10. **Dado externo.**
2. **O 1º cliente consta da lista de obrigados à EFD da SEFAZ-SP?** (Posto Fiscal Eletrônico.) Decide se a dispensa do
   Prot. 3/11 vale para ele (L-ICMS-1).
3. **Entregas de DeSTDA do cliente** em 2026 (houve valor declarado?). **Dado externo.**
4. **RBT12 do cliente perto do sublimite** de R$ 3,6 mi? Decide a urgência do gatilho g1.
5. **Contas** de ICMS a recolher, a recuperar e CIAP no plano (quando houver RPA).
6. **Estoque comprado com ST antes de 01/04/2026** (Portaria CAT 28/20, já pendente no PRE-ADR do Simples §9).

## 9. Insumos ausentes (registrados, não varridos — regra 2)

- **Guia Prático da EFD ICMS/IPI vigente (PDF).** A pasta oficial lista a 3.2.2. As notícias citam 3.2.3 e 3.2.4 (Ato
  COTEPE/ICMS 86/2026). Baixar a versão vigente, registrar no MANIFEST e conferir a estrutura de blocos que o §2.3
  marca como **I**.
- **Tabela 5.1.1 (códigos de ajuste E111) de SP** e **Tabela 4.3.x** de SP. Fonte: SEFAZ-SP/Portal SPED.
- **Texto da Portaria SRE 2/2025** e da **Portaria CAT 23/2016** (DeSTDA). Lidos só pelo portal da SEFAZ-SP.
- **RICMS-SP** nos pontos de DIFAL do Simples, antecipação e FCP (L-ICMS-3/5/9).
- **Convênio ICMS 142/2018** (CEST/ST: segmentos e anexos) e **Res. Senado 22/1989 e 13/2012** (alíquotas
  interestaduais). Fonte das tabelas do F-ICMS-11.
- **Ajuste SINIEF 12/2015** e alterações (DeSTDA), no CONFAZ.

## 10. Achados fora de escopo (registrados, não planejados)

1. **"EFD-Contribuições existe"** é uma crença do pedido que o código desmente: o X8 a deixou diferida (F-X8-1 a). Se o
   dono assume que existe, a matriz de obrigações e o discurso comercial precisam saber que não.
2. **Parser da NF-e ignora o grupo `IBSCBS`** (dívida T3 de `M5-ibs-cbs.md`). NF-e autorizada desde 03/08/2026 traz o
   grupo. Hoje isso não quebra nada, mas some com dado que o IBS/CBS vai precisar. Entra no B0 se o F-ICMS-13 → (a).
3. **O perfil fiscal da unidade não tem IE nem UF** (`schema.prisma:1404-1462`). O BRIEF da NFC-e (X10a) também precisa
   disso (*"perfil sem IE ⇒ 400"*, `BE-INCR-NFCE-brief.md:195`). Quem executar primeiro cria o campo.
4. **OCA: vigência por `now()`** é um defeito do projeto de referência (§2.4 achado 1). Não afeta o Luminaris. Fica
   registrado para que ninguém copie o padrão.
5. **GIA-ST** dispensada em SP para contribuinte de outra UF (Portaria SRE 6/2025, segundo notícia): **NV**. Só importa
   para tenant substituto fora de SP.

## 11. Perguntas de lei

Só entra o que a pesquisa desta sessão não resolveu.

**L-ICMS-1**
- (a) **Pergunta:** o optante do Simples com IE em SP, abaixo do sublimite, está dispensado da EFD ICMS/IPI, ou SP está
  na exceção do parágrafo único do Prot. 3/11 (UF que estabeleceu a obrigatoriedade até o 1º trimestre de 2014)?
- (b) **Por que importa:** é o que decide se o 1º cliente precisa de EFD hoje, e portanto o F-ICMS-0 inteiro.
- (c) **O que a pesquisa achou:** Prot. ICMS 3/11, cl. 2ª II e p.ú. (red. Prot. 49/15), dispensa o Simples
  (<https://www.confaz.fazenda.gov.br/legislacao/protocolos/2011/pt003_11>). A Portaria CAT 147/09, art. 1º § 1º,
  dispensa quem não está "relacionado" (<https://legislacao.fazenda.sp.gov.br/Paginas/pcat1472009.aspx>). A Res. CGSN
  140 art. 64 § 4º I só admite Sped do optante acima do sublimite. Por que não basta: a "relação" de obrigados é ato
  administrativo da SEFAZ-SP, e há resposta à consulta (RC 22801/2020) sobre optante que constava da lista. Não li a
  conclusão.
- (d) **Quem responde:** órgão (SEFAZ-SP, lista de obrigados no Posto Fiscal Eletrônico) + contador.

**L-ICMS-2**
- (a) **Pergunta:** ao cruzar o sublimite de R$ 3,6 mi, a partir de quando o optante de SP passa a apurar ICMS no RPA
  e a entregar EFD (mês seguinte ao excesso, ou ano seguinte quando o excesso é ≤ 20%)?
- (b) **Por que importa:** é a data do gatilho g1 (F-ICMS-0) e do aviso do comportamento 7.
- (c) **O que a pesquisa achou:** LC 123 art. 20 § 1º (impedimento *"a partir do mês subsequente"*), mas a compilada
  intercala redações no trecho e eu não isolei a vigente com certeza. A Portaria CAT 147/09 art. 19-A mostra que SP já
  tratou prazo de EFD de quem "passou ao RPA em razão da ultrapassagem do sublimite" (2018). O `simplesCalc.ts` já
  implementa uma regra de janela. Por que não basta: falta conferir a redação vigente do art. 20 §§ 1º, 1º-A e 3º e a
  regra paulista de início da EFD.
- (d) **Quem responde:** lei pesquisável (LC 123 compilada + Res. CGSN 140) + órgão (SEFAZ-SP, início da EFD).

**L-ICMS-3**
- (a) **Pergunta:** SP cobra do optante do Simples o diferencial de alíquota nas aquisições interestaduais para **uso
  e consumo / ativo** e para **revenda** sem antecipação (LC 123 art. 13 § 1º XIII "g" 2 e "h")? Com que base e
  vencimento?
- (b) **Por que importa:** decide o F-ICMS-10 (calcular × registrar × fora) e o custo do item comprado de fora.
- (c) **O que a pesquisa achou:** a LC 123 autoriza a cobrança fora do DAS ("h": *"relativo à diferença entre a
  alíquota interna e a interestadual"*), e o RICMS-SP não foi lido nesse ponto. A EC 87/LC 190 tratam do DIFAL a
  consumidor final e do contribuinte destinatário (LC 87 art. 12 XV), não especificamente do Simples. Por que não
  basta: a cobrança depende de previsão na lei estadual. E há a discussão constitucional do DIFAL do Simples (o tema
  do STF não foi lido nesta sessão: NV).
- (d) **Quem responde:** lei pesquisável (RICMS-SP) + advogado tributarista (alcance da jurisprudência do STF) +
  contador.

**L-ICMS-4**
- (a) **Pergunta:** a DeSTDA continua exigível em SP em 2026, com prazo no dia 28, e há previsão de extinção ou
  substituição dela na transição (2027+)?
- (b) **Por que importa:** decide se o espelho DeSTDA entra no B-SN-ICMS (F-ICMS-10 a) ou só o registro da guia.
- (c) **O que a pesquisa achou:** o portal da SEFAZ-SP diz que é exigida de todo optante com IE paulista (salvo MEI),
  pelo SEDIF-SN, até o dia 28, e dispensada sem valores a declarar
  (<https://portal.fazenda.sp.gov.br/servicos/simples/Paginas/destda.aspx>). Por que não basta: a página não tem data
  de atualização, e a Portaria CAT 23/2016 e o Ajuste SINIEF 12/2015 não foram lidos na redação vigente.
- (d) **Quem responde:** lei pesquisável (Portaria CAT 23/2016 + Ajuste SINIEF 12/2015 compilados) + órgão
  (SEFAZ-SP).

**L-ICMS-5**
- (a) **Pergunta:** depois da Portaria SRE 94/2025 (perfumaria/higiene fora da ST desde 01/04/2026), a compra
  **interestadual** desses itens pelo optante de SP gera antecipação (art. 13 § 1º XIII "g") ou só o diferencial
  "h"?
- (b) **Por que importa:** decide qual das duas regras o B-SN-ICMS calcula para o produto que o salão revende.
- (c) **O que a pesquisa achou:** a Portaria SRE 94/2025 está no corpus (arts. 1º e 4º lidos no PRE-ADR do Simples) e
  trata da saída da ST interna. Por que não basta: o regime de antecipação na entrada interestadual é outro
  dispositivo do RICMS-SP, que não foi lido.
- (d) **Quem responde:** lei pesquisável (RICMS-SP) + contador.

**L-ICMS-6**
- (a) **Pergunta:** qual é a versão vigente do Guia Prático da EFD ICMS/IPI e do leiaute para os períodos de
  2026/2027: a 3.2.2 da pasta oficial, ou a 3.2.4 (Ato COTEPE/ICMS 86/2026) noticiada?
- (b) **Por que importa:** é a fonte de transcrição do B3 (gerador) e do `LEIAUTE_SPED`.
- (c) **O que a pesquisa achou:** <http://sped.rfb.gov.br/item/show/1573> lista a 3.2.2 como mais recente em
  10/10/2026, e a [notícia](https://jornalcontabil.com.br/noticia/publicada-nova-versao-3-2-4-do-guia-pratico-efd-icms-ipi/)
  cita a 3.2.4. Por que não basta: divergência entre o portal e a notícia, e o Ato COTEPE não foi lido.
- (d) **Quem responde:** órgão (Portal SPED / CONFAZ, Ato COTEPE/ICMS 86/2026): pesquisável.

**L-ICMS-7**
- (a) **Pergunta:** como SP regulamenta o pedido de homologação do saldo credor e, em especial, do CIAP de bem entrado
  a partir de 2029 (LC 227 art. 134 § 1º I, *"no mesmo período de apuração em que tiver início o aproveitamento"*)?
  Forma, sistema e efeito da falta do pedido.
- (b) **Por que importa:** decide os campos do `IcmsCiapAsset` (F-ICMS-8) e se o sistema precisa gerar ou registrar o
  protocolo.
- (c) **O que a pesquisa achou:** LC 227/2026 arts. 132–137 lidos
  (<https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm>). O art. 134 § 5º manda processar *"nos termos da
  legislação do Estado"*. Por que não basta: não há (ou não foi achada) regulamentação paulista.
- (d) **Quem responde:** órgão (SEFAZ-SP), provavelmente ainda sem norma. Advogado tributarista para o efeito da falta
  do pedido no prazo.

**L-ICMS-8**
- (a) **Pergunta:** a transição das obrigações acessórias do ICMS em 2029–2033 (EFD com alíquota reduzida a 9/10…6/10;
  última EFD; escrituração depois de 2032 para o saldo credor) tem norma própria (Ajuste SINIEF/Ato COTEPE)?
- (b) **Por que importa:** decide o B5 (fator de transição como dado e bloqueio de 2033) e quanto tempo o gerador de
  EFD precisa viver.
- (c) **O que a pesquisa achou:** EC 132 ADCT 128–129 (alíquotas e extinção) e LC 227 art. 132 § 1º II (saldo
  *"regularmente apurado na escrituração fiscal… ainda que… após 31 de dezembro de 2032"*). Por que não basta: a regra
  acessória da transição é de convênio/ajuste, e nenhum foi encontrado.
- (d) **Quem responde:** lei pesquisável (CONFAZ, quando editado) + órgão (CONFAZ/SEFAZ).

**L-ICMS-9**
- (a) **Pergunta:** quais mercadorias têm adicional de FCP (fundo de combate à pobreza) em SP, e com qual percentual
  vigente?
- (b) **Por que importa:** popula a tabela do F-ICMS-5 para SP.
- (c) **O que a pesquisa achou:** nada lido em fonte primária nesta sessão. O OCA modela o FCP por UF/NCM, mas não traz
  dado por UF (o dado vem de carga). Por que não basta: sem fonte.
- (d) **Quem responde:** lei pesquisável (lei estadual do fundo + RICMS-SP).

**L-ICMS-10**
- (a) **Pergunta:** se um tenant de serviço ou de varejo **importa diretamente** mercadoria (ex.: cosmético), ele vira
  equiparado a industrial para o IPI e passa a ser contribuinte do IPI na revenda, mesmo com alíquota zero desde 2027?
- (b) **Por que importa:** decide se o F-ICMS-6 (b) basta ou se a apuração de IPI volta para algum tenant.
- (c) **O que a pesquisa achou:** EC 132 ADCT art. 126 III "a" (alíquota zero desde 2027, salvo ZFM). O RIPI (Decreto
  7.212/2010, equiparação) não foi lido. Por que não basta: a equiparação gera obrigação acessória mesmo com alíquota
  zero? Não sei.
- (d) **Quem responde:** lei pesquisável (RIPI + legislação pós-EC 132) + contador.

## 12. Como entra na fila (depois da ratificação)

1. O dono ratifica (ou não) F-ICMS-0..14. A decisão vira nota em `docs/plano/decisoes/`, e a citação da autorização
   de 10/10 entra nela (divergência 1 do cabeçalho).
2. Se F-ICMS-0 → (c): nasce o nó `ICMS-EFD` (F-ICMS-1) em estado `deferred`, com os **gatilhos g1–g3 no corpo** e as
   arestas:
   - `depende_de` pontilhada [[X10a]] (`ProductFiscalProfile`, IE);
   - futuro nó de IBS/CBS (B0 = livro fiscal);
   - [[X14]] (gatilho g1);
   - [[C8]] (CIAP).
3. B-SN-ICMS só abre se o insumo §8-1 confirmar compra interestadual. Senão, ele vira alerta dentro do X14.
4. Código continua exigindo "executa" por PR (ORCH-006).

## Riscos desta proposta (incluindo os vieses do autor)

- **Viés de adiamento.** Recomendar (c) é confortável para quem escreve: não há código a defender. O contrapeso é o
  gatilho g1, que já é calculado e pode disparar **com o próprio 1º cliente** (§8-4). Se disparar antes do B0, o
  tenant fica sem EFD no 1º mês do RPA.
- **Dependência do IBS/CBS.** A fundação (B0) está pendurada num PRE-ADR que ainda não foi autorizado
  (`M5-ibs-cbs.md`: autorização "falta"). Se o IBS/CBS atrasar, a fundação atrasa junto. Alternativa: B0 como BRIEF
  próprio, autorizável sozinho.
- **Grau das fontes estaduais.** As afirmações sobre SP (GIA, DeSTDA) vêm do portal da SEFAZ-SP, e não do texto das
  portarias. Estão marcadas NV onde cabe, e as perguntas L-ICMS-1/4 existem por isso.
- **Estrutura da EFD de memória.** A lista de blocos e registros no §2.3 é **I**. O Guia não foi baixado (§9). Nenhum
  comportamento do §5 depende do número exato do registro antes do B3.
- **Referência OCA lida num commit.** O comportamento descrito é o de `296438366ff2`. O OCA pode corrigir a vigência
  por `now()` depois.
