# Estudo da API Focus NFe — camada fiscal (2026-10-07)

> Só pesquisa: sem código, sem BRIEF. Complementa (não refaz) a ADR-INCR-DFE-EMISSAO-PARCEIRO §11.2 e o gate D5.
> Fontes lidas em 07/10/2026: índice `https://doc.focusnfe.com.br/llms.txt` e as páginas `.md` citadas abaixo;
> `https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html` **abriu** (a raiz `campos.focusnfe.com.br` dá 403;
> a página de campos responde 200, com 243 campos extraídos).
> Graus: **V** = verificado (a página diz literalmente) · **I** = inferido (de onde) · **H** = só a homologação (D5) responde.

Base das URLs: `D = https://doc.focusnfe.com.br`, `C = https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html`.

## ⚠ Reenquadramento do dono (chat, 2026-10-07)

> *"Não é pra ter conta focus, é pra usar a api deles para aprender e fazer a nossa"*

A Focus é **referência de desenho**, não fornecedor. Não haverá conta, token nem homologação na Focus. Consequências para este documento:

- As tabelas P1–P12 continuam válidas como **descrição de como um emissor maduro resolve cada problema**. Lê-se "Efeito no Luminaris"
  como "o que copiar ou evitar no **nosso** emissor", e não como "o que o adaptador Focus precisa".
- A lista "Só a homologação (D5) resolve" **perde o objeto**. As perguntas que importam para o nosso emissor (numeração, código de
  motivo do e101101, códigos E0xxx, ambiente) se respondem no **ADN / manual oficial da NFS-e nacional**, e não na Focus.
- As premissas do gate D5 ("Dono escolheu Focus NFe, BYOK"; certificado A1 no painel da Focus) ficam **superadas por esta fala**.
  Atualizar a nota do D5 depende de autorização do dono e não foi feito aqui.

### O que aprender da Focus para o nosso emissor

| Padrão da Focus | Lição para o nosso desenho |
|---|---|
| `ref` do cliente como chave de idempotência; 422 em ref duplicada; consulta por ref | Já é o nosso desenho (F-DFE-10). Expor a **mesma semântica** na nossa API: POST idempotente por ref, GET por ref |
| JSON plano em português sobre o leiaute XML | Separar o **contrato de entrada** (amigável, plano) do **XML assinado** (infDPS). Hoje o `DpsPayload` já é XML-shaped; um DTO de entrada plano é decisão de API pública, não de emissão |
| Ambiente pela URL/credencial, não pelo corpo | Derivar o `tpAmb` do ambiente do documento, nunca de campo livre. Ataca as lacunas GAP-MAP l.25/l.72 |
| Prestador omitido = cadastro da empresa | Preencher `prest` a partir da unidade (já fazemos) |
| Contador por empresa e por ambiente (`proximo_numero_nfsen_producao/_homologacao`) | **Confirma o conserto da GAP-MAP l.133:** sequência separada por ambiente |
| Emissão assíncrona + webhook + polling de fallback; retentativas 1 min→24 h | Mesmo modelo para o nosso job de consulta ao ADN |
| Status `processando_autorizacao / autorizado / erro_autorizacao / negado / cancelado / erro_cancelamento` | O nosso PROCESSING/AUTHORIZED/REJECTED/CANCELLED cobre. O `erro_cancelamento` separado é útil |
| `erros[{codigo, mensagem, correcao}]` | Vale adotar o `correcao` (dica de conserto) nos nossos erros de emissão |
| Recebidas por cursor `versao` monotônico por CNPJ + `X-Max-Version` | Modelo bom para a distribuição do ADN (NSU). Guardar um cursor por unidade |
| Cancelamento só com justificativa | **Não copiar:** o e101101 exige `cMotivo` (1/2/9). A nossa porta está certa |
| Rate limit por credencial (100/min) | Se expusermos API, limitar por unidade/tenant |
| Certificado com `valido_de/ate` legível e propagação por CNPJ raiz | Guardar e alertar a validade do A1 por unidade |

## Resumo — o que muda no nosso entendimento (leitura original, como se fôssemos clientes da Focus)

