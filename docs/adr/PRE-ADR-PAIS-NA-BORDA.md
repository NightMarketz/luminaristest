# PRE-ADR-PAIS-NA-BORDA — conceito universal no centro, país na borda

- **Data:** 2026-11-15
- **Status:** **Proposed — forks F-PB-1..9 RATIFICADOS em 24/11** (dono, questionário; §5.1 e `docs/plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`). A direção é do dono (§0). A redação da regra do §1 ainda não foi ratificada e precisa ser reescrita conforme o §5.1 (F-PB-1 a, F-PB-4 b, F-PB-7 a). Não autoriza código sozinho. O ADR com a guarda (§6) é o passo seguinte, e os BRIEFs com `executa` são emendados pela regra antes do código (D-2026-11-24 §6).
- **Publicação:** escrito em 15/11 na worktree `claude/personal-dept-coverage-c7fea7` e publicado sem alteração em 24/11 pela sessão maestro, com exceção deste cabeçalho e do §5.1. Os dois links abaixo para `D-2026-11-15-PAIS-NA-BORDA.md` e `BE-INCR-LEGAL-REGRAS-brief.md` ainda apontam para arquivos não publicados daquela worktree (lacuna na caixa).
- **ADR (24/11):** [`ADR-PAIS-NA-BORDA.md`](ADR-PAIS-NA-BORDA.md) reescreve a regra do §1 para as respostas do §5.1 e planeja a guarda e as fatias; a redação do §1 abaixo fica como histórico.
- **Classe:** DECISÃO ARQUITETURAL (fronteira).
- **Relaciona:** `ADR-ARCH-BOUNDARIES.md` (guarda mecânica), `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md` (o que a lei desenha é Prisma first-class), `ADR-DOMAIN-MOTOR-rejected.md` (não reabre), fase P-i18n do `docs/SDD-LUMINARIS.md` §IV.1 e invariante 8 de `docs/plano/destino/17-…md`, [`BE-INCR-LEGAL-REGRAS-brief.md`](../accounting/BE-INCR-LEGAL-REGRAS-brief.md) (motor de leis, F-ML-13).
- **Decisão que o abre:** `docs/plano/decisoes/D-2026-11-15-PAIS-NA-BORDA.md`.
- **Revisão independente (15/11):** [`revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md`](revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md) — confirma o acoplamento no código; discorda de F-PB-1, F-PB-2 (a) e F-PB-3; mostra que os "100 models sem instância" do §3 superestimam o centro (amostra de 25: 8 limpos, 9 com código brasileiro como valor, 8 do Brasil) e que a guarda por import não enxerga regra de país escrita dentro do arquivo. **Incorporada em 15/11** (§7 lista o que mudou; os forks F-PB-1, 2 e 3 têm recomendação nova e há três forks novos, F-PB-7..9).

## 0. De onde vem

Dono, chat, 15/11/2026: *"Na realidade vc já contou errado, precisamos definir uma regra onde o país fica na borda, sempre,
pq conceitos de contabilidade, DP e financeiro são universais, temos que separar melhor"*. Antes, 14/11: *"deixar
desacoplado desde já tudo é uma boa prática mesmo se não internacionalizar ainda"*.

**O erro que este documento corrige.** O inventário de 14/11 (`docs/accounting/inventario-brasil-2026-11-14/`) contou
**termos**: tratou como "Brasil" todo arquivo com palavras como *folha, rubrica, férias, afastamento, alíquota, retenção,
plano de contas, DRE*. Isso mede **idioma**, não **país**. Folha de pagamento, rubrica, férias, tributo, retenção e plano
de contas existem em qualquer país; o que é do Brasil é o INSS, o eSocial, o ICMS, o SPED, o CNPJ. A conta "175 de 402
arquivos da contabilidade são Brasil" **está retirada**. A medida certa é por **conceito** (§3).

O plano já dizia a metade disto: *"o núcleo do ledger nunca importa de localização/compliance; jurisdição entra como dado
(fixture/slot), jamais como branch no núcleo"* (SDD §IV.1). Lá a regra vale para o **razão**. O dono a estende para
**contabilidade, DP e financeiro inteiros** e a torna permanente.

