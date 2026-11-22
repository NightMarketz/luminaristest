# PRE-ADR-INTEGRA-CONTADOR — entregar à Receita pela API Integra Contador (Serpro) o que hoje só sai como arquivo

- **Status:** Accepted (22/11/2026). Forks F-IC-1..8 **ratificados pelo dono** por questionário em 21–22/11
  ([[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]] §Ratificação). Seis ficaram na recomendação ou numa extensão dela; o
  **F-IC-2 → (b)** e o **F-IC-8 → (b)** foram **contra** a recomendação. O F-IC-2 reverte, para **todos os usos**, a
  guarda recusada em 22/10 ([[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]]). O texto de §1–§6 é o da proposta de 21/11; o
  que mudou com a ratificação está em **§10**, que prevalece.
- **Nó:** [[INTEGRA-CONTADOR]] (novo, `planned`). Reabre a [[R5]] ([[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]]).
- **Autorização:** dono, 2026-11-21, questionário. À pergunta *"Fork R5: a integração com a Receita pela API Integra
  Contador (Serpro) está adiada… Reabrir para planejar a entrega automática?"*, a resposta foi *"Reabrir e planejar"*.
  No chat do mesmo dia: *"Executa tudo pra liberar e poder rodar em xhigh até terminar"*. Cobre a pesquisa, este PRE-ADR,
  o BRIEF e os forks. **Não** cobre código, contratação ou ratificação de fork, e a contratação segue com o dono.
- **Dossiê:** [`pesquisas-legais/integra-contador-serpro/`](../../pesquisas-legais/integra-contador-serpro/relatorio.md).
  São 26 páginas oficiais do Serpro, baixadas em 21/11/2026, com hash. Neste texto, `[Dnn]` aponta para o documento do
  dossiê.