1. **A Focus não aceita o nosso `infDPS`.** O `POST /v2/nfsen` recebe um **JSON plano** em português
   (`numero_dps`, `cnpj_tomador`, `logradouro_tomador`, `ibs_cbs_situacao_tributaria`…), sem `tpAmb` e sem `Id`.
   O adaptador vai precisar de um tradutor `DpsPayload → JSON Focus`, campo a campo (tabela da P3).
2. **O nosso `ref` "<cuid>:<n>" desobedece a regra escrita** (sem caracteres especiais), mas o próprio exemplo da doc
   usa `=` e `-`. Contradição → só a homologação fecha. O desvio barato é `<cuid>-<n>` ou `<cuid>n<n>`.
3. **O cancelamento da Focus não recebe o `cMotivo`** — só `justificativa`. O nosso 1/2/9 não tem campo onde entrar.
4. **A consulta não traz a chave nem os valores de ISS/IBS/CBS como campos.** Vêm pelo XML (`caminho_xml_nota_fiscal`)
   e, no caso da chave, também pela URL. `EmissaoResult.valores` sai do parse do XML, não do JSON.
5. **Token é por empresa** (`token_producao`/`token_homologacao` por CNPJ); o Token Master só administra.
   N CNPJs = N tokens. Cabe no `partnerAccountRef` da porta.

**Maior risco:** a numeração da DPS. Os campos `serie_dps`/`numero_dps` estão marcados como **obrigatórios** na página de campos,
mas a API de empresas tem `proximo_numero_nfsen_*`, "calculado automaticamente". Se a Focus numera **e** nós mandamos o número,
há dois donos da sequência. Um número repetido no ADN vira rejeição, e a doc não diz o que a Focus faz nesse caso → **H**.

---

## P1 — Formato do `ref`

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Caracteres | "Pode ser alfanumérica"; "Não use caracteres especiais (acentos, espaços, `@`, `/`, etc.); fique em letras e números" | `D/reference/referencia.md` | V |
| Contradição | O exemplo de consulta autorizada usa `ref: "TRANSACTION=742130=1=0=092467d0-e275-4ff2-b633-3510643cfd03"` (com `=` e `-`) | `D/reference/consultar_nfse_nacional.md` | V (a contradição) |
| Tamanho máximo | **Não documentado** em nenhuma página lida | — | H |
| Escopo | "única dentro do escopo do token (cada empresa/token tem o seu próprio conjunto)" | `referencia.md` | V |
| Duplicada | `422 {"codigo":"erro_validacao","mensagem":"Já existe um DPS com esta referência."}` | `D/reference/emitir_dps_nacional.md` | V |
| Transporte | Vai na **query** (`?ref=`) e no **path** (`/nfsen/{referencia}`) | emitir / consultar / cancelar | V |
| `"<docId>:<n>"` passa? | `:` é caractere especial pela regra escrita; no path ele é legal em URL, mas a validação da API é desconhecida | — | **H** |

**Efeito:** `attemptRef` (`server/src/features/accounting/repositories/FiscalDocumentRepository.ts:15`) gera `${documentId}:${attemptNo}`.
O cuid é alfanumérico (`schema.prisma`, `FiscalDocument.id @default(cuid())`), então só o `:` é problema. A troca é local ao adaptador ou ao `attemptRef`.

## P2 — Quem numera a DPS

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| `serie_dps` | Integer[5], **obrigatório**, "faixa de utilização para API: 00001 a 49999" | C | V |
| `numero_dps` | Integer[15], **obrigatório** | C | V |
| Do lado da empresa | `proximo_numero_nfsen_producao/_homologacao`: "Próximo número do RPS da NFSe Nacional… (calculado automaticamente)"; `serie_nfsen_*`: "Algumas prefeituras não utilizam" | `D/reference/criar_empresa.md` | V |
| Contradição | Campo obrigatório no payload × contador automático na empresa. Exemplo do OpenAPI manda `serie_dps: 1, numero_dps: 1` | C × `criar_empresa.md` × `emitir_dps_nacional.md` | **H** |
| Número repetido | Não documentado. O ADN rejeita DPS com número repetido; a Focus deve devolver `erro_autorizacao` | I (regra do ADN + enum da consulta) | H |
| Faixa 1–49999 | Bate com o nosso `serie: min(1).max(49999)` (E0010) | `DpsPayloadDto.ts:26` | V |