## 1. A regra (redação proposta)

- **R1 — Centro é conceito.** O centro de cada domínio modela o que existe em qualquer país: lançamento, conta, período,
  documento fiscal, tributo, alíquota, base, retenção, apuração, obrigação acessória, título a pagar e a receber,
  conciliação, trabalhador, vínculo, rubrica, folha, afastamento, férias, benefício. O centro é **nomeado e tipado pelo
  conceito**, nunca pela instância de um país.
- **R2 — Borda é país.** Tudo o que só existe num país mora no **pacote do país**: (a) as **instâncias** (quais tributos,
  documentos, obrigações, identificadores, categorias de trabalhador, formas de pagamento); (b) as **regras e números de
  lei** (motor de leis e parâmetros legais, com jurisdição); (c) **leiautes e serializers** (SPED, eSocial, NF-e, CNAB);
  (d) **validadores** de identificador; (e) **textos, formatos, fuso e calendário**.
- **R3 — A dependência aponta para dentro.** Borda importa centro; **centro nunca importa borda**. Quando o centro precisa
  de algo do país (uma guarda, um cálculo, um formato), ele expõe um **ponto de extensão** (porta ou registro) e o pacote
  do país o preenche. O gate continua dentro da transação; só deixa de nomear o país.
- **R4 — No banco também.** Model do centro não tem coluna com nome de instância de país. O dado do país fica em tabela do
  pacote do país ligada ao model do centro, ou em atributo tipado por registro do país (F-PB-2).
- **R5 — Idioma não é país.** Nome em português de conceito universal não é acoplamento. Teste de uma pergunta: *"isto
  existiria num ERP de outro país, com outro valor ou outro nome?"* Sim ⇒ conceito, fica no centro. *"Só existe aqui"* ⇒
  instância, vai para a borda.
- **R6 — Vale sempre, a partir de já.** Código novo nasce separado. O existente migra por fatias. A fronteira tem guarda
  mecânica no `check:arch`, com baseline que só encolhe. A regra **não** abre segundo país: aceitar outra jurisdição
  continua sendo a fase P-i18n e a decisão T9 (BRL-only).

**O que a guarda mecânica enxerga, e o que não (revisão, finding 3).** O `check:arch` lê **imports**. Ele pega o centro
importando um módulo de país (`PostingService` → `ILalurRepository`). Ele **não** pega: (i) regra de país escrita dentro do
arquivo do centro, sem import (a regra de níveis da ECD em `PostingService.ts:960-985`); (ii) instância de país guardada
como **valor** (código do eSocial em `DpVinculo.categoria`, `regime`); (iii) coluna cujo nome não está numa lista
(`Partner.residenteBrasil`); (iv) chave estrangeira do centro para tabela de país (`AccountingScopeSettings` →
`LalurParteBAccount`). R3 é mecanizável; R1, R4 e R5 dependem de **revisão por leitura** em cada PR. A regra não promete
mais do que isso.

**Como classificar qualquer coisa (três perguntas, na ordem):**
1. É um conceito que outro país também tem? Não ⇒ **borda**.
2. O que muda de país para país é só o **valor** (alíquota, prazo, teto)? ⇒ centro com o valor em **parâmetro legal** da borda.
3. O que muda é a **forma** (como se calcula, quais campos, qual arquivo)? ⇒ centro com **ponto de extensão**; a forma mora
   na borda (regra do motor de leis, serializer, tabela do país).

## 2. Mapa conceito → Brasil

"Hoje" cita só o que foi lido ou medido nesta conversa; o resto do código não foi classificado.

