# Transcrição — NFS-e autorizada (`infNFSe`), série da DPS (E0010), assinatura e evento de cancelamento `e101101`

> Insumo do BRIEF [`BE-INCR-DFE-MANUAL`](../BE-INCR-DFE-MANUAL-brief.md) (item 1 / PR-0). Transcrito em 2026-09-27
> de fonte primária, **nunca de memória** (I052). Autorização: dono 27/09 *"pode baixar"* + *"Pode seguir"*.
>
> **Regra de conflito (passo 0.3):** o **XSD vence** para nome de tag e estrutura; a **planilha vence** para regra
> de negócio. Divergências na §8 — nenhuma resolvida de memória.

## Fontes (baixadas 27/09 com `--so=<id>`; bytes e sha256 iguais ao `MANIFEST.md`)

| id | arquivo | bytes | sha256 (12) | o que foi lido |
|---|---|---|---|---|
| `nfse-anexo-i` | `NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx` | 215.196 | `de5bc492959e` | aba `LEIAUTE DPS_NFS-e ` (417 linhas) e `RN DPS_NFS-e` (655) |
| `nfse-anexo-ii` | `NFSe-ANEXO-II-eventos-v1.01.xlsx` | 51.527 | `5abe83d7e510` | abas `TIPO EVENTOS DE NFSe` (18), `LEIAUTE EVENTO_PED.REG.EVENTO` (86), `RN EVENTO_PED.REG.EVENTO` (111) |
| `nfse-xsd` | `NFSe-ESQUEMAS_XSD-v1.01.zip` | 65.640 | `e7935cbd9470` | `Schemas/1.01/`: `NFSe_v1.01.xsd`, `tiposComplexos_v1.01.xsd`, `tiposSimples_v1.01.xsd`, `evento_v1.01.xsd`, `tiposEventos_v1.01.xsd` |
| `nfse-manual-adn` | `NFSe-manual-contribuintes-APIs-ADN.pdf` | 201.769 | `9ffc97d8b1be` | 3 páginas — só para a §6 (quem assina); não traz o dado |

Referências: `[n]` = linha da planilha (número da linha no Excel); `xsd:Tipo` = tipo no XSD 1.01.

## 1. Estrutura da NFS-e autorizada (XSD)

```
NFSe  @versao                                   ns = http://www.sped.fazenda.gov.br/nfse   (xsd:TCNFSe)
├── infNFSe  @Id  (TSIdNFSe: "NFS" + 50 dígitos)                                          (xsd:TCInfNFSe)
│   ├── xLocEmi, xLocPrestacao, nNFSe, cLocIncid?, xLocIncid?, xTribNac, xTribMun?, xNBS?,
│   │   verAplic, ambGer, tpEmis, procEmi?, cStat, dhProc, nDFSe
│   ├── emit      (CNPJ|CPF, IM?, xNome, xFant?, enderNac, fone?, email?)
│   ├── valores   (vCalcDR?, tpBM?, vCalcBM?, vBC?, pAliqAplic?, vISSQN?, vTotalRet?, vLiq)
│   ├── xOutInf?
│   ├── IBSCBS?   (valores calculados de IBS/CBS — linhas [47]–[98]; fora da releitura no MVP)
│   └── DPS  @versao                            ← a DPS como AUTORIZADA, embutida            (xsd:TCDPS)
│       ├── infDPS  @Id (TSIdDPS: "DPS" + 42 dígitos) — mesmos campos do BRIEF X10b §1, linhas [102]+
│       └── ds:Signature?   (0-1)
└── ds:Signature            (1-1)
```

## 2. Campos de `infNFSe` que o Luminaris lê