**Efeito:** `capabilities.numbersDps` decide se a sequência local é consumida. Hoje a Focus fica `numbersDps: false`: mandamos o número.
A homologação precisa provar duas coisas: o nosso número prevalece sobre o `proximo_numero_nfsen`, e a sequência separa homologação de produção
(lacuna GAP-MAP l.133).

## P3 — Campos do `POST /v2/nfsen` × nosso `DpsPayload` (infDPS)

Fonte de todos os campos: C (V). A página lista 243 campos. Só se mapeiam aqui os que o nosso schema tem, mais os grupos que não temos.

| Nosso `infDPS` (DpsPayloadDto.ts) | Campo Focus (tag XML) | Nota |
|---|---|---|
| `id` [102] | — | **Não existe**: a Focus monta o Id. As lacunas GAP-MAP l.67 e l.71 (Id com tpInsc/nDPS=0) **não afetam** o canal Focus |
| `tpAmb` [103] | — | **Não existe**: o ambiente vem da URL + token (`D/reference/ambiente.md`) |
| `dhEmi` | `data_emissao` (dhEmi), obrig. | |
| `verAplic` | — | Não exposto (a Focus preenche) — I |
| `serie` / `nDPS` | `serie_dps` / `numero_dps`, obrig. | Ver P2 |
| `dCompet` | `data_competencia` (dCompet), obrig., AAAA-MM-DD | GAP-MAP l.83 (ISO UTC) continua valendo |
| `tpEmit` | `emitente_dps` (1/2/3), obrig. | |
| `cLocEmi` | `codigo_municipio_emissora`, obrig. | |
| `prest.CNPJ` | `cnpj_prestador` (CPF/NIF/CAEPF alternativos) | Dados de endereço do prestador são opcionais; telefone "usa os dados do cadastro da empresa quando omitido" |
| `prest.IM` / `xNome` | `inscricao_municipal_prestador` / `razao_social_prestador` | |
| `regTrib.opSimpNac` | `codigo_opcao_simples_nacional`, obrig. | |
| `regTrib.regApTribSN` | `regime_tributario_simples_nacional` | |
| `regTrib.regEspTrib` | `regime_especial_tributacao`, obrig. | |
| `toma.CNPJ` / `CPF` | `cnpj_tomador` / `cpf_tomador` | |
| — (não temos) | `nif_tomador` + `motivo_ausencia_nif_tomador` (cNaoNIF) | **Tomador estrangeiro** |
| `toma.xNome` | `razao_social_tomador` | |
| `toma.end.endNac.cMun` / `CEP` | `codigo_municipio_tomador` / `cep_tomador` | |
| — (não temos) | `codigo_pais_ext_tomador`, `cep_ext_tomador`, `nome_cidade_ext_tomador`, `regiao_ext_tomador` | **Endereço no exterior** |
| `toma.end.xLgr/nro/xCpl/xBairro` | `logradouro_tomador`/`numero_tomador`/`complemento_tomador`/`bairro_tomador` | Endereço **achatado** (sem `end/endNac`) |
| — | `telefone_tomador`, `email_tomador`, `caepf_tomador`, `inscricao_municipal_tomador` | |
| — (não temos) | grupo `*_intermediario` (mesmo shape do tomador) | |
| `serv.locPrest.cLocPrestacao` | `codigo_municipio_prestacao`, obrig. (+ `codigo_pais_prestacao`) | |
| `cServ.cTribNac` | `codigo_tributacao_nacional_iss`, obrig., String[6] | |
| `cServ.cTribMun` | `codigo_tributacao_municipal_iss` | |
| `cServ.xDescServ` | `descricao_servico`, obrig. | |
| `cServ.cNBS` | `codigo_nbs` | |
| `cServ.cIntContrib` | `codigo_interno_contribuinte` | |
| `infoCompl.xInfComp` | `informacoes_complementares` | |
| `valores.vServPrest.vServ` | `valor_servico`, obrig., Decimal[15.2] | **Decimal em reais**, não centavos → conversão no adaptador (risco de float: serializar como string decimal, a ser provado na homologação) |
| `vDescCondIncond` | `desconto_incondicionado` / `desconto_condicionado` | |
| — (não temos) | `percentual_deducao_servico`, `valor_deducao_servico`, documentos dedutíveis (`tipo_deducao`, `valor_dedutivel`…) | |
| `tribMun.tribISSQN` | `tributacao_iss`, obrig. | |
| `tribMun.tpRetISSQN` | `tipo_retencao_iss` | **Retenção de ISS** |
| `tribMun.pAliq` | `percentual_aliquota_relativa_municipio`, Decimal[1.2] | Confirma o 1V2 do XSD (GAP-MAP l.66) |
| — (não temos) | `tipo_imunidade`, `tipo_exigibilidade_suspensao`, `numero_processo_suspensao`, `numero_beneficio_municipal`, `valor/percentual_reducao_base_calculo` | |
| — (não temos) | **Retenções federais:** `situacao_tributaria_pis_cofins`, `base_calculo_pis_cofins`, `aliquota_pis/cofins`, `valor_pis/cofins`, `tipo_retencao_pis_cofins`, `valor_cp`, `valor_irrf`, `valor_csll` | |
| `totTrib.pTotTrib.*` | `percentual_total_tributos_federais/estaduais/municipais` (+ `valor_total_tributos_*`, `indicador_total_tributacao`, `percentual_total_tributos_simples_nacional`) | |
| `IBSCBS.finNFSe` | `finalidade_emissao` | |
| `IBSCBS.cIndOp` | `codigo_indicador_operacao` | |
| `IBSCBS.indDest` | `indicador_destinatario` (+ grupo `*_destinatario`) | |
| `IBSCBS…gIBSCBS` (CST/cClassTrib) | `ibs_cbs_situacao_tributaria` (CST), `ibs_cbs_classificacao_tributaria` (cClassTrib) | |
| — (não temos) | `consumidor_final`, `indicador_operacao_zfm_alc`, `tipo_operacao_governamental`, `tipo_ente_governamental`, `ibs_cbs_credito_codigo_classificacao`, `*_regular`, `ibs_uf/ibs_mun/cbs_percentual_diferimento`, grupos `*_imovel`, `tipo_chave_dfe`, `valor_repasse` | Os campos de IBS/CBS da página levam a marca "reforma tributária" e quase não têm descrição |
| — | Substituição: `chave_nfse_substituida`, `codigo_justificativa_substituicao`, `motivo_substituicao` | |
| — | Comércio exterior, obra, evento, `codigo_moeda`, `valor_servico_ext` | |

