# H1 — dados do P6 para o passo 3 (ECD) e o passo 5 (ECF), versão de teste com dado público

> Dono, chat, 13/10: *"Crie dados do p6 com exemplos reais, mas publicos que vc possa pesquisar na internet"*.
> Insumo do [`RUNBOOK-H1-PVA`](RUNBOOK-H1-PVA.md) §P6. **Não é evidência do runbook** e não substitui o dado do
> contador para um cliente real.

## Regras de uso

- **O `.txt` gerado com estes dados só pode ser VALIDADO no PVA. Nunca assinar nem transmitir.** O CNPJ é de uma
  empresa real (dado público). Transmitir seria entregar escrituração em nome de terceiro.
- **Pessoas são fictícias.** Nenhum CPF ou CRC real foi usado. Os CPFs só têm o dígito verificador válido
  (`REGRA_VALIDA_CPF`); o CRC só tem o formato do CFC. Usar CPF de pessoa real num livro, mesmo de teste, é dado pessoal
  de terceiro.
- O razão é o do tenant `seed-presumido` (2025, receita ≈ R$ 211 mil). Os números **não** são os da empresa. O PVA
  offline não cruza escrituração com cadastro, então o par CNPJ real + razão de teste não gera crítica.

## Empresa: Corpóreos – Serviços Terapêuticos S.A. (marca Espaçolaser)

Escolhida por ser serviço pessoal de estética, o mais perto do vertical salão/clínica entre as companhias abertas.

| Campo | Valor | Fonte | Grau |
|---|---|---|---|
| `cnpj` | `08845676000198` | CVM, cadastro de companhias abertas ([dados abertos](https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv), baixado em 13/10, SHA-256 `1648f675…7c90b`), CD_CVM 27669, situação ATIVO | verificado |
| `nome` | `CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.` | idem (DENOM_SOCIAL) | verificado |
| `endereco` / `num` / `bairro` | `AVENIDA DOS EUCALIPTOS` / `762` / `INDIANOPOLIS` | idem (sede) | verificado |
| `uf` / `cep` | `SP` / `04517050` | idem (a CVM grava `4517050`, sem o zero inicial) | verificado |
| `email` / `numTel` | `dri@espacolaser.com.br` / `1148583340` | idem (contato de RI da companhia) | verificado |
| `codMun` | `3550308` (São Paulo) | IBGE, [API de localidades](https://servicodados.ibge.gov.br/api/v1/localidades/municipios/3550308) | verificado |
| `codNat` | `2046` (Sociedade Anônima Aberta) | Tabela de Natureza Jurídica (CONCLA/IBGE); coerente com o registro na CVM | inferido (tabela não relida nesta sessão) |
| `cnaeFiscal` | `8650004` (fisioterapia) | só agregadores privados (MonitorCNPJ, Solutudo). O cartão CNPJ da Receita exige CAPTCHA | **inferido**: pista, não fonte oficial |
| `indNire` | `1` | S.A. registrada na JUCESP | inferido |
| `book.nire` | **em aberto** | não achado em fonte aberta. A consulta da JUCESP exige CAPTCHA | ver lacuna L3 do runbook |
| `indGrandePorte` | `0` | coerente com o razão do seed, não com a empresa real | escolha de teste |

## Livro e signatários (fictícios)

| Campo | Valor |
|---|---|
| `book.numOrd` / `natLivr` / `dtExSocial` | `1` / `LIVRO DIARIO` / `2025-12-31` |
| Signatário 1 (responsável legal) | `DIRETOR FICTICIO DE TESTE` · CPF `12345678062` · ECD `codAssin 203` / ECF `identQualif 203` (Diretor) · `indRespLegal S` |
| Signatário 2 (contador) | `CONTADOR FICTICIO DE TESTE` · CPF `23456789173` · `900` · CRC `SP-123456/O-1` · UF `SP` · `contador.teste@example.com` · `1148583340` · certidão `SP/2026/000001`, validade `2026-12-31` |

## Payloads

Conferidos contra os schemas Zod do backend (`SpedEcdRequestSchema` / `SpedEcfRequestSchema` do build `9f6477d8`),
**sem** chamar a geração (que grava o item de entrega):

```text
ECD OK (schema do backend aceita)
ECF OK (schema do backend aceita)
```

```json
{
  "ecd": {
    "unitId": "cmuw4yqxg001jcii0iz2yb9rw", "mappingVersion": "2025", "year": 2025,
    "declarant": { "cnpj": "08845676000198", "nome": "CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.", "uf": "SP", "codMun": "3550308", "indNire": "1", "indGrandePorte": "0" },
    "book": { "numOrd": "1", "natLivr": "LIVRO DIARIO", "dtExSocial": "2025-12-31" },
    "signers": [
      { "identNom": "DIRETOR FICTICIO DE TESTE", "identCpfCnpj": "12345678062", "codAssin": "203", "indRespLegal": "S" },
      { "identNom": "CONTADOR FICTICIO DE TESTE", "identCpfCnpj": "23456789173", "codAssin": "900", "indRespLegal": "N",
        "indCrc": "SP-123456/O-1", "ufCrc": "SP", "email": "contador.teste@example.com", "fone": "1148583340",
        "numSeqCrc": "SP/2026/000001", "dtCrc": "2026-12-31" }
    ]
  },
  "ecf": {
    "unitId": "cmuw4yqxg001jcii0iz2yb9rw", "year": 2025,
    "declarant": { "cnpj": "08845676000198", "nome": "CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.", "codNat": "2046", "cnaeFiscal": "8650004",
      "endereco": "AVENIDA DOS EUCALIPTOS", "num": "762", "bairro": "INDIANOPOLIS", "uf": "SP", "codMun": "3550308", "cep": "04517050",
      "email": "dri@espacolaser.com.br", "numTel": "1148583340" },
    "signers": [
      { "identNom": "DIRETOR FICTICIO DE TESTE", "identCpfCnpj": "12345678062", "identQualif": "203", "email": "diretor.teste@example.com", "fone": "1148583340" },
      { "identNom": "CONTADOR FICTICIO DE TESTE", "identCpfCnpj": "23456789173", "identQualif": "900", "email": "contador.teste@example.com", "fone": "1148583340", "indCrc": "SP-123456/O-1" }
    ]
  }
}
```

## Pontos em aberto antes do passo 3

1. **NIRE.** Se a JUCESP for consultada (CAPTCHA, só o dono), preencha `book.nire`. Sem ele, o passo 4 é o
   oráculo da lacuna L3: se o PVA criticar o I030, isso é achado de DTO, não de contabilidade.
2. **Regime.** Uma S.A. aberta desse porte é Lucro Real na vida real. A ECF Presumido aqui prova o gerador, não a
   situação fiscal da empresa.