| [n] | caminho | OCOR | TAM / tipo XSD | regra ou nota (planilha) |
|---|---|---|---|---|
| [5] | `infNFSe/@Id` | 1-1 | 53 · `TSIdNFSe` = `NFS[0-9]{50}` | "NFS" + cód. mun. (7) + amb. ger. (1) + tipo de inscrição (1) + inscrição (14) + nNFSe (13) + AAMM de emissão (4) + código numérico (9) + DV (1) |
| — | chave de acesso | — | `TSChaveNFSe` = `[0-9]{50}` | = `@Id` sem o literal `NFS`; é o `chNFSe` do evento (§7) e o `chaveOuCodigo` do `FiscalDocument` |
| [8] | `infNFSe/nNFSe` | 1-1 | 13 · `TSNNFSe` = `[1-9][0-9]{0,12}` | "A Sefin Nacional NFS-e irá gerar o número … de forma sequencial por emitente" |
| [15] | `infNFSe/ambGer` | 1-1 | 1 | 1 = sistema próprio do município; **2 = Sefin Nacional NFS-e** |
| [16] | `infNFSe/tpEmis` | 1-1 | 1 | 1 = emissão direta no modelo nacional; 2 = leiaute próprio do município transcrito |
| [17] | `infNFSe/procEmi` | 0-1 | 1 | 1 = aplicativo do contribuinte (API); **2 = aplicativo do fisco (Web)**; 3 = aplicativo do fisco (App). "Preenchido somente em NFS-e emitidas pelo Sistema Nacional" |
| [18] | `infNFSe/cStat` | 1-1 | 3 · `TStat` ∈ {100, 102, 103, 107} | 100 = gerada; 102 = decisão judicial/administrativa; 103 = avulsa; 107 = MEI |
| [19] | `infNFSe/dhProc` | 1-1 | `TSDateTimeUTC` | data/hora do processamento, `AAAA-MM-DDThh:mm:ssTZD` |
| [22]/[23] | `infNFSe/emit/CNPJ` \| `CPF` | 1-1 (choice) | 14 / 11 | inscrição do **emitente da NFS-e** |
| [41] | `infNFSe/valores/vBC` | 0-1 | 1-15V2 | vServ − desconto incondicionado − deduções/reduções − benefício municipal |
| [42] | `infNFSe/valores/pAliqAplic` | 0-1 | 1-2V2 · `TSDec1V2` | alíquota aplicada |
| [43] | `infNFSe/valores/vISSQN` | 0-1 | 1-15V2 | vBC × pAliqAplic |
| [45] | `infNFSe/valores/vLiq` | 1-1 | 1-15V2 | vServ − descontos − retenções |

## 3. Mapa dos 13 campos da releitura (`CampoComparado`) — todos na DPS embutida

Caminho completo = `NFSe/infNFSe/DPS/infDPS/` + coluna "caminho".

| `CampoComparado` | grupo | [n] | caminho | OCOR | TAM | normalização declarada |
|---|---|---|---|---|---|---|
| `prest.CNPJ` | identidade | [118] | `prest/CNPJ` | 1-1 | 14 | igualdade exata de string |
| `toma.doc` | conteúdo (PII) | [145]/[146] | `toma/CNPJ` \| `toma/CPF` | 1-1 (choice) | 14 / 11 | igualdade exata + tipo (CPF×CNPJ); valor **nunca** persistido |
| `cLocPrestacao` | conteúdo | [192] | `serv/locPrest/cLocPrestacao` | 1-1 | 7 | exata |
| `cTribNac` | conteúdo | [195] | `serv/cServ/cTribNac` | 1-1 | 6 | exata |
| `cNBS` | conteúdo | [198] | `serv/cServ/cNBS` | 0-1 | 9 | ausente dos dois lados = igual; presente de um lado só = divergência `ausente` |
| `dCompet` | conteúdo | [108] | `dCompet` | 1-1 | `TSData` | exata (AAAA-MM-DD) |
| `vServ` | conteúdo | [250] | `valores/vServPrest/vServ` | 1-1 | 1-15V2 | centavos por aritmética de string; tolerância zero |
| `vDescIncond` | conteúdo | [252] | `valores/vDescCondIncond/vDescIncond` | 0-1 | 1-15V2 | ausente = 0; centavos |
| `vDescCond` | conteúdo | [253] | `valores/vDescCondIncond/vDescCond` | 0-1 | 1-15V2 | ausente = 0; centavos |
| `tpRetISSQN` | conteúdo | [311] | `valores/trib/tribMun/tpRetISSQN` | 1-1 | 1 | exata |
| `pAliq` | conteúdo | [312] | `valores/trib/tribMun/pAliq` | 0-1 | 1V2 · `TSDec1V2` = `0\|[0-9](\.[0-9]{2})?` | compara em pontos-base; só quando enviada |
| `IBSCBS.CST` | conteúdo | [406] | `IBSCBS/valores/trib/gIBSCBS/CST` | 1-1 no grupo | 3 | exata; só quando o grupo foi enviado |
| `IBSCBS.cClassTrib` | conteúdo | [407] | `IBSCBS/valores/trib/gIBSCBS/cClassTrib` | 1-1 no grupo | 6 | exata; só quando o grupo foi enviado |