Grau do mapeamento: os **nomes** são V (C). A equivalência semântica com as nossas tags vem da tag XML que a página mostra em cada campo (V).
O formato numérico aceito (número JSON × string) é **H**.

## P4 — Cancelamento

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Rota | `DELETE /v2/nfsen/{referencia}`, **síncrono** | `D/reference/cancelar_nfse_nacional.md` | V |
| Corpo | Só `{"justificativa": "…"}`, opcional. **Não há campo de código de motivo** | idem | V |
| "Código 4" | Texto literal: "Justificativa do cancelamento (necessária se o código de cancelamento for 4)". O código 4 não é nenhum dos motivos do e101101 (1 erro na emissão, 2 serviço não prestado, 9 outros). Parece sobra da doc da NFS-e **municipal** | I (comparação com o e101101 já transcrito na porta) | H |
| Respostas | `200 {"status":"cancelado"}` ou `200 {"status":"erro_cancelamento","erros":[{codigo:"V999",mensagem:"NFSe fora do prazo…",correcao:null}]}`; `404 nao_encontrado` | idem | V |
| Pré-condição | "Apenas notas com status autorizado podem ser canceladas" | idem | V |

**Efeito:** `cancelar(partnerRef, {cMotivo, xMotivo})` (DfeEmissorPort) **não tem para onde mandar o `cMotivo`**. Como a Focus
escolhe o código no e101101 é **H**. O `OUT_OF_WINDOW` não tem código próprio: só aparece na mensagem de `erro_cancelamento`.
Para separá-lo de `REJECTED` vai ser preciso casar a mensagem ou o código ADN de dentro de `erros[]` (H). O status `PROCESSING` do
`CancelResult` não ocorre na Focus, porque o cancelamento é síncrono (V).

