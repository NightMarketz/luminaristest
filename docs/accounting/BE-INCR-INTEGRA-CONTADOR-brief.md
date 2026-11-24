# BE-INCR-INTEGRA-CONTADOR — BRIEF: entrega à Receita pela API Integra Contador (nó INTEGRA-CONTADOR)

> `sessao-planejamento`, 2026-11-21, base `origin/main` `43719baa`. **Sem código.** Implementar exige `executa` próprio
> (ORCH-006). Decisões de fundo e pesquisa: [`PRE-ADR-INTEGRA-CONTADOR.md`](../adr/PRE-ADR-INTEGRA-CONTADOR.md) (aqui
> "PRE-ADR"); fontes: [`pesquisas-legais/integra-contador-serpro/`](../../pesquisas-legais/integra-contador-serpro/relatorio.md)
> (`[Dnn]`).
>
> **Forks:** F-IC-1..8 **ratificados pelo dono** por questionário em 21–22/11 (PRE-ADR §10;
> [[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]]). Contra a recomendação: **F-IC-2 → (b)**, A1 cifrado no servidor, para
> todos os usos ([[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]]), e **F-IC-8 → (b)**, DEFIS e DASN-SIMEI no PR-2. O
> **F-IC-1** ficou BYOK com os dois modos, cliente e escritório de contabilidade, já na 1ª fase. **Produção espera o
> parecer de advogado sobre a guarda** (RB-IC-0, §5). Este checklist já está na forma ratificada.

## 0. Formulário (contexto fixo)

- **Item a planejar:** nó novo [[INTEGRA-CONTADOR]]: entregar pela API do Serpro o que hoje só sai como arquivo ou
  espelho (PGDAS-D/DAS, MIT, DARF), mais a consulta de pagamento. Reabre a [[R5]].
- **Autorização:** dono, 2026-11-21, questionário. À pergunta *"Fork R5: … Reabrir para planejar a entrega
  automática?"*, a resposta foi *"Reabrir e planejar"*. No chat do mesmo dia: *"Executa tudo pra liberar e poder rodar em
  xhigh até terminar"*. Confirmada pelo dono ao iniciar o cartão
  ([[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]]).
  **Confere com o item:** pede planejar a entrega automática e diz que "contratação segue com o dono". Este documento
  planeja e deixa a contratação como fork (F-IC-1). **Sem divergência de escopo.**
