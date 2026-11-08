# Transcrição — Web Services da NF-e/NFC-e (MOC 7.0 Visão Geral) — PR-7 do X10a

> Insumo do PR-7 (transporte SEFAZ) do X10a. Transcreve **só o que está escrito** no MOC 7.0 — Visão Geral sobre o
> padrão de comunicação, os leiautes de entrada/retorno dos Web Services de autorização, consulta de protocolo,
> inutilização, registro de evento (parte geral + cancelamento 110111), status do serviço, a distribuição
> (`nfeProc` / `procEventoNFe`) e os códigos de status que o VG cita. Onde o VG não traz o que foi pedido, a seção diz
> **"não achado no VG"**. Leiaute da NF-e em si: [`TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md`](TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md);
> assinatura: [`TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`](TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md).

## Fontes (sha256 conferido nesta sessão)

| Chave | Documento | sha256 | Como foi lido |
|---|---|---|---|
| `[VG]` | MOC 7.0 — Visão Geral, NF-e e NFC-e, "Versão 7.00 - Novembro de 2020" (150 pp., PDF 1.7, 4.304.647 bytes), <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=LrBx7WT9PuA=> | `f664dcf94b77cabb32311620d85a7eb02cdf86adb2d4632ce178af2572dd2ad1` (= MANIFEST `moc70-visao-geral`) | baixado 2026-10-29 com `curl -L -c cj -b cj -A "Mozilla/5.0"` (cookie jar passa o laço `AspxAutoDetectCookieSupport`); `pdftotext -table` (xpdf 4.06) para as tabelas, conferido com `pdftotext -layout` e `-raw`. PDF não commitado |

**Como foi lido.** A página citada é a do rodapé "Página N / 150" (coincide com a página do PDF). O texto do PDF sai em
Latin-1; o `-table` cola palavras nas células de descrição ("recebeuo Lote"): os espaços foram restaurados pelo
`-layout` da mesma página. Fora isso, **grafia, maiúsculas, erros e remissões são do original** (marcados *sic* quando
chamam atenção). Na coluna "Descrição/Observação" o texto é literal; quebras de linha viraram espaço.

Colunas: `ID · campo · Ele · Pai · Tipo · Ocor. · Tam. · descrição/observação (literal)`. Notação do VG (Tabela 4-4,
p. 56): Ele `A`=atributo ("Versão"), `ID`=identificador da TAG a ser assinada, `G`=grupo, `CG`=grupo exclusivo,
`E`=elemento, `CE`=elemento exclusivo; Tipo `C`, `N`, `D`/`DH` (data-hora UTC `AAAA-MM-DDThh:mm:ssTZD`); Tam. `1-2v2` =
1 a 2 inteiros + 2 decimais (Tabela 4-5, pp. 56–57).

---

## `[WS-SOAP]` Padrão de comunicação (`[VG]` §4.2.2–4.2.3 pp. 52–53; §4.2.6 pp. 55–56; §4.3 pp. 57–58; §4.4 pp. 64–65; §4.5.3 p. 67)

**§4.2.2 Padrão de Comunicação (p. 52), literal:**

> A comunicação será baseada em Web Services disponibilizados pelo Sistema de Recepção de Nota Fiscal eletrônica.
>
> O meio físico de comunicação utilizado será a Internet, com o uso do protocolo TLS 1.2 ou superior, com autenticação
> mútua, que além de garantir um duto de comunicação seguro na Internet, permite a identificação do servidor e do
> cliente através de certificados digitais, eliminando a necessidade de identificação do usuário através de nome ou
> código de usuário e senha.
>
> O modelo de comunicação segue o padrão de Web Services definido pelo WS-I Basic Profile.
>
> A troca de mensagens entre os Web Services do ambiente do Sistema de Recepção da NF-e e o aplicativo da empresa será
> realizada no padrão SOAP versão 1.2, com troca de mensagens XML no padrão Style/Enconding [*sic*]: Document/Literal.
>
> A chamada de diferentes Web Services é realizada com o envio de uma mensagem XML através do parâmetro nfeDadosMsg.
>
> A versão do leiaute da mensagem XML contida no parâmetro nfeDadosMsg será informada no elemento versaoDados do tipo
> string localizado no elemento nfeCabecMsg do SOAP Header.

**Exemplo de envelope (p. 52)** — o VG traz o exemplo do serviço **antigo** `NfeRecepcao2`, não de um serviço 4.00.
No PDF o trecho `xml</nfeDadosMsg>` e o `<?xml …?>` do retorno estão deslocados pela diagramação; abaixo, na ordem
lógica, com os namespaces e tags exatamente como impressos:

```xml
<!-- "Exemplo de uma mensagem requisição padrão SOAP:" -->
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/sce/wsdl/NfeRecepcao2">   <!-- "sce" sic -->
      <versaoDados>string</versaoDados>
      <cUF>string</cUF>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRecepcao2">xml</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>

<!-- "Exemplo de uma mensagem de retorno padrão SOAP:" -->
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRecepcao2">
      <versaoDados>string</versaoDados>
      <cUF>string</cUF>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeRecepcaoLote2Result xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRecepcao2">
      xml</nfeRecepcaoResult>   <!-- fechamento diverge da abertura no original -->
  </soap12:Body>
</soap12:Envelope>
```

**§4.4.1 (p. 64), literal — o cabeçalho SOAP foi eliminado na 4.0:**

> Na versão 4.0 do leiaute da NF-e foi eliminado o uso de variáveis no SOAP Header (eliminada a "Área de Cabeçalho")
> na requisição enviada para todos os Web Services previstos no Sistema NFE. Portanto, foram eliminadas também as
> regras de validação relacionadas com o controle da chamada ao Web Service que usam estas variáveis do SOAP Header.
> Exemplo do SOAP Header que não será mais necessário:

```xml
<soap12:Header>
  <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/nfeAutorizacao">
    <versaoDados>string</versaoDados>
    <cUF>string</cUF>
  </nfeCabecMsg>
</soap12:Header>
```

> A informação armazenada na área de dados é um documento XML que deve atender o leiaute definido na documentação do
> Web Service acessado:

```xml
<soap12:Body>
  <nfeAutorizacaoResponse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/nfeAutorizacao">
    <nfeRetornoMsg>xml</nfeRetornoMsg>
  </nfeAutorizacaoResponse>
```

(Contradição interna do VG: §4.2.2 p. 52 e §4.4.2 p. 65 — "devendo ainda informar a versão do leiaute da estrutura XML
da mensagem no campo versaoDados da área de cabeçalho da mensagem" — ainda mandam usar o `nfeCabecMsg`; §4.4.1 p. 64
diz que a 4.0 o eliminou.)

**Serviços, Web Service e método (Tabela 4-11 p. 67; "Método:" de cada §5.x; Tabela 4-6 p. 57):**

| Serviço (Tab. 4-11) | Web Service (Tab. 4-11) | Método (§5.x) | Processo | Página |
|---|---|---|---|---|
| Autorização de Lote de NF-e — "Recepção de mensagens de lote de NF-e" | NFeAutorizacao | `nfeAutorizacaoLote` (compactado: `NfeAutorizacaoLoteZip`, parâmetro `nfeDadosMsgZip`) | assíncrono/síncrono | 71–72 |
| Consulta Recibo do Lote | NFeRetAutorizacao | `nfeRetAutorizacao` | assíncrono | 75 |
| Inutilização de numeração NF-e — "Solicitações de inutilização de numeração" | NFeInutilizacao | `nfeInutilizacaoNF` | síncrono | 78 |
| Consulta Protocolo da NF-e — "Solicitações de consulta da situação atual da NF-e" | NFeConsultaProtocolo | `nfeConsulta` | síncrono | 81 |
| Consulta Status de Serviço da NF-e | NFeStatusServico | `nfeStatusServico` | síncrono | 84 |
| Registro de Evento — "Recepção de mensagem de Evento da NF-e" | NFeRecepcaoEvento | `nfeRecepcaoEvento` | síncrono | 67, 99 |