## P5 — Consulta

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Rota | `GET /v2/nfsen/{referencia}` | `D/reference/consultar_nfse_nacional.md` | V |
| Campos (autorizado) | `status, cnpj_prestador, ref, numero_rps, serie_rps, tipo_rps, numero, codigo_verificacao, data_emissao, url, url_danfse, caminho_xml_nota_fiscal` (+ `caminho_xml_cancelamento` quando cancelada) | idem | V |
| `caminho_xml_nota_fiscal` | É um caminho **relativo** (`/arquivos/<cnpj>_1/<aaaamm>/XMLsNFSe/NFS<chave50>-nfse.xml`). O host e a necessidade de auth não são documentados. O `url_danfse` do exemplo é um link **público** de S3 | idem | V (formato) / H (host + auth) |
| `completa=1` | **Não existe** na consulta de emitida. Existe só em `GET /v2/nfsens_recebidas` | `consultar_nfsen_recebidas.md` | V |
| Chave da NFS-e | Não há campo `chave`. Aparece dentro de `url` (`…&chave=<50 dígitos>`) e no nome do arquivo XML | idem (exemplo) | V (exemplo) / I (usar como fonte) |
| ISS / IBS / CBS | **Não vêm no JSON** da consulta. Só no XML autorizado | idem (ausência no schema) | V (ausência) |

**Efeito:** `EmissaoResult.valores` e `chaveOuCodigo` só se preenchem depois de baixar e parsear o XML. O parser de leitura da NFS-e
manual (`lib/nfse.ts`, 13 campos) é o candidato natural. O `xml?: Buffer` da porta se confirma como necessário.

## P6 — Webhook

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Corpo | "os dados do documento são enviados em formato JSON via método POST… Cada acionamento contém os dados de apenas um documento". O schema do corpo **não é publicado** | `D/reference/webhooks.md` | V (texto) |
| Traz o `ref`? | Muito provável: o corpo seria o mesmo JSON da consulta, que traz `ref` | I (webhooks.md + consulta) | H |
| Reenviar | `POST /v2/nfsen/{referencia}/hook` reenvia "para todos os gatilhos cadastrados" | `D/reference/reenviar_hook_nfsen.md` | V |
| Vários CNPJs | Na criação, `cnpj`/`cpf` são campos **opcionais** do gatilho, junto com `event`, `url`, `authorization`, `authorization_header`. Se omitir o `cnpj` cobre todas as empresas, e qual token cria o gatilho, a doc não diz | `D/reference/criar_webhook.md` | H |
| Retentativas | `webhooks.md`: 1 min, 30 min, 1 h, 3 h, 24 h, depois para (≈ 28,5 h). Guia: "período **máximo de 48 horas**" | `webhooks.md` × `D/docs/utilizando-webhooks.md` | V (a contradição) |
| Eventos | `nfe, nfse, nfsen, nfce_contingencia, nfe_recebida, nfe_recebida_falha_consulta, nfsen_recebida, cte_recebida, inutilizacao, cte, mdfe, nfcom, nfce_consulta_automatica` | `criar_webhook.md` | V |

**Efeito:** confirma o desenho da §10. O webhook só acorda a consulta, e o polling é obrigatório.
`verifyWebhook` devolve `partnerRef` lido do corpo, o que depende do `ref` vir no corpo (H). Sem ele, o fallback é o `cnpj` + `numero`.

## P7 — Status