Série, número e `@Id` da DPS **não** entram na comparação (F-MAN-4: o portal numera — §5).

**Guarda de origem (derivada de [15] e [17]):** uma nota do modo manual vem do portal público, então tem
`ambGer = 2` (Sefin Nacional) e `procEmi ∈ {2, 3}` (Web ou App do fisco). `procEmi = 1` (API de terceiro) ou
`ambGer = 1` (sistema próprio do município) não é nota emitida pela ficha.

## 4. Datas e fuso

`dhProc` e `DPS/infDPS/dhEmi` são `TSDateTimeUTC` (`AAAA-MM-DDThh:mm:ssTZD`, com fuso). A guarda "a nota não é anterior
ao documento" compara **instantes** (com o TZD), nunca a data de calendário. `dCompet` é `TSData` (data sem hora): compara
como string, sem `new Date()`.

## 5. Série da DPS — RN E0010 ([106] nota + RN [147], nível 1, rejeição)

> Faixas de utilização da série da DPS: **00001 a 49999** — emissão com aplicativo próprio; **50000 a 69999** — Emissor
> Móvel; **70000 a 79999** — Emissor Web; **80000 a 89999** — emissão com transcrição manual (Web). "O emitente deve
> informar o número de série (transcrever o número de série) que foi repassado ao não emitente da NFS-e."

Consequência: a DPS gerada pelo portal cai em 70000–79999 (Web) ou 50000–69999 (App); a série do Luminaris
(`FiscalProfile.dpsSerie`, 1–49999) não vale no portal. Confirma o F-MAN-4 (a). Tipo `TSSerieDPS` = `^0{0,4}\d{1,5}$`.

## 6. Assinatura

| RN (planilha RN, linha) | regra | onde vale (colunas: emissores públicos \| judicial públicos \| ADN municipal \| judicial ADN) |
|---|---|---|
| E1630 ([650]) | "A assinatura da NFS-e deve ser válida" | V \| V \| V \| V |
| E1632 ([651]) | certificado válido: validade, **cadeia de certificação**, revogação, LCR | V \| V \| V \| V |
| E1634 ([652]) | certificado no padrão: versão 3, não é AC, KeyUsage de assinatura e não-recusa, **OtherName de CNPJ (2.16.76.1.3.3) ou CPF (2.16.76.1.3.1)**, raiz ICP-Brasil | V \| V \| V \| V |
| E1636 ([653]) | assinatura obrigatória quando enviado para API | V \| V \| V \| V |
| E1638 ([654]) | "deve ser feita com o certificado digital do **município** emissor da NFS-e" | **X \| X** \| V \| V — só NFS-e compartilhada por município |
| E0714–E0718 ([645]–[649]) | assinatura da **DPS** (`DPS/Signature`, 0-1): válida, certificado do emitente da DPS, obrigatória só via Web Service | só na recepção de DPS |