- **Namespace WSDL `http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4` (e `…4` dos demais): não achado no VG.**
  Os únicos namespaces `…/nfe/wsdl/…` impressos são `NfeRecepcao2` (p. 52) e `nfeAutorizacao` (p. 64).
- **Nomes de operação `NFeAutorizacao4`, `NFeConsultaProtocolo4`, `NFeInutilizacao4`, `NFeRecepcaoEvento4`,
  `NFeStatusServico4`: não achados no VG** (o VG dá os métodos da coluna acima).
- **Elemento de retorno `nfeResultMsg`: não achado no VG.** O VG mostra `nfeRetornoMsg` dentro de
  `nfeAutorizacaoResponse` (p. 64) e `nfeRecepcaoLote2Result` no exemplo antigo (p. 52).
- Endereço/WSDL (p. 58 "d)" e p. 62), literal: "As URL dos Web Services encontram-se disponíveis no Portal Nacional da
  NF-e; mediante acesso à URL pode ser obtido o WSDL (Web Services Description Language) de cada Web Service"; "digite o
  endereço desejado seguido do literal `?WSDL'". Relação: `http://hom.nfe.fazenda.gov.br/portal/webServices.aspx?tipoConteudo=Wak0FwB7dKs=`
  (homologação) e `https://www.nfe.fazenda.gov.br/portal/webServices.aspx?tipoConteudo=Wak0FwB7dKs=` (produção) (p. 62).

**Certificado de transmissão — §4.2.3 (pp. 52–53), literal:**

> O certificado digital utilizado no Sistema Nota Fiscal eletrônica será emitido por Autoridade Certificadora
> credenciada pela Infraestrutura de Chaves Públicas Brasileira - ICP-Brasil, tipo A1 ou A3, devendo conter o CNPJ da
> pessoa jurídica titular do certificado digital no campo OtherName OID =2.16.76.1.3.3 ou o CPF da pessoa física
> titular do certificado digital no campo OtherName OID=2.16.76.1.3.1.
>
> Os certificados digitais serão exigidos em 2 (dois) momentos distintos:
>
> · Assinatura de Mensagens: O certificado digital utilizado para essa função deverá conter o CNPJ/CPF de um dos
> estabelecimentos da empresa emissora da NF-e . […]
>
> · Transmissão (durante a transmissão das mensagens entre o servidor do contribuinte e o Portal da Secretaria de
> Fazenda Estadual): O certificado digital utilizado para identificação do aplicativo do contribuinte deverá conter o
> CNPJ do responsável pela transmissão das mensagens, que não será necessariamente o CNPJ/CPF da empresa emissora da
> NF-e, devendo ter a extensão Extended Key Usage com permissão de "Autenticação Cliente".

Complementos literais: Tabela 4-3 (p. 55) — "Meio físico de comunicação: Internet"; "Protocolo Internet: TLS versão
1.2, com autenticação mútua através de certificados digitais."; "Padrão de troca de mensagens: SOAP versão 1.2."; p. 56
"Padrão da mensagem: XML no padrão Style/Encoding: Document/Literal."; "Para transmissão, utilizar o certificado digital
do responsável pela transmissão." §4.3 "e)" (p. 58): "O processo de utilização dos Web Services sempre é iniciado pelo
contribuinte enviando uma mensagem nos padrões XML e SOAP, através do protocolo TLS com autenticação mútua". §4.3.3
(p. 60): "CNPJ do transmissor: CNPJ da empresa que enviou a mensagem que não necessita estar vinculado ao CNPJ do
estabelecimento emissor da NF-e. Somente o transmissor da mensagem terá acesso ao resultado do processamento das
mensagens de solicitação de serviços". e-CPF (§4.2.4.1, p. 55): "o "e-CPF" poderá ser usado na transmissão dos dados
e/ou na assinatura dos documentos."

**Número do protocolo — §4.3.5 (p. 61), literal:** "O número do protocolo (nProt) é gerado pelo Portal da Secretaria
da Fazenda Estadual ou da Secretaria da Receita Federal do Brasil para identificar univocamente as transações
realizadas de autorização de uso, denegação de uso, cancelamento de NF-e e inutilização de numeração de NF-e." Tabela
4-8: 1 posição Tipo Autorizador (1=Secretaria de Fazenda Estadual; 2=Receita Federal; 3=SEFAZ Virtual RS; 4=SEFAZ
Virtual RFB) + 2 código da UF (Tabela 8-1) + 2 ano + 10 sequencial no ano. Recibo do lote (§4.3.4, pp. 60–61): 2 UF +
1 Tipo de Autorizador (0 ou 1=SEFAZ normal, 2=Contingência SCAN-RFB, 3=SEFAZ VIRTUAL-RS, 4=SEFAZ VIRTUAL-RFB) + 12
sequenciais.

---

## Versões dos schemas — `[VG]` Tabela 4-12 (pp. 67–68) e Tabela 4-14 (pp. 69–70)

| WS | Seção | Schema | PL | vers | Observação (literal) |
|---|---|---|---|---|---|
| NFeAutorizacao | 5.1 | enviNFe | A | 4.00 | Mensagem de envio de lote de NF-e |
| | | retEnviNFe | A | 4.00 | Mensagem de retorno do envio de lote de NF-e |
| NFeRetAutorizacao | 5.2 | consReciNFe | A | 4.00 | Mensagem de consulta processamento do lote de NF-e transmitida |
| | | retConsReciNFe | A | 4.00 | Mensagem de retorno da consulta de processamento do lote de NF-e |
| NFeInutilizacao | 5.3 | inutNFe | A | 4.00 | Mensagem de solicitação de inutilização de numeração de NF-e |
| | | retInutNFe | A | 4.00 | Mensagem de retorno da solicitação de inutilização de numeração de NF-e |
| NFeConsultaProtocolo | 5.4 | consSitNFe | A | 4.00 | Mensagem de consulta da situação atual da NF-e |
| | | retConsSitNFe | A | 4.00 | Mensagem de retorno da consulta da situação atual da NF-e |
| NFeStatusServico | 5.5 | consStatServ | A | 4.00 | Mensagem da consulta do status do serviço de autorização de NF-e |
| | | retConsStatServ | A | 4.00 | Mensagem de retorno da consulta do status do serviço de autorização de NF-e |
| NFeRecepcaoEvento | 5.8.6 | procEventoNFe | D | 1.00 | Estrutura XML para disponibilização de evento pelo emissor para o destinatário |
| | 5.9 | envEventoCancNFe | E | 1.00 | Mensagem de solicitação de registro de evento de cancelamento |
| | | retEnvEventoCancNFe | E | 1.00 | Mensagem de retorno da solicitação de registro de evento de cancelamento |

Tabela 4-13 (p. 68): PL A = `PL_009_V4_00_NT_2019_001_v1.20a` (NT 2019.001, NT 2020.002; At 20/08/2019, Hom 26/08/2019,
Prod 02/09/2019); PL E = `Evento_Canc_PL_v1.01` (NT 2018.004; 21/12/2018, 25/02/2019, 29/04/2019); PL D =
`Evento_Generico_PL_v1.01`. Tabela 4-14 (p. 69): `procNFe` 4.00 "Leiaute de compartilhamento da NF-e"; `procInutNFe`
4.00; `e110111` 1.00 "Evento Cancelamento"; `procEventoCanc` 1.00; `leiauteEvento` 1.00 "Tipos básicos de evento
genérico".

Os **nomes de arquivo** citados no cap. 5: `enviNFe_v4.00.xsd` (p. 71), `retEnviNFe_v4.00.xsd` (p. 72),
`inutNFe_v4.00.xsd` (p. 78), `retInutNFe_v4.00.xsd` (p. 79), `consSitNFe_4.00.xsd` [*sem "v"*] (p. 82),
`retConsSitNFe_v4.00.xsd` (p. 82), `consStatServ_v4.00.xsd` (p. 85), `retConsStatServ_4.00.xsd` [*sem "v"*] (p. 85),
`envEvento_v1.00.xsd` (p. 100), `retEnvEvento_v1.00.xsd` (p. 101), `procEventoNFe_v1.00.xsd` (p. 104),
`envEventoCancNFe_v1.00.xsd` (tpEvento=110111) (p. 105), `retEnvEventoCancNFe_v1.00.xsd` (p. 106),
`procNFe_v3.10.xsd` (p. 125 — ver `[WS-NFEPROC]`).