| Status | Onde | Terminal? | Reenvio com o mesmo `ref`? | Fonte / grau |
|---|---|---|---|---|
| `processando_autorizacao` | emissão / consulta | não | — | V |
| `autorizado` | consulta | sim (só sai por cancelamento) | **não**: ref "fica vinculada" | V (`referencia.md`) |
| `erro_autorizacao` | consulta | sim, para a tentativa | **sim**, "após corrigir o payload" | V (`referencia.md`: "nota rejeitada ou erro antes de autorizar") |
| `negado` | enum do schema de consulta | sim (I) | não documentado | V (existe) / H (semântica) |
| `cancelado` | consulta / cancelar | sim | não ("mesmo que depois seja cancelada") | V |
| `erro_cancelamento` | cancelar (síncrono) | a nota continua `autorizado` | — | V |
| `denegado` | **não aparece** na NFS-e nacional (é status de NF-e) | — | — | V (ausência) |

**Efeito:** o mapeamento para a porta fica `processando_autorizacao→PROCESSING`, `autorizado→AUTHORIZED`, `erro_autorizacao→REJECTED`.
`negado` também iria para `REJECTED`, mas por inferência (H). O nosso reenvio (`reenviar`, só a partir de `REJECTED`) cria um ref novo
(n+1). A Focus permitiria reusar o mesmo ref, então gerar um novo é legal mas desnecessário: as duas formas funcionam (V).

## P8 — Ambientes

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Homologação | `https://homologacao.focusnfe.com.br`, "sem validade fiscal nem tributária" | `D/reference/ambiente.md` | V |
| Passa pelo ADN de testes? | Não diz explicitamente. Indícios: "Mesmo para testes no ambiente de homologação da SEFAZ/Prefeituras, é obrigatório… CNPJ real e Certificado A1 válido". A empresa tem `habilita_nfsen_homologacao` separado | `D/docs/como-cadastrar-uma-empresa.md`, `criar_empresa.md` | I (forte) / H |
| `tpAmb` no corpo | **Não existe** campo de ambiente no JSON (243 campos); o ambiente é URL + token | C, `ambiente.md` | V (ausência) |
| Token por ambiente | `token_homologacao` ≠ `token_producao` | `criar_empresa.md`, `como-cadastrar-uma-empresa.md` | V |
| Exclusividade | `habilita_nfse` (municipal) **não pode** estar ligado junto com `habilita_nfsen_producao` | `criar_empresa.md` | V |

**Efeito:** no canal Focus, a lacuna "DPS sempre `tpAmb=1`" (GAP-MAP l.25) não tem efeito, porque o campo nem é enviado. A lacuna
"consultar/cancelar/webhook usam o ambiente do env" (GAP-MAP l.72) **piora**: com token por ambiente, consultar com o token errado devolve 404.
A exclusividade municipal × nacional por empresa vira uma restrição de provisionamento.

## P9 — Limites, timeouts, idempotência

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Rate limit | "100 requisições por minuto por token", ampliável pelo suporte; estouro = HTTP 429 | `D/docs/cuidado-com-o-rate-limit.md` | V |
| Depois do 429 | Nada sobre `Retry-After` nem duração do bloqueio; só "backoff progressivo" | idem | H |
| Timeouts | Não documentados. "Autorizações assíncronas podem levar de alguns segundos a vários minutos" | idem | V (latência) / H (timeout HTTP) |
| Idempotência | Pela `ref`: POST repetido → `422 erro_validacao "Já existe um DPS com esta referência"` | `emitir_dps_nacional.md` | V |

**Efeito:** queda de rede depois do POST → consultar pela `ref` (já é o desenho, F-DFE-10). O 422 de ref duplicada tem de ser tratado
como "já enviado, vá consultar", e não como rejeição. O limite é por token, e como o token é por empresa (P10), um cliente não esgota o outro (I).