| Domínio | Conceito universal (centro) | O que é do Brasil (borda) | Hoje |
|---|---|---|---|
| Contabilidade | Lançamento, partida, conta, plano de contas, período, numeração, estorno, auditoria | Regra de níveis do plano e leiaute da ECD; referencial da RFB; e-Lalur/e-Lacs | `PostingService` impõe a regra de níveis da ECD (`:966`) e consulta o e-Lalur ao excluir conta (`:1062`): **centro conhece a borda** |
| Contabilidade | Demonstrações (balanço, resultado, fluxo de caixa) | Vocabulário `BP`/`DRE`, mapeamento para a ECD | `'BP'`/`'DRE'` como literal em 41 pontos de `features/accounting` |
| Contabilidade | Ano fiscal | Ano-calendário brasileiro | Duas cópias de `fiscalYearFrom` com `getUTCFullYear()` (`PostingService.ts:120`, `EntryApprovalService.ts:484`) |
| Fiscal | Tributo, alíquota, base, crédito, apuração por período | ICMS, ISS, PIS, Cofins, IRPJ, CSLL, IBS, CBS; regras de cada um | `ConsumptionTaxAssessment` tem nome universal (bom exemplo); `SimplesApuracao`, `LalurEntry` e outros 17 models são instância no nome (§3) |
| Fiscal | Perfil fiscal da empresa, do produto e do serviço | Regime (MEI, Simples, Presumido, Real), CRT, NCM, CEST, CFOP, CST, NBS, indicadores da ECD/ECF | `FiscalProfile` tem 48 de 117 campos com instância brasileira; `CompanyFiscalProfile` 20 de 55; `ProductFiscalProfile` 9 de 21 |
| Fiscal | Retenção na fonte | IRRF, CSRF, INSS retido, ISS retido, códigos de receita | `WithholdingProfile`: 9 de 25 campos |
| Fiscal | Documento fiscal (emissão, numeração, cancelamento, contingência) | NF-e, NFC-e, NFS-e, DANFE, SEFAZ, ADN | `FiscalDocument` (nome universal) com 7 campos de ISS/IBS/CBS; `NfceCsc`, `NfceContingencia` instância no nome |
| Fiscal | Obrigação acessória (gerar, validar, entregar, retificar) | SPED ECD/ECF, EFD-Reinf, MIT, DCTFWeb | `lib/{sped,ecf,nfe,…}.ts` já são borda pura (regra F1 do `check:arch`); `ReinfBatch`, `MitExport` instância no nome |
| Fiscal | Regra e número de lei com vigência | As 46 tabelas de `LegalParameter` e as regras do motor de leis | A plataforma `legalParameters` importa 7 modelos da contabilidade e define formatos do DP (`formatoLinha.ts`): **centro conhece a borda** |
| Financeiro | Título a pagar/receber, pagamento, recebimento, conciliação, conta bancária | Boleto, PIX, CNAB, split do IBS/CBS | `BankSettlementItem` com 4 campos `split…Ibs/Cbs`; `Payable`/`Receivable` sem instância no schema |
| DP | Trabalhador, vínculo, cargo, jornada, lotação | CPF, CBO, categorias do eSocial (101, 103, 901, 723), CLT | `DpTrabalhador.cpf`, `DpCargo.cbo`; `DpVinculo.categoria` guarda código do eSocial (não medido pelo script, que só lê nome de campo) |
| DP | Rubrica (provento, desconto), folha, cálculo com prova | Natureza da Tabela 03 do eSocial, incidências de CP/IRRF/FGTS, INSS, FGTS, 13º | Catálogo de 19 rubricas em código com natureza e incidência do eSocial; calculadoras `inssEmpregado`, `fgtsDaCategoria` nomeadas pela instância |
| DP | Afastamento, férias, dependente, sindicato, convenção | Motivos da Tabela 18, regras da CLT, salário-família, CNPJ do sindicato | Números já em `FOLHA_REGRA` (dado); forma em código, a virar regra do motor de leis |
| Cadastro | Identificador de pessoa e de empresa, endereço, telefone | CPF, CNPJ, CEP, UF, IBGE | Motor DynamicTable tem `'cpf' \| 'cnpj'` como formato fixo de campo (`DynamicTable.model.ts:29`) |
| Plataforma | Escopo, moeda, fuso, calendário, idioma | `'BRL'`, `America/Sao_Paulo`, feriados nacionais, português | `AccountingScope` tem os slots; `'BRL'` em 67 linhas e o fuso em 28 fora do slot; 3.989 linhas de mensagem em português no servidor |
| Plataforma | Auditoria, datas, dinheiro | — (nenhuma instância deveria aparecer) | Vivem em `features/accounting`; a allowlist de auditoria nomeia eventos de todos os domínios (104 linhas) |