**Valor literal do atributo `versao` ("4.00"/"1.00") dentro do XML: não achado no VG** como texto de campo; o VG só dá
o tamanho (`1-2v2` / `2v2`) e a versão do schema nas tabelas acima.

---

## `[WS-ENVINFE]` `enviNFe` — `[VG]` §5.1.1, Tabela 5-1 (pp. 71–72)

Função (p. 71): "serviço destinado à recepção de mensagens de lote de NF-e." Processo: assíncrono/síncrono. Método:
nfeAutorizacaoLote. Schema XML: enviNFe_v4.00.xsd.

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| AP01 | enviNFe | Raiz | - | - | - | - | TAG raiz |
| AP02 | versao | A | AP01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| AP03 | idLote | E | AP01 | N | 1-1 | 1-15 | Identificador de controle do envio do lote. Número sequencial auto incremental, de controle correspondente ao identificador único do lote enviado. A responsabilidade de gerar e controlar esse número é exclusiva do contribuinte. |
| AP03a | indSinc | E | AP01 | N | 1-1 | 1 | 0=Não. 1=Empresa solicita processamento síncrono do Lote de NF-e (sem a geração de Recibo para consulta futura); Nota: O processamento síncrono do Lote corresponde a entrega da resposta do processamento das NF-e do Lote, sem a geração de um Recibo de Lote para consulta futura. A resposta de forma síncrona pela SEFAZ Autorizadora só ocorrerá se: · a empresa solicitar e constar unicamente uma NF-e no Lote; · a SEFAZ Autorizadora implementar o processamento síncrono para a resposta do Lote de NF-e. |
| AP04 | NFe | G | AP01 | xml | 1-50 | - | Conjunto de NF-e transmitidas (máximo de 50 NF-e), seguindo definição do documento MOC - Anexo I - Leiaute e Regras de Validação da NF-e e da NFC-e. |

Compactação (p. 72), literal: "Nome do Método: NfeAutorizacaoLoteZip; O novo método tem unicamente o parâmetro
"nfeDadosMsgZip", contendo a mensagem "enviNFe" compactada no padrão GZip, onde o resultado da compactação é convertido
para Base64. […] Em caso de falha no processo de descompactação será retornado o erro "416 - Rejeição: Falha na
descompactação da área de dados"."

Regras genéricas (Tabela 5-3, p. 74): grupos A Validação do Certificado de Transmissão (protocolo TLS); B Validação
Inicial da Mensagem no Web Service; D Validação da Área de Dados; E Validação do Certificado Digital de Assinatura;
F Validação da Assinatura Digital — "As regras de validação específicas deste WS estão descritas na Seção 4.1 do
documento Anexo I".

## `[WS-RETENVINFE]` `retEnviNFe` — `[VG]` §5.1.2, Tabela 5-2 (pp. 72–73); §5.1.4 (p. 73)

Schema XML: retEnviNFe_v4.00.xsd.

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| AR01 | retEnviNFe | Raiz | - | - | - | - | TAG raiz da Resposta |
| AR02 | versao | A | AR01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| AR03 | tpAmb | E | AR01 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2= Homologação |
| AR04 | verAplic | E | AR01 | C | 1-1 | 1-20 | Versão do Aplicativo que recebeu o Lote. A versão deve ser iniciada com a sigla da UF nos casos de WS próprio ou a sigla SVAN ou SVRS nos demais casos. |
| AR05 | cStat | E | AR01 | N | 1-1 | 3 | Código do status da resposta (conforme item 4.4.1 do documento MOC - Anexo I - Leiaute NF-e/NFC-e) |
| AR06 | xMotivo | E | AR01 | C | 1-1 | 1-255 | Descrição literal do status da resposta |
| AR06a | cUF | E | AR01 | N | 1-1 | 2 | Código da UF que atendeu a solicitação. |
| AR06b | dhRecbto | E | AR01 | D | 1-1 | | Preenchido com a data e hora do processamento (informado também no caso de rejeição). Formato: "AAAA-MM-DDThh:mm:ssTZD" (UTC - Universal Coordinated Time). |
| AR07 | infRec | CG | AR01 | - | 0-1 | - | Dados do Recibo do Lote (Só é gerado se o Lote for aceito e o processamento for assíncrono) |
| AR08 | nRec | E | AR07 | N | 1-1 | 15 | Número do Recibo gerado pelo Portal da Secretaria de Fazenda Estadual, conforme descrição do item 4.3.4 |
| AR10 | tMed | E | AR07 | N | 1-1 | Nv1-4 | Tempo médio de resposta do serviço (em segundos) dos últimos 5 minutos, conforme descrição do item 4.3.6 Nota: Caso o tempo médio de resposta fique abaixo de 1 (um) segundo, o tempo será informado como 1 segundo. Arredondar as frações de segundos para cima. |
| AR11 | protNFe | CG | AR01 | - | 0-1 | - | Dados do Protocolo de recebimento da NF-e gerado no caso do processamento síncrono do Lote de NF-e, conforme descrito no item 5.2.2. |

(Não há AR09 no original. `infRec` e `protNFe` são `CG` — grupo exclusivo.)

§5.1.4.2 Processamento Assíncrono (p. 73), literal: "Após a gravação da mensagem na fila de entrada será retornada uma
mensagem de confirmação de recebimento para o transmissor, com as seguintes informações: · a identificação do ambiente;
· a versão do aplicativo; · o código 103 e o literal "Lote recebido com Sucesso"; · o código da UF que atendeu a
solicitação; · o Número do Recibo de Lote de que trata o item 4.3.4, com data, hora local de recebimento da mensagem;
· Tempo Médio de Resposta do serviço de processamento dos lotes nos últimos 5 minutos, tratado no item 4.3.6."

§5.1.4.3 Processamento Síncrono (p. 73), literal: "No caso de processamento síncrono do Lote de NF-e, as validações da
NF-e serão feitas na sequência, sem a geração de um Número de Recibo."

§5.1.6 (pp. 74–75), literal: "Para cada NF-e autorizada ou denegada será atribuído o Número de Protocolo da Secretaria de
Fazenda, seguindo o disposto no item 4.3.5." Tabela 5-4 (Posíveis [*sic*] Resultados): Denegação de uso — "Gravar";
Rejeição com/sem avisos — "Corrigir NF-e", "Não gravar"; Autorização de uso com avisos — "A operação está autorizada, a
NF-e não poderá ser corrigida", "Gravar"; Autorização de uso sem avisos — "Gravar".

## `[WS-PROTNFE]` `protNFe` / `infProt` — `[VG]` §5.2.2 (pp. 76–77), "(Atualizado NT 2018.005)"