## P10 — Empresas, tokens, certificado A1

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Granularidade do token | **Por empresa e por ambiente** (`token_producao`, `token_homologacao` no `EmpresaResponse`); "Token Master" é da conta, para a API de empresas e as APIs acessórias | `criar_empresa.md`, `como-cadastrar-uma-empresa.md`, `autenticacao.md` ("o token da empresa") | V |
| N CNPJs com 1 token | **Não** para emitir (ref e rate limit são por token). Sim para administrar, via Master | idem | V |
| A1 pela API | `arquivo_certificado_base64` (PFX/P12) + `senha_certificado` no criar/atualizar empresa | `criar_empresa.md` | V |
| A1 pelo painel | "Faça o upload do Certificado Digital A1 e informe a sua senha", no painel da **conta** | `como-cadastrar-uma-empresa.md` | V |
| Validade legível | `certificado_valido_de`, `certificado_valido_ate`, `certificado_cnpj` no `EmpresaResponse` | `consultar_empresa_por_id.md` | V |
| Propagação | `certificado_especifico`: se falso, a troca de certificado "é propagada para todas empresas co[m o mesmo CNPJ raiz]" | `criar_empresa.md` (texto truncado na extração) | V / I (o complemento) |
| Simulação | `dry_run=1` no criar empresa | `criar_empresa.md` | V |

**Efeito:** confirma o critério R8 do D5 pela API de empresas (V). Também responde a pergunta 1 do fold de 02/10 do D5
("o cliente sobe o A1 no painel sem passar pelo Luminaris?"): **só se a conta Focus for do cliente** (BYOK puro).
Se a conta for do Luminaris, o painel é nosso e o A1 entra pelo painel ou pela API, por nós.

## P11 — Erros

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Síncrono (400/404/422) | `{codigo, mensagem}` com códigos **próprios da Focus** em snake_case: `requisicao_invalida`, `erro_validacao`, `nao_encontrado`. O 401 vem em `text/html` "HTTP Basic: Access denied" | emitir / cancelar | V |
| Assíncrono | `erros: [{codigo, mensagem, correcao}]` em `erro_autorizacao` / `erro_cancelamento` | consulta / cancelar | V |
| Códigos do ADN (E0xxx)? | O único exemplo é `"V999"`, que não é código do ADN. Se os E0xxx passam adiante sem mudança, a doc não mostra | `cancelar_nfse_nacional.md` | H |

**Efeito:** `EmissaoResult.errors[{code,message}]` cabe, mas perde o `correcao`. O cancelamento que usa E0822 para `OUT_OF_WINDOW`
(`FiscalDocumentLifecycleService.ts:259`) depende de o código do ADN chegar inteiro (H).

## P12 — Documentos recebidos

| Item | NFS-e nacional recebida | NF-e recebida | Fonte | Grau |
|---|---|---|---|---|
| O que chega | "recebemos o **xml completo**" | só **resumo**; XML completo depois da manifestação. Carta de correção e cancelamento atualizam a nota | `consultar_nfsen_recebidas.md`, `consultar_nfes_recebidas.md` | V |
| Como | `GET` por `cnpj` + `versao` (cursor monotônico por CNPJ), 100 por página, cabeçalhos `X-Total-Count`/`X-Max-Version`; `completa=1` devolve o XML em dados completos | mesmo modelo de `versao`; filtros `pendente`, `pendente_ciencia`; manifestação (ciência/confirmação/desconhecimento/não realizada) | idem | V |
| Push | evento `nfsen_recebida` | eventos `nfe_recebida`, `nfe_recebida_falha_consulta` | `criar_webhook.md` | V |
| Habilitar | `habilita_nfsen_recebidas_producao/_homologacao`; "requer certificado com CNPJ idêntico"; `data_inicio_recebimento_nfsen`: "documentos anteriores serão **ignorados e não cobrados**. Após definido, **não pode ser alterado**" | `habilita_manifestacao`, `habilita_filtro_mde_destinatario_empresa` | `criar_empresa.md` | V |
| Frequência | Não documentada (depende da distribuição da Receita) | idem | — | H |

**Efeito:** o cursor `versao` por CNPJ precisa de um campo persistido por unidade. NF-e recebida tem ciclo de vida próprio
(resumo → completa → cancelada), então o modelo tem de ser re-versionável. Também existe um campo **irreversível**,
`data_inicio_recebimento_nfsen`, que tem efeito de cobrança (ver pergunta ao dono).

---

## Efeito no Luminaris

### GAP-MAP (`docs/operating-manual/GAP-MAP.md`)

