# TRANSCRIÇÃO — NFS-e nacional: API da Sefin Nacional / ADN e ordem dos elementos do XSD 1.01 (2026-10-13)

> Item 2 do PR-0 do [`BE-INCR-DFE-ADN-EMISSOR-brief.md`](../BE-INCR-DFE-ADN-EMISSOR-brief.md). Execução autorizada pelo
> dono no chat em 2026-10-13 (*"executa o PR-0 do BRIEF do ADN"*); download do XSD autorizado no chat na mesma data.
> As chaves abaixo são as que testes e código podem citar como fato. O binário não é commitado (`LEIA-ME.md`).

## 1. Fontes e integridade

| Chave MANIFEST | Arquivo | sha256 conferido | Data |
|---|---|---|---|
| `nfse-manual-emissor` | Manual dos Contribuintes — API do Emissor Público | `ac2f36e34ff5…` (conferido em 10/10, BRIEF §1) | 10/10/2026 |
| `nfse-manual-adn` | Manual dos Contribuintes — APIs do ADN | `9ffc97d8b1be…` (conferido em 10/10, BRIEF §1) | 10/10/2026 |
| `nfse-xsd` | `nfse-esquemas_xsd-v1-01-20260209.zip` (65.640 B) | `e7935cbd9470527c6cc32984c1b2263e614183bf0139ce2733eaaed2de9a8072` — igual ao MANIFEST | 13/10/2026 |
| (dentro do zip) | `Schemas/1.01/tiposComplexos_v1.01.xsd` | `e8e09d525574cc224ca6d1f8d8eb0366043ab2a3aa8d0d234058e6244d60e371` | 13/10/2026 |
| (dentro do zip) | `Schemas/1.01/tiposEventos_v1.01.xsd` | `1b32bea21089dc232d78b62d805e9c07382f440d4e0ea2cb3fb6b82ebde68c11` | 13/10/2026 |

Os dois manuais já estavam no MANIFEST (linhas `nfse-manual-emissor` e `nfse-manual-adn`); nenhuma entrada nova foi
necessária.

## 2. Chaves citáveis (grau V)