Contexto (p. 76): "* Para cada Protocolo de uma NF-e processada teremos o seguinte leiaute". É o elemento BR07
(`protNFe*`, xml, 0-50) do `retConsReciNFe` — "Estas informações são retornadas apenas para o código do status do lote
= 104 (Lote processado)" — e o AR11 do `retEnviNFe` síncrono.

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| PR01 | protNFe | Raiz | - | - | - | - | TAG raiz do Protocolo de recebimento da NFe |
| PR02 | versao | A | PR01 | N | 1-1 | 2v2 | Versão do leiaute das informações de Protocolo. |
| PR03 | infProt | G | PR01 | - | 1-1 | - | Informações do Protocolo de resposta. TAG a ser assinada |
| PR04 | Id | ID | PR03 | C | 0-1 | - | Identificador da TAG a ser assinada, somente precisa ser informado se a UF assinar a resposta. Em caso de assinatura da resposta pela SEFAZ preencher o campo com o Número do Protocolo, precedido com o literal "ID" |
| PR05 | tpAmb | E | PR03 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| PR06 | verAplic | E | PR03 | C | 1-1 | 1-20 | Versão do Aplicativo que processou o Lote. A versão deve ser iniciada com a sigla da UF nos casos de WS próprio ou a sigla SVAN ou SVRS nos demais casos. |
| PR07 | chNFe | E | PR03 | N | 1-1 | 44 | Chave de Acesso da NF-e |
| PR08 | dhRecbto | E | PR03 | D | 1-1 | - | Preenchido com a data e hora do processamento (informado também no caso de rejeição). Formato: "AAAA-MM-DDThh:mm:ssTZD" (UTC - Universal Coordinated Time). |
| PR09 | nProt | E | PR03 | N | 0-1 | 15 | Número do Protocolo da NF-e, conforme item 4.3.5 |
| PR10 | digVal | E | PR03 | C | 0-1 | 28 | DigestValue da NF-e processada Utilizado para conferir a integridade da NFe original. |
| PR11 | cStat | E | PR03 | N | 1-1 | 3 | Código do status da resposta (conforme item 4.4.1 do documento MOC - Anexo I - Leiaute NF-e/NFC-e) |
| PR12 | xMotivo | E | PR03 | C | 1-1 | 1-255 | Descrição literal do status da resposta para a NF-e. |
| PR13 | Sequência XML | G | PR03 | | 0-1 | | Grupo de informações para envio de mensagens do interesse da SEFAZ (Criado na NT 2018.005) |
| PR14 | cMsg | E | PR13 | N | 0-1 | 1-4 | Código da Mensagem. (Criado na NT 2018.005) |
| PR15 | xMsg | E | PR13 | C | 1-1 | 1-200 | Mensagem da SEFAZ para o emissor. (Criado na NT 2018.005) |
| PR90 | Signature | G | PR01 | xml | 0-1 | - | Assinatura XML do grupo identificado pelo atributo "Id" A decisão de assinar a mensagem fica a critério da UF interessada. |

§5.2.3 (p. 77), literal: "O aplicativo do Contribuinte deve ser construído de forma a aguardar um tempo mínimo de 15
segundos entre o envio do Lote de NF-e para processamento e a consulta do resultado deste processamento, evitando a
obtenção desnecessária do status de erro 105 - "Lote em Processamento"." §5.2.5 (p. 78): "Lote processado - cStat=104,
com os resultados individuais de processamento das NF-e; · Lote em processamento - cStat=105, o aplicativo do
contribuinte deverá fazer uma nova consulta; · Lote não localizado - cStat=106, o aplicativo do contribuinte deverá
providenciar o reenvio da mensagem; · Recibo ou CNPJ do requisitante com problemas - cStat= 248 ou 223, o aplicativo
do contribuinte deverá sanar o problema;"

## `[WS-NFEPROC]` Distribuição — `nfeProc` — `[VG]` §6.3, Tabela 6-2 (p. 125)

Literal (p. 125): "Deverá ser disponibilizado para o destinatário o mesmo conteúdo da NF-e enviada para a SEFAZ,
complementada com a informação da Autorização de Uso." **Schema XML: procNFe_v3.10.xsd** [*sic* — a Tabela 4-14, p. 69,
lista `procNFe` 4.00].

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| XR01 | nfeProc | Raiz | - | - | - | - | TAG raiz |
| XR02 | versao | A | XR01 | N | 1-1 | 1-2v2 | |
| XR03 | NFe | G | XR01 | - | 1-1 | - | |
| XR04 | (dados) | - | - | - | - | - | Dados da NF-e, inclusive com os dados da assinatura |
| XR05 | protNfe [*sic, "f" minúsculo*] | G | XR01 | - | 1-1 | - | Protocolo de autorização ou denegação de uso do NF-e, conforme descrito no item 5.2.2. |
| XR06 | (dados) | - | - | - | - | - | |

Nome de arquivo sugerido (p. 125): `<999...999>-procNFe.xml`, onde `<999...999>` "corresponde a Chave de Acesso da
NF-e" e "-procNFe" "identifica o processamento do documento autorizado". Guarda (p. 124, literal): "o emitente e o
destinatário deverão manter em arquivo digital as Notas Fiscais eletrônicas pelo prazo estabelecido na legislação
tributária para a guarda dos documentos fiscais" (cláusula décima do Ajuste SINIEF 07/05). Variante B2B (Tabela 6-1,
pp. 124–125): `nfeProcB2B` (VR01) > `nfeProc` (VR02) + `NFeB2B` (VR07, 0-1).

---

## `[WS-CONSSIT]` Consulta Protocolo — `[VG]` §5.4 (pp. 81–84)

Função (p. 81): "serviço destinado ao atendimento de solicitações de consulta da situação atual da NF-e na Base de
Dados do Portal da Secretaria de Fazenda Estadual." Processo: síncrono. Método: nfeConsulta.