- **Insumos (fato consumado):**
  - `server/src/lib/mit.ts` (`montarArquivoMit`, leiaute 1.0) + `MitExportService` (X9);
  - `SimplesApuracaoService.calcular:361` / `registrarDas:388` (DAS oficial com `SourceDocument` de proveniência DAS,
    F-SD-3/4) e o espelho do PGDAS-D (X14);
  - `ProfitDistributionService.ts:282` / `InterestOnEquityService.ts:273` (código de receita + vencimento, sem guia);
  - `TaxAssessmentService` (X7, apurações `CONFIRMED`);
  - `dfe/DfeEmissorPort.ts` + `dfe/resolveEmissor.ts` + `selectDfeEmissor` (molde de porta, capacidades e seleção);
  - `lib/secretBox.ts` (cofre com keyring, AAD = id da linha; molde `PscCredential.model.ts`);
  - `ReinfTransmissorPort` (`lib/reinf.ts:129`), porta com função pura de mapeamento de status;
  - BRIEF do ciclo fiscal (PR #1322, **não em `main`**): `ObrigacaoFiscalOcorrencia`, estados, `AGUARDANDO_HUMANO`.
- **Nós vizinhos:** consome [[X9]], [[X14]], [[X7]], [[IRRF-DISTRIBUICAO]], o `FiscalCertificate` do [[X10i]] (PR-1,
  em `main`: A1 cifrado por unidade, `FiscalCertificateService.upload` com leitura do PKCS#12) e o CICLO-FISCAL (#1322).
  O assinador local do [[X10a]] **não** é mais dependência (F-IC-2 → b). É consumido pelo CICLO-FISCAL (o PR-6 deste BRIEF liga os dois) e pelo
  FE (tela de credencial e botão "aprovar entrega", incremento `FE-INCR-INTEGRA-CONTADOR` vizinho, fora deste BRIEF).

## 1. Checklist numerado (cada item testável sozinho)

### PR-0 — contrato e cliente puro (sem rede, sem Prisma)

1. **`ReceitaFederalPort`** + `ReceitaCapabilities` + `ResultadoChamada<T>` (§2) em
   `features/accounting/receita/ReceitaFederalPort.ts`. Porta de aplicação. Comentário de cabeçalho com a regra §2.1:
   nunca chamada de plugin, `RuleContext` ou `DynamicTableService`.
2. **Envelope puro** `montarEnvelope(ctx, servico, dados)` e `lerResposta(json)`: `dados` serializado como **string
   JSON** na ida e lido na volta [D13, D14]; `contratante.tipo = 2` sempre [D06]; `numero` como string com
   alfanumérico [D06]. Testes com os exemplos literais do dossiê (`D13`, `D14`, `D19`) como fixture.
3. **Classificação do HTTP** (`classificarHttp`), tabela fechada: 200/202/304 → `OK`; 400/403/404 → `RECUSADO` (com
   `mensagens`); 504 e erro de rede **depois** do envio → `INDETERMINADO`; 429/500/503 e erro **antes** do envio →
   `INDISPONIVEL`; 401 → renova o token uma vez e repete, e na 2ª vez `RECUSADO` com código `RECEITA_TOKEN_INVALIDO`.
   Fonte: [D07], [D08]. Teste por linha.
4. **`cobravel(tipoServico, httpStatus)`**: `Apoiar`/`Monitorar` nunca; 200/202/403 sim; o resto não [D06, D07].
   Serve ao registro de consumo, não a bloquear nada.
5. **Catálogo de serviços como dado** (`servicosReceita.ts`): `ReceitaServico` → `{ idSistema, idServico,
   versaoSistema, tipo }`, só os usados no BRIEF (§2), com o sequencial do catálogo [D04] em comentário.
6. **Adaptadores** `ReceitaFake` (respostas programáveis, conta chamadas) e `ReceitaDisabled` (motivo nomeado:
   `RECEITA_SEM_CREDENCIAL`, `RECEITA_SEM_TOKEN`, `RECEITA_SERVICO_DESLIGADO`) + **`selectReceitaGateway(env,
   credencial)`** pura, molde `selectDfeEmissor`. Env `RECEITA_GATEWAY` = `integra-contador` | `fake` | ausente
   (= disabled); `INTEGRA_CONTADOR_AMBIENTE` = `producao` | `trial`.
7. **`IntegraContadorAdapter`** (HTTP): POST em `<base>/<Tipo>` com `Authorization: Bearer`, `jwt_token`,
   `X-Request-Tag` (§2) [D03, D09]. Sem `autenticar_procurador_token`: nos dois modos ratificados, contratante = autor
   (PRE-ADR §10.1), então o Termo de Autorização [D23] não se aplica. A base de
   produção vem do API Reference (insumo §6 item 1); a de trial é a de [D11]. Timeout do cliente = 30 s [D08].
8. **Teste de contrato opcional contra o trial** (`scripts/integra-contador-trial.mjs`, fora do CI, sem segredo: token
   público de [D11]). Chama um serviço por tipo (`Apoiar`, `Consultar`, `Declarar`, `Emitir`) e confere o formato do
   envelope de volta. F-IC-7 (a).

### PR-1 — credencial, token e registro de chamadas

9. **Prisma `ReceitaCredencial` + `ReceitaRequisicao`** (§2), migração aditiva com prólogo defensivo (SQLite sem
   transação, memória `migracao-sqlite-nao-e-transacional`). Repositórios próprios com `tx` propagado. Soft-delete na
   credencial; a requisição é **imutável** (sem update fora da máquina de estados do item 12, sem delete).
10. **Rotas da credencial** (Route → Controller → Service → Repository + Policy; DTO Zod `.strict()`; rota em 2
    toques): `GET/PUT/DELETE /api/accounting/receita/credencial` e `POST /api/accounting/receita/credencial/testar`.
    - **O teste** chama `SICALC/CONSULTAAPOIORECEITAS52` (`/Apoiar`, **gratuito** [D04, D07]) e grava `verificadaEm`.
      No modo `PROCURADOR`, chama também `PROCURACOES/OBTERPROCURACAO41` (Consultar, cobrado) e grava os códigos de
      procuração encontrados (`00146`, `00103`, `00004`).
    - **Policy:** a mesma de quem gere o certificado fiscal e o PSC da unidade (`AccountingPolicy`, conferir o nome na
      execução).
    - **Modo `CONTRIBUINTE`** (PRE-ADR §10.1): o contratante tem de ser o CNPJ da matriz da PJ, com `FiscalCertificate`
      vivo cujo `cnpjCertificado` = contratante e `notAfter` futuro. Senão, 400 `RECEITA_CONTRATANTE_DIVERGE` ou
      `RECEITA_SEM_CERTIFICADO`. É a guarda local do 403 `ICGERENCIADOR-016` [D06].
    - **Modo `PROCURADOR`:** o PUT recebe o A1 do escritório (`pfx` + senha, multipart, como o upload do
      `FiscalCertificate`). A leitura do PKCS#12 sai de `FiscalCertificateService.upload` para uma função pura
      compartilhada, sem duplicar o forge. O CNPJ do A1 tem de ser o `contratanteCnpj`, e a senha **nunca** é gravada.
    - Consumer Key e Secret vão cifrados nos dois modos.
    - **Autorização de acesso (modo `PROCURADOR`, IN RFB 2.320/2026):**
      - o cliente concede a autorização ao escritório **no aplicativo oficial da Receita**. O Luminaris só mostra o passo
        a passo e os serviços a marcar; **nunca** automatiza a outorga, a alteração ou a revogação (art. 13, vedação a
        sistema de terceiro);
      - a autorização vale no máximo 5 anos (art. 7º § 1º IV) e não admite substabelecimento (art. 8º § 3º);
      - o retorno do `OBTERPROCURACAO41` traz `dtexpiracao` e a lista de `sistemas` [D27]. Os dois são gravados, e o job
        avisa 30 dias antes de vencer (dossiê `pesquisas-legais/procuracao-eletronica-ecac`).
11. **`SapiTokenPort`** com o adaptador **`A1ServidorSapiToken`** (F-IC-2 → b):
    - decifra o A1 (o do `FiscalCertificate` no modo `CONTRIBUINTE`, o da credencial no `PROCURADOR`) e as chaves só em
      memória;
    - faz o POST `client_credentials` com TLS mútuo no `/authenticate` [D03] e recebe `{ accessToken, jwtToken,
      expiraEm }`.
    - O token fica cifrado (`secretBox`, keyring `RECEITA_KEYS`, AAD = id da credencial), com `expiraEm`. Token vencido
      ou 401 ⇒ renova uma vez.
    - A1 vencido ⇒ pré-requisito `RECEITA_CERTIFICADO_VENCIDO` na ocorrência do ciclo, com a data do `notAfter`.
    - Teste: o mTLS contra um servidor HTTPS local de teste que exige certificado de cliente, com um A1 de teste gerado
      no próprio teste. Nunca um certificado real.
12. **Idempotência e 504** (`ReceitaRequisicaoService.executar`):
    - grava a intenção (`PENDENTE`) com `chaveIdempotencia` **antes** de chamar;
    - a mesma chave com `OK` ⇒ devolve o resultado gravado, sem nova chamada;
    - `INDETERMINADO` ⇒ **não reenvia**: chama a consulta de reconciliação do serviço (§2: PGDAS-D →
      `CONSULTIMADECREC14`; MIT → `SITUACAOENC315`/`LISTAAPURACOES317`; DARF → `CONSOLIDAR54` não serve, o DARF é
      reemitível sem efeito) e só então resolve para `OK` ou libera o reenvio [D08].
    - Testes: duas chamadas concorrentes com a mesma chave ⇒ uma vai à porta (unique); 504 seguido de consulta que
      acha o recibo ⇒ `OK` sem 2º envio.
13. **Auditoria** (allowlist do `auditCanonical.ts` na mesma mudança): `receita.credencial.set` /
    `receita.credencial.removed` (ids, CNPJ do contratante, `modo`, impressão digital do A1; nunca segredo nem senha) e `receita.requisicao.declarar`
    (ids, serviço, período, `payloadSha256`, `responseId`, quem aprovou; **sem CPF**). Log estruturado sem payload
    (`ADR-OBSERVABILIDADE`: nível, PII).

11a. **Trava de produção sem parecer** (RB-IC-0; dono, 22/11: *"Produção espera"*):
    - com `INTEGRA_CONTADOR_AMBIENTE=producao` e o env `RECEITA_GUARDA_PARECER_REF` vazio, o `selectReceitaGateway`
      devolve `disabled` com o motivo `RECEITA_GUARDA_SEM_PARECER`. O PUT da credencial continua aceito, porque guardar
      ainda não é usar.
    - Testes: produção sem a referência ⇒ disabled e 0 chamadas; trial e fake sem a referência ⇒ habilitados; produção
      com a referência ⇒ `integra-contador`.

### PR-2 — Simples: PGDAS-D e DAS (F-IC-6 → a)

14. **Mapper puro `montarPgdasdApi(espelho, perfil, folhas, estabelecimentos) → dados do TRANSDECLARACAO11`** [D18,
    D20]:
    - atividades por `idAtividade` da tabela de domínio, a partir da segregação do espelho (anexo, fator r,
      ST/monofásico, ISS próprio × outro município × retido);
    - `receitasBrutasAnteriores` só quando a regra (d) pedir;
    - **`folhasSalario` obrigatório para PA ≥ 2026-11** [D21];
    - `estabelecimentos` = **todos** os da raiz vigentes no PA (R8);
    - `valoresParaComparacao` = o nosso devido por `codigoTributo` (1001..1010).

    Testes: um caso por anexo do X14, ST e monofásico (id 2), ISS retido (id 12/15/18), PA 2026-10 sem folha
    aceito e PA 2026-11 sem folha ⇒ erro nomeado `PGDASD_FOLHA_OBRIGATORIA`.
15. **Pré-voo** `consultarUltimaDeclaracaoPgdasd(pa)` decide `tipoDeclaracao` 1 (original) × 2 (retificadora), regra
    (a) [D18]. Retificadora exige confirmação explícita no pedido (`confirmarRetificacao: true`), senão 409
    `PGDASD_RETIFICADORA_SEM_CONFIRMACAO`.
16. **`POST /api/accounting/simples/apuracoes/:competencia/entregar`**:
    - aprovação humana (F-IC-3 c): corpo `{ aprovar: true, confirmarRetificacao?, semComparacao?: { motivo } }`;
    - chama com `indicadorTransmissao = true` e `indicadorComparacao = true`;
    - divergência ⇒ 409 `PGDASD_DIVERGE` com a diferença por tributo, e nada é transmitido (regra b);
    - `semComparacao` só com `motivo` não vazio, auditado (F-IC-6 a);
    - competência com DAS oficial já registrado ⇒ 409, salvo retificação.
17. **DAS automático depois da transmissão:**
    - `GERARDAS12` [D19] → `SourceDocument` (PDF, proveniência DAS) → `SimplesApuracaoService.registrarDas` com
      `numeroDocumento` e valor **da resposta**, sem digitação;
    - a provisão definitiva continua pelo valor oficial (F-SN-10 a), e a estimada do ciclo (F-CF-5 b) é estornada ali
      como o #1322 já prevê;
    - falha no `GERARDAS12` depois da transmissão ⇒ a declaração fica transmitida e o DAS pendente, com nova tentativa
      pelo job; nunca retransmitir.

    Teste: transmissão OK + DAS 503 ⇒ 1 declaração, 0 DAS; 2ª passada ⇒ DAS registrado, a declaração não reenviada.
18. **Prévia oficial sem transmitir** (`indicadorTransmissao = false`) **só sob pedido** (`POST …/previa-oficial`), nunca
    no job: custa uma declaração (R$ 0,40 na 1ª faixa; grau I, PRE-ADR §2.4).
18a. **DEFIS pela API** (F-IC-8 → b; PRE-ADR §10.3): mapper do espelho `SimplesDeclaracaoService.defis` para
    `DEFIS/TRANSDECLARACAO141`. O leiaute se lê no PR-2 (insumo §6 item 7).
    - `POST /api/accounting/simples/declaracoes/:ano/defis/entregar` com a mesma aprovação do item 16. Recibo
      (`CONSULTIMADECREC143`) como `SourceDocument`.
    - Só para ano-calendário ≤ 2026: de 2027 em diante a rota recusa com `DEFIS_EXTINTA_USE_PGDASD_ANUAL`, porque vira o
      bloco anual do PGDAS-D (BRIEF do ciclo §6 item 22).
18b. **DASN-SIMEI pela API** (`DASNSIMEI/TRANSDECLARACAO151`, + `GERARDASEXCESSO153` quando houver excesso): mapper do
    espelho `SimplesDeclaracaoService.dasnSimei`, rota `…/:ano/dasn-simei/entregar`, a mesma aprovação.
    - O catálogo não dá data de implantação [D04]. A capacidade `DASNSIMEI_ENTREGAR` só entra no adaptador de produção
      quando o RB-IC-1 mostrar o serviço respondendo.
    - Até lá, a rota responde 409 `RECEITA_SERVICO_NAO_IMPLANTADO`, sem chamada.
    - Teste: com a capacidade desligada, 0 chamadas à porta.

### PR-3 — DARF pelo Sicalc

19. **Mapper `montarDarf(origem) → dados do CONSOLIDARGERARDARF51`** [D22] para: apuração do X7 confirmada (IRPJ/CSLL
    trimestral e estimativa; PIS/COFINS do X8), IRRF de dividendos (1841) e de JCP (5706). `codigoReceita` +
    `codigoReceitaExtensao` + `tipoPA`/`dataPA` vêm da tabela de domínio do Sicalc (insumo §6 item 2) e da apuração;
    `vencimento` é o que o serviço dono já calcula; `dataConsolidacao` = hoje ou a data pedida.
    Quota de IRPJ/CSLL: `cota` × `vencimento` são mutuamente exclusivos [D22] (liga com a lacuna
    `L-20261121-191723-f153`).
20. **`POST /api/accounting/darfs`** `{ sourceType, sourceId, dataConsolidacao? }` → emite PDF + código de barras
    (`GERARDARFCODBARRA53`) + Pix (`qrCode`). Grava o `SourceDocument` e liga ao título a pagar da provisão, se existir.
    É reemitível (emissão não confessa nada): nova data de consolidação ⇒ novo DARF, o anterior fica como histórico.
21. **Automático:** quando a apuração passa a `CONFIRMED`, o serviço dono emite o DARF pela porta se a credencial
    estiver ativa. Sem credencial, nada muda (código e vencimento como hoje).

### PR-4 — pagamentos

22. **`PAGAMENTOS71`** depois do vencimento, para as guias emitidas (DAS e DARF pelo `numeroDocumento`) → anexa o
    comprovante (`COMPARRECADACAO72`, sob pedido, porque é emissão cobrada) e marca a ocorrência do ciclo como paga
    (`CONCLUIDA` derivado). **A baixa financeira do título não entra aqui** (conciliação; achado §8).

### PR-5 — MIT (F-IC-5 → a)

23. **Pré-voo `listarApuracoesMit(ano, mes)`** + `consultarApuracao`: o retorno diz se há apuração `EM EDIÇÃO` (será
    sobrescrita [D13]) ou `ENCERRADA` (o envio vira retificador).
24. **`POST /api/accounting/mit-exports/:id/encerrar`**:
    - corpo `{ aprovar: true, atestoSemOutrosDebitos: true, confirmarRetificacao? }`;
    - envia o **mesmo** `conteudo` do `MitExport` (`montarArquivoMit`, sem recalcular) ao `ENCAPURACAO314`;
    - grava o `protocoloEncerramento`;
    - sem atesto ⇒ 409 `MIT_ATESTO_AUSENTE`;
    - `MitExport` `defasado` ⇒ 409 (o arquivo não é mais o vigente).
    - **Modo `PROCURADOR`:** recusado com 409 `MIT_PROCURACAO_DESCONHECIDA` enquanto o código de procuração dos
      serviços MIT não for conhecido. A tabela do Serpro não lista o MIT [D05]. O RB-IC-1, ou uma versão nova da
      tabela, fecha isso, e o recusado vira capacidade.
25. **Situação pelo job** (`SITUACAOENC315`, **gratuito**): `ENCERRAMENTO EM CURSO` ⇒ espera; `ENCERRADA` ⇒ grava
    `dataEncerramento` e conclui a ocorrência `DCTFWEB` do ciclo; volta a `EM EDIÇÃO` com `avisosDctf` ⇒
    `AGUARDANDO_HUMANO` com os avisos literais [D13 dúvida d].

### PR-6 — ligação com o ciclo fiscal (só depois de o CICLO-FISCAL estar em `main`)

26. No job do ciclo, para a PJ com credencial ativa:
    - **DAS:** prévia calculada ⇒ `AGUARDANDO_HUMANO` com a ação "aprovar entrega" (item 16). Com
      `entregaAutomatica.PGDASD` ligada, o job transmite sozinho a partir de N dias antes do vencimento (N =
      parâmetro da credencial, padrão 3).
    - **DARF:** emitido na confirmação (item 21).
    - **DCTFWEB (MIT):** `ARQUIVO_GERADO` ⇒ `AGUARDANDO_HUMANO` "atestar e encerrar" (item 24); com
      `entregaAutomatica.MIT`, **só** se o atestado permanente do item 27 existir.
    - **Pagamento:** consulta diária até 5 dias depois do vencimento (item 22).
    - **DEFIS e DASN-SIMEI:** no ciclo, hoje só ocorrência, prazo e pré-requisito. Com credencial e serviço ligados, vão
      para `AGUARDANDO_HUMANO` "aprovar entrega" (18a, 18b); com a chave `entregaAutomatica.DEFIS`/`.DASNSIMEI`,
      seguem a regra do DAS.

    Não cria estado novo na `ObrigacaoFiscalOcorrencia`: o andamento da chamada vive na `ReceitaRequisicao`.
27. **Atestado permanente do MIT** (opcional, por credencial): *"esta PJ não tem débitos no MIT além dos que o
    Luminaris apura"*, com data e quem atestou. Revogável. Sem ele, o MIT nunca é automático.
28. **Teste de ponta a ponta com o fake:** Simples (prévia → aprovação → transmissão → DAS → pagamento ⇒ `CONCLUIDA`) e
    Presumido (confirmação → DARF → MIT com atesto → `ENCERRADA` ⇒ `CONCLUIDA`). Rodado 2× seguidas, a 2ª não faz
    nenhuma chamada cobrável.

### Gates que o diff aciona (entram no PR que os toca)

29. Snapshot de shape dos DTOs Zod (PR-1, 2, 3, 5); paridade i18n pt/en dos códigos de erro novos; allowlist do
    `auditCanonical.ts` (item 13); guard de path-count do openapi + `docs/accounting.receita.paths.ts`; `npm run
    check:arch` (a porta não importa nada do motor); `tsc` limpo nos dois lados.

## 2. Contratos esboçados

```ts
// PR-0 — features/accounting/receita/ReceitaFederalPort.ts
export type ReceitaServico =
  | 'PGDASD_ENTREGAR' | 'PGDASD_GERAR_DAS' | 'PGDASD_ULTIMA_DECLARACAO' | 'PGDASD_EXTRATO_DAS'
  | 'SICALC_EMITIR_DARF' | 'SICALC_DARF_CODBARRA' | 'SICALC_APOIO_RECEITAS'
  | 'MIT_ENCERRAR' | 'MIT_SITUACAO' | 'MIT_CONSULTAR' | 'MIT_LISTAR'
  | 'PAGTOWEB_PAGAMENTOS' | 'PAGTOWEB_COMPROVANTE'
  | 'DEFIS_ENTREGAR' | 'DEFIS_ULTIMA_DECLARACAO'                       // F-IC-8 b
  | 'DASNSIMEI_ENTREGAR' | 'DASNSIMEI_DAS_EXCESSO'                     // F-IC-8 b; capacidade só após RB-IC-1
  | 'PROCURACOES_OBTER';                                               // teste da credencial no modo PROCURADOR

export interface ReceitaCapabilities {
  servicos: readonly ReceitaServico[];
  ambiente: 'producao' | 'trial' | 'fake';
}

export interface ReceitaContexto {
  contratante: string;                          // CNPJ raiz (R8)
  autor: { numero: string; tipo: 1 | 2 };       // = contribuinte no modo CONTRIBUINTE; = escritório no PROCURADOR
  contribuinte: { numero: string; tipo: 2 };
  tokens: { accessToken: string; jwtToken: string };
  // Sem Termo de Autorização: nos dois modos ratificados, contratante = autor (PRE-ADR §10.1).
  requestTag: string;                           // ≤ 32 [D09]
}

export type ResultadoChamada<T> =
  | { desfecho: 'OK'; dados: T; httpStatus: number; responseId: string | null; mensagens: MensagemReceita[] }
  | { desfecho: 'RECUSADO'; httpStatus: number; mensagens: MensagemReceita[] }
  | { desfecho: 'INDETERMINADO'; httpStatus: 504 | null; motivo: string }
  | { desfecho: 'INDISPONIVEL'; httpStatus: 429 | 500 | 503 | null; motivo: string };
export type MensagemReceita = { codigo: string; texto: string };

export interface ReceitaFederalPort {
  readonly name: 'integra-contador' | 'fake' | 'disabled';
  readonly capabilities: ReceitaCapabilities;
  entregarPgdasd(ctx: ReceitaContexto, e: PgdasdEntrega): Promise<ResultadoChamada<PgdasdEntregue>>;
  gerarDas(ctx: ReceitaContexto, e: { periodoApuracao: string; dataConsolidacao?: string }): Promise<ResultadoChamada<DasEmitido>>;
  consultarUltimaDeclaracaoPgdasd(ctx: ReceitaContexto, pa: string): Promise<ResultadoChamada<PgdasdRecibo | null>>;
  emitirDarf(ctx: ReceitaContexto, e: DarfEntrada): Promise<ResultadoChamada<DarfEmitido>>;
  encerrarApuracaoMit(ctx: ReceitaContexto, arquivo: MitArquivo): Promise<ResultadoChamada<{ protocoloEncerramento: string; idApuracao: number }>>;
  situacaoEncerramentoMit(ctx: ReceitaContexto, protocolo: string): Promise<ResultadoChamada<MitSituacao>>;
  listarApuracoesMit(ctx: ReceitaContexto, f: { ano: number; mes?: number }): Promise<ResultadoChamada<MitApuracaoResumo[]>>;
  consultarPagamentos(ctx: ReceitaContexto, f: { numerosDocumento: string[] }): Promise<ResultadoChamada<PagamentoReceita[]>>;
}

export type PgdasdEntrega = {
  cnpjCompleto: string; pa: number; indicadorTransmissao: boolean; indicadorComparacao: boolean;
  declaracao: PgdasdDeclaracaoApi;              // espelho de [D18], campos com os nomes da API
  valoresParaComparacao?: { codigoTributo: 1001 | 1002 | 1004 | 1005 | 1006 | 1007 | 1008 | 1010; valor: number }[];
};
export type DasEmitido = { numeroDocumento: string; valorTotal: number; vencimento: string; pdfBase64: string };
export type DarfEmitido = { numeroDocumento: string; valorTotal: number; pdfBase64: string; qrCodePix: string | null; codigoBarras?: string };
export type MitSituacao = { idApuracao: number; situacao: 'EM_EDICAO' | 'ENCERRAMENTO_EM_CURSO' | 'ENCERRADA'; avisosDctf: string[]; dataEncerramento: string | null };
// Os nomes exatos dos campos de saída do PGDAS-D, do DAS e do Pagamentos se confirmam nas páginas de saída e de
// exemplos na execução (insumo §6 item 3). O tipo acima é a forma de domínio, e o adaptador traduz.

// PR-1 — tokens (F-IC-2 → b: A1 no servidor)
export interface SapiTokenPort {
  obter(credencialId: string): Promise<
    | { accessToken: string; jwtToken: string; expiraEm: string }
    | { indisponivel: 'RECEITA_SEM_CREDENCIAL' | 'RECEITA_SEM_CERTIFICADO' | 'RECEITA_CERTIFICADO_VENCIDO' | 'RECEITA_AUTENTICACAO_RECUSADA' }
  >;
}
```

```prisma
// PR-1 — Prisma first-class (§2.1: credencial e registro de ato legal)
model ReceitaCredencial {
  id                    String    @id @default(cuid())
  userId                String    @unique // a PJ (R8)
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  modo                  String // 'CONTRIBUINTE' | 'PROCURADOR' (F-IC-1 ratificado: os dois na 1ª fase)
  contratanteCnpj       String // = CNPJ da matriz (CONTRIBUINTE) ou do escritório (PROCURADOR); contratante = autor
  fiscalCertificateId   String? // CONTRIBUINTE: o A1 da própria PJ (X10i)
  certCiphertext        Bytes? // PROCURADOR: DER do A1 do escritório, cifrado (keyring RECEITA_KEYS, AAD = id)
  keyCiphertext         Bytes? // PROCURADOR: PKCS#8 do A1 do escritório, cifrado; a senha do pfx nunca é gravada
  certCnpj              String? // PROCURADOR: CNPJ do A1 (= contratanteCnpj)
  certNotAfter          String? // AAAA-MM-DD
  certFingerprintSha256 String?
  consumerKeyCiphertext    Bytes // cifrado (keyring RECEITA_KEYS)
  consumerSecretCiphertext Bytes
  segredoKeyVersion     Int
  procuracoesEncontradas Json? // PROCURADOR: [{ dtexpiracao, sistemas[] }] do OBTERPROCURACAO41 no último teste [D27]
  servicos              Json // ReceitaServico[] que o cliente ligou
  entregaAutomatica     Json // { PGDASD: false, MIT: false, diasAntes: 3 } (F-IC-3 c)
  atestoMitSemOutrosEm  DateTime? // item 27
  atestoMitPorId        String?
  tokenCiphertext       Bytes? // { accessToken, jwtToken } cifrado (secretBox, AAD = id)
  tokenKeyVersion       Int?
  tokenExpiraEm         DateTime?
  verificadaEm          DateTime?
  setById               String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?
  @@map("receita_credenciais")
}

model ReceitaRequisicao {
  id                 String    @id @default(cuid())
  userId             String
  credencialId       String
  servico            String // ReceitaServico
  idSistema          String
  idServico          String
  tipoCobranca       String // 'Consultar' | 'Emitir' | 'Declarar' | 'Apoiar' | 'Monitorar'
  contribuinteCnpj   String
  periodo            String? // "2026-11" | "2026-T03"
  chaveIdempotencia  String    @unique
  requestTag         String
  payloadSha256      String // nunca o conteúdo (CPF do responsável no MIT)
  estado             String // 'PENDENTE' | 'OK' | 'RECUSADO' | 'INDETERMINADO' | 'INDISPONIVEL'
  httpStatus         Int?
  responseId         String?
  protocolo          String? // protocoloEncerramento (MIT), número do recibo/documento
  mensagens          Json?
  cobravel           Boolean?
  sourceType         String? // 'simples_apuracao' | 'tax_assessment' | 'mit_export' | 'profit_distribution' | 'obrigacao_fiscal_ocorrencia'
  sourceId           String?
  sourceDocumentId   String? // PDF devolvido (DAS, DARF, comprovante)
  aprovadoPorId      String? // declaração aprovada por humano (F-IC-3)
  motivoSemComparacao String? // F-IC-6 a
  createdAt          DateTime  @default(now())
  resolvidaEm        DateTime?
  @@index([userId, servico, createdAt])
  @@index([estado, createdAt])
  @@map("receita_requisicoes")
}
```

```ts
// PR-1 — DTOs (Zod .strict())
// Campos de texto do multipart (o pfx do modo PROCURADOR vem como arquivo, a senha como campo, igual ao
// upload do FiscalCertificate; a senha só vive na requisição).
export const ReceitaCredencialPutSchema = z.object({
  modo: z.enum(['CONTRIBUINTE', 'PROCURADOR']),
  contratanteCnpj: z.string().regex(/^[0-9A-Z]{12}[0-9]{2}$/), // alfanumérico aceito [D06]
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
  pfxSenha: z.string().optional(),                               // obrigatória com modo = PROCURADOR (refine)
  servicos: z.array(z.enum(RECEITA_SERVICOS)).min(1),
  entregaAutomatica: z.object({ PGDASD: z.boolean(), MIT: z.boolean(), DEFIS: z.boolean(), DASNSIMEI: z.boolean(), diasAntes: z.number().int().min(0).max(20) }).strict(),
}).strict();
// View devolvida: nunca as chaves nem o certificado; só modo, contratante, CNPJ/validade/impressão do A1,
// serviços, entregaAutomatica, verificadaEm, procuracoesEncontradas.

// PR-2
export const PgdasdEntregarSchema = z.object({
  aprovar: z.literal(true),
  confirmarRetificacao: z.boolean().optional(),
  semComparacao: z.object({ motivo: z.string().trim().min(10) }).strict().optional(),
}).strict();

// PR-5
export const MitEncerrarSchema = z.object({
  aprovar: z.literal(true),
  atestoSemOutrosDebitos: z.literal(true),
  confirmarRetificacao: z.boolean().optional(),
}).strict();
```

## 3. Forks pendentes de ratificação

**Nenhum pendente.** F-IC-1..8 foram ratificados em 21–22/11 (PRE-ADR §10). Itens que cada um fixou: F-IC-1 → 9, 10,
11 (dois modos) · F-IC-2 → 11 (A1 no servidor) · F-IC-3 → 16, 26 · F-IC-4 → a ordem dos PRs · F-IC-5 → 23–27 ·
F-IC-6 → 16 · F-IC-7 → 8 e o RB-IC-1 · F-IC-8 → 18a, 18b. Decisão nova que aparecer na execução vira lacuna de spec e
pergunta ao dono, nunca escolha do executor.

## 4. Pendente de validação externa

PRE-ADR §8, itens 1–8. O que trava:
- **Antes do PR-1:** o item 4, termos do Serpro sobre o uso da credencial do cliente por software de terceiro.
- **Antes do item 25:** o item 3.
- **Antes do item 24 no modo `PROCURADOR`:** o item 2 (código de procuração do MIT). Até lá vale o 409 nomeado.
- O item 5 (norma da procuração) foi **resolvido**: IN RFB 2.320/2026, lida no Sijut em 22/11 (dossiê
  `pesquisas-legais/procuracao-eletronica-ecac`). Entra no item 10.
- **Antes de produção:** o item 7, o parecer de advogado sobre a guarda (RB-IC-0).
- O item 1 (`expires_in`) deixou de travar: com o A1 no servidor, o token se renova sozinho.

## 5. Gates humanos (runbook, não sessão de agente)

- **RB-IC-0 — parecer sobre a guarda do A1 de terceiro** (L-ADN-5, decisão do dono de 22/11: *"Produção espera"*). O
  advogado responde por escrito se o Luminaris pode guardar, cifrado, o A1 do cliente e o do escritório (modo
  `PROCURADOR`) e usá-los para autenticar e assinar em nome deles. Sem o parecer arquivado, a credencial de produção
  fica recusada: `INTEGRA_CONTADOR_AMBIENTE=producao` exige o env `RECEITA_GUARDA_PARECER_REF` preenchido, e o
  `selectReceitaGateway` devolve `disabled` com o motivo `RECEITA_GUARDA_SEM_PARECER`. Código, testes e trial seguem.
- **RB-IC-1 — primeira chamada real** (`RUNBOOK-FORMAT`, desfecho e assinatura do dono), depois do RB-IC-0:
  1. o cliente contrata e configura a credencial;
  2. `POST …/credencial/testar` (gratuito);
  3. uma consulta cobrada (`CONSULTIMADECREC14`);
  4. só então a 1ª entrega aprovada do PGDAS-D de um mês real.

  A evidência é o `responseId` e o recibo. Isto é o oráculo: o agente não o substitui. O RB-IC-1 também diz se a
  DASN-SIMEI responde (item 18b) e se a DCTFWeb do MIT fica `ATIVA` sem `TRANSDECLARACAO310` (PRE-ADR §8 item 3).

## 6. Insumos ausentes

1. **API Reference (swagger) de produção:** a URL base e o schema de saída de cada serviço. A página do dossiê só tem o
   título [`pt_chamadas_api_reference`]. Ler no PR-0.
2. **Dados de domínio do Sicalc** (`codigoReceitaExtensao`, `tipoPA`, `numeroReferencia`). Ler no PR-3.
3. **Páginas de saída e de exemplos** do PGDAS-D (`entregar_declaracao_mensal_saida`, exemplos do GERARDAS12) e do
   PagtoWeb. Ler no PR-2 e no PR-4.
4. **`expires_in` do token SAPI** (PRE-ADR §8 item 1).
5. **Folha de 12 meses para `folhasSalario`** (PA ≥ 2026-11): hoje é digitada no histórico do Simples. A ponte folha
   → razão → Simples é a lacuna `L-20261121-181950-5cb9` (PES-4). O item 14 lê o que existir e falha com nome
   (`PGDASD_FOLHA_OBRIGATORIA`), sem inventar.
6. ~~Assinador local~~: deixou de ser insumo com o F-IC-2 → (b).
7. **Leiautes da DEFIS (`TRANSDECLARACAO141`) e da DASN-SIMEI (`TRANSDECLARACAO151`, `GERARDASEXCESSO153`)** na
   documentação do Serpro: não lidos nesta sessão. Ler no PR-2 (itens 18a, 18b).

## 7. Write-set

| PR | Edita ou cria |
|---|---|
| PR-0 | `server/src/features/accounting/receita/**` (porta, envelope, catálogo, adaptadores, seleção, testes) · `scripts/integra-contador-trial.mjs` |
| PR-1 | `server/prisma/schema.prisma` · `server/prisma/migrations/**` · `server/src/features/accounting/receita/**` · `server/src/features/accounting/dtos/ReceitaCredencialDto.ts` · `server/src/features/accounting/services/ReceitaCredencialService.ts` · `server/src/features/accounting/services/ReceitaRequisicaoService.ts` · `server/src/features/accounting/repositories/ReceitaCredencialRepository.ts` · `server/src/features/accounting/repositories/ReceitaRequisicaoRepository.ts` · `server/src/controllers/ReceitaController.ts` · `server/src/features/accounting/policies/AccountingPolicy.ts` · `server/src/features/accounting/services/FiscalCertificateService.ts` (extração da leitura do PKCS#12 para função pura) · `server/src/features/accounting/repositories/FiscalCertificateRepository.ts` (leitura do A1 da matriz) |
| PR-2 | `server/src/features/accounting/receita/pgdasd*.ts` · `receita/defis*.ts` · `receita/dasnSimei*.ts` · `server/src/features/accounting/dtos/SimplesDto.ts` (ou o DTO do Simples vigente) · `server/src/features/accounting/services/SimplesEntregaService.ts` · `server/src/features/accounting/services/SimplesApuracaoService.ts` (só a chamada a `registrarDas` com origem API) · `server/src/features/accounting/services/SimplesDeclaracaoService.ts` (leitura do espelho da DEFIS/DASN para o mapper) |
| PR-3 | `server/src/features/accounting/receita/darf*.ts` · `server/src/features/accounting/dtos/DarfDto.ts` · `server/src/features/accounting/services/DarfService.ts` · `TaxAssessmentService.ts`, `ProfitDistributionService.ts`, `InterestOnEquityService.ts` (gancho na confirmação) |
| PR-4 | `server/src/features/accounting/receita/pagamentos*.ts` · `server/src/features/accounting/services/ReceitaPagamentoService.ts` |
| PR-5 | `server/src/features/accounting/services/MitExportService.ts` · `server/src/features/accounting/dtos/MitExportDto.ts` · `server/src/features/accounting/services/MitEncerramentoService.ts` |
| PR-6 | os arquivos do job do CICLO-FISCAL (`CicloFiscalService.ts`, nomes do #1322) · `ReceitaCredencial` (atestado) |
| todos | `server/src/features/accounting/**/__tests__/**` · `server/src/controllers/__tests__/**` · locales pt/en dos códigos de erro |

**Choke points (PAR-001):** `server/src/lib/factory.ts` · `server/src/routes/accounting.ts` ·
`server/src/routes/docs/accounting.receita.paths.ts` · `server/src/routes/docs.paths.ts` · `server/public/openapi.json` ·
`server/src/features/accounting/audit/auditCanonical.ts` ·
`server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts` · `server/test/helpers/db.ts` ·
`server/prisma/schema.prisma`.

**Integração:** 7 PRs no mesmo tema ⇒ `integration/integra-contador` (dono, 10/11), em pilha nativa.

## 8. Achados fora de escopo (vão à caixa)

- Caixa Postal do e-CAC e DTE por API (`MSGCONTRIBUINTE61`, `INNOVAMSG63` gratuito por ser Monitorar). Intimação perdida
  pode excluir do Simples (mapa de 10/10, `dominio-contabil.md:146`).
- SITFIS (relatório de situação fiscal) e CND.
- Parcelamentos do Simples e do MEI (PARCSN/PERTSN/RELPSN…), "NÃO MAPEADO" no mapa de 10/10.
- DAS mensal do MEI pela API (`PGMEI/GERARDASPDF21`, sem procuração [D05]). Não pedido; fica ao lado da DASN-SIMEI,
  que entrou (F-IC-8 b).
- Conta de escritório de contabilidade compartilhada entre tenants: uma credencial `PROCURADOR` serve a vários clientes.
  Hoje é uma por PJ (PRE-ADR §10.1).
- Reversão da guarda para NF-e, NFC-e e NFS-e (F-IC-2, "todos os usos"): replanejar o X10a e o X10i
  ([[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]]).
- Baixa automática do título de imposto pela conciliação quando o pagamento aparece (item C3 do handoff de 21/11).
- Com a guarda do A1 de volta (F-IC-2 → b), o F-REINF-2 (transmissão da Reinf pelo webservice) pode usar o mesmo A1 guardado no mTLS. A decisão é do nó EFD-REINF.