| Chave | Regra | Fonte | Grau |
|---|---|---|---|
| `[API-NFSE-POST]` | `POST /nfse`: "Geração **síncrona**"; a API valida a DPS e devolve "a mensagem de erro com o motivo da rejeição" **ou** "o arquivo XML da NFS-e gerada com a DPS" | Manual dos Contribuintes, API do Emissor Público, §1.3.2 a. <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf> (sha256 `ac2f36e34ff5…` = MANIFEST `nfse-manual-emissor`; o histórico interno diz "1.0, 17/03/2025") | V |
| `[API-NFSE-SUBST]` | DPS com chave de NFS-e a substituir ⇒ a API gera "Evento de Cancelamento de NFS-e por Substituição" e a substituta | idem, §1.3.2 a | V |
| `[API-NFSE-GET]` | `GET /nfse/{chaveAcesso}`: consulta a NFS-e pela chave | idem, §1.3.2 b | V |
| `[API-DPS-GET]` | `GET /dps/{id}` devolve a chave da NFS-e a partir do Id da DPS (Cód. Mun 7 + tpInsc 1 + inscrição 14 + série 5 + nDPS 15), só se o certificado da conexão for de um ator da nota (prestador, tomador, intermediário) | idem, §1.4.1–1.4.2 a | V |
| `[API-DPS-HEAD]` | `HEAD /dps/{id}`: informa se a NFS-e foi gerada, sem a chave, para "qualquer usuário desde que realize a consulta com um certificado digital válido" | idem, §1.4.2 b | V |
| `[API-EVT-POST]` | `POST /nfse/{chaveAcesso}/eventos`: pedido de registro de evento, **síncrono**; mensagens em JSON, o DF-e em XML "contendo a assinatura digital do emissor do evento" | idem, §1.5.2 a | V |
| `[API-EVT-GET]` | `GET /nfse/{chave}/eventos`, `…/eventos/{tipoEvento}`, `…/{tipoEvento}/{numSeqEvento}` | idem, §1.5.2 b–d | V |
| `[API-PARAM]` | `GET /parametros_municipais/{codigoMunicipio}/convenio`, `/{codigoMunicipio}/{codigoServico}`, `/{codigoMunicipio}/{CPF/CNPJ}` | idem, §1.2.1 | V |
| `[ADN-DIST]` | `GET /DFe/{NSU}` e `GET /NFSe/{ChaveAcesso}/Eventos`; consulta pode usar "certificado cujo CNPJ tenha o mesmo CNPJ Raiz do contribuinte" (só a **distribuição**) | Manual dos Contribuintes, APIs do ADN, v1.0 12/02/2026, §1.1. <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf> (sha256 `9ffc97d8b1be…` = MANIFEST `nfse-manual-adn`) | V |
| `[HOSTS]` | Produção restrita: Sefin Nacional `https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index`; ADN contribuintes `https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html`. Produção: `https://sefin.nfse.gov.br/SefinNacional/docs/index`; `https://adn.nfse.gov.br/contribuintes/docs/index.html`. Página "Atualizado em 20/08/2026" | <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao> | V (hosts das **docs**). O caminho base da API em cada ambiente (`/API/SefinNacional` × `/SefinNacional`) é **I** |
| `[SWAGGER-403]` | `curl` sem certificado de cliente nos dois índices da Sefin de produção restrita ⇒ HTTP **403** | medição desta sessão, 10/10/2026 | V (o 403). Que a causa seja a falta de mTLS é **I** |
| `[XSD-DPS]` | `DPS` (ns `http://www.sped.fazenda.gov.br/nfse`) = `infDPS` + `ds:Signature` **0-1**; `@versao` obrigatório | `DPS_v1.01.xsd`, `tiposComplexos_v1.01.xsd:737-742` do zip <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/nfse-esquemas_xsd-v1-01-20260209.zip> (sha256 `e7935cbd9470…` = MANIFEST `nfse-xsd`) | V |
| `[XSD-IDDPS]` | `TSIdDPS` = `DPS[0-9]{42}`: "DPS" + Cód.Mun (7) + Tipo de Inscrição Federal (1) + Inscrição (14) + Série (5) + Núm. DPS (15) | `tiposSimples_v1.01.xsd:44-56` | V |
| `[XSD-NDPS]` | `TSNumDPS` = `[1-9]{1}[0-9]{0,14}` (sem zero à esquerda no elemento `nDPS`); `TSSerieDPS` = `^0{0,4}\d{1,5}$` | `tiposSimples_v1.01.xsd:158-161,1310-1318` | V |
| `[XSD-TPAMB]` | `TSTipoAmbiente`: 1 = Produção; 2 = Homologação | `tiposSimples_v1.01.xsd:57-70` | V |
| `[XSD-DSIG]` | o `xmldsig-core-schema.xsd` do pacote é o **genérico** do W3C: `Algorithm` é `anyURI` sem enumeração. O XSD **não fixa** algoritmo de assinatura, digest nem c14n | `xmldsig-core-schema.xsd:69-132` | V |
| `[XSD-PEDREG]` | `pedRegEvento` = `infPedReg` + `ds:Signature` 0-1; `TSIdPedRegEvt` = `PRE[0-9]{56}`. A documentação diz "PRE + chave + tipo do evento + nPedRegEvento", mas o padrão tem 56 dígitos = chave (50) + tipo (6). O XSD vence | `pedRegEvento_v1.01.xsd`; `tiposEventos_v1.01.xsd:69-75`; `tiposSimples_v1.01.xsd:1508-1518` | V (a divergência) |
| `[RN-DPS-SIG]` | E0714–E0718: assinatura da DPS válida, "certificado do emitente da DPS", obrigatória só via Web Service | [`TRANSCRICAO-NFSe-…-2026-09-27.md`](fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md) §6 (Anexo I, aba RN, [645]–[649]) | V |
| `[RN-E0010]` | série 00001–49999 = "emissão com aplicativo próprio" | idem §5 | V |
| `[NFSE-ORIGEM]` | `ambGer` 2 = Sefin Nacional; `procEmi` 1 = "aplicativo do contribuinte (API)" | idem §2 ([15], [17]) | V |