XSD: `NFSe/ds:Signature` é obrigatória (1-1); `DPS/ds:Signature` é opcional (0-1).

**Quem assina a NFS-e gerada pelos emissores públicos nacionais:** o sistema gerador (Sefin Nacional). **O CNPJ do
certificado da Sefin não consta no corpus** (Anexo I, XSD e manual do ADN lidos). Consequência para o F-MAN-1 (a): o
verificador exige integridade + certificado com OtherName de CNPJ ou CPF (E1630/E1634) e **não** amarra o titular ao
prestador (a regra "CNPJ-raiz do certificado = emitente" do SIG-NFE **não** se aplica aqui — mesmo desenho do caso
NFA-e `procEmi=1` do #403). Cadeia ICP-Brasil (E1632) = F-SIG-3 (c), nó futuro.

## 7. Evento de cancelamento `e101101` (Anexo II + XSD)

`TIPO EVENTOS DE NFSe` [2]: "Cancelamento de NFS-e", código **101101**, autor = emitente, **assinatura digital
obrigatória no pedido: Sim**, ambiente receptor = "Sistema que gerou a NFS-e (Sistema próprio do município ou Sefin
Nacional NFS-e)".

```
evento  @versao                                                        (xsd:TCEvento)
├── infEvento  @Id (TSIdEvento, 62: "EVT" + …)                         (xsd:TCInfEvento)
│   ├── verAplic, ambGer (1 município | 2 Sefin | 3 ADN), nSeqEvento (001 no cancelamento), dhProc, nDFSe
│   └── pedRegEvento  @versao                                          (xsd:TCPedRegEvt)
│       ├── infPedReg  @Id (59)                                        (xsd:TCInfPedReg)
│       │   ├── tpAmb, verAplic, dhEvento, CNPJAutor | CPFAutor
│       │   ├── chNFSe  (TSChaveNFSe, 50)      ← tem de ser a chave do documento
│       │   └── e101101 { xDesc (5-60), cMotivo (1 erro na emissão | 2 serviço não prestado | 9 outros), xMotivo (15-255) }
│       └── ds:Signature?
└── ds:Signature   (1-1)
```

Linhas do leiaute: [3]–[24] (`e101101` = [21]–[24]). Guarda do item 13 do BRIEF (F-MAN-5 a): o XML enviado tem de
ser um `evento` com `pedRegEvento/infPedReg/e101101` e `chNFSe` igual à chave do `FiscalDocument`; `cMotivo`/`xMotivo`
vêm do XML, não do formulário. O prazo de cancelamento é do município (RN E0822, BRIEF X10b p9).

## 8. Divergências planilha × XSD (o XSD vence para nome e estrutura)

| # | planilha | XSD | decisão |
|---|---|---|---|
| 1 | campo `id` em `infNFSe`, `infDPS`, `infEvento`, `infPedReg` | **atributo `Id`** em todos | usar `@Id` |
| 2 | `evento/pedRegEvento/…` ([12]–[24]) | `pedRegEvento` é filho de **`infEvento`** | caminho `evento/infEvento/pedRegEvento/infPedReg/…` |
| 3 | `pAliq` TAM `1V2` ([312]) | `TSDec1V2` = `0\|[0-9](\.[0-9]{2})?` (um dígito inteiro) | **achado fora do escopo:** o `DpsPayloadSchema` do X10b aceita `\d{1,2}\.\d{2}` — "10.00" passa no nosso schema e seria recusado. Não corrigido aqui (PR-0 é só docs) |

## 9. O que continua fora do corpus

- CNPJ do certificado com que a Sefin Nacional assina a NFS-e e o evento (§6).
- Anexo IV do ADN (a planilha de faixas citada pelo guia do emissor web) — a regra em si já está na E0010 (§5).
- Prazo de cancelamento de cada município (E0822) — dado do município, não do leiaute.