**Entrada — Schema XML: consSitNFe_4.00.xsd — Tabela 5-13 (p. 82)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| EP01 | consSitNFe | Raiz | - | - | - | - | TAG raiz |
| EP02 | versao | A | EP01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| EP03 | tpAmb | E | EP01 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| EP04 | xServ | E | EP01 | C | 1-1 | 9 | Serviço solicitado `CONSULTAR' |
| EP05 | chNFe | E | EP01 | N | 1-1 | 44 | Chave de Acesso da NF-e. |

**Retorno — Schema XML: retConsSitNFe_v4.00.xsd — Tabela 5-14 (p. 82)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| ER01 | retConsSitNFe | Raiz | - | - | - | - | TAG raiz da Resposta |
| ER02 | versao | A | ER01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| ER03 | tpAmb | E | ER01 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| ER04 | verAplic | E | ER01 | C | 1-1 | 1-20 | Versão do Aplicativo que processou a consulta. A versão deve ser iniciada com a sigla da UF nos casos de WS próprio ou a sigla SVAN ou SVRS nos demais casos. |
| ER05 | cStat | E | ER01 | N | 1-1 | 3 | Código do status da resposta (conforme item 4.4.1 do documento MOC - Anexo I - Leiaute NF-e/NFC-e) |
| ER06 | xMotivo | E | ER01 | C | 1-1 | 1-255 | Descrição literal do status da resposta. |
| ER07 | cUF | E | ER01 | N | 1-1 | 2 | Código da UF que atendeu a solicitação. |
| ER07a | dhRecbto | E | ER01 | D | 1-1 | | Preenchido com a data e hora do processamento. Formato: "AAAA-MM-DDThh:mm:ssTZD" (UTC - Universal Coordinated Time). |
| ER07b | chNFe | E | ER01 | N | 1-1 | 44 | Chave de Acesso da NF-e consultada. |
| ER08 | protNFe | G | ER01 | xml | 0-1 | - | Protocolo de autorização ou denegação de uso do NF-e, conforme descrito no item 5.2.2. · Informar se localizada uma NF-e com cStat = 100-uso autorizado, 150-uso autorizado fora de prazo ou 110-uso denegado. (NT 2012.003) |
| ER09 | retCancNFe | G | ER01 | xml | 0-1 | - | Protocolo de homologação de cancelamento de NF-e (vide item 4.3.2). Informar se localizada uma NF-e com cStat = 101-cancelado ou 151-cancelado fora de prazo. (NT 2012.003) |
| ER10 | procEventoNFe | G | ER01 | xml | 0-N | - | Informação do evento e respectivo Protocolo de registro de Evento |

§5.4.3 (p. 83), literal: "Na resposta do Web Service de Consulta Situação da Nota Fiscal deverão ser retornados
unicamente os Eventos de Cancelamento, Carta de Correção e EPEC […]. Ainda no processamento da requisição das
consultas deste Web Service, será limitado o período de consulta para 180 dias da data de emissão da Nota Fiscal⁶." —
nota 6: "Eventualmente a SEFAZ Autorizadora poderá manter o modelo anterior, conforme seu critério."

Regra específica J03 (p. 84): "Acesso BDNFE (Chave: CNPJ/CPF Emit, Modelo, Série, Número): · Se NF-e não existe,
acessar BD Evento EPEC […] · Verificar se EPEC não existe" → 217 "Rejeição: NF-e não consta na base de dados da
SEFAZ". J01 → 252; J02 → 226; J02a → 236; J02k → 526 "Rejeição: Consulta a uma Chave de Acesso muito antiga"; J04 → 562;
J05 → 561; J06 → 613.

§5.4.5 (p. 84), literal: "No caso de localização da NF-e retornar o cStat com os valores "100-Autorizado o Uso",
"101-Cancelamento de NF-e Homologado" ou "110-Uso Denegado"."

---

## `[WS-INUT]` Inutilização — `[VG]` §5.3 (pp. 78–81)

Função (p. 78): "serviço destinado ao atendimento de solicitações de inutilização de numeração." Processo: síncrono.
Método: nfeInutilizacaoNF. §5.3.3 (p. 80): "A mensagem de pedido de inutilização de numeração de NF-e é um documento
eletrônico e deve ser assinado digitalmente pelo emitente da NF-e."

**Entrada — Schema XML: inutNFe_v4.00.xsd — Tabela 5-9 (pp. 78–79)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| DP01 | inutNFe | Raiz | - | - | - | - | TAG raiz |
| DP02 | versao | A | DP01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| DP03 | infInut | G | DP01 | - | 1-1 | - | Dados do Pedido TAG a ser assinada |
| DP04 | Id | ID | DP03 | C | 1-1 | 43 | Identificador da TAG a ser assinada formada com Código da UF + Ano (2 posições) + CNPJ + modelo + série + número inicial e número final precedida do literal "ID" |
| DP05 | tpAmb | E | DP03 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| DP06 | xServ | E | DP03 | C | 1-1 | 10 | Serviço solicitado `INUTILIZAR' |
| DP07 | cUF | E | DP03 | N | 1-1 | 2 | Código da UF do solicitante |
| DP08 | ano | E | DP03 | N | 1-1 | 2 | Ano de inutilização da numeração |
| DP09 | CNPJ | E | DP03 | C | 1-1 | 14 | CNPJ do emitente |
| DP10 | mod | E | DP03 | N | 1-1 | 2 | Modelo do documento (55 ou 65) |
| DP11 | serie | E | DP03 | N | 1-1 | 1-3 | Série da NF-e |
| DP12 | nNFIni | E | DP03 | N | 1-1 | 1-9 | Número da NF-e inicial a ser inutilizada |
| DP13 | nNFFin | E | DP03 | N | 1-1 | 1-9 | Número da NF-e final a ser inutilizada |
| DP14 | xJust | E | DP03 | C | 1-1 | 15-255 | Informar a justificativa do pedido de inutilização |
| DP15 | Signature | G | DP01 | xml | 1-1 | - | Assinatura XML do grupo identificado pelo atributo "Id" |

**Retorno — Schema XML: retInutNFe_v4.00.xsd — Tabela 5-10 (pp. 79–80)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| DR01 | retInutNFe | Raiz | - | - | - | - | TAG raiz da Resposta |
| DR02 | versao | A | DR01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| DR03 | infInut | G | DR01 | - | 1-1 | - | Dados da resposta - TAG a ser assinada |
| DR04 | Id | ID | DR03 | C | 0-1 | 17 | Identificador da TAG a ser assinada, somente precisa ser informado se a UF assinar a resposta. Em caso de assinatura da resposta pela SEFAZ preencher o campo com o Número do Protocolo, precedido com o literal "ID". |
| DR05 | tpAmb | E | DR03 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| DR06 | verAplic | E | DR03 | C | 1-1 | 1-20 | Versão do Aplicativo que processou o pedido de inutilização. A versão deve ser iniciada com a sigla da UF nos casos de WS próprio ou a sigla SVAN ou SVRS nos demais casos. |
| DR07 | cStat | E | DR03 | N | 1-1 | 3 | Código do status da resposta (conforme item 4.4.1 do documento MOC - Anexo I - Leiaute NF-e/NFC-e) |
| DR08 | xMotivo | E | DR03 | C | 1-1 | 1-255 | Descrição literal do status da resposta. |
| DR09 | cUF | E | DR03 | N | 1-1 | 2 | Código da UF que atendeu a solicitação |
| | | | | | | | *Linha de nota da tabela:* "Os campos a seguir são obrigatórios no caso de homologação da inutilização cStat=102. Os campos de dhRecbto e nProt não serão preenchidos em caso de erro" |
| DR10 | ano | E | DR03 | N | 0-1 | 2 | Ano de inutilização da numeração |
| DR11 | CNPJ | E | DR03 | C | 0-1 | 14 | CNPJ do emitente |
| DR12 | mod | E | DR03 | N | 0-1 | 2 | Modelo da NF-e |
| DR13 | serie | E | DR03 | N | 0-1 | 1-3 | Série da NF-e |
| DR14 | nNFIni | E | DR03 | N | 0-1 | 1-9 | Número da NF-e inicial a ser inutilizada |
| DR15 | nNFFin | E | DR03 | N | 0-1 | 1-9 | Número da NF-e final a ser inutilizada |
| DR16 | dhRecbto | E | DR03 | D | 1-1 | - | Preenchido com a data e hora do processamento (informado também no caso de rejeição). Formato: "AAAA-MM-DDThh:mm:ssTZD" (UTC - Universal Coordinated Time). |
| DR17 | nProt | E | DR03 | N | 0-1 | 15 | Número do Protocolo de Inutilização, conforme item 4.3.5 |
| DR18 | Signature | G | DR01 | xml | 0-1 | - | Assinatura XML do grupo identificado pelo atributo "Id" A decisão de assinar a mensagem fica a critério da UF interessada. |

(DR16 `dhRecbto` é 1-1 na tabela, mas a nota logo acima diz que "não será preenchido em caso de erro" — contradição do
original.)

Regras específicas (Tabela 5-12, pp. 80–81), códigos e textos literais: I01 252 "Rejeição: Ambiente informado diverge
do Ambiente de recebimento"; I02 250 "Rejeição: UF diverge da UF autorizadora"; I02a 266 (série 910–969, CPF); I02b 453
"Rejeição: Ano de inutilização não pode ser superior ao Ano atual"; I02c 454 "… não pode ser inferior a 2006"; I03 224
"Rejeição: A faixa inicial é maior que a faixa final"; I04 201 "Rejeição: Número máximo de numeração a inutilizar
ultrapassou o limite" (regra: "ultrapassa o limite (10.000 números)"); I04.a 502 "Rejeição: Erro na Chave de Acesso -
Campo Id não corresponde à concatenação dos campos correspondentes"; I05 203; I06 240 "Rejeição:
Cancelamento/Inutilização - Irregularidade Fiscal do Emitente"; I07 563 "Rejeição: Já existe pedido de Inutilização
com a mesma faixa de inutilização"; I07a 256 "Rejeição: Uma NF-e da faixa já está inutilizada na Base de dados da
SEFAZ"; I08 e I09 241 "Rejeição: Um número da faixa já foi utilizado".

§5.3.5 (p. 81), literal: "No caso de homologação da Inutilização retornar o cStat = 102. É verificada a existência de
um Pedido de Inutilização de Numeração em duplicidade (mesma faixa de numeração a ser inutilizada), rejeitando o novo
Pedido de Inutilização com o erro "563-Rejeição: Já existe pedido de Inutilização com a mesma faixa de inutilização".
Para esta rejeição, será informado na resposta o Número do Protocolo de Autorização do Pedido de Inutilização
anteriormente autorizado (tag: retInutNFe/infInut/nProt). (NT 2015.002)"

---

## `[WS-EVENTO]` Registro de Evento — parte geral — `[VG]` §5.8 (pp. 99–104)