## 3. Medida corrigida (por conceito, no schema)

Os 146 models de `server/prisma/schema.prisma`, classificados por script (nome do model e nome dos campos escalares
contra uma lista de **instâncias** brasileiras; conceito em português não conta):

| Classe | Nº | O que significa pela regra |
|---|---|---|
| Nome do model é instância brasileira | **19** | Já é borda no nome; falta estar na borda no lugar. `Lalur*` (8), `Simples*` (5), `Nfce*` (3), `ReinfBatch`, `MitExport`, `IssBeneficioMunicipal` |
| Nome universal, com campo de instância brasileira | **27** | É aqui que "separar melhor" acontece. Maiores: `FiscalProfile` 48/117, `CompanyFiscalProfile` 20/55, `WithholdingProfile` 9/25, `ProductFiscalProfile` 9/21, `FiscalDocument` 7/49 |
| Sem instância brasileira no nome nem nos campos | **100** | Candidatos a centro. **É teto**: o script não vê instância guardada como **valor** (`DpVinculo.categoria`, `regime`) nem nome em inglês (`ReferentialAccount`, `PtaxRate`, `TaxAssessment` são do Brasil e caíram aqui) |

**Correção da revisão (finding 4, lido no schema):** numa amostra de 25 models de domínio tirados dos "100", **8 são do
Brasil**, **9 têm forma universal mas guardam código brasileiro como valor** e só **8 estão limpos**. O centro limpo é
perto de um terço do que a tabela sugere. Há, portanto, uma terceira forma de vazamento que a tabela não mede: **instância
como valor**.

**"Fiscal" não é um domínio no código (finding 5).** A lógica tributária brasileira mora dentro de
`features/accounting/models` (cerca de 90 arquivos), ao lado do razão. O primeiro corte útil não é entre features: é
**razão × fiscal brasileiro dentro de `features/accounting`** (F-PB-8).

**Grau:** contagem por script, verificada à mão só nos models citados. O código (serviços, modelos, DTOs) **não** foi
reclassificado por conceito: isso pede leitura por arquivo, não contagem de termo, e é o primeiro trabalho depois da
ratificação (§6).

## 4. O que já respeita a regra e o que a viola

**Respeita:** libs fiscais puras (`F1`); motor DynamicTable não importa contabilidade (`B1`); núcleo do DP não importa
opcional (`D1`); números de lei em `LegalParameter` com vigência; slots de moeda e fuso no `AccountingScope`;
`ConsumptionTaxAssessment` nomeado pelo conceito.

**Viola, com lacuna registrada na caixa do maestro:** centro que conhece a borda — `L-20261115-013829-41b5` (razão × e-Lalur
e ECD), `L-20261114-222614-0d37` (parâmetros legais × contabilidade e DP), `L-20261115-013846-1cb6` (allowlist de auditoria);
primitivas de plataforma dentro de um domínio — `L-20261114-222614-b556`; instância fixa no centro —
`L-20261115-013846-5722` (`cpf`/`cnpj` no motor), `L-20261114-223006-1fd7` (ano fiscal), `L-20261114-223006-d704` (moeda e
fuso fora do slot), `L-20261114-222632-675c` (vigência em código); sem guarda — `L-20261114-222632-0a7b`.