## 3. Ordem dos elementos — `TCInfDPS` (`tiposComplexos_v1.01.xsd:744-847`, `xs:sequence`)

Atributo obrigatório: `Id` (`TSIdDPS`, `DPS[0-9]{42}`).

| # | Elemento | Ocorrência | Linha |
|---|---|---|---|
| 1 | `tpAmb` | 1 | 746 |
| 2 | `dhEmi` | 1 | 751 |
| 3 | `verAplic` | 1 | 756 |
| 4 | `serie` | 1 | 761 |
| 5 | `nDPS` | 1 | 766 |
| 6 | `dCompet` | 1 | 771 |
| 7 | `tpEmit` | 1 | 776 |
| 8 | `cMotivoEmisTI` | 0-1 | 781 |
| 9 | `chNFSeRej` | 0-1 | 791 |
| 10 | `cLocEmi` | 1 | 798 |
| 11 | `subst` | 0-1 | 806 |
| 12 | `prest` | 1 | 811 |
| 13 | `toma` | 0-1 | 816 |
| 14 | `interm` | 0-1 | 821 |
| 15 | `serv` | 1 | 826 |
| 16 | `valores` | 1 | 831 |
| 17 | `IBSCBS` | 0-1 | 838 |

## 4. Ordem dos elementos — `TCInfPedReg` (`tiposEventos_v1.01.xsd:78-215`, `xs:sequence`)

Atributo obrigatório: `Id` (`TSIdPedRegEvt`, `PRE[0-9]{56}`). **Não há `nPedRegEvento` no 1.01** — confirma a
divergência `[XSD-PEDREG]` (o padrão tem 56 dígitos = chave 50 + tipo 6).

| # | Elemento | Ocorrência | Linha |
|---|---|---|---|
| 1 | `tpAmb` | 1 | 80 |
| 2 | `verAplic` | 1 | 89 |
| 3 | `dhEvento` | 1 | 94 |
| 4 | escolha: `CNPJAutor` \| `CPFAutor` | 1 | 101–123 |
| 5 | `chNFSe` | 1 | 124 |
| 6 | escolha de um evento: `e101101`, `e105102`, `e101103`, `e105104`, `e105105`, `e202201`, `e203202`, `e204203`, `e205204`, `e202205`, `e203206`, `e204207`, `e205208`, `e305101`, `e305102`, `e305103` | 1 | 129–212 |

## 5. Grau I — a confirmar pelo Swagger (NÃO citar em teste como fato)

| Chave | Regra | Fonte | Grau |
|---|---|---|---|
| `[ENVELOPE-JSON]` | corpo `{"dpsXmlGZipB64": "<DPS gzip+base64>"}`; resposta de erro com `tipoAmbiente`, `versaoAplicativo`, `idDPS`, `erros[{Codigo, Descricao}]`; mTLS com A1 e-CNPJ do prestador; `GET /dps/{id}` não gerada ⇒ 404 `E2404` | relato de desenvolvedor, fórum ACBr: <https://www.projetoacbr.com.br/forum/topic/92867-nfs-e-nacional-sefin-produ%C3%A7%C3%A3o-restrita-%E2%80%94-e999-mesmo-com-xmldsig-ok-e-dps-equivalente-ao-emissor-web/> | **I**. Fonte secundária, sem resposta oficial. Só o Swagger com mTLS (D5) promove |

## 6. Achado da pesquisa legal de 12/10 (contexto, não chave)

A FAQ oficial NFS-e v1.1 (22/09/2026) item 17.7 exige o certificado do próprio prestador na assinatura **e** no mTLS
(dossiê `pesquisas-legais/nfse-adn-certificado-numeracao/relatorio.md`). Sustenta o F-ADN-11 (a) e a emenda §12 do
ADR-DFE.