Função (p. 99): "Serviço destinado à recepção de mensagem de Evento da NF-e". Processo: síncrono. Método:
nfeRecepcaoEvento. §5.8.3 (p. 102): "O processo de Registro de Eventos recebe eventos em uma estrutura de lotes, que
podem conter de 1 a 20 eventos."

**Entrada — Schema XML: envEvento_v1.00.xsd — Tabela 5-32 (pp. 100–101)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| P01 | envEvento | Raiz | - | - | - | - | TAG raiz |
| P02 | versao | A | P01 | N | 1-1 | 2v2 | Versão do leiaute |
| P03 | idLote | E | P01 | N | 1-1 | 1-15 | Identificador de controle do Lote de envio do Evento. Número sequencial único para identificação do Lote, de uso exclusivo do autor do evento. O Web Service não faz qualquer uso deste identificador. |
| P04 | evento | G | P01 | xml | 1-20 | - | Evento, um lote pode conter até 20 eventos |
| P05 | versao | A | P04 | N | 1-1 | 2v2 | Versão do leiaute do evento |
| P06 | infEvento | G | P04 | - | 1-1 | - | Grupo de informações do registro do Evento |
| P07 | Id | ID | P06 | C | 1-1 | 54 | Identificador da TAG a ser assinada, formado por "ID" + tpEvento + Chave da NF-e + nSeqEvento |
| P08 | cOrgao | E | P06 | N | 1-1 | 2 | Código do órgão de recepção do Evento, conforme Tabela do IBGE ou: 91=Ambiente Nacional Informar o código da UF para este evento. |
| P09 | tpAmb | E | P06 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| P10 | CNPJ | CE | P06 | N | 1-1 | 14 | CNPJ do autor do evento |
| P11 | CPF | CE | P06 | N | 1-1 | 11 | CPF do autor do evento |
| P12 | chNFe | E | P06 | N | 1-1 | 44 | Chave de Acesso da NF-e à qual o evento será vinculado |
| P13 | dhEvento | E | P06 | D | 1-1 | - | Data e hora do evento no formato AAAA-MMDDThh:mm:ssTZD (UTC - Universal Coordinated Time) |
| P14 | tpEvento | E | P06 | N | 1-1 | 6 | Código do evento (de acordo com tabelas do item 3.1) |
| P15 | nSeqEvento | E | P06 | N | 1-1 | 1-2 | Sequencial do evento para o mesmo tipo de evento. Informar o valor "1" para este evento. |
| P16 | verEvento | E | P06 | N | 1-1 | 2v2 | Versão do grupo de detalhe do evento. |
| P17 | detEvento | G | P06 | | 1-1 | - | Detalhes do evento. Inserir neste local o XML específico do tipo de evento (ex: cancelamento, carta correção, registro de passagem). |
| P91 | Signature | G | P04 | xml | 1-1 | - | Assinatura Digital do documento XML, a assinatura deverá ser aplicada no elemento infEvento |

**Retorno — Schema XML: retEnvEvento_v1.00.xsd — Tabela 5-33 (pp. 101–102)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| R01 | retEnvEvento | Raiz | - | - | - | - | TAG raiz da mensagem de retorno |
| R02 | versao | A | R01 | N | 1-1 | 2v2 | Versão do leiaute |
| R03 | idLote | E | R01 | N | 1-1 | 1-15 | Idem a mensagem de entrada. |
| R04 | tpAmb | E | R01 | N | 1-1 | 1 | Idem a mensagem de entrada. |
| R05 | verAplic | E | R01 | C | 1-1 | 1-20 | Versão da aplicação que processou o evento. |
| R06 | cOrgao | E | R01 | N | 1-1 | 2 | Órgão de recepção do Evento, idem a mensagem de entrada. |
| R07 | cStat | E | R01 | N | 1-1 | 3 | Código do status da resposta (conforme item 4.4.1 do documento MOC - Anexo I - Leiaute NF-e/NFC-e) |
| R08 | xMotivo | E | R01 | C | 1-1 | 1-255 | Descrição do status da resposta |
| R09 | retEvento | G | R01 | - | 0-20 | - | Grupo do resultado do processamento do Evento |
| R10 | versao | A | R09 | N | 1-1 | 2v2 | Versão do leiaute |
| R11 | infEvento | G | R09 | | 1-1 | - | Grupo de informações do registro do Evento |
| R12 | Id | ID | R11 | C | 0-1 | 17 | Identificador da TAG a ser assinada, somente deve ser informado se o órgão de registro assinar a resposta. No caso de assinatura, preencher com o número do protocolo, precedido pela literal "ID" |
| R13 | tpAmb | E | R11 | N | 1-1 | 1 | Idem a mensagem de entrada. |
| R14 | verAplic | E | R11 | C | 1-1 | 1-20 | Versão da aplicação que registrou o Evento, utilizar literal que permita a identificação do órgão, como a sigla da UF ou do órgão. |
| R15 | cOrgao | E | R11 | N | 1-1 | 2 | Idem a mensagem de entrada. |
| R16 | cStat | E | R11 | N | 1-1 | 3 | Código do status da resposta (conforme item 4.4.1 do documento MOC - Anexo I - Leiaute NF-e/NFC-e) |
| R17 | xMotivo | E | R11 | C | 1-1 | 1-255 | Descrição do status da resposta. |
| R18 | chNFe | E | R11 | N | 0-1 | 44 | Idem a mensagem de entrada. |
| R19 | tpEvento | E | R11 | N | 0-1 | 6 | Código do evento (de acordo com tabelas do item 3.1) |
| R20 | xEvento | E | R11 | C | 0-1 | 5-60 | Descrição do resultado do processamento do evento |
| R21 | nSeqEvento | E | R11 | N | 0-1 | 1-2 | Idem a mensagem de entrada. |
| R22 | cOrgaoAutor | E | R11 | N | 0-1 | 2 | Idem a mensagem de entrada, para os casos de eventos em que é informado na mensagem de entrada. Específico para eventos: - 110112 - Cancelamento por substituição (NT 2018.005) - 110140 - EPEC Obs: Esta tag não é preenchida no evento de manifestação |
| R23 | CNPJDest | CE | R11 | N | 0-1 | 14 | Informar o CNPJ do destinatário da NF-e. Específico para evento 110111 - Cancelamento |
| R24 | CPFDest | CE | R11 | N | 0-1 | 11 | Informar o CPF do destinatário da NF-e. Específico para evento 110111 - Cancelamento Obs: Esta tag não é preenchida no evento de manifestação |
| R25 | emailDest | E | R11 | C | 0-1 | 1-60 | E-mail do destinatário informado na NF-e. Específico para eventos 110111 - Cancelamento Obs: Esta tag não é preenchida no evento de manifestação |
| R30 | dhRegEvento | E | R11 | D | 1-1 | - | Data e hora de registro do evento no formato AAAA-MMDDTHH:MM:SSTZD (formato UTC). Se o evento for rejeitado informar a data e hora de recebimento do evento. |
| R31 | nProt | E | R11 | N | 0-1 | 15 | Número do Protocolo do Evento, conforme item 4.3.5 |
| R32 | chNFePend | E | R11 | N | 0-50 | 44 | Relação de Chaves de Acesso de EPEC pendentes de conciliação, existentes no AN. Específico para evento: 110140 - EPEC Obs: Esta tag não é preenchida no evento de manifestação |
| R91 | Signature | G | R09 | XML | 0-1 | - | Assinatura Digital do documento XML, a assinatura deverá ser aplicada no elemento infEvento. A decisão de assinar a mensagem fica a critério da UF. |