## 5. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação e justificativa |
|---|---|---|
| **F-PB-1** Onde mora a borda | (a) pasta por país dentro de cada domínio (`features/<dominio>/paises/br/**`); (b) uma árvore só (`paises/br/<dominio>/**`); (c) não mover: marcar por lista e guardar por regra | **Revista em 15/11: (c), e listando o centro, não a borda.** A recomendação anterior (pasta `paises/br` só para código novo) deixava duas convenções sem data para acabar, que é o defeito apontado no `ADR-DOMAIN-MOTOR-rejected.md` §2. Alternativa da revisão (A2), que adoto: a guarda declara uma lista **curta e estável** de arquivos do centro (razão e plataforma, cerca de 15) e proíbe que eles importem país; todo o resto "pode ser Brasil" sem precisar de crachá nem de pasta nova. Pasta por país só quando uma fatia mover uma área inteira de uma vez |
| **F-PB-2** Campo de país no banco | (a) tabela do país ligada 1:1 ao model do centro (`FiscalProfile` + `BrFiscalProfile`); (b) coluna JSON tipada por registro do país; (c) manter a coluna e só proibir novas | **Revista em 15/11: (c) para o que existe; (a) só para dado novo.** A revisão mostrou o custo de (a) agora: migração de dado em tabela fiscal não é transacional no SQLite, o smoke de migração reprova backfill por desenho, e não há consumidor até existir segundo país. Então: **nenhuma coluna brasileira nova em model do centro** (dado brasileiro novo nasce em tabela do país, ligada 1:1); os 27 models mistos ficam como estão até uma fatia ter motivo próprio para tocá-los. (b) continua fora: perde índice, unicidade e tipo. Depende de F-PB-7 |
| **F-PB-3** Ordem | (a) regra + guarda já; código novo separado; existente por fatias guiadas pelo baseline; (b) parar features até separar; (c) só documentar | **Revista em 15/11: (a) só na metade "regra + guarda + código novo".** A revisão discorda de fatiar o existente agora: sem segundo país, cada fatia é custo sem consumidor e alonga a convivência de dois regimes. Fatiar o existente passa a depender de F-PB-9 (regime duplo com prazo) e começa, se começar, pelo corte de F-PB-8 |
| **F-PB-4** Nome dos conceitos | (a) centro em português (como hoje: `rubrica`, `vinculo`), borda com a sigla do país; (b) centro em inglês | **(a).** R5: idioma não é país; renomear em massa não compra separação |
| **F-PB-5** Identificador de pessoa e de empresa | (a) centro guarda `identificador` + `tipo` de um registro do país; (b) manter `cpf`/`cnpj` como coluna | **(a) em model novo; (b) nos existentes até a fatia deles.** É o caso mais espalhado (36 campos no schema) |
| **F-PB-6** DP | (a) o F3 em diante já nasce pela regra (rubrica = conceito; natureza, incidência e cálculo = pacote Brasil via motor de leis); (b) terminar o DP como está e separar depois | **(a).** O DP é o domínio mais novo e ainda tem F3..F6 sem BRIEF: é onde separar custa menos |
| **F-PB-7** "Desde já" inclui mexer no banco antes de existir segundo país? | (a) sim: migrar os models mistos por fatias; (b) não: congelar (nada brasileiro novo no centro) e migrar só com consumidor; (c) só documentar | **(b).** A fase P-i18n do plano diz que a regra preventiva tem *"custo zero hoje"* e que o gatilho é *"primeiro tenant não-BR real — nunca por completude de mapa"*. A decisão do dono de 14 e 15/11 **emenda** isso para código e para dado novo; estendê-la a migração de dado existente é uma segunda emenda, que só o dono faz. **Pergunta do dono** |
| **F-PB-8** Primeiro corte | (a) razão × fiscal brasileiro **dentro** de `features/accounting`; (b) entre features; (c) nenhum agora | **(a).** É onde está o acoplamento que importa (finding 5) e onde a lista do centro da F-PB-1 se aplica; não exige mover arquivo |
| **F-PB-9** Dois regimes convivendo | (a) aceitar sem prazo; (b) aceitar com prazo e dono por fatia; (c) não aceitar: ou migra tudo, ou não começa | **(b), e só se F-PB-7 for (a).** Com F-PB-7 (b) não há regime duplo de dado: há um centro guardado e uma dívida congelada, medida pelo baseline. **Pergunta do dono** |

### 5.1 Ratificação (dono, questionário, 24/11/2026)

Fonte: sessão maestro de 24/11, por AskUserQuestion, com o contexto de cada fork no texto da pergunta. A cédula está em
`docs/plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`. **Quatro escolhas foram contra a recomendação**
(F-PB-1, F-PB-4, F-PB-7 e, por consequência, F-PB-3 e F-PB-9).

