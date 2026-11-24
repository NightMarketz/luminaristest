# BE-INCR-NFSE-PAULISTANA — NFS-e municipal de São Paulo (Nota Paulistana) emitida pelo produto, no `DfeEmissorPort` — nó NFSE-PAULISTANA

> `sessao-planejamento`, 2026-11-21, sobre `origin/main` `43719baa`. PRE-ADR + BRIEF num documento só (molde do
> `BE-INCR-CICLO-FISCAL-brief.md`). **Sem código.** Implementação exige `executa` próprio do dono (ORCH-006).
>
> **Autorização, literal:** dono, 2026-11-21, questionário da sessão de medição do fiscal, à pergunta *"Fork da NFS-e de
> São Paulo: … Planejar o adaptador?"*, a resposta *"Planejar o adaptador"*; e no chat do mesmo dia: *"Executa tudo pra
> liberar e poder rodar em xhigh até terminar"*. Lacuna de origem: `L-20261121-183240-e378`. **Cobre o planejamento** deste
> nó (nota, PRE-ADR/BRIEF, forks ao dono, PR só de `.md`). Não é `executa` de código, não autoriza merge fora da classe de
> risco.
>
> **Forks F-NSP-0..12 RATIFICADOS em 21/11** por questionário ([[D-2026-11-21-NFSE-PAULISTANA-FORKS]]); F-NSP-2 contra a
> recomendação (modo manual **dentro** do nó, PR-M), e F-NSP-2b perguntado em seguida. Código segue esperando `executa`.
>
> **Em duas linhas:** um adaptador `paulistana` no `DfeEmissorPort` monta o RPS do leiaute 2 da prefeitura a partir da
> mesma montagem da NFS-e, assina e transmite pelo **assinador local** do cliente (o mesmo da NF-e) — ou, no modo manual
> (PR-M), entrega a ficha, recebe o XML da nota emitida no site e relê — e grava o `FiscalDocument` que o relatório de ISS do X7 e a apuração de IBS/CBS já leem. **Risco principal (verificado):** o
> público é menor do que o pedido diz — desde 01/11/2026 a IN SF/SUREM 10/2011 art. 1º-A § 2º (red. IN 13/2026) **veda** a
> Paulistana ao Simples, ao MEI e a quem **sair** do Simples; sobra a PJ de SP capital em regime normal que não passou pelo
> Simples. E a prefeitura **não tem homologação**: só um método de teste em produção que não gera nota.

> **EMENDA PAÍS NA BORDA (24/11/2026)** — [`ADR-PAIS-NA-BORDA`](../adr/ADR-PAIS-NA-BORDA.md) (Proposed).
> - **Autorização:** dono, 24/11, à pergunta *"Esses BRIEFs seguem como foram escritos ou já nascem pela regra?"*: **"Já
>   nascem pela regra"** (D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA §6). O `executa` de 24/11 (§4 da mesma cédula)
>   continua e vale para **este BRIEF emendado**. **Divergência registrada** com a regra 1 da `sessao-planejamento`
>   ("não edita spec existente"): a edição no lugar foi mandada pela tarefa e pela §6.
> - **O que muda:** a NFS-e de São Paulo é instância brasileira (municipal) inteira, então todo arquivo novo vai para
>   `server/src/features/accounting/paises/br/**`, com os nomes de hoje (F-PBA-2 a). O centro só ganha a coluna
>   `numberingScheme` na `FiscalDocumentSequence` (F-PBA-1 a). As colunas novas de `FiscalProfile` e `ServiceFiscalProfile`
>   vão para os satélites 1:1 `BrFiscalProfile` e `BrServiceFiscalProfile` (R4), escritos por rota da borda (F-PBA-4 a).
>
> | Antes (21/11) | Depois (24/11) |
> |---|---|
> | `server/src/lib/paulistana/**` (PR-1, bibliotecas puras) | `server/src/features/accounting/paises/br/models/nfse/paulistana/**` (F-PBA-3 a; folha, `L6`) |
> | `server/src/features/accounting/dfe/paulistana/**` (PR-M, PR-4) | `server/src/features/accounting/paises/br/dfe/paulistana/**` |
> | `FiscalProfile.{nfseSistema, nfseEmissao, paulistanaSemSimplesDesde20261101, rpsSerie, pacoteCodigoServicoSp}` | satélite `BrFiscalProfile` (1:1 com `FiscalProfile`), mesmas colunas; `nfseEmissao` é o do ADL-14 da X10i (quem chega primeiro cria, no satélite; lacuna `L-20261124-035405-9b71`) |
> | `ServiceFiscalProfile.codigoServicoSp` | satélite `BrServiceFiscalProfile.codigoServicoSp` |
> | campos novos em `FiscalProfileDto.ts` / `ServiceFiscalProfileDto.ts` | DTOs da borda `paises/br/dtos/{BrFiscalProfileDto,BrServiceFiscalProfileDto}.ts`, rotas `PUT /api/accounting/fiscal-profile/br` e `PUT /api/accounting/service-fiscal-profiles/:serviceRef/br` (+ os GET) |
> | `FiscalDocumentSequence.numeracao` | `FiscalDocumentSequence.numberingScheme` (centro, inglês); valores `''` e `'RPS_SP'` |
> | `PAULISTANA_ENDPOINTS` (sem caminho) | `paises/br/dfe/paulistana/paulistanaEndpoints.ts` |
>
> - **Forks novos que travam PRs deste BRIEF** (ADR §6, RATIFICAÇÃO PENDENTE): F-PBA-1 e F-PBA-2 (nomes, todo código);
>   F-PBA-3 (PR-1); F-PBA-4 (PR-2); F-PBA-5 (PR-2, PR-M, PR-4). O PR-0 (só ADRs) não depende de nenhum.
> - **Escopo `LEGADO_BR` usado** (ADR §3.1, ramo a do F-PBA-5): `features/accounting/dfe/**` (seleção, resolução do
>   adaptador, protocolo e hosts do assinador), `services/FiscalDocumentEmissionService.ts` (renderizador),
>   `services/FiscalDocumentLifecycleService.ts` (evento `cancelamentoMunicipal`), `services/FiscalProfileService.ts` (volta a
>   `NACIONAL` na troca de regime, na mesma tx) e `models/issCompetencia.ts` (`locaisDoPayload`). O
>   `controllers/fiscalDocumentController.ts` é camada de aplicação (F-PBA-3 a) e não precisa do escopo.
> - **Pré-requisito:** o item 0 da guarda (ADR §3: `P1`, `P2`, G1–G5) entra no 1º PR de código emendado; se o PR-1 deste
>   BRIEF for o primeiro, ele o carrega. Sem o G2, o DTO da borda fica fora do snapshot de shape.

## 0. Formulário (contexto fixo)