| Linha | Lacuna | Efeito da doc Focus |
|---|---|---|
| l.25 | DPS sempre `tpAmb=1` | **Muda:** sem efeito no canal Focus (o campo não é enviado). Continua valendo para Manual/Null |
| l.66 | `pAliq` mais largo que o XSD | **Confirma:** Focus `percentual_aliquota_relativa_municipio` = Decimal[1.2] |
| l.67, l.71 | `Id` da DPS (tpInsc, nDPS=0) | **Muda:** sem efeito no canal Focus (a Focus monta o Id) |
| l.72 | consultar/cancelar/webhook usam o ambiente do env | **Agrava:** token por ambiente → 404 em vez de nota errada |
| l.83 | `dCompet` em ISO UTC → 400 | **Confirma:** `data_competencia` exige AAAA-MM-DD |
| l.133 | numeração sem `ambiente` | **Confirma e agrava:** a Focus tem um contador separado por ambiente (`proximo_numero_nfsen_*`) |
| **nova** | `attemptRef` usa `:` | **Cria:** a regra escrita do `ref` proíbe caracteres especiais (H) |
| **nova** | `cancelar` não transmite o `cMotivo` | **Cria:** a Focus só recebe `justificativa` |
| **nova** | 422 "ref duplicada" ≠ rejeição | **Cria:** precisa ser classificado como "já enviado → consultar" |
| **nova** | valor monetário em reais decimais | **Cria:** risco de float na serialização centavos→reais |

### DfeEmissorPort / LifecycleService

| Ponto | Confirma / contradiz |
|---|---|
| `EmitirInput.payload: DpsPayload` | **Contradiz em forma:** o adaptador traduz para JSON plano. A porta continua certa, porque a tradução é responsabilidade do adaptador |
| `EmitirInput.ref` "<docId>:<n>" | **Contradiz** a regra escrita (H) |
| `partnerAccountRef` | **Confirma:** é o token por empresa+ambiente |
| `capabilities.numbersDps` | **Indefinido** (H, P2) |
| `capabilities.webhook/consultar/cancelar` | **Confirma:** as três existem |
| `EmissaoResult.status` 3 estados | **Confirma** (`negado` = REJECTED, I) |
| `EmissaoResult.valores` / `chaveOuCodigo` | **Confirma a necessidade de parse do XML.** O JSON não traz esses dados |
| `cancelar(…, {cMotivo, xMotivo})` | **Contradiz:** sem campo de código |
| `CancelResult.PROCESSING` | **Contradiz:** o cancelamento na Focus é síncrono, então o estado não ocorre |
| `OUT_OF_WINDOW` via E0822 | **H:** depende do código do ADN atravessar a Focus |
| `verifyWebhook → partnerRef` | **Confirma o segredo em cabeçalho** (§11.2). O `ref` no corpo é **H** |
| Lifecycle: webhook só acorda a consulta + polling | **Confirma**, e a contradição 28,5 h × 48 h reforça o polling |
| Lifecycle `reenviar` com ref n+1 | **Confirma:** legal. A Focus aceitaria até o mesmo ref |

## Só a homologação (D5) resolve

1. `ref` com `:` (ou `-`/`=`) é aceito? Qual o tamanho máximo?
2. Numeração: o `numero_dps` enviado prevalece sobre o `proximo_numero_nfsen`? O que acontece com número repetido?
3. Qual `cMotivo` do e101101 a Focus grava no cancelamento? O que é o "código 4"?
4. `caminho_xml_nota_fiscal`: em qual host, e precisa de Basic Auth?
5. O corpo do webhook `nfsen` traz o `ref`? Um gatilho sem `cnpj` cobre todas as empresas?
6. Os códigos do ADN (E0xxx, incl. E0822) chegam em `erros[].codigo`?
7. Semântica de `negado`, e se ele aceita reenvio com o mesmo `ref`.
8. A homologação da Focus bate no ADN de produção restrita? (O indício forte é que sim.)
9. Comportamento após o 429 (Retry-After / duração do bloqueio) e timeouts HTTP.
10. Formato numérico aceito em `valor_servico` (número JSON × string decimal).
11. Frequência de chegada das recebidas (NFS-e e NF-e).