| Fork | Resposta do dono (rótulo escolhido) | Decisão |
|---|---|---|
| F-PB-7 | "Migrar por fatias" | **(a)**: o dado existente (27 models mistos) migra por fatias desde já, contra a recomendação (b) |
| F-PB-9 | (vem da opção de F-PB-7) | **(b)**: dois regimes convivem, com prazo e dono por fatia |
| F-PB-3 | (vem da opção de F-PB-7) | **(a) inteiro**: regra, guarda e código novo já; o existente migra por fatias guiadas pelo baseline |
| F-PB-1 | "Pasta por país no domínio" | **(a)**: `features/<dominio>/paises/br/**`, contra a recomendação (c) |
| F-PB-8 | "DP pela regra + razão 1º" | **(a)**: o primeiro corte é razão × fiscal brasileiro dentro de `features/accounting` |
| F-PB-2 | "Tabela do país no novo" | **(c) no existente até a fatia dele, (a) no dado novo**: dado brasileiro novo nasce em tabela do país ligada 1:1 |
| F-PB-5 | "Tabela do país no novo" | **(a) em model novo, (b) nos existentes até a fatia** |
| F-PB-4 | "Centro em inglês" | **(b)**: os conceitos do centro são nomeados em inglês, contra a recomendação (a). A renomeação do existente entra em cada fatia. Para código novo, o dono decidiu no 2º questionário do dia que os BRIEFs já ratificados nascem pela regra (D-2026-11-24 §6) |
| F-PB-6 | "DP pela regra + razão 1º" | **(a)**: do F3 em diante o DP nasce pela regra, com o cálculo brasileiro em `features/dp/paises/br` |

Consequências que o ADR precisa resolver: (1) o §1 (R1–R6) foi escrito para F-PB-1 (c) e F-PB-4 (a), e a redação muda;
(2) a guarda do `check:arch` passa a ser por pasta (`paises/<cc>/**` não é importado pelo centro); (3) com F-PB-4 (b), o
nome em inglês do centro convive com o português do código atual até a fatia de cada área.

## 6. Depois da ratificação (não é deste documento)

1. ADR com a regra ratificada e a guarda no `check:arch` (regra nova, baseline antes/depois, prova por plantio).
2. Classificar por leitura os serviços e modelos de `features/accounting` e `features/dp` em centro × borda (o inventário
   por termo serve para **achar** candidatos, não para decidir).
3. BRIEF por fatia, na ordem das lacunas do §4.

## 7. O que mudou com a revisão independente (15/11)

Relatório: [`revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md`](revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md)
(sessão separada, só leitura). Conferido no código pela sessão que escreveu este documento: o processador de recálculo, a
política de publicação, a chave estrangeira para o e-Lalur e o texto do ADR de persistência. **Não** conferido: a amostra
de 25 models (aceita como lida pela revisão).

| Ponto | Antes | Agora |
|---|---|---|
| Medida do centro limpo | "100 models sem instância" | Teto frouxo: amostra de 25 deu 8 limpos, 9 com código brasileiro como valor, 8 do Brasil (§3) |
| Alcance da guarda | "guarda mecânica no `check:arch`" | Só R3 é mecanizável; regra inline, valor, coluna fora de lista e chave estrangeira pedem leitura (§1) |
| F-PB-1 | pasta `paises/br` para código novo | listar o centro (≈15 arquivos), não a borda |
| F-PB-2 | tabela satélite já nos 5 models grandes | congelar; satélite só para dado novo |
| F-PB-3 | fatiar o existente já | regra, guarda e código novo já; fatiar depende de F-PB-7 e F-PB-9 |
| Relação com o plano | "não abre segundo país" | A regra **emenda** o "nunca por completude de mapa" da P-i18n para código e dado novos; migrar dado existente é outra emenda (F-PB-7) |
| Forks novos | — | F-PB-7, F-PB-8, F-PB-9 |

A revisão não tinha uma informação: o dono já decidiu que a regra vale **sempre e desde já** (14 e 15/11). Por isso ela leu
como contradição com o plano o que é uma emenda do dono; o que continua em aberto é só o alcance dessa emenda sobre o
**dado existente**.

## 8. O que este documento não decide

Abrir outro país (P-i18n, T9); o motor de leis (BRIEF próprio); mudar leiaute ou serializer; o front (`my-app`), que tem a
mesma pergunta e não foi medido por conceito.