Regras da parte geral (Tabela 5-35, pp. 102–103), códigos e textos literais: P07-10 572 "Rejeição: Erro Atributo ID do
evento não corresponde a concatenação dos campos ("ID" + tpEvento + chNFe + nSeqEvento)"; P08-10 250; P09-10 252;
P10-10 489; P11-10 490; P11-20 408; P12-10 236; P12-14 614; P12-18 615; P12-22 616; P12-26 617; P12-30 618; P12-34 619;
P12-40 249 "Rejeição: UF da Chave de Acesso diverge da UF autorizadora"; P12-44 574 "Rejeição: Autor do evento diverge
do emissor da NF-e"; P13-10 578 "Rejeição: A data do evento não pode ser maior que a data do processamento" (regra:
"aceitar tolerância de até 5 minutos"); 1P10-10 203 "Rejeição: Emissor não habilitado para emissão de NF-e"; 1P10-20
240 "Rejeição: Irregularidade fiscal do emitente"; 3P15-10 573 "Rejeição: Duplicidade de Evento".

§5.8.5 Final do Processamento do Lote (pp. 103–104), literal:

> O processamento do lote pode resultar em:
> · Rejeição do Lote - por algum problema que comprometa o processamento do lote;
> · Processamento do Lote - o lote foi processado (cStat=128), a validação de cada evento do lote poderá resultar em:
> o Rejeição - o Evento será descartado, com retorno do código do status do motivo da rejeição;
> o Recebido pelo Sistema de Registro de Eventos, com vinculação do evento na NF-e, o Evento será armazenado no
> repositório do Sistema de Registro de Eventos com a vinculação do Evento à respectiva NF-e (cStat=135);
> o Recebido pelo Sistema de Registro de Eventos - vinculação do evento à respectiva NF-e prejudicada - o Evento será
> armazenado no repositório do Sistema de Registro de Eventos, a vinculação do evento à respectiva NF-e fica
> prejudicada face à inexistência da NF-e no momento do recebimento do Evento (cStat=136);
>
> A resposta da SEFAZ pode ser assinada e neste caso deve ser preenchido o atributo "Id' (HR12) [*sic*]. Este atributo
> é opcional e não deve ser informado pela SEFAZ caso a mensagem de resposta não seja assinada. Esta orientação é
> válida para todos os tipos de evento.

**`procEventoNFe` — §5.8.6, Tabela 5-36 (p. 104).** Literal: "O arquivo digital do Evento, com a respectiva
informação do Registro de Evento da SEFAZ, deve ser mantido pelo emissor e disponibilizado para o destinatário, na forma
da Tabela 5-36." Schema XML: procEventoNFe_v1.00.xsd.

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Dec. | Descrição/Observação |
|---|---|---|---|---|---|---|---|---|
| ZR01 | procEventoNFe | Raiz | - | - | - | - | - | TAG raiz |
| ZR02 | versao | A | ZR01 | N | 1-1 | 1-4 | 2 | |
| ZR03 | evento | G | ZR01 | - | 1-1 | - | - | |
| YR04 [*sic*] | (dados) | - | - | - | - | - | - | Dados do Evento (mensagem de entrada) |
| YR05 [*sic*] | retEvento | G | ZR01 | - | 1-1 | - | - | |
| YR06 [*sic*] | (dados) | - | - | - | - | - | - | Dados do registro do Evento (mensagem de saída) |

Mesma estrutura no §7.4, Tabela 7-1 (p. 127), com IDs ZR01–ZR06, `versao` Tam. `1-2v2`, `evento` Tipo "Xml",
`retEvento` Tipo "xml", ZR06 "Dados da homologação do Evento". Nome de arquivo sugerido (pp. 127–128):
`<999...999>_<888888>-procEventoNFe.xml` — "<888888>: identifica o tipo de evento (CC-e=110110, Cancelamento=110111,
etc.)".

## `[WS-EVT-110111]` Cancelamento — `[VG]` §5.9 (pp. 105–109); Tabela 3-1 (p. 28)

Tabela 3-1 (p. 28): `110111` · "Cancelamento pelo Emitente" · "Cancelamento da NF-e" · criado por NT 2011.006, NT
2013.008.

§5.9 (p. 105), literal: "(Atualizado pela NT 2018.004) Função: evento destinado ao atendimento de solicitações de
cancelamento de NF-e/NFC-e. […] Autor do Evento: O autor do evento é o emissor da NF-e e a NF-e deve existir no banco de
dados da SEFAZ. A mensagem XML do evento será assinada com o certificado digital do emitente da NF-e. No caso do
emitente pessoa jurídica, poderá ser usado o certificado digital da matriz ou de qualquer filial da empresa (mesmo
CNPJ-Base)". Códigos dos Eventos: · 110111 - "Cancelamento" · 110112 - "Cancelamento por substituição""

**Entrada (dentro de `detEvento` P17) — Schema XML: envEventoCancNFe_v1.00.xsd (tpEvento=110111) — Tabela 5-37 (p. 105)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| P18 | versao | A | P17 | N | 1-1 | 2v2 | Informar o mesmo valor da tag "verEvento" (P16) |
| P19 | descEvento | E | P17 | C | 1-1 | 5-60 | Veja a descrição do evento, junto com o Tipo de Evento documentado anteriormente. |
| P20 | cOrgaoAutor | E | P17 | N | 1-1 | 2 | […] Nota: Campo exclusivo do Evento "110112 - Cancelamento por substituição". |
| P21 | tpAutor | E | P17 | N | 1-1 | 1 | […] Nota: Campo exclusivo do Evento "110112 - Cancelamento por substituição". |
| P22 | verAplic | E | P17 | C | 1-1 | 1-20 | […] Nota: Campo exclusivo do Evento "110112 - Cancelamento por substituição". |
| P23 | nProt | E | P17 | N | 1-1 | 15 | Informar o número do Protocolo de Autorização da NF-e a ser Cancelada. |
| P30 | xJust | E | P17 | C | 1-1 | 15-255 | Informar a justificativa do cancelamento |
| P31 | chNFeRef | E | P17 | N | 1-1 | 44 | […] Nota: Campo exclusivo do Evento "110112 - Cancelamento por substituição". |

**Para o 110111, ficam: `versao`, `descEvento`, `nProt`, `xJust`.** Literal de `descEvento` do 110111: **"Cancelamento"**
(p. 105, lista "Códigos dos Eventos"). Retorno (§5.9.2, pp. 105–106): "conforme retorno do Web Service de Registro de
Eventos - Parte Geral, especificado no item 5.8.2"; "Descrição do resultado do processamento do evento (xEvento):
"Cancelamento homologado""; Schema XML: retEnvEventoCancNFe_v1.00.xsd (tpEvento=110111); "O leiaute desta mensagem de
retorno não apresenta nenhuma diferença com relação à Tabela 5-33."