- **BRIEF:** [`BE-INCR-INTEGRA-CONTADOR-brief.md`](../accounting/BE-INCR-INTEGRA-CONTADOR-brief.md).
- **Related:** `ADR-INCR-DCTFWEB-MIT` (D1, D11, F-X9-1) · `PRE-ADR-SIMPLES-NACIONAL-CALCULO` (F-SN-8, F-SN-10) ·
  `ADR-INCR-TAX-ASSESSMENT` (porta `EnvioMit`, F-X7-9) · `ADR-INCR-EFD-REINF` (`ReinfTransmissorPort`) ·
  [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]] · [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] (sem guarda de certificado) ·
  [[D-2026-10-30-X10A-EMENDA-4-FORKS]] (assinador local) · CICLO-FISCAL (BRIEF no PR #1322, ainda não em `main`).

**Em duas linhas.** A API faz bem mais do que a R5 supunha: transmite o PGDAS-D e gera o DAS, encerra a apuração do
MIT com o mesmo JSON que o Luminaris já monta, emite DARF pelo Sicalc e consulta pagamentos. **Risco principal:** o
token exige o **e-CNPJ do contratante** num TLS mútuo. O dono decidiu guardar o A1 cifrado no servidor e reverteu a
decisão de 22/10 (§10). O desenho só funciona com o arquivo A1, e a produção espera o parecer de advogado sobre a
guarda (L-ADN-5).

---

## 1. Por que a R5 adiou, e o que mudou

- **R5 (cédula #319, 14/09):** *"Adiar até X7 destravar — sem desenho de adaptador agora; contratar decide-se quando D1
  itens 1/1b chegarem"* (`CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md:25,36`). A premissa era que o MIT dependia
  dela. Desde então o X7 e o X9 avançaram sem a API: o MIT sai como arquivo JSON de importação (F-X7-9 → b), e o Simples
  sai como espelho mais o registro do DAS oficial (F-SN-8 → b).
- **O que mudou:** (i) o ciclo fiscal agendado (PR #1322) precisa de um canal de entrega. Sem ele, todas as
  obrigações acabam em `AGUARDANDO_HUMANO`, e §3.2 desse BRIEF lista "Procuração e-CAC, e-CNPJ, PSC → R5". (ii) A
  pesquisa de hoje mostra que o MIT tem **encerramento por API** desde 28/03/2025 [D04 linha 041] e que o PGDAS-D aceita
  **cálculo sem transmissão** e **comparação com o nosso valor** [D18]. Nenhum dos dois era conhecido em 14/09.
- **O que não mudou:** [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]] ("o Luminaris não contrata serviço; se um dia
  contratar, será BYOK") e o item 3 de [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] ("o Luminaris não guarda o
  certificado do cliente"). ~~As duas valem integralmente. O desenho recomendado (§5) cabe dentro delas.~~ *(Superado
  na ratificação, §10: a 2ª foi revertida pelo dono para todos os usos; da 1ª fica o item 1, "o Luminaris não
  contrata".)*

## 2. O que a API entrega de fato (verificado na documentação oficial, 21/11/2026)

Grau: **V** = lido na fonte oficial do dossiê · **I** = inferido do texto · **NV** = não encontrado.

### 2.1 Serviços relevantes ao que o Luminaris já gera

| O que o Luminaris tem hoje | Serviço da API (idSistema / idServico, tipo de cobrança) | O que faz | Grau |
|---|---|---|---|
| Espelho do PGDAS-D + registro manual do DAS (`SimplesApuracaoService.registrarDas`) | `PGDASD/TRANSDECLARACAO11` (Declarar), desde 23/09/2022 | Transmite a declaração original ou retificadora. Com `indicadorTransmissao=false`, **devolve os valores devidos sem transmitir**. Com `indicadorComparacao=true`, só transmite se os `valoresParaComparacao` forem **exatamente** os calculados; *"Diferença de 0,01 … não permitirá a transmissão"*. Com qualquer erro, *"nenhum dado será salvo"* | V [D18 regras b, f] |
| idem | `PGDASD/GERARDAS12` (Emitir) | Gera o DAS de uma declaração já transmitida, inclusive para data de consolidação futura | V [D19] |
| idem | `PGDASD/CONSULTIMADECREC14`, `CONSDECREC15`, `CONSEXTRATO16` (Consultar) | Última declaração e recibo, declaração e recibo, extrato do DAS | V [D04] |
| idem | Regra (a) do TRANSDECLARACAO11 | *"Se … ocorra uma transmissão pela Web, a declaração pelo IntegraSN deverá ser retificadora"*: o tipo (original × retificadora) depende do que já existe na RFB | V [D18 regra a] |
| idem (fator r) | Campo `folhasSalario` | **Obrigatório para PA posterior a 10/2026** (changelog de 03/11/2026) | V [D21] |
| Arquivo JSON de importação do MIT (`lib/mit.ts`, `MitExportService`) | `MIT/ENCAPURACAO314` (Declarar), desde 28/03/2025 | Recebe o **mesmo leiaute** do arquivo (`PeriodoApuracao`, `DadosIniciais`, `Debitos`…) e **encerra** a apuração. O envio à DCTFWeb é assíncrono e devolve `protocoloEncerramento`. *"Caso exista uma apuração em edição no mesmo período, esta será sobrescrita"* | V [D13] |
| idem | `MIT/SITUACAOENC315` (Apoiar, **gratuito**) | Situação `EM EDIÇÃO` / `ENCERRAMENTO EM CURSO` / `ENCERRADA`, com `avisosDctf`. A DCTFWeb pode recusar: o retorno é aceito (MSG_0024), mas a situação volta a `EM_EDIÇÃO` | V [D13 dúvidas c, d; D14] |
| idem | `MIT/CONSAPURACAO316`, `LISTAAPURACOES317` (Consultar) | Consulta apuração e pendências; lista por ano ou mês | V [D04, D12] |
| DCTFWeb: nada (o Luminaris não gera) | `DCTFWEB/CONSXMLDECLARACAO38` + `TRANSDECLARACAO310` (Declarar) | Gera o XML da declaração **em andamento** e transmite. O XML deve ser assinado (XMLDSig, elemento `ConteudoDeclaracao`) pelo certificado do **autor do pedido** e ficar *"idêntica, caractere a caractere"* | V [D15, D16] |
| idem | `DCTFWEB/GERARGUIA31` (Emitir), `CONSRECIBO32` | Guia (DARF) e recibo da declaração **ativa** | V [D04, D15] |
| Código de receita e vencimento do DARF, sem guia (`ProfitDistributionService.ts:282`, `InterestOnEquityService.ts:273`, apurações do X7) | `SICALC/CONSOLIDARGERARDARF51` (Emitir), `GERARDARFCODBARRA53` (Emitir), `CONSOLIDAR54` (Consultar, desde 15/10/2026), `CONSULTAAPOIORECEITAS52` (Apoiar, **gratuito**) | Consolida multa e juros, devolve o PDF do DARF em base64, o número do documento e o **QR Code Pix**. O código de barras é outra chamada | V [D22, D04] |
| Baixa do imposto: só manual | `PAGTOWEB/PAGAMENTOS71` (Consultar), `COMPARRECADACAO72` (Emitir) | Consulta pagamentos e emite o comprovante de arrecadação | V [D25, D04] |
| DEFIS (espelho `SimplesDeclaracaoService.defis`) | `DEFIS/TRANSDECLARACAO141` (Declarar), desde 25/09/2023 | Transmite a DEFIS | V [D04]; leiaute **NV** |
| DASN-SIMEI (espelho) | `DASNSIMEI/TRANSDECLARACAO151` | **Sem data de implantação** no catálogo | V [D04]: roadmap |

### 2.2 O que **não** está na API (corrige o enunciado da tarefa)

- **EFD-Reinf, ECD, ECF e eSocial não constam do catálogo** [D04]. A Reinf continua pelo webservice próprio
  (`ReinfTransmissorPort`, PR-4 do [[EFD-REINF]]); ECD e ECF continuam no PVA (gate H1); o eSocial é do [[PES-4]].
- Sem data no catálogo, tratados como roadmap: DCTFWeb 3.4–3.7, 3.9, 3.11, 3.12 e DASN-SIMEI 15.x [D04].
- **Ambiente de testes:** só a **demonstração (trial) com dados simulados** (*"mock objects"*), no endpoint
  `gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/<Tipo>`, com token público e sem `jwt_token` [D10, D11].
  **NV** um ambiente de homologação com dados reais: a primeira chamada real é produção.

### 2.3 Autenticação, procuração e identidade

- **Contratação:** *"É necessário o uso do certificado digital e-CNPJ"*. Contrato assinado com e-CNPJ, chaves em até
  10 minutos na Área do Cliente, cancelamento *"a qualquer momento"* [D02, D26]. Qualquer porte pode contratar [D02].
- **Token:** OAuth2 `client_credentials` em `https://autenticacao.sapi.serpro.gov.br/authenticate`, com Basic
  (Consumer Key:Secret), `role-type: TERCEIROS` e **o e-CNPJ do contratante como certificado de cliente (.p12/.pfx)
  no TLS**. Devolve `access_token` e `jwt_token`, com `expires_in`, e 401 pede nova autenticação [D03].
  *"Esse certificado digital deve ser o mesmo utilizado na contratação do produto"* [D03].
- **NI do contratante:** o NI informado em `contratante.numero` tem de ser o do certificado validado no `jwt_token`.
  Divergência = 403 `ICGERENCIADOR-016` [D06].
- **I:** o certificado só entra na chamada de autenticação. O passo 4 do guia chama a API só com `Authorization: Bearer`
  e o cabeçalho `jwt_token`, sem certificado [D03]. Então um token obtido fora do servidor pode ser usado pelo servidor.
  A duração (`expires_in`) **não está na documentação lida** (insumo ausente, BRIEF §6).
- **Procuração:** *"Existem serviços que exigem a procuração eletrônica quando o autor do pedido de dados não é o
  próprio contribuinte"* [D05]. Códigos: PGDAS-D e DEFIS `00146`, DCTFWeb `00103`, Caixa Postal `00006`, Pagamentos
  `00004`, SITFIS `00002`. **Sicalc e PGMEI: n/a** [D05]. **Os serviços MIT 3.14–3.17 não aparecem na tabela (NV).**
- **Software-house sem procuração:** quem contratou mas age em nome de um procurador envia um **Termo de Autorização**
  em XML assinado (XMLDSig, e-CPF ou e-CNPJ A1/A3) pelo procurador. Recebe um token que vale *"até a meia-noite do dia
  seguinte"* e vai no cabeçalho `autenticar_procurador_token` [D23, D24].

### 2.4 Custo, cobrança e limites

- **Preço por chamada, em faixas de volume mensal; o total sai pela faixa atingida** [D26]:
  Consulta R$ 0,24 (1–300) … R$ 0,06 (>30.000); Emissão R$ 0,32 (1–500) … R$ 0,08 (>50.000); Declaração R$ 0,40
  (1–100) … R$ 0,12 (>10.000). A página não traz data. **Captura de 21/11/2026.**
- **Cobrado:** 200, 202 e 403. **Não cobrado:** 204, 304, 400, 401, 404, 429, 500, 503 e 504, nem `/Apoiar` e
  `/Monitorar` [D06, D07]. **I:** a chamada de PGDAS-D com `indicadorTransmissao=false` é do tipo Declarar e volta 200,
  então é cobrada (R$ 0,40 na 1ª faixa).
- **Rateio por cliente:** o cabeçalho `X-Request-Tag` (32 caracteres) aparece no relatório de consumo `.csv` da Área
  do Cliente [D09].
- **Timeout:** teto síncrono de 30 s. **504 é estado indeterminado**: *"Isso não garante que o backend não concluiu"*.
  Não reenviar de imediato; consultar antes; 504 não é tarifado [D08].
- **Limite de requisições:** 429 existe (*"Alguns serviços podem ter esse controle"*) [D07]. Números **NV**, salvo nos
  eventos de atualização.
- **I (aritmética, conferida contra o mercado):** declarar + emitir + consultar na 1ª faixa = 0,40 + 0,32 + 0,24 =
  **R$ 0,96**. Esse é o valor *"contratando direto na Serpro"* que a Alterdata publica para o DAS. Na 3ª faixa, PGDAS =
  0,32 + 0,26 + 0,18 = R$ 0,76, igual ao exemplo da Omie. **Ordem de grandeza por PJ do Simples:** ~R$ 1 por mês
  (transmitir, gerar DAS, consultar pagamento).

## 3. Como o mercado faz (central de ajuda dos fornecedores; pista, não fonte normativa)

| Fornecedor | Contratante | Credencial no ERP | Procuração | Serviços | Cobrança |
|---|---|---|---|---|---|
| **Omie (OneFlow)**, artigos de 05 e 08/06/2026 | **o escritório de contabilidade**, com o próprio e-CNPJ; *"ficam vinculadas ao CNPJ utilizado na contratação"* | o usuário cadastra Consumer Key/Secret no ERP | Autentica Procurador opcional | PGMEI, PGDAS, DEFIS, DCTFWeb, MIT, DARF | pós-paga, direto ao Serpro |
| **Alterdata (Prosoft)**, sem data | **a própria Alterdata**: *"foi contratado diretamente pela Prosoft by Alterdata"* | nenhuma: botão "CONTRATAR" no sistema | procuração e-CAC da empresa para o contador | DAS e DEFIS | revenda: DAS R$ 0,80 por transmissão, na fatura mensal |

Links: [Omie — contratar](https://ajuda.omie.com.br/pt-BR/articles/9749470-como-contratar-o-integra-contador) ·
[Omie — configurar](https://ajuda.omie.com.br/pt-BR/articles/9750205) ·
[Alterdata C1722](https://ajuda.alterdata.com.br/prosoftcontabil/c1722-integra-contador-como-funciona-220171012.html) ·
[Alterdata C1726](https://ajuda.alterdata.com.br/prosoftcontabil/c1726-simples-nacional-transmissao-retificacao-e-consultas-dos-documentos-via-integra-contador-220178907.html).
A Omie diz também que o "robô" no portal do PGDAS é bloqueado em horário comercial e que a via Integra Contador não é.
O mercado tem os dois modelos. Nenhum dos dois cita um agente local para o certificado: os dois guardam a credencial
do contratante no ERP.

## 4. Restrições que o desenho tem de respeitar (fato consumado)

1. **Sem contratação pelo Luminaris; serviço só BYOK** ([[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]).
2. **Sem guarda do certificado do cliente** ([[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] item 3; a L-ADN-5, parecer
   sobre custódia, não foi acionada). O `FiscalCertificate` (A1 cifrado por unidade, X10i PR-1) existe em `main`, mas o
   caminho de guarda está arquivado.
3. **O transporte sem guarda já planejado é o assinador local** (X10a EMENDA-4, [[D-2026-10-30-X10A-EMENDA-4-FORKS]]),
   que ainda **não está em `main`** (nota do [[X10a]], 07/11). É o e-CNPJ do próprio cliente, na máquina dele, assinando
   e abrindo o mTLS.
4. **R8:** instância = CNPJ raiz. O contratante é a raiz, e o PGDAS-D pede **todos os estabelecimentos** [D18].
5. **A confissão é humana até decisão contrária:** `ADR-INCR-DCTFWEB-MIT` D1 (*"O Luminaris não transmite"*), F-SN-8 →
   (b) (espelho, sem API), F-SN-10 → (a) (provisão definitiva pelo DAS oficial). Integrar **emenda** esses ADRs, e cada
   emenda é um fork (F-IC-5, F-IC-6).
6. **MIT parcial:** o arquivo só traz o que o Luminaris apura (F-X9-1 → a), e o encerramento por API **sobrescreve** a
   apuração em edição [D13]. Encerrar por API um arquivo parcial confessaria uma DCTFWeb incompleta.
7. **Camadas:** é integração com órgão externo, então porta de aplicação chamada por serviço ou job, **nunca** do motor
   DynamicTable (Contrato §2.1). Credencial e registro de chamada são Prisma first-class (legal, imutável, auditável).

## 5. Desenho proposto (sujeito aos forks)

### 5.1 Porta e adaptadores (molde `DfeEmissorPort` + `resolveEmissor`)

- **`ReceitaFederalPort`** (`server/src/features/accounting/receita/ReceitaFederalPort.ts`), porta de **aplicação** com
  métodos no vocabulário da lei, não da API: `entregarPgdasd`, `gerarDas`, `consultarUltimaDeclaracaoPgdasd`,
  `emitirDarf`, `encerrarApuracaoMit`, `situacaoEncerramentoMit`, `listarApuracoesMit`, `consultarPagamentos`.
  `capabilities.servicos` declara o que o adaptador faz; o serviço recusa o que não estiver lá (409 nomeado, como
  `DFE_*_NAO_SUPORTADA`).
- **Resultado com 4 desfechos** (`ResultadoChamada`): `OK` · `RECUSADO` (400, 403 de negócio, mensagens da RFB) ·
  `INDETERMINADO` (504 ou rede caída depois do envio [D08]) · `INDISPONIVEL` (429, 500, 503: nada chegou). Só
  `INDETERMINADO` exige consultar antes de reenviar.
- **Adaptadores:** `IntegraContadorAdapter` (HTTP real; produção ou trial por env) · `ReceitaDisabled` (motivo nomeado,
  nunca silêncio: sem credencial, sem token, serviço fora da lista) · `ReceitaFake` (testes). A seleção
  (`selectReceitaGateway(env, credencial)`) é pura, como `selectDfeEmissor`.
- **Cliente baixo nível puro** (`integraContadorEnvelope.ts`): monta o envelope `contratante / autorPedidoDados /
  contribuinte / pedidoDados{idSistema, idServico, versaoSistema, dados}` (o `dados` é **string JSON**) e lê a resposta
  (`dados` também string). Tudo testável sem rede, com os exemplos do dossiê como fixture.
- **Tokens:** porta separada `SapiTokenPort.obter(credencial) → { accessToken, jwtToken, expiraEm }`. O adaptador de
  produção depende do F-IC-2. O servidor guarda só o token, cifrado (`secretBox`) e com validade.

### 5.2 Persistência (Prisma first-class)

- **`ReceitaCredencial`**, 1 por PJ (`userId`, R8): `contratanteCnpj`, `autorTipo` (`CONTRIBUINTE` | `PROCURADOR`) +
  `autorNumero`, os serviços que o cliente ligou e a chave de entrega automática por obrigação (F-IC-3), desligada por
  padrão. Segredos (Consumer Key/Secret) **só** se o F-IC-2 os puser no servidor. O campo `autorTipo` nasce já com
  `PROCURADOR` para o F-IC-1 (b) entrar depois sem migração.
- **`ReceitaRequisicao`**, imutável, uma linha por chamada **cobrável ou com efeito**, gravada **antes** do envio
  (intenção) com `chaveIdempotencia` única (ex.: `PGDASD:TRANSDECLARACAO11:<cnpj>:<pa>:<sha256 dos dados>`),
  `requestTag` (= `X-Request-Tag`, rateio [D09]), `payloadSha256` (**nunca** o conteúdo: o MIT leva CPF do responsável,
  D12 do ADR do MIT), estado, `httpStatus`, `responseId`, protocolo, `sourceType/sourceId` (ocorrência do ciclo,
  apuração, exportação do MIT) e quem aprovou.
- **Documentos devolvidos** (PDF do DAS, do DARF, recibos) viram `SourceDocument` com proveniência própria. É o mesmo
  caminho que o `registrarDas` já exige (`SOURCE_TYPE_SIMPLES_DAS`, F-SD-3/4).

### 5.3 O que vira automático no ciclo fiscal e o que continua humano

| Passo | Hoje (PR #1322) | Com a integração (recomendação) | Por quê |
|---|---|---|---|
| Calcular a prévia | job | job (sem mudança) | — |
| **Transmitir o PGDAS-D** | humano no portal (`AGUARDANDO_HUMANO`) | humano **aprova no app** (1 clique, com a comparação oficial já feita na chamada). Automático só com a chave ligada pelo cliente (F-IC-3) | confissão de dívida (Res. CGSN 140 art. 38 § 2º I, citada no BRIEF do ciclo §3.2) |
| Gerar o DAS e registrar o oficial | humano baixa o PDF e chama `PUT …/das` | **automático** depois da transmissão: `GERARDAS12` → `SourceDocument` → `registrarDas` | é emissão de guia de valor já confessado; F-SN-10 continua (o valor é o oficial) |
| Emitir DARF (IRPJ/CSLL, PIS/COFINS, IRRF de dividendos e JCP) | só código e vencimento | **automático** na confirmação da apuração; com atraso, o Sicalc consolida multa e juros | emissão, não confissão; o DARF não declara nada |
| **Encerrar o MIT** | humano importa o arquivo e encerra no e-CAC | humano **aprova no app** e **atesta** que o mês não tem outros débitos (F-IC-5); depois o job consulta a situação (gratuito) | confissão (IN 2.237 art. 2º, D1 do ADR do MIT) + risco de sobrescrita |
| Saber se pagou | humano marca `PAGA` | **automático**: `PAGAMENTOS71` depois do vencimento, comprovante anexado | consulta |
| Transmitir a DCTFWeb fora do MIT | — | fora do nó (não há DCTFWeb gerada pelo Luminaris) | — |
| Reinf, ECD, ECF, eSocial | humano / porta sem adaptador | **sem mudança**: não estão na API (§2.2) | — |
| Contratar o Serpro, ter e-CNPJ ~~, manter o assinador ligado~~ (§10.2: ter um **A1 em arquivo** e enviá-lo ao Luminaris) | — | **humano (o cliente ou o escritório)** | contrato e identidade |
| Opção pelo Simples, opção de regime de caixa | humano | **sem mudança** (o `REGIMEAPURACAO` existe, mas a opção é irretratável) | decisão do contribuinte |
| Pagar a guia | humano | **sem mudança** | regra de pagamento do produto |

## 6. O que **não** muda

- A apuração continua do Luminaris. A API não recalcula o Real nem o Presumido, e no Simples a RFB calcula e o nosso
  valor só confere (comparação exata).
- O arquivo do MIT e o espelho do PGDAS-D continuam: são o canal de quem não tiver credencial, e a prova do que foi
  enviado.
- A porta `EnvioMit` (D11) continua como tipo + função pura; o adaptador HTTP é o `encerrarApuracaoMit` desta porta, que
  **consome** o `montarArquivoMit` sem mudá-lo.

## 7. Forks (como foram levados ao dono; a ratificação está em §10)

> F-IC-1 e F-IC-2 vêm antes e são acoplados: o contratante define onde precisa estar o e-CNPJ. Os outros forks
> pressupõem a recomendação deles.

**F-IC-1 — Quem é o contratante (e quem paga o Serpro).**
- **(a) Cada PJ cliente contrata no próprio CNPJ (BYOK)** e paga o consumo direto ao Serpro, pós-pago (~R$ 1 por mês
  no Simples, §2.4). O autor do pedido é o próprio contribuinte, então **nenhuma procuração** é necessária [D05].
- (b) O escritório de contabilidade do cliente contrata (modelo Omie) e age como procurador: procuração e-CAC por
  cliente ou Termo de Autorização diário [D23]. Uma credencial serve a vários tenants, e é preciso um vínculo
  escritório × cliente que não existe hoje.
- (c) O Luminaris contrata e revende (modelo Alterdata). Exige o e-CNPJ do Luminaris (compra) e procuração e-CAC de cada
  cliente para o CNPJ do Luminaris, que passa a confessar débito em nome de terceiros. **Contraria a decisão de 30/10**,
  e a responsabilidade pede advogado.
- (d) Não integrar agora; manter arquivo e espelho.
- **Recomendação: (a)**, com o modelo de dados já pronto para (b) (`autorTipo = PROCURADOR`, sem migração depois). É a
  única que cabe nas duas decisões em vigor sem nova decisão: BYOK, sem custo para o Luminaris, sem procuração.

**F-IC-2 — Onde mora o e-CNPJ do contratante para o `/authenticate` (e para assinar XML quando for preciso).**
- **(a) No assinador local do cliente (X10a EMENDA-4).** O assinador faz o mTLS com o SAPI e entrega ao servidor só o
  par `access_token`/`jwt_token`, com a validade. **Consumer Key e Secret também ficam no assinador**, então o servidor
  não guarda segredo de longo prazo. Custo: depende do assinador em `main` e de ele estar ligado quando o token
  expira.
- (b) A1 em arquivo, cifrado no servidor (o `FiscalCertificate` já existe). Funciona sem máquina do cliente, mas
  **reabre a guarda** recusada em 22/10 e exige o parecer da L-ADN-5.
- (c) e-CNPJ em nuvem no PSC fazendo o handshake TLS (saída (b) do §4.1 de `D5-DECISAO-2026-10-30`). Não verificado em
  nenhum PSC para TLS.
- **Recomendação: (a).** É o mesmo transporte já escolhido para a NF-e e a NFS-e sem guarda, e um único assinador serve
  aos três. **Risco declarado:** se o `expires_in` for curto (insumo ausente), a automação fica presa ao horário em que a
  máquina do cliente está ligada. O job então avisa "abra o assinador", em vez de falhar calado.

**F-IC-3 — Quem aperta "transmitir" nas declarações (PGDAS-D, MIT).**
- (a) Sempre o humano, no app: o job prepara, valida e agenda.
- (b) Sempre o job.
- **(c) Humano por padrão + chave por obrigação que o cliente liga** (`entregaAutomatica.PGDASD`, `.MIT`). Com ela
  ligada, o job transmite quando a comparação oficial bate e a ocorrência está a N dias do vencimento.
- **Recomendação: (c).** Mesma linha do ciclo fiscal (*"lançar sozinho só o que é determinístico"*, chave por perfil).
  A confissão fica com quem ligou a chave, e emissões e consultas não precisam de chave.

**F-IC-4 — Ordem dos PRs (não é corte de escopo: o BRIEF cobre todos).**
- **(a) Simples primeiro:** PR-0 contrato → PR-1 credencial e token → PR-2 PGDAS-D + DAS → PR-3 DARF (Sicalc) →
  PR-4 pagamentos → PR-5 MIT → PR-6 ligação com o ciclo fiscal.
- (b) MIT primeiro (o leiaute já existe).
- **Recomendação: (a).** O 1º cliente é Simples em SP, e o PGDAS-D tem a comparação oficial que protege a 1ª
  transmissão real. O MIT carrega o risco do arquivo parcial (F-IC-5).

**F-IC-5 — Encerrar o MIT por API com arquivo parcial (emenda ao D1 e ao F-X9-1 do `ADR-INCR-DCTFWEB-MIT`).**
- **(a) Só com atestado:** o usuário confirma no app que o mês não tem outros débitos fora do que o Luminaris apura.
  Antes de enviar, o serviço lista as apurações do mês (`LISTAAPURACOES317`). Se houver uma **em edição**, mostra que
  será sobrescrita. Se houver uma **encerrada**, o envio vira retificador e pede uma segunda confirmação. Sem atestado,
  segue o arquivo.
- (b) Nunca encerrar por API: o MIT continua só por arquivo, e a API serve para consultar a situação.
- (c) Encerrar sempre, só com aviso.
- **Recomendação: (a).** A defesa do F-X9-1 era o aviso no arquivo. Na API, o aviso vira bloqueio com confirmação
  explícita e auditada.

**F-IC-6 — PGDAS-D pela API × F-SN-8 (b) "espelho, sem API" (emenda ao PRE-ADR do Simples).**
- **(a) A API vira canal opcional sobre o espelho**, com `indicadorComparacao = true` sempre. Divergência ⇒ 409 com a
  diferença por tributo, e nada é transmitido (regra b [D18]). O humano pode reenviar **sem** comparação só com motivo
  escrito e auditado: o valor da RFB é o oráculo, mas divergência pode ser atividade mal segregada.
- (b) Igual, mas sem a saída do motivo: divergência só se resolve corrigindo o cálculo ou os insumos, ou no portal.
- **Recomendação: (a).** Mantém o oráculo no centro, como o F-SN-8 queria, e não trava o cliente no vencimento por
  causa de um modelo nosso incompleto.

**F-IC-7 — Como provar antes da primeira chamada real (não há homologação com dado real).**
- **(a) Fake nos testes + teste de contrato opcional contra o trial (mock) + runbook humano da 1ª transmissão real**
  com o 1º cliente (`RUNBOOK-FORMAT`, desfecho e assinatura do dono). A 1ª chamada real é uma consulta gratuita
  (`CONSULTAAPOIORECEITAS52`, `/Apoiar`).
- (b) O Luminaris contrata para testar consultas no próprio CNPJ. Contraria a decisão de 30/10.
- **Recomendação: (a).**

**F-IC-8 — DEFIS e DASN-SIMEI.**
- **(a) Fora deste nó.** A DEFIS de 2026 é a última (em 2027 vira o bloco anual do PGDAS-D, BRIEF do ciclo §6 item 22),
  e o leiaute da API não foi lido. A DASN-SIMEI não tem data de implantação [D04]. Vai para a caixa de lacunas.
- (b) Entra no PR-2.
- **Recomendação: (a).**

## 8. Pendente de validação externa

1. **Duração do token SAPI** (`expires_in`): não está nas páginas lidas. Define se o F-IC-2 (a) automatiza de verdade.
2. **Procuração dos serviços MIT:** ausentes da tabela [D05]. Com o F-IC-1 ratificado (modo `PROCURADOR` na 1ª fase),
   **vale já**: o MIT no modo `PROCURADOR` fica recusado com nome até o código ser conhecido (BRIEF item 24).
3. **A DCTFWeb do contribuinte só com MIT é transmitida no encerramento, ou precisa de `TRANSDECLARACAO310`?** O texto
   diz que as apurações *"terão suas informações transmitidas para a DCTFWeb"* [D12]. Não diz se a declaração fica
   `ATIVA`. Prova: o runbook da 1ª transmissão (F-IC-7), lendo `CONSRECIBO32`.
4. **Termos de uso e contrato do Serpro** (sigilo fiscal, LGPD, uso por software de terceiro com a credencial do
   cliente): **não são públicos**.
   - O contrato de adesão aparece no fluxo de contratação, com login e e-CNPJ. A loja só linka a política de
     privacidade geral (22/11).
   - **Pista, não fonte deste produto:** outros contratos de adesão do Serpro ligados a dados da RFB proíbem repassar os
     dados a terceiros e citam a Portaria RFB 34/2021.
   - Se o contrato do Integra Contador vedar o uso da credencial por software de terceiro, os dois modos do F-IC-1
     caem. Prova: o cliente do RB-IC-1 lê o contrato ao contratar, e ele vai ao dossiê.
5. **Norma da procuração eletrônica — RESOLVIDO (22/11).** Vale a **IN RFB 2.320/2026**, que revogou a 2.066/2022.
   Lida no Sijut: `pesquisas-legais/procuracao-eletronica-ecac` [D03] (lá a numeração dos documentos é a daquele dossiê).
   - A autorização de acesso tem efeito de procuração (art. 6º p.ú.) e admite atos de confissão (art. 7º § 1º II).
   - Lista os serviços com exatidão e vale até 5 anos (art. 7º § 1º I e IV); sem substabelecimento (art. 8º § 3º).
   - **É vedado automatizar a outorga** por sistema de terceiro (art. 13). A Cogea pode limitar o número de autorizações
     por representante (art. 15; o ato não foi procurado).
6. **Efeito de confissão pela API = pelo portal:** inferido. A Res. CGSN 140 art. 38 § 2º I não distingue canal (citada
   no BRIEF do ciclo).
7. **(Desde a ratificação) Parecer de advogado sobre a guarda de certificado de terceiro (L-ADN-5).** Vale para o A1
   da PJ e para o do escritório (modo `PROCURADOR`). É gate de produção (§10, BRIEF §5 RB-IC-0).

## 9. OPS-001

1. **Objetivo:** dizer o que a API entrega e propor o nó; em §2 e §5.3.
2. **Grau:** marcado por linha (V/I/NV).
3. **Caso adversarial tentado:** "a API resolve tudo". Caiu: Reinf, ECD e ECF não estão no catálogo, não há homologação,
   e o token exige o e-CNPJ do contratante no TLS. O desenho inicial (o cliente contrata e o servidor autentica) **viola
   o "sem guarda"**, e isso só apareceu ao ler o guia de autenticação [D03] contra a decisão de 22/10.
4. **Checagem que falharia se eu estivesse errado:** o runbook da 1ª chamada real (F-IC-7) lê `responseId` e
   `httpStatus`, e o 403 `ICGERENCIADOR-016` prova ou derruba a premissa do NI [D06].
5. **Primeiras linhas:** o "Em duas linhas" acima.

## 10. Ratificação (dono, questionário, 21–22/11/2026) — prevalece sobre §4, §5 e §7

| Fork | Decisão | Na recomendação? | Efeito no desenho |
|---|---|---|---|
| F-IC-1 | **BYOK + contador já.** Cada cliente contrata no próprio CNPJ, **ou** o escritório de contabilidade que já tem contrato atua como procurador, as duas na 1ª fase. Antes, o dono pediu pesquisa de opção grátis (*"Pesquise outras soluções grátis se não houver, byok"*). Resultado: não há API oficial gratuita. O Conecta gov.br é gratuito só para órgãos públicos, e a automação de portal (robô) esbarra em CAPTCHA, que o produto não contorna. A pesquisa saiu de resumos de busca, então é grau I: [Conecta — catálogo](https://www.gov.br/conecta/catalogo/), [Conecta — quem acessa](https://www.gov.br/governodigital/pt-br/infraestrutura-nacional-de-dados/interoperabilidade/conecta-gov.br/acessar-os-servicos-do-conecta), [emitir DARF (SicalcWeb)](https://www.gov.br/pt-br/servicos/emitir-darf-para-pagamento-de-tributos-federais). O gratuito é o caminho manual que já existe (arquivo do MIT, espelho do PGDAS-D, e-CAC, SicalcWeb) | extensão de (a) com (b) | §10.1 |
| F-IC-2 | **(b) A1 em arquivo, cifrado no servidor, para todos os usos.** Pergunta de alcance: *"Todos os usos"* (NF-e, NFC-e e NFS-e também) | **não** (recomendado: assinador local) | §10.2; [[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]] |
| Parecer da guarda | **Produção espera o parecer** do advogado (L-ADN-5): código e testes seguem; a 1ª chamada real com o A1 de terceiro só depois | sim | gate RB-IC-0 no BRIEF §5 |
| F-IC-3 | (c) humano por padrão + chave por obrigação | sim | — |
| F-IC-4 | (a) Simples primeiro | sim | — |
| F-IC-5 | (a) MIT só com atestado | sim | — |
| F-IC-6 | (a) divergência bloqueia; saída com motivo auditado | sim | — |
| F-IC-7 | (a) fake + trial + runbook da 1ª transmissão real | sim | — |
| F-IC-8 | **(b) DEFIS e DASN-SIMEI entram no PR do Simples** | **não** (recomendado: fora) | §10.3 |

### 10.1 Dois modos de credencial na 1ª fase (F-IC-1)

- **`CONTRIBUINTE`:** contratante = autor = a PJ cliente. Sem procuração [D05]. O certificado é o A1 da própria PJ, o
  `FiscalCertificate` da unidade matriz, cujo `cnpjCertificado` tem de ser o contratante [D06].
- **`PROCURADOR`:** contratante = autor = o escritório de contabilidade; contribuinte = a PJ cliente. Exige a
  **autorização de acesso** (o novo nome da procuração eletrônica, IN RFB 2.320/2026) do cliente para o escritório.
  Ela é concedida só pelo cliente, no aplicativo oficial, e o Luminaris nunca a automatiza (art. 13). Os códigos de cada serviço são: `00146` PGDAS-D e DEFIS,
  `00103` DCTFWeb, `00004` pagamentos; Sicalc e PGMEI `n/a` [D05]. **MIT: não listado** (§8 item 2). Como contratante e
  autor coincidem, **não** há Termo de Autorização [D23]. O A1 é **do escritório**, guardado cifrado na credencial
  daquela PJ (não no `FiscalCertificate`, que é o certificado da própria PJ).
- **Uma credencial por PJ** nas duas formas: o escritório que atende 10 clientes cadastra a credencial em cada um. Uma
  conta de escritório compartilhada entre tenants exige um vínculo que o produto não tem (sem multiempresa,
  `AccountingScope`) e vai à caixa como feature.
- **Quem paga:** quem contratou, direto ao Serpro. O `X-Request-Tag` [D09] por PJ dá ao escritório o rateio do
  consumo por cliente.
- **403 sem procuração:** o adaptador mapeia o 403 de acesso negado para `RECEITA_SEM_PROCURACAO`, com o código da
  procuração do serviço. O 403 é cobrado [D06], e a consulta prévia de procuração (`OBTERPROCURACAO41`, também
  cobrada) só roda no teste da credencial.

### 10.2 Certificado no servidor (F-IC-2 → b)

- O token SAPI é obtido **pelo servidor**, com o A1 decifrado só em memória para o mTLS do `/authenticate` [D03].
  Consumer Key e Secret ficam cifrados (`secretBox`, keyring `RECEITA_KEYS`, AAD = id da credencial). Sem dependência
  do assinador local: a automação do F-IC-3 roda sem máquina do cliente ligada.
- A assinatura do XML da DCTFWeb [D16], se for preciso (§8 item 3), também sai do servidor, com o A1 do autor.
- **e-CNPJ em nuvem (PSC) não serve a este nó:** o TLS com o SAPI exige o arquivo .p12/.pfx [D03]. O cliente que
  quiser a entrega automática precisa de um **A1 em arquivo**.
- **Fora deste nó (vai à caixa):** a mesma reversão vale para NF-e, NFC-e e NFS-e. Abre a saída (a) do §4.1 de
  `D5-DECISAO-2026-10-30` (o cliente entrega o A1 para o transporte) e pode desarquivar o BRIEF-ADN de guarda.
  Replanejar o X10a e o X10i é de outra sessão.

### 10.3 DEFIS e DASN-SIMEI no PR-2 (F-IC-8 → b)

- **DEFIS** (`TRANSDECLARACAO141`, implantado em 25/09/2023 [D04]): mapper do espelho `SimplesDeclaracaoService.defis`
  para o leiaute da API, com o mesmo par aprovação humana + chave do F-IC-3. Vale para a DEFIS de 2026, entregue em 2027.
  Em 2027 ela vira o bloco anual do PGDAS-D (BRIEF do ciclo, §6 item 22). O leiaute é insumo do PR-2.
- **DASN-SIMEI** (`TRANSDECLARACAO151`, **sem data de implantação** [D04]): mesma forma, atrás de uma capacidade do
  adaptador. Enquanto o serviço não responder em produção, a rota recusa com `RECEITA_SERVICO_NAO_IMPLANTADO`, e nada é
  inventado. Também entra o DAS de excesso (`GERARDASEXCESSO153`), que acompanha a declaração.