- **Item a planejar:** nó novo `NFSE-PAULISTANA` (nome já usado na proposta F4 de
  [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md`](../plano/PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md) linha 248 e
  na [[FILA-ORDEM]] linha F4). Nota: [`docs/plano/nos/NFSE-PAULISTANA.md`](../plano/nos/NFSE-PAULISTANA.md).
- **Autorização:** a citação acima. **Confere com o item:** "planejar o adaptador" da NFS-e de SP no `DfeEmissorPort`
  é exatamente este documento. A Q9 de 20/10 (F4 "só com cliente SP normal") segue aberta e não é decidida aqui: o
  dono mandou planejar agora; o `executa` continua dele (§6, F-NSP-0).
- **Insumos lidos (21/11, por leitura de arquivo):**
  - Código: `server/src/features/accounting/dfe/{DfeEmissorPort,selectDfeEmissor,resolveEmissor,ManualEmissor,
    selectDfeAssinador,AssinadorRemotoPort}.ts`, `dfe/local/assinadorLocalRuntime.ts`, `dfe/sefaz/SefazTransporte.ts`;
    `prisma/schema.prisma` (`FiscalProfile` 1763–1910, `FiscalDocument` 2357, `FiscalDocumentAttempt` 2450,
    `FiscalDocumentSequence` 2469); `repositories/FiscalDocumentRepository.ts:67` (`findForIssReport`);
    `models/issCompetencia.ts:83` (`locaisDoPayload`); `services/FiscalDocumentEmissionService.ts` (estrutura: `emit`,
    `createAndSend`, `assemble`, `buildPayload`); PR aberto #1146 (AL-PR-3): `dtos/DfeSignerDto.ts`
    (`DfeSignerConteudoSchema`, `DfeSignerTarefaTransmitirSchema`), `dfe/local/sefazHosts.ts`.
  - ADRs/BRIEFs: [`ADR-INCR-DFE-EMISSAO-PARCEIRO`](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) §13–§14;
    [`ADR-ASSINADOR-LOCAL`](../adr/ADR-ASSINADOR-LOCAL.md) inteiro;
    [`BE-INCR-DFE-ADN-EMENDA-ASSINADOR-LOCAL-brief.md`](BE-INCR-DFE-ADN-EMENDA-ASSINADOR-LOCAL-brief.md) (ADL-2, ADL-3,
    ADL-14, §4.1); notas [[X10a]], [[X10i]], [[DFE-MANUAL]], [[ISS-TRANSICAO-IBS]] (frontmatter e folds).
  - Fontes oficiais: dossiê [`pesquisas-legais/nfse-paulistana-adaptador`](../../pesquisas-legais/nfse-paulistana-adaptador/relatorio.md)
    D01–D09 — manual do webservice **v3.4.1 de 19/11/2026** [D04, SHA-256 `8fcea6e81a3f…`], IN SF/SUREM 10/2011
    compilada [D09], IN SF/SUREM 13/2026 [D06], notícias da SF de 02/01, 19/10 e 19/11/2026 [D02][D03][D07]. **Nenhuma
    norma municipal de SP do assunto está no acervo `ctresb/leis`** (lido em 21/11): tudo veio da fonte oficial.
- **Nós vizinhos:**
  - Consome (fato consumado): [[X10b]] (porta, `FiscalDocument`, montagem da DPS), [[DFE-MANUAL]] (adaptador por
    documento, `resolveEmissorFor`), [[X11]] (eventos, cancelamento, janela), [[X7]] (relatório de ISS por competência),
    [[ISS-TRANSICAO-IBS]] (alíquota do ISS 2029–2032).
  - Consome (em execução, **bloqueia o PR-4**): [[X10a]] EMENDA-4 — fila do assinador (AL-PR-3, **#1146 aberto**) e o
    pacote `assinador-local/` (AL-PR-5, ainda inexistente na `main`).
  - Irmão de protocolo: [[X10i]] — a emenda ADN pelo assinador local estende o mesmo contrato (alvos `infDPS`/`infPedReg`,
    protocolo `rest`, campo `nfseEmissao` por unidade, ADL-14). Este BRIEF estende o mesmo contrato do mesmo jeito.
  - Consumidores: relatório de ISS do [[X7]], apuração de IBS/CBS ([[IBS-CBS-2027]]), tela fiscal (FE, fora deste BRIEF).

## 1. O que a fonte oficial diz (resumo do dossiê; grau entre parênteses)

1. **Quem emite pela Paulistana (V + I).** NFS-e é obrigatória para todo prestador de SP [D09 art. 1º]. Desde
   01/11/2026, MEI (tomador CNPJ), ME/EPP do Simples (inclusive opção pendente e impedimento do art. 12 da Res. CGSN 140),
   autônomo isento (Lei 14.864/2008) e uniprofissional do Simples emitem **só** a NFS-e Nacional [D09 art. 1º-A I–IV,
   red. IN 13/2026; D06 art. 10]. O § 2º veda o sistema próprio a essas pessoas *"inclusive na hipótese de … virem a ser
   posteriormente desenquadradas do Simples Nacional"*. **Sobra a PJ de SP capital em regime normal fora do art. 1º-A**
   (inferido forte: o art. 1º manda emitir e nenhum ato lido manda o regime normal ao Emissor Nacional).
2. **Transporte (V).** SOAP 1.2, TLS 1.2 com autenticação mútua; o certificado ICP-Brasil (A1/A3/A4) contém o CNPJ e é o
   mesmo do `CPFCNPJRemetente`; mensagem em XMLDSig enveloped, `rsa-sha1`, `sha1`, c14n 2001, só o certificado do usuário
   final, sem `KeyValue` nem `X509IssuerSerial` [D04 §3.2.2–§3.2.5].
3. **Assinaturas adicionais (V).** Cada RPS: RSA-SHA1 de uma cadeia ASCII (v2: IM 12, série 5, número 12, data AAAAMMDD,
   tributação 1, status 1, ISS retido 1, valor 15, deduções 15, código do serviço 5, indicador + CPF/CNPJ do tomador,
   indicador + CPF/CNPJ do intermediário, ISS retido pelo intermediário, NIF/NãoNIF) [D04 §4.3.2]. Cada cancelamento: RSA-SHA1
   de 20 posições (IM 8 + número da NF-e 12) [D04 §4.3.10].
4. **Endereços (V).** `https://nfews.prefeitura.sp.gov.br/lotenfe.asmx` (síncrono, leiautes 1 e 2) e
   `…/lotenfeasync.asmx` (assíncrono). O antigo `nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx` não aceita o leiaute 2
   [D04 §4.1]. Schemas `schemas-reformatributaria-v02-8` (12/11/2026).
5. **Sem homologação (V).** Só `TesteEnvioLoteRPS`/`TesteEnvioLoteRpsAsync`, no endereço de produção: as mesmas
   validações, nenhuma NF-e [D04 §2.1.3, §4.3.4]. Consulta e cancelamento não têm teste.
6. **Reenvio cancela e reemite (V).** Alerta 217: *"RPS reenviado. A NF-e … foi cancelada e uma nova NF-e foi emitida"*
   [D04 §4.5.2]. `ConsultaNFe` aceita `ChaveRPS` [D04 §4.3.5].
7. **Cancelamento (V).** `CancelamentoNFe`, só da NF-e gerada por webservice (erro 1306), até 50 por pedido [D04 §4.3.10].
   O manual não traz código de recusa por prazo no cancelamento: o 324 ("ultrapassado o prazo permitido") aparece nos
   métodos de **envio** (coluna "Onde Ocorre" C, D, E = Envio de RPS, Envio de Lote, Teste; legenda do §4.5) [D04 §4.5.1]. A nota cancelada no site aparece na `ConsultaNFe` (`StatusNFe`,
   `DataCancelamento`).
8. **Rejeições que encerram o caminho (V):** 394 (regime trocado pelo Simples), 641 (Simples na data), 1647 (contribuinte
   no CNC deve emitir no ambiente nacional), 631/639 (leiaute 2/1 por data de fato gerador, data `{0}` sem valor no
   manual) [D04 §4.5.1].
9. **Leiaute 2 (V).** Em produção desde 01/01/2026, com ISS + IBS + CBS; o leiaute 1 segue aceito na transição [D02]. O
   retorno do leiaute 2 traz `ChaveNotaNacional` [D04 `tpChaveNFe`].

## 2. Checklist de comportamentos (cada um testável sozinho)

Legenda: **[direto]** sem fork · **[fork:F-NSP-n]** depende do fork, escrito no ramo recomendado · **[pend-ext]** depende de
validação externa (§7) e não entra na implementação antes dela.

### PR-0 — contrato (só docs + schema, sem comportamento)

1. **[direto] Emenda §15 do `ADR-INCR-DFE-EMISSAO-PARCEIRO`** registra o adaptador `paulistana` (um adaptador por
   protocolo, como o `adn` da emenda X10i), o roteamento por unidade (F-NSP-1) e o "sem homologação" (F-NSP-3); o
   `ADR-ASSINADOR-LOCAL` §7 passa a nomear a Paulistana como 3º cliente do assinador. *Teste:* `plano-vault.mjs check` 0 e
   links do ADR resolvem.

### PR-1 — bibliotecas puras do RPS (sem I/O; em `features/accounting/paises/br/models/nfse/paulistana/`, F-PBA-3 a)

2. **[fork:F-NSP-4] `RpsSpPayloadSchema` (Zod `.strict()`, leiaute 2)** espelha o `tpRPS` v2 + `IBSCBS` do XSD
   `schemas-reformatributaria-v02-8` (§4.1). *Teste:* as fixtures oficiais de exemplo do leiaute 2 validam; campo extra ⇒
   erro; `ValorInicialCobrado` ⇒ erro (erro 640 do manual: só `ValorFinalCobrado`).
3. **[fork:F-NSP-4] Renderizador `rpsSpDaMontagem(montagem, perfilSp)`**, puro: recebe o resultado da montagem única da
   NFS-e (o mesmo `assemble` do serviço; §4.2) e o perfil SP da unidade; devolve o `RpsSpPayload`. Centavos BigInt-safe, como
   o resto da porta. *Teste:* a montagem de uma venda de serviço gera RPS com `ValorFinalCobrado` = `vServ` do DPS
   equivalente (tie-out com o razão, F-DFE-11 a), `CodigoServico` do perfil do serviço, `cLocPrestacao` = 3550308 quando
   local.
4. **[direto] Cadeia de assinatura do RPS v2** (`cadeiaRpsV2(rps): string`), exatamente pela tabela de [D04 §4.3.2] (IM
   12 com zeros à esquerda, série 5 com espaços à direita, … NIF/NãoNIF). *Teste:* o exemplo do manual
   (`InscricaoPrestador 123456789012`, série `RTNT`, número 1, 2026-01-01, `T`, `N`, `ISSRetido false`, 20500, 5000, 2658,
   CPF 13167474254) reproduz a cadeia do manual caractere a caractere; série com espaço à esquerda ⇒ erro.
5. **[pend-ext] Cadeia do cancelamento** (`cadeiaCancelamento(im, numeroNfe)`: IM 8 + número 12, [D04 §4.3.10]). O
   manual não tem quadro v2 e o RPS v2 usa IM de 12 (ambiguidade 3 do dossiê). Implementa-se a do manual (8) com o teste do
   exemplo `"31000000000000000009"`; o runbook (item 27) prova contra a prefeitura antes do primeiro cancelamento real.
6. **[direto] Montagem das mensagens** `PedidoEnvioLoteRPS` com **um** RPS (v2, `Cabecalho Versao="2"`,
   `CPFCNPJRemetente`, `transacao=true`, `dtInicio = dtFim = DataEmissao`, `QtdeRPS=1`; F-NSP-7 a — o teste da prefeitura
   recebe a mensagem de lote [D04 §4.3.4 III], então a mensagem testada é a mesma da produção),
   `PedidoConsultaNFe` (por `ChaveRPS` e por `ChaveNFe`), `PedidoCancelamentoNFe` (`Transacao=true`, 1 `Detalhe`) e
   o mesmo `PedidoEnvioLoteRPS` para o `TesteEnvioLoteRPS`, **sem** a `Signature` (quem assina é o assinador). Regras de preenchimento do [D04 §3.4.4] e
   escape do §3.4.5. *Teste:* cada mensagem valida no XSD oficial (fixture do XSD commitada com o SHA-256).
7. **[direto] Leitura dos retornos** (`RetornoEnvioLoteRPS`, `RetornoConsulta`, `RetornoCancelamentoNFe`) → `Sucesso`,
   `Alerta[]`, `Erro[]`, `ChaveNFe {Numero, CodigoVerificacao, ChaveNotaNacional}`, `StatusNFe`, `DataCancelamento`, valores
   de ISS/IBS/CBS do `tpNFE` v2. *Teste:* fixtures oficiais; retorno com `Sucesso=false` e erro 1647 vira o código
   `PAULISTANA_1647`.
8. **[direto] Tabela de tradução de erros e alertas** (§4.5) em constante única: terminal (394, 641, 1647, 1306, 1305,
   324 — prazo no envio) × corrigível pelo operador (dados) × transporte (1101/timeout) × alerta 217 (**nunca** esperado — o adaptador não
   reenvia; se aparecer, é bug nosso e vira erro `dfe_paulistana_reenvio_inesperado` com alerta OBS).
   *Teste:* cada código da tabela cai na classe declarada.

### PR-2 — perfil, roteamento por unidade, numeração

9. **[fork:F-NSP-1] [pend-ext §7 itens 1 e 7] Campo `nfseSistema: 'NACIONAL' | 'PAULISTANA'` no satélite `BrFiscalProfile`** (1:1 com o `FiscalProfile` da unidade, R4; criado aqui se ainda não existir; linha ausente = `NACIONAL`), escrito por `PUT /api/accounting/fiscal-profile/br` (rota, controller, `BrFiscalProfileService` e repositório da borda, mesma policy do perfil; F-PBA-4 a), com
   guarda na escrita: `PAULISTANA` exige `codMun = '3550308'`, `regimeTributario ≠ 'SIMPLES'`, `inscricaoMunicipal`
   preenchida e **nenhuma linha do `CompanyFiscalProfile` (regime por `anoCalendario`) com `regime = SIMPLES` de 2027 em
   diante** (o § 2º fala só dos incisos II e IV: *"inclusive na hipótese de as pessoas de que tratam os incisos II e IV virem
   a ser posteriormente desenquadradas do Simples Nacional"*); se a linha de **2026** for `SIMPLES`, exige ainda a declaração explícita
   `paulistanaSemSimplesDesde20261101 = true` (o operador declara que a PJ saiu do Simples antes de 01/11/2026 — § 2º do
   art. 1º-A; a linha anual não diz o mês; ambiguidade 1 do dossiê). Recusa com 400 nomeado. Mudar o regime para
   `SIMPLES` com `nfseSistema = PAULISTANA` volta a unidade para `NACIONAL` na mesma tx e audita (o `FiscalProfileService`, legado BR no escopo `LEGADO_BR`, chama o repositório do satélite com o `tx`). *Teste:* as recusas
   (município, regime atual, IM, ano ≥ 2027 no Simples, 2026 no Simples sem declaração). Ex-MEI fora do Simples não
   é barrado (o § 2º não cita o inciso I); fica como pendência (§7 item 7); a troca de regime.
10. **[fork:F-NSP-1] Seleção por documento:** a NFS-e de uma unidade com `nfseSistema = PAULISTANA` resolve o adaptador
    `paulistana`; as demais seguem `DFE_PARTNER_NFSE` (§13 item 2 do ADR, inalterado). O env `DFE_PARTNER_PAULISTANA=off`
    desliga o adaptador na instância (motivo nomeado, nunca silêncio). O documento já criado segue o `partner` gravado
    (`resolveEmissorFor`, DFE-MANUAL item 9). *Teste:* duas unidades na mesma instância, uma de cada sistema, emitem cada
    uma pelo seu adaptador; `off` ⇒ 409 com o motivo.
    **F-NSP-2b (a):** dentro da Paulistana, o campo por unidade `nfseEmissao: 'portal' | 'automatica'` (o mesmo do
    ADL-14 da emenda X10i; quem chegar primeiro à `main` cria, **no satélite `BrFiscalProfile`**, e o outro reusa) escolhe o adaptador: `automatica` ⇒
    `paulistana`; `portal` ⇒ `paulistana-manual` (PR-M). *Teste:* as quatro combinações sistema × emissão resolvem o
    adaptador certo.
11. **[fork:F-NSP-12] Código de serviço municipal** (5 dígitos, Anexo I da IN SF/SUREM 8/2011) em
    `BrServiceFiscalProfile.codigoServicoSp` (satélite 1:1 do `ServiceFiscalProfile`, escrito por `PUT /api/accounting/service-fiscal-profiles/:serviceRef/br`) e no `BrFiscalProfile.pacoteCodigoServicoSp` (pacote, espelho do `pacoteCTribNac`).
    Ausente ⇒ faltante nomeado no `preview` e 409 no `emit` (mesmo padrão dos faltantes do D1f). **[pend-ext]** a validação
    contra a tabela oficial entra quando a tabela estiver no repositório (§7 item 2). *Teste:* faltante nomeado; 5 dígitos.
12. **[direto] Agrupamento:** um RPS por grupo de `cTribNac` (a chave única do `FiscalDocument` não muda). Linhas do
    mesmo `cTribNac` com `codigoServicoSp` diferentes ⇒ faltante `codigo_servico_sp_divergente` (o RPS tem um só
    `CodigoServico`). *Teste:* duas linhas, dois códigos SP, mesmo `cTribNac` ⇒ faltante.
13. **[fork:F-NSP-5] Série do RPS** = `BrFiscalProfile.rpsSerie Int` (default 1, escrita como texto no XML, ≤ 5
    caracteres); `FiscalDocument.serie Int` não muda. *Teste:* série 1 ⇒ `<SerieRPS>1</SerieRPS>` e `"1    "` na cadeia.
14. **[fork:F-NSP-6] Numeração do RPS** na `FiscalDocumentSequence` com a coluna nova `numberingScheme` (centro, inglês, F-PBA-1 a) na chave
    (`''` = DPS/NF-e como hoje · `'RPS_SP'`), migração aditiva com default `''`; consumida na tx do `SENT`
    (`numbersDps: false`). *Teste:* DPS e RPS da mesma unidade e série não compartilham contador; migração sobre base com
    sequências existentes não muda nenhum `last`.

14a. **[direto] Partes do PR-4 que não dependem do assinador entram aqui**, para o PR-M não depender do #1146: o item 27
    (`locaisDoPayload` lê o RPS) e, do item 24, o tipo `cancelamentoMunicipal` em `EventoNfse` com a aplicação no serviço
    (como o e101101). Os testes são os dos itens 24 e 27, com documento criado direto no repositório.

### PR-3 — contrato do assinador local (servidor) — **depois do #1146 em `main`**

15. **[fork:F-NSP-10] Alvos novos no `ASSINAR`:** `conteudo.alvo` ganha `pedidoPaulistana` (assinatura enveloped do
    elemento raiz da mensagem, c14n 2001 + sha1, como o `infNFe`) e `cadeiaPaulistana` (RSA-SHA1 de cadeia ASCII, molde do
    `qrCodeV3Offline`/`baseQrB64`), este com o elemento RPS (ou o `Detalhe` do cancelamento) junto, para o assinador
    **recalcular a cadeia** a partir do XML e conferir (ADR-ASSINADOR-LOCAL D6) — e conferir que o `CPFCNPJRemetente` tem os
    14 dígitos do certificado. Sem `tpAmb` (não existe na Paulistana). `dfeSigner.schema.json` regenerado; o teste de
    divergência gerado × commitado cobre os alvos novos. *Teste:* tarefa `cadeiaPaulistana` com cadeia que não bate com o
    RPS anexo ⇒ o falso do assinador devolve `CONTEUDO_RECUSADO`.
16. **[direto] `TRANSMITIR` SOAP da Paulistana:** `servico` ganha `PaulistanaEnvioLoteRPS | PaulistanaConsultaNFe |
    PaulistanaCancelamentoNFe | PaulistanaTesteEnvioLoteRPS`; o servidor monta o envelope SOAP 1.2 (método *wrapped* com
    `VersaoSchema` + `MensagemXML` em CDATA, [D04 §4.3.1]) e manda em `envelopeB64`, como hoje. Se o protocolo `rest` da
    X10i (ADL-3) já estiver em `main`, entra com `protocolo: 'soap12'`. *Teste:* tarefa com `servico` novo valida no schema.
17. **[direto] Lista de hosts:** `nfews.prefeitura.sp.gov.br` entra na lista que o assinador aceita, gerada de uma tabela
    `PAULISTANA_ENDPOINTS` (`paises/br/dfe/paulistana/paulistanaEndpoints.ts`) (molde `sefazHosts.ts`/`ADN_HOSTS`, F-ADN-12 a); o endereço antigo
    `nfe.prefeitura.sp.gov.br` **não** entra (não aceita o leiaute 2). *Teste:* o JSON commitado bate com o gerado.
18. **[direto] `selectDfeAssinador` aceita o parceiro `paulistana`** (hoje só `sefaz`), com `local` como único valor
    válido (`psc` desligado: a Paulistana exige o mTLS com o certificado do contribuinte, que o PSC não abre). *Teste:*
    `paulistana` + `psc` ⇒ desabilitado com motivo nomeado.

### PR-4 — o adaptador `PaulistanaEmissor` e a ligação no serviço

19. **[direto] `PaulistanaEmissor implements DfeEmissorPort`** com `name = 'paulistana'`, `capabilities = { kinds:
    ['NFSE'], numbersDps: false, consultar: true, cancelar: true, webhook: false, substituir: false, inutilizar: false,
    cce: false, assinaturaRemota: true, resultadoSincrono: true, consultarEventos: true, analiseFiscal: false }` e
    `testarEnvio` (F-NSP-3). *Teste:* contrato da porta (`DfeCancelResultContract.test.ts` herdado) e capacidades.
20. **[fork:F-NSP-7] `emitir` = `EnvioLoteRPS` síncrono com um RPS por documento** (o ramo "síncrono, 1 RPS por nota";
    lote de 1 e não `EnvioRPS` porque o `TesteEnvioLoteRPS` só testa a mensagem de lote e o §4.3.10 descreve o cancelamento
    das NF-e "geradas a partir do método EnvioLoteRPS"): monta → `ASSINAR cadeiaPaulistana` → monta
    a mensagem → `ASSINAR pedidoPaulistana` → `TRANSMITIR PaulistanaEnvioLoteRPS` → `Sucesso=true` ⇒ `AUTHORIZED` com
    `nNFSe = ChaveNFe/Numero`, `chaveOuCodigo = ChaveNFe/CodigoVerificacao` (a `ChaveNotaNacional`, quando vier, vai no
    `resultJson`), valores de ISS/IBS/CBS do retorno; `Sucesso=false` ⇒ `REJECTED` com os códigos traduzidos (item 8).
    *Teste:* contra o `FakePaulistanaServer` (item 26): autoriza, rejeita, alerta.
21. **[direto] Falha de transporte nunca reenvia às cegas** (alerta 217): timeout/TLS/HTTP ⇒ documento fica `SENT`
    e a próxima ação (polling ou `reenviar` do operador) faz **primeiro** `ConsultaNFe` por `ChaveRPS`; só sem NF-e para
    aquela chave o RPS é enviado de novo, com a **mesma** chave. *Teste:* o falso autoriza e derruba a resposta; o
    `reenviar` consulta, acha a nota e aplica `AUTHORIZED` sem segundo envio.
22. **[direto] `consultar(partnerRef)`** = `ConsultaNFe` por `ChaveRPS` (partnerRef = `IM:série:número`), devolve o mesmo
    `EmissaoResult`. **"Nenhuma NF-e para a chave" (erro 1106, F) não é rejeição:** devolve `PROCESSING` com o código
    `PAULISTANA_RPS_NAO_RECEBIDO` — o RPS não chegou — e só esse código autoriza o reenvio do item 21 (mesma chave). O
    polling nunca aplica `REJECTED` por ele. *Teste:* nota existente ⇒ `AUTHORIZED`; inexistente ⇒ `PROCESSING` com o código
    e o documento continua `SENT`; o reenvio seguinte manda o RPS uma vez.
23. **[direto] `cancelar`** = `CancelamentoNFe` com a assinatura do item 5; o `cMotivo`/`xMotivo` do `CancelInput`
    (obrigatórios na porta) ficam só no `FiscalDocument` e na auditoria — a mensagem da Paulistana não tem motivo. 1306 ⇒ `REJECTED`
    (nota não nasceu no webservice); toda outra recusa ⇒ `REJECTED` com o código preservado. **[pend-ext §7 item 3]**
    `OUT_OF_WINDOW` só quando o código da recusa por prazo no cancelamento for identificado (o 324 é do envio). *Teste:*
    cancela; 1306; recusa genérica.
24. **[fork:F-NSP-9] Cancelamento feito no site da prefeitura:** `consultarEventos(chave)` faz `ConsultaNFe` por
    `ChaveNFe` e, com `StatusNFe = C`, devolve um evento novo do tipo `cancelamentoMunicipal` com `dhProc` =
    `DataCancelamento`; o job do X11 aplica `CANCELLED` como faz com o e101101. `EventoNfse` ganha esse ramo (o serviço
    trata igual ao e101101). *Teste:* nota cancelada no falso aparece `CANCELLED` depois do job; `cancelEvento =
    'cancelamentoMunicipal'`.
25. **[fork:F-NSP-3] `testarEnvio(input)`** = `TesteEnvioLoteRPS` com um RPS montado da venda, **sem** criar
    `FiscalDocument`, sem consumir número (número fixo de teste) — rota `POST /api/nfe/dfe/paulistana/teste` (`server/src/routes/dfe.ts`)
    (Route → Controller → Service, policy de quem emite, DTO `.strict()`), devolve `Sucesso`/erros/alertas. `ambiente =
    'homologacao'` com o adaptador `paulistana` ⇒ porta desabilitada com o motivo *"a Prefeitura de São Paulo não tem
    homologação; use o teste de envio"*. *Teste:* rota responde sem gravar nada; `homologacao` ⇒ 409 nomeado.
26. **[direto] `FakePaulistanaServer`** (`paises/br/dfe/paulistana/__tests__/`, molde `FakePscServer.ts`): SOAP 1.2 com os métodos do item 16, valida a
    assinatura da mensagem e a cadeia do RPS com a chave do certificado de teste, simula 217 no reenvio e 1647/394.
    *Teste:* é o oráculo dos testes 20–25; nenhum teste fala com a prefeitura.
27. **[direto] Relatório de ISS e IBS/CBS veem a nota:** `locaisDoPayload` (`models/issCompetencia.ts:83`) lê também o
    `RpsSpPayload` (`cLocPrestacao`; `cLocEmi` = `codMun` da unidade) — hoje devolveria `null` e o município sairia vazio;
    `assertTpAmb` não se aplica ao RPS (o adaptador só existe em produção). *Teste:* uma NFS-e Paulistana autorizada entra
    no `findForIssReport` com município 3550308 e no `findForIbsCbs`.
28. **[direto] Gates do diff:** snapshot de shape dos DTOs novos, inclusive os da borda (`__dto-shapes__.json`, com o G2 do item 0), `auditCanonical.ts` com os
    eventTypes novos (`fiscal.paulistana.teste_envio`, troca de `nfseSistema`), `docs.paths.ts` + guard de path-count do
    openapi para a rota do item 25 e as duas rotas dos satélites (itens 9 e 11), `check:arch` (`P1` sem violação fora do escopo `LEGADO_BR`), `tsc` dos dois lados (tipo FE gerado). Sem i18n (sem tela).

### PR-M — modo manual da Paulistana (F-NSP-2 b; não depende do assinador local)

32. **[direto] `PaulistanaManualEmissor`** (`name = 'paulistana-manual'`, molde `ManualEmissor`): `kinds: ['NFSE']`,
    `numbersDps: true` (no site a prefeitura numera a NFS-e direto; a sequência `RPS_SP` não é consumida),
    `consultar`/`cancelar`/`consultarEventos: false` (chamar é erro de código próprio `dfe_paulistana_manual`, nunca um
    resultado inventado). *Teste:* capacidades e os dois erros.
33. **[direto] Ficha** (`GET …/documents/:id/ficha`, rota que já existe): devolve o RPS renderizado (item 3) na ordem
    dos campos da tela de emissão do site, com o código de serviço de 5 dígitos, a alíquota e o grupo IBS/CBS. *Teste:*
    ficha de uma venda tem os campos do RPS e nenhum campo da DPS nacional.
34. **[pend-ext] Retorno manual** (`POST …/documents/:id/retorno-manual`, rota que já existe): aceita o XML da NFS-e
    emitida no site, lido pelo mesmo leitor do `tpNFE` v2 do item 7, e grava número, código de verificação,
    `ChaveNotaNacional` e valores; o anexo segue o outbox do `FiscalDocumentPendingAttachment`. **Depende do formato do
    XML que o site exporta** (§8): se não for o `tpNFE` do webservice, o leitor ganha o ramo do formato exportado.
    *Teste:* fixture do XML exportado autoriza o documento.
35. **[direto] Releitura campo a campo** (molde da releitura do DFE-MANUAL, F-MAN-2 c): prestador (IM/CNPJ), tomador,
    `CodigoServico`, valor, deduções, alíquota, ISS retido, `cLocPrestacao`, NBS e `cClassTrib` da nota × o RPS da ficha.
    Diferença ⇒ `AUTHORIZED_DIVERGENT` com a lista; IM/CNPJ do prestador diferente ⇒ 400 (nota de outra empresa, não
    grava). *Teste:* cada campo divergente aparece na lista; prestador errado ⇒ 400 sem escrita.
36. **[pend-ext] Cancelamento manual:** o operador cancela no site e registra pelo XML da nota com `StatusNFe = C` e
    `DataCancelamento` (o mesmo leitor); sem esse XML não há prova, e o cancelamento não é registrado (molde do #421, que
    exige o evento assinado na NFS-e Nacional). Depende do que o site exporta para a nota cancelada (§8). *Teste:* XML
    com `StatusNFe = N` ⇒ 400; com `C` ⇒ `CANCELLED` e `cancelEvento = 'cancelamentoMunicipal'`.
37. **[direto] Relatório de ISS e IBS/CBS** veem a nota manual pelo mesmo item 27 (o `payloadJson` da tentativa é o RPS
    da ficha). *Teste:* nota manual autorizada aparece no `findForIssReport` com município 3550308.

### Fora do servidor

29. **[direto] Pacote do assinador (C#, AL-PR-5 da EMENDA-4):** os alvos do item 15 (recalcular a cadeia a partir do RPS
    anexo e conferir o CNPJ de 14 dígitos), os serviços do item 16 (SOAPAction por serviço) e o host do item 17. Entra no PR
    do pacote quando ele existir; até lá, só o contrato do PR-3 e o falso.
30. **[direto] Runbook `RUNBOOK-NFSE-PAULISTANA.md` (gate humano, RUNBOOK-FORMAT):** (1) pareamento do assinador com o
    certificado da PJ; (2) `testarEnvio` real → `Sucesso=true` colado; (3) primeira nota real de valor mínimo; (4)
    cancelamento dela — prova a cadeia do item 5; (5) a nota aparece no relatório de ISS; (6) modo manual: uma nota
    emitida no site com o XML exportado devolvido (prova o formato do item 34) e o cancelamento dela (item 36). Desfecho
    e assinatura do dono.
    Agente prepara; não executa sem o dono.
31. **[direto] Vigilância datada** (sem aparato novo): o manual teve 12 versões em 15 meses [D04 changelog]. O BRIEF fixa
    a v3.4.1 e o XSD v02-8 com SHA-256 no dossiê; antes do PR-1 e do PR-4, a sessão de feature compara o SHA-256 do manual
    publicado com o daqui e, se mudou, lê o changelog antes de codar.

## 3. Ordem e pilha

`integration/nfse-paulistana` (feature com 2+ PRs, D-2026-11-10): PR-0 → PR-1 → PR-2 → PR-M → (#1146 em `main`) → PR-3 →
PR-4. PR-1, PR-2 e PR-M não dependem do assinador e podem andar antes; o PR-M já entrega a Paulistana pelo site, com
releitura e ISS no relatório, enquanto o assinador não existe. A integração só vai à `main` com o PR-4 verde. Classe de risco:
PR-2, PR-3 e PR-4 são vermelhos (schema, contrato do assinador, emissão) ⇒ revisor independente + lote do dono.

## 4. Contratos esboçados

### 4.1 `RpsSpPayloadSchema` (PR-1; forma final = XSD `schemas-reformatributaria-v02-8`, insumo ausente §8)

```ts
// features/accounting/paises/br/models/nfse/paulistana/rpsSp.ts — leiaute 2. Valores em centavos (string), BigInt-safe; o XML escreve "205.00".
const Cents = z.string().regex(/^\d{1,15}$/);
export const RpsSpPayloadSchema = z.object({
  layout: z.literal('RPS_SP_V2'),                                // discriminador no payloadJson (item 27)
  chave: z.object({
    inscricaoPrestador: z.string().regex(/^\d{1,12}$/),          // CCM (FiscalProfile.inscricaoMunicipal)
    serieRps: z.string().min(1).max(5).regex(/^\S/),             // F-NSP-5: String(rpsSerie)
    numeroRps: z.string().regex(/^\d{1,12}$/),                   // F-NSP-6: sequência RPS_SP
  }).strict(),
  tipoRps: z.literal('RPS'),
  dataEmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),           // = dCompet
  statusRps: z.literal('N'),
  tributacaoRps: z.enum(['T', 'F', 'A', 'B', 'D', 'M', 'N', 'R', 'S', 'X', 'V', 'P']), // [D04 §4.3.2] item 5
  valorFinalCobradoCents: Cents,                                 // erro 640: ValorInicialCobrado não
  valorDeducoesCents: Cents,
  codigoServico: z.string().regex(/^\d{5}$/),                    // F-NSP-12
  aliquotaServicosBp: z.number().int().min(0).max(500),
  issRetido: z.boolean(),
  tomador: z.object({ cpfCnpj: z.string().regex(/^(\d{11}|\d{14})$/).optional(), nif: z.string().max(40).optional(),
    naoNif: z.enum(['0', '1', '2']).optional(), razaoSocial: z.string().optional(), email: z.string().email().optional(),
    endereco: z.unknown().optional() /* tpEnderecoIBSCBS — XSD */ }).strict().optional(),
  intermediario: z.object({ cpfCnpj: z.string(), issRetido: z.boolean() }).strict().optional(),
  discriminacao: z.string().min(1),
  nbs: z.string().regex(/^\d{9}$/),                              // tpRPS v2: NBS 1-1
  cLocPrestacao: z.string().regex(/^\d{7}$/),                    // choice com cPaisPrestacao
  exigibilidadeSuspensa: z.literal(0),
  valorIpiCents: z.literal('0'),
  ibsCbs: z.object({ cClassTrib: z.string().regex(/^\d{6}$/) /* + finNFSe, indFinal, cIndOp… — XSD */ }).passthrough().optional(),
}).strict();
// PR-M: a ficha do modo manual não tem RPS numerado — no site a prefeitura emite a NFS-e direto (item 32).
export const RpsSpFichaPayloadSchema = RpsSpPayloadSchema.omit({ chave: true, layout: true })
  .extend({ layout: z.literal('RPS_SP_V2_FICHA'), inscricaoPrestador: z.string().regex(/^\d{1,12}$/) }).strict();
```

### 4.2 Montagem única → renderizador por leiaute (F-NSP-4, ramo recomendado)

```ts
// FiscalDocumentEmissionService: o `assemble` atual continua produzindo a montagem da NFS-e (grupo por cTribNac, valores,
// tomador, IBS/CBS). O ramo novo só troca o renderizador:
type NfseRender = { layout: 'DPS_NACIONAL'; payload: DpsPayload } | { layout: 'RPS_SP_V2'; payload: RpsSpPayload };
function renderNfse(montagem: MontagemNfse, perfil: FiscalProfileView): NfseRender; // nfseSistema decide
// FiscalDocumentAttempt.payloadJson grava o que foi ENVIADO (o RPS), imutável por tentativa (F-DFE-10 a).
```

### 4.3 Perfil e numeração (PR-2)

```prisma
// Satélites do país (R4 do ADR-PAIS-NA-BORDA): um por model do centro; quem chega primeiro cria (a ponte do DP acrescenta
// simplesCppForaDoDas no BrFiscalProfile; o ADL-14 da X10i usa o nfseEmissao).
model BrFiscalProfile {
  id                                 String        @id @default(cuid())
  fiscalProfileId                    String        @unique
  fiscalProfile                      FiscalProfile @relation(fields: [fiscalProfileId], references: [id], onDelete: Cascade)
  nfseSistema                        String  @default("NACIONAL") // NACIONAL | PAULISTANA (F-NSP-1)
  nfseEmissao                        String  @default("portal")   // portal | automatica — o do ADL-14 da X10i (F-NSP-2b a)
  paulistanaSemSimplesDesde20261101  Boolean @default(false)       // declaração do operador (IN 10/2011 art. 1º-A § 2º)
  rpsSerie                           Int     @default(1)           // F-NSP-5
  pacoteCodigoServicoSp              String?                        // F-NSP-12
  createdAt                          DateTime @default(now())
  updatedAt                          DateTime @updatedAt
  @@map("br_fiscal_profiles")
}
model BrServiceFiscalProfile {
  id                     String               @id @default(cuid())
  serviceFiscalProfileId String               @unique
  serviceFiscalProfile   ServiceFiscalProfile @relation(fields: [serviceFiscalProfileId], references: [id], onDelete: Cascade)
  codigoServicoSp        String? // 5 dígitos, Anexo I IN 8/2011
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  @@map("br_service_fiscal_profiles")
}
model FiscalDocumentSequence {
  // …
  numberingScheme String @default("") // '' (DPS/NF-e) | 'RPS_SP'  (F-NSP-6; centro, inglês)
  @@id([userId, unitId, kind, ambiente, numberingScheme, serie])
}
```

Linha ausente no satélite = os defaults acima (o leitor devolve o padrão; não há backfill). Soft-delete não se aplica: a
linha morre com o perfil (`Cascade`), como morreriam os campos que ela substitui.

### 4.4 Protocolo do assinador (PR-3; acréscimo ao `v1`, como o §4.1 da emenda X10i)

```ts
const AlvoAssinado = z.enum(['infNFe', 'infEvento', 'infInut', 'qrCodeV3Offline', /* X10i: */ 'infDPS', 'infPedReg',
  /* NFSE-PAULISTANA: */ 'pedidoPaulistana', 'cadeiaPaulistana']);
// cadeiaPaulistana: { alvo, cadeiaB64 /* ASCII; sha1 dela = digestB64 */, origemXml /* o <RPS> ou o <Detalhe> */,
//                     cnpjRemetente /* 14 dígitos, = certificado */ }
// pedidoPaulistana: { alvo, elementoXml /* raiz c14n */, signedInfoC14nB64, cnpjRemetente }
const ServicoPaulistana = z.enum(['PaulistanaEnvioLoteRPS', 'PaulistanaConsultaNFe', 'PaulistanaCancelamentoNFe',
  'PaulistanaTesteEnvioLoteRPS']); // somado ao enum `servico` do TRANSMITIR soap12
export const PAULISTANA_ENDPOINTS = [{ servico: 'sync', url: 'https://nfews.prefeitura.sp.gov.br/lotenfe.asmx' }] as const;
```

### 4.5 Porta (PR-4)

```ts
export type EventoNfse = /* … atuais … */ | { tipo: 'cancelamentoMunicipal'; dhProc: string }; // F-NSP-9
export interface DfeEmissorPort { /* … */ testarEnvio?(input: EmitirInput): Promise<TesteEnvioResult>; } // F-NSP-3
export interface TesteEnvioResult { sucesso: boolean; erros: Array<{ code: string; message: string }>; alertas: Array<{ code: string; message: string }>; }
export interface DfeCapabilities { /* … */ testeEnvio?: boolean; }
// partnerRef = `${IM}:${serie}:${numero}` (ChaveRPS) — consulta e reenvio por ela (itens 21–22).
```

## 5. Achados de código que o desenho resolve (lidos em 21/11)

- **A seleção é por instância e por tipo** (`selectDfeEmissor.ts:44-49`, F-NFCE-1 c): `NFSE` é um tipo só para dois
  leiautes. Unidade de SP regime normal e filial do Simples (ou fora de SP) na mesma instância precisam de adaptadores
  diferentes ⇒ item 10 / F-NSP-1.
- **`locaisDoPayload` só entende `infDPS`** (`issCompetencia.ts:83-88`): o relatório de ISS veria a nota sem município ⇒
  item 27.
- **`FiscalDocument.serie` é `Int`** e a série do RPS é texto de 5 ⇒ F-NSP-5.
- **`FiscalDocumentSequence` não separa DPS de RPS** (chave `[userId, unitId, kind, ambiente, serie]`) ⇒ F-NSP-6.
- **O contrato do assinador** (#1146: `alvo` em 4 valores, `servico` só NF-e, hosts gerados da tabela SEFAZ,
  `selectDfeAssinador` só para `sefaz`) não cobre a Paulistana ⇒ itens 15–18.

## 6. Forks — RATIFICADOS em 21/11 ([[D-2026-11-21-NFSE-PAULISTANA-FORKS]])

Todos pela recomendação, **exceto F-NSP-2 → (b)** (modo manual dentro do nó). A tabela abaixo é o texto que foi ao dono.
Não existem F-NSP-8 nem F-NSP-11 (os candidatos viraram itens diretos: motivo do cancelamento, item 23; leiaute só 2,
item 2). Depois da ratificação, o F-NSP-7 (a) ficou realizado como lote síncrono de 1 RPS (item 20), dentro do ramo escolhido.

| Fork | Caminhos | Recomendação e por quê |
|---|---|---|
| **F-NSP-0** Quando executar | (a) executar quando o dono der `executa`, com PR-1/PR-2 já possíveis e PR-3/PR-4 depois do #1146; (b) só com um cliente de SP regime normal contratado (Q9 a de 20/10) | **(a)** — o dono pediu completude e o desenho não depende do cliente; o oráculo real (runbook) é que espera o cliente. A Q9 continua dele. |
| **F-NSP-1** Quem vai para a Paulistana | (a) campo por unidade `nfseSistema` escolhido pelo operador, com as guardas da lei derivadas do que o banco já tem (SP capital, regime atual ≠ Simples, IM, `CompanyFiscalProfile` sem Simples/MEI de 2027 em diante) e a declaração só quando 2026 foi Simples; (b) derivado automático (sem campo): toda unidade de SP capital fora do Simples vai para a Paulistana; (c) env por instância (`DFE_PARTNER_NFSE=paulistana`) | **(a)** — é a estrutural (por unidade, como o ADL-14 da X10i) e respeita o § 2º com o histórico anual que existe; (b) erra quem saiu do Simples em 2026 depois de 01/11 e tira do operador a escolha que a lei deixa ambígua; (c) quebra instância com filial fora de SP ou no Simples. |
| **F-NSP-2** Modo manual da Paulistana (operador emite no site e devolve o XML) | (a) fora deste nó — sem assinador, a unidade emite no site e a nota não entra no produto (aviso nomeado); (b) dentro: ficha + upload do XML de exportação da prefeitura + releitura | **(a)** com lacuna na caixa — o pedido é o adaptador; a releitura de outro leiaute é frente própria. Fica aberto: ISS dessa nota fora do relatório enquanto o assinador não roda. |
| **F-NSP-2b** Como manual e automático convivem (pergunta derivada da resposta b do F-NSP-2) | (a) o mesmo campo por unidade `nfseEmissao: portal \| automatica` da X10i (F-ADL-4); (b) fallback automático: sem assinador pareado e ativo, a nota cai na ficha manual | **(a)** — uma regra só para os dois sistemas, escolhida pelo operador; (b) muda o caminho da nota por estado de máquina. **Ratificado (a).** |
| **F-NSP-3** O que é "homologação" | (a) adaptador só em produção; `testarEnvio` (TesteEnvioLoteRPS) como operação à parte, sem `FiscalDocument`; homologação ⇒ desabilitado com motivo; (b) homologação chama o teste e grava o documento num status novo `VALIDATED_TEST`; (c) homologação só contra o falso | **(a)** — não inventa resultado (a prefeitura não gera nota no teste) e não mexe na máquina de 9 status (#1162). |
| **F-NSP-4** De onde sai o RPS | (a) montagem única + renderizador por leiaute (`renderNfse`), o RPS gravado no `payloadJson`; (b) o adaptador traduz a DPS nacional dentro da porta (payload = DPS + grupo SP); (c) montador próprio do RPS no serviço | **(a)** — uma montagem (tie-out com o razão num lugar só) e o registro do que foi enviado é o RPS; (b) esconde a tradução no adaptador e grava o que não foi enviado; (c) duplica a montagem de 1.600 linhas. |
| **F-NSP-5** Série do RPS | (a) `rpsSerie Int` no perfil, escrito como texto; `FiscalDocument.serie` continua `Int`; (b) coluna nova texto para série alfanumérica | **(a)** — o manual aceita qualquer texto de até 5; número basta e não mexe no modelo. |
| **F-NSP-6** Contador do RPS | (a) coluna `numeracao` na chave da `FiscalDocumentSequence` (`''` / `RPS_SP`), migração aditiva; (b) convenção: perfil exige `rpsSerie ≠ dpsSerie`; (c) contador compartilhado | **(a)** — separa por construção; (b) é regra que alguém esquece; (c) mistura numeração de dois sistemas quando a unidade muda de sistema. |
| **F-NSP-7** Envio | (a) `EnvioRPS` síncrono, um RPS por documento, consulta por `ChaveRPS` na falha; (b) lote assíncrono com protocolo e `ConsultaSituacaoLote` | **(a)** — emissão nasce da venda (um documento por vez), volume de salão/clínica é baixo, e o síncrono novo (`nfews`) aceita o leiaute 2. |
| **F-NSP-9** Cancelamento feito fora do produto | (a) `consultarEventos` devolve `cancelamentoMunicipal` a partir do `StatusNFe = C` e o job do X11 aplica; (b) só `consultar` mostra e o operador concilia à mão; (c) fora do escopo (aviso) | **(a)** — o X11 já tem o job e a máquina; acrescenta um tipo de evento sem fingir código ADN. |
| **F-NSP-10** Como o assinador confere a cadeia | (a) o assinador recebe o `<RPS>`/`<Detalhe>`, recalcula a cadeia pela regra do manual e confere com a pedida, e confere o CNPJ de 14 dígitos do remetente; (b) confere só o CNPJ do remetente e assina a cadeia como vem | **(a)** — é o D6 do ADR-ASSINADOR-LOCAL (servidor comprometido não assina nota falsa); (b) deixa o servidor pedir assinatura de qualquer cadeia. |
| **F-NSP-12** Código de serviço de 5 dígitos | (a) campo `codigoServicoSp` por serviço (e no pacote), validado contra a tabela oficial quando ela entrar; (b) derivado do `cTribNac` por tabela de correlação; (c) campo único por unidade | **(a)** — a prefeitura usa o código dela por serviço; correlação oficial com o `cTribNac` não foi achada (insumo ausente), e (c) erra quem presta dois serviços. |

## 7. Pendente de validação externa

1. **"Posteriormente desenquadradas" (§ 2º do art. 1º-A):** vale para quem saiu do Simples **antes** de 01/11/2026?
   Leitura do texto: não (só a partir da vigência). Pergunta ao contador no pacote dele. Enquanto isso, a declaração do
   item 9 cobre a leitura mais segura.
2. **Tabela oficial dos códigos de serviço** (Anexo I da IN SF/SUREM 8/2011, com as mudanças de 2026 — códigos novos e
   encerrados, [D02]) e alíquota por código (Lei 13.701/2003 art. 16): baixar pelo método legal antes do PR-2.
3. **Prazo do cancelamento pela internet e o código da recusa:** a norma municipal não foi lida e o manual não traz código
   de prazo no cancelamento (o 324 é dos métodos de envio). Até lá vale o `cancelPrazoDias` do perfil (X11, só avisa) e a
   recusa fica `REJECTED` com o código (item 23).
4. **Cadeia do cancelamento no leiaute 2** (IM 8 × 12): prova no runbook (item 30, passo 4) ou pergunta à SF/Prodam.
5. **Erro 1647 / CNC:** quem entra no Cadastro Nacional de Contribuintes em SP. Tratado como terminal (item 8).
6. **Data do leiaute 2 obrigatório** (`{0}` dos erros 631/639) e efeito do Ato Conjunto RFB/CGIBS 7/2026 na NFS-e de SP:
   o produto só emite leiaute 2, então só muda a data de aviso.
7. **Ex-MEI** que passa a ME/EPP fora do Simples: o § 2º só cita os incisos II e IV; a leitura literal o deixa na
   Paulistana. Pergunta ao contador junto com o item 1.

## 8. Insumos ausentes

- **XSD `schemas-reformatributaria-v02-8` e exemplos XML** (página e zip na notadomilhao): não baixados nesta sessão; o
  PR-1 começa por eles (`legal.py baixar`), e o §4.1 vira o espelho exato.
- **Mês da saída do Simples:** o banco tem o regime **por ano** (`CompanyFiscalProfile.anoCalendario` + `regime`,
  `schema.prisma:1913`), não a data da exclusão. Por isso a declaração do item 9 existe só para 2026.
- **Assinador C#** (`assinador-local/`): não existe em `main`; o item 29 espera o AL-PR-5.
- **Manual de Acesso Pessoa Jurídica – NFS-e** (`Manual_NFe_PJ.pdf`, 13/10/2026 [D01]): a tela de emissão que a ficha
  do PR-M espelha (item 33). Não baixado.
- **Formato do XML que o site da Paulistana exporta** para a nota emitida e para a cancelada (itens 34 e 36): o
  "Manual de Exportação de NFS-e" de 13/04/2020 [D01] descreve layouts de exportação, não lidos nesta sessão; se o
  XML for o `tpNFE` do webservice, o leitor do item 7 basta. O PR-M começa por ele (`legal.py baixar` + uma exportação
  real no runbook, passo 6).

## 9. Achados fora de escopo (na caixa, `--pai L-20261121-183240-e378`)

- `L-20261121-201050-24af` — tela: campo `nfseSistema`/código SP no perfil e botão "testar envio" (FE).
- `L-20261121-201051-e0a7` — NFS-e **recebidas** de SP (`ConsultaNFeRecebidas`) para o contas a pagar.
- `L-20261121-201100-fc2b` — NFTS (nota do tomador) — obrigação de quem contrata prestador de fora de SP.
- ~~`L-20261121-201053-0536` — modo manual da Paulistana~~ → entrou no nó pelo F-NSP-2 (b), PR-M (itens 32–37).

## 10. Write-set

Caminhos depois da emenda de 24/11. `BR` = `server/src/features/accounting/paises/br`.

- **PR-0:** `docs/adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md`, `docs/adr/ADR-ASSINADOR-LOCAL.md`.
- **PR-1:** `BR/models/nfse/paulistana/**` (com `__tests__/**` e `__fixtures__/**`).
- **PR-2:** `server/prisma/schema.prisma`, `server/prisma/migrations/**`, `BR/dtos/BrFiscalProfileDto.ts`,
  `BR/dtos/BrServiceFiscalProfileDto.ts`, `BR/services/BrFiscalProfileService.ts`, `BR/services/BrServiceFiscalProfileService.ts`,
  `BR/repositories/{IBrFiscalProfileRepository,BrFiscalProfileRepository,IBrServiceFiscalProfileRepository,BrServiceFiscalProfileRepository}.ts`,
  `server/src/controllers/brFiscalProfileController.ts`, `server/src/features/accounting/services/FiscalProfileService.ts`,
  `server/src/features/accounting/dfe/resolveEmissor.ts`, `server/src/features/accounting/dfe/selectDfeEmissor.ts`,
  `server/src/features/accounting/repositories/FiscalDocumentRepository.ts`,
  `server/src/features/accounting/services/FiscalDocumentEmissionService.ts`.
- **PR-M:** `BR/dfe/paulistana/PaulistanaManualEmissor.ts`, `server/src/features/accounting/dfe/DfeEmissorPort.ts`,
  `server/src/features/accounting/dtos/FiscalDocumentDto.ts`, `server/src/controllers/fiscalDocumentController.ts`,
  `server/src/features/accounting/models/issCompetencia.ts`, `server/src/features/accounting/dfe/resolveEmissor.ts`,
  `server/src/features/accounting/services/FiscalDocumentEmissionService.ts`,
  `server/src/features/accounting/services/FiscalDocumentLifecycleService.ts`, `BR/models/nfse/paulistana/**`.
- **PR-3:** `server/src/features/accounting/dtos/DfeSignerDto.ts`, `server/src/features/accounting/dtos/dfeSigner.schema.json`,
  `server/src/features/accounting/dfe/local/**`, `server/src/features/accounting/dfe/selectDfeAssinador.ts`,
  `BR/dfe/paulistana/paulistanaEndpoints.ts`.
- **PR-4:** `BR/dfe/paulistana/**`, `server/src/features/accounting/dfe/DfeEmissorPort.ts`,
  `server/src/features/accounting/models/issCompetencia.ts`, `server/src/features/accounting/services/FiscalDocumentEmissionService.ts`,
  `server/src/features/accounting/services/FiscalDocumentLifecycleService.ts`, `server/src/controllers/fiscalDocumentController.ts`,
  `server/src/routes/dfe.ts`, `server/src/routes/docs/nfe.paths.ts`, `docs/accounting/RUNBOOK-NFSE-PAULISTANA.md`.
- **Item 0 da guarda (só se o PR-1 for o 1º PR de código emendado):** `server/.dependency-cruiser.cjs`,
  `docs/adr/ADR-ARCH-BOUNDARIES.md`, `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts`,
  `server/src/features/accounting/__tests__/atomicUntil.boundary.test.ts`.
- **Choke points (PAR-001):** `server/src/lib/factory.ts`, `server/src/routes/accounting.ts`, `server/src/routes/docs.paths.ts`,
  `server/src/routes/docs/accounting.fiscal-profile.paths.ts` (ou o arquivo de paths do perfil fiscal, conferir),
  `server/public/openapi.json`, `server/src/features/accounting/audit/auditCanonical.ts`,
  `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json`, `server/prisma/schema.prisma`.