Regras específicas que atingem o 110111 (Tabela 5-38, pp. 106–109), códigos e textos literais: P12-40 249; P12-44 574;
P13-10 578; P15-10 594 "Rejeição: Número de sequência do evento informado é maior do que o permitido" (regra: "Número de
sequência do evento diferente de 1"); 1P10-10 203; 1P10-20 240; 2P12-10 494 "Rejeição: Chave de Acesso Inexistente";
**2P12-14 501 "Rejeição: Prazo de cancelamento superior ao previsto na Legislação"** (regra: "Se tpEvento=110111
(Cancelamento Normal): verificar se NF-e autorizada há mais de 1 dia (24 horas). Nota: Considera a exceção de prazo
definida em legislação estadual"); 2P12-22 580 "Rejeição: Evento exige uma NF-e autorizada"; 2P13-10 577; 2P13-14 579;
2P23-10 222 "Rejeição: Protocolo de Autorização de Uso difere do cadastrado"; 3P15-10 573; 4P15-14 221 "Rejeição:
Confirmado o recebimento da NF-e pelo destinatário" ("Se NF-e (Modelo 55)"); 4P15-18 690; 4P15-22 219; 4P15-26 304;
(sem ID) 811 "Rejeição: Pedido de Prorrogação deferido impede o cancelamento da NF-e".

§5.9.4 (p. 109), literal: "A SEFAZ autorizadora poderá aceitar o cancelamento fora de prazo, mantendo um código de
retorno diferente para estes casos: status "155-Cancelamento homologado fora de prazo". No caso do Evento de
Cancelamento para a NFC-e, o pedido de cancelamento fora do prazo é rejeitado com o código de erro 501 "Rejeição: Prazo
de cancelamento superior ao previsto na Legislação"."

---

## `[WS-STATUS]` Status do serviço — `[VG]` §5.5 (pp. 84–86)

Função (p. 84): "serviço destinado à consulta do status do serviço prestado pelo Portal da Secretaria de Fazenda
Estadual." Processo: síncrono. Método: nfeStatusServico.

**Entrada — Schema XML: consStatServ_v4.00.xsd — Tabela 5-17 (p. 85)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| FP01 | consStatServ | Raiz | - | - | - | - | TAG raiz |
| FP02 | versao | A | FP01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| FP03 | tpAmb | E | FP01 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| FP04 | cUF | E | FP01 | N | 1-1 | 2 | Código da UF consultada |
| FP05 | xServ | E | FP01 | C | 1-1 | 6 | Serviço solicitado `STATUS' |

**Retorno — Schema XML: retConsStatServ_4.00.xsd — Tabela 5-18 (pp. 85–86)**

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Descrição/Observação |
|---|---|---|---|---|---|---|---|
| FR01 | retConsStatServ | Raiz | - | - | - | - | TAG raiz da Resposta |
| FR02 | versao | A | FR01 | N | 1-1 | 1-2v2 | Versão do leiaute |
| FR03 | tpAmb | E | FR01 | N | 1-1 | 1 | Identificação do Ambiente: 1=Produção/2=Homologação |
| FR04 | verAplic | E | FR01 | C | 1-1 | 1-20 | Versão do Aplicativo que processou a consulta. A versão deve ser iniciada com a sigla da UF nos casos de WS próprio ou a sigla SVAN ou SVRS nos demais casos. |
| FR05 | cStat | E | FR01 | N | 1-1 | 3 | Código do status da resposta (conforme item 4.4.1 do documento MOC - Anexo I - Leiaute NF-e/NFC-e) |
| FR06 | xMotivo | E | FR01 | C | 1-1 | 1-60 | Descrição literal do status da resposta. |
| FR07 | cUF | E | FR01 | N | 1-1 | 2 | Código da UF que atendeu a solicitação |
| FR08 | dhRecbto | E | FR01 | D | 1-1 | - | Preenchido com a data e hora do processamento. Formato: "AAAA-MM-DDThh:mm:ssTZD" (UTC - Universal Coordinated Time). |
| FR09 | tMed | E | FR01 | N | 0-1 | 1-4 | Tempo médio de resposta do serviço (em segundos) dos últimos 5 minutos (item 5.7). |
| FR10 | dhRetorno | E | FR01 | D | 0-1 | - | Preencher com data e hora previstas para o retorno do Web Service, no formato AAA-MM-DDTHH:MM:SS |
| FR11 | xObs | E | FR01 | C | 0-1 | 1-255 | Informações adicionais para o Contribuinte |

§5.5.3 (p. 86), literal: "As empresas que construírem um aplicativo que se mantenha em "loop" permanente de consulta a
este Web Service, devem aguardar um tempo mínimo de 3 minutos entre cada consulta, evitando sobrecarregar
desnecessariamente os servidores da SEFAZ." Regras (Tabela 5-20): K01 252; K02 289 "Rejeição: Código da UF informada
diverge da UF solicitada"; K03 108; K04 109. §5.5.5 (p. 86), literal: "O processamento do pedido de consulta de status
de Serviço pode resultar em uma mensagem de erro ou retornar a situação atual do Servidor de Processamento, códigos de
situação "107-Serviço em Operação", "108-Serviço Paralisado Temporariamente" e "109-Serviço Paralisado sem Previsão"."

---

## `[WS-CSTAT]` Códigos de status citados no VG

O VG **não tem** tabela de códigos de status: remete ao "item 4.4.1 do documento MOC - Anexo I". Abaixo, todo trecho do
VG em que cada código pedido aparece, com o texto exatamente como impresso.

| cStat | Texto no VG (literal) | Página / onde |
|---|---|---|
| 100 | "100-Autorizado o Uso" · "cStat = 100-uso autorizado" | p. 84 §5.4.5 · p. 82 ER08 |
| 101 | "101-Cancelamento de NF-e Homologado" · "cStat = 101-cancelado" | p. 84 §5.4.5 · p. 82 ER09 |
| 102 | só "No caso de homologação da Inutilização retornar o cStat = 102." e "obrigatórios no caso de homologação da inutilização cStat=102" — **texto do xMotivo não achado no VG** | p. 81 §5.3.5 · p. 79 Tab. 5-10 |
| 103 | "o código 103 e o literal "Lote recebido com Sucesso"" | p. 73 §5.1.4.2 |
| 104 | "código do status do lote = 104 (Lote processado)" · "Lote processado - cStat=104" | p. 76 BR07 · p. 78 §5.2.5 |
| 105 | "status de erro 105 - "Lote em Processamento"" · regra E04 (Msg 105): "Rejeição: Serviço em Operação" [*diverge*] · "Lote em processamento - cStat=105" | p. 77 §5.2.3 · p. 77 Tab. 5-8 · p. 78 |
| 107 | "107-Serviço em Operação" | p. 86 §5.5.5 |
| 108 | "108-Serviço Paralisado Temporariamente" · regra K03 (Msg 108, Efeito "-"): "Rejeição: Serviço Paralisado Momentaneamente (curto prazo)" [*diverge*] | p. 86 §5.5.5 · p. 86 Tab. 5-20 |
| 109 | "109-Serviço Paralisado sem Previsão" · K04: "Rejeição: Serviço Paralisado sem Previsão" | p. 86 |
| 110 | "110-Uso Denegado" · "110-uso denegado" | p. 84 · p. 82 ER08 |
| 128 | "o lote foi processado (cStat=128)" (lote de evento) | p. 103 §5.8.5; p. 123 |
| 135 | "(cStat=135)" · "135 - Evento registrado e vinculado a NF-e" · "cStat= 135-Evento registrado e vinculado a NF-e" | p. 103 · p. 117 · p. 123 |
| 136 | "(cStat=136)" · "cStat=136 - Evento registrado, mas não vinculado a NF-e" | p. 104 · p. 123 |
| 150 | "150-uso autorizado fora de prazo" | p. 82 ER08 |
| 151 | "151-cancelado fora de prazo" | p. 82 ER09 |
| 155 | "status "155-Cancelamento homologado fora de prazo"" | p. 109 §5.9.4 |
| 204 | **não achado no VG** | — |
| 217 | "Rejeição: NF-e não consta na base de dados da SEFAZ" (J03, consulta protocolo) · "Rejeição: NF-e inexistente para a chave de acesso informada" (H142, NFeDistribuicaoDFe) | p. 84 Tab. 5-16 · p. 96 |
| 225 | só citado: "Se cStatus = 225, 565, ou 568, significa que o lote de NF-e consultado é inválido" — **texto não achado no VG** | p. 76 BR05 |
| 501 | "Rejeição: Prazo de cancelamento superior ao previsto na Legislação" | p. 107 Tab. 5-38 2P12-14/2P12-18; p. 109 |
| 539 | **não achado no VG** | — |
| 656 | "656-Rejeição: Consumo Indevido" | p. 63 §4.3.8; p. 99 |

---

## O que ficou de fora / não achado no VG

- Namespaces WSDL `…/nfe/wsdl/<Serviço>4`, nomes de operação `NFe…4` e o elemento `nfeResultMsg` (ver `[WS-SOAP]`):
  provavelmente nos WSDL do Portal Nacional, não no VG.
- Texto dos cStat 102, 204, 225 e 539: estão no MOC 7.0 **Anexo I** item 4.4.1 (não lido nesta sessão).
- Valor literal "4.00"/"1.00" do atributo `versao`: o VG só dá tamanho e versão de schema.
- `consReciNFe`/`retConsReciNFe` (§5.2) transcritos só no que toca `protNFe` (BR07); não pedidos.
