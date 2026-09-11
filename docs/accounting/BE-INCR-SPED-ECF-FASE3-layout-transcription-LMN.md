# BE-INCR-SPED-ECF-FASE3B — Passo A: transcrição dos Blocos L/M/N (Manual do Leiaute 12)

> **Estado:** Passo A CONCLUÍDO (item 1 do BRIEF `BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md`), `sessao-feature`
> autorizada por dono, em sessão, 2026-09-11 (*"abre o PR e autoriza a sessao-feature do Passo A"*). Docs-only.
> Gerado por script a partir do corpus local — nenhum campo foi digitado de memória. Nome de campo marcado com `†`
> foi **normalizado pelo parser** (o PDF quebra nomes longos: `IND_ SD_INI_LAL` → `IND_SD_INI_LAL`, `VL_LCTO_PARTE B` →
> `VL_LCTO_PARTE_B`) e conferido contra a página. Campo marcado `[PARSER?]` (se houver) não fechou e precisa de leitura manual. Toda página é a impressa no PDF (`Página N de 621`).

## Fonte normativa

- **Manual de Orientação do Leiaute 12 da ECF** — Anexo ao ADE Cofis nº 02/2026, **Atualização: maio/2026**
  (índice oficial `sped.rfb.gov.br/pasta/show/1644`: *"Leiaute 12 (Atualização: 20/05/2026)"*), 621 páginas.
  Arquivo: `docs/accounting/fontes-oficiais/Manual-ECF-Leiaute-12.pdf` — sha256 `7216ec2bd62de7d45e5b019298be2420d08c2a3c6ade3646a053412937e95265`.
- **Tabelas Dinâmicas e Planos Referenciais da ECF, Leiaute 12 (28/05/2026)** —
  `docs/accounting/fontes-oficiais/RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx` — sha256 `366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac`.
- Extração: `pdf-parse` (já em `server/node_modules`) com marcador por página; XLSX via `exceljs`. Reponível:
  `node scripts/baixar-fontes-oficiais.mjs` + `node scripts/transcrever-ecf-lmn.mjs`.

## Legenda

- Obrigatoriedade de **Entrada** (Tabela de Registros, p.42): `O` Obrigatório · `F` Facultativo · `OC` Obrigatório
  Condicional · `N` Não Deve Existir. **Entrada** = importação do nosso `.txt`; **Saída** = transmissão.
- Tipo de campo: `C` caractere · `N` numérico · `NS` numérico **sinalizado** (p.31).
- `TIPO` das Tabelas Dinâmicas: `E` Entrada (nossa) · `CNA` Calculada Não Alterável (PVA, com FÓRMULA) ·
  `CA` Calculada Alterável · `R` Rótulo/subtotal.

## Matriz de obrigatoriedade — Bloco L/M/N (Tabela de Registros, pp.46-49)

| Registro | Entrada | Saída | Ocorrência | Nota |
|---|---|---|---|---|
| L001 | F | O | 1:1 | |
| L030 | F | OC | 0:13 | períodos "conforme parâmetros do Bloco 0" (p.221) |
| L100 / L200 / L210 / L300 | F | OC | 0:N | **fora deste incremento** (Fork 6→b): saldos finais de L100/L300 "não são editáveis" (pp.224/232) |
| L990 | F | O | 1:1 | |
| M001 | F | O | 1:1 | |
| M010 | F | — | — | Parte B — identificação da conta |
| M030 | F | — | 0:13 | |
| M300 / M350 | F | — | 0:N | Parte A (e-Lalur / e-Lacs) |
| M305 · M310 · M312 · M355 · M360 | F | — | — | filhos de M300/M350 |
| M410 · M500 | F | — | — | Parte B — lançamento sem reflexo / controle de saldos |
| **M990** | **N** | O | 1:1 | **Entrada = N** (p.47) — ver pendência PVA no BRIEF §4 item 1 |
| N001 | F | O | 1:1 | |
| N030 | F | OC (FORMA_TRIB ∈ 1,2,3,4) | 0:13 | |
| N500 | F | OC (FORMA_TRIB ∈ 1,2,3,4) | 0:N | |
| N630 / N670 | F | — | 0:N | |
| N990 | F | O | 1:1 | |

> As colunas Saída/Ocorrência marcadas "—" não foram lidas linha a linha nesta passada (a matriz nas pp.46-49
> quebra os nomes longos em 2-3 linhas e o parser não fecha a coluna com segurança). O que importa para o
> serializer — **Entrada** — foi lido para todos.


## Registros — campo a campo

### L001 — Abertura do Bloco L (p.220)

- Nível / Ocorrência: **1 / 1:1** · Campo(s) chave: `[REG]`
- Regras de validação (cabeçalho): `REGRA_OCORRENCIA_UNITARIA_ARQ`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo contendo a identificação do registro (L001). | C | 4 | - | [L001] | Sim |
| 2 | `IND_DAD` | Indicador de movimento: 0 – Bloco com dados informados. 1 – Bloco sem dados informados. | N | 1 | - | [0;1] | Sim |

Regras (seção I do registro):

- `REGRA_OCORRENCIA_UNITARIA_ARQ`: Verifica se registro ocorreu apenas uma vez por arquivo, considerando a chave “L001” (REG). Se a regra não for cumprida, a ECF gera um erro. Exemplo de Preenchimento: |L001|0| |L001|: Identificação do tipo do registro. |0|: Indica que o bloco possui dados info…

### L030 — Identificação dos Períodos e Formas de Apuração do IRPJ e da CSLL no Ano-Calendário (p.221)

> Registro de identificação dos períodos da escrituração necessários conforme definições de parâmetros do Bloco 0.

- Nível / Ocorrência: **2 / 0:13** · Campo(s) chave: `PER_APUR`
- Regras de validação (cabeçalho): —

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (L030). | C | 4 | - | [L030] | Sim |
| 2 | `DT_INI` | Data do Início do Período | N | 8 | - | - | Sim |
| 3 | `DT_FIN` | Data do Fim do período | N | 8 | - | - | Sim |
| 4 | `PER_APUR` | Período de apuração [para 0010.FORMA_APUR = “A”]: A00 – Receita Bruta/ Balanço de Suspensão e Redução Anual A0… | C | 3 | - | [A00; A01; A02; A03; A04; A05; A06; A07; A08; A09; A10; A11; A12; T01; T02; T03; | Sim |

Regras (seção I do registro):

- `REGRA_DUPLICIDADE_DESPREZADA`: Verifica se o registro já foi importado anteriormente, de acordo com a chave e os registros pais. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_PERIODO_DESPREZADO`: Verifica se a linha deste período existe no arquivo de importação, mas não deve ser importado, pois as datas não compatíveis com o período da ECF. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_ALTERADA`: Verifica se a linha deste período existe no arquivo de importação, mas deve ser alterada, pois as datas não compatíveis com o período da ECF. Se a regra não for cumprida, a ECF gera um aviso. Exemplo de Preenchimento: |L030|01012025|31032025|T01| |L030|: Ident…

### L990 — Encerramento do Bloco L (p.235)

- Nível / Ocorrência: **1 / 1:1** · Campo(s) chave: `[REG]`
- Regras de validação (cabeçalho): —

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo contendo a identificação do registro (L990). | C | 4 | - | [L990] | Sim |
| 2 | `QTD_LIN` | Quantidade total de registros do Bloco L. | N | - | - | - | Sim |

### M001 — Abertura do Bloco M (p.236)

- Nível / Ocorrência: **1 / 1:1** · Campo(s) chave: `[REG]`
- Regras de validação (cabeçalho): `REGRA_OCORRENCIA_UNITARIA_ARQ`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo contendo a identificação do registro (M001). | C | 4 | - | [M001] | Sim |
| 2 | `IND_DAD` | Indicador de movimento: 0 – Bloco com dados informados. 1 – Bloco sem dados informados. | N | 1 | - | [0;1] | Sim |

Regras (seção I do registro):

- `REGRA_OCORRENCIA_UNITARIA_ARQ`: Verifica se registro ocorreu apenas uma vez por arquivo, considerando a chave “M001” (REG). Se a regra não for cumprida, a ECF gera um erro. Exemplo de Preenchimento: |M001|0| |M001|: Identificação do tipo do registro. |0|: Indica que o bloco possui dados info…

### M010 — Identificação da Conta na Parte B do e-Lalur e do e-Lacs (p.237)

> Cadastra os saldos iniciais no período da escrituração das contas da parte B utilizadas no e-LALUR e no e-LACS. O registro pode ser replicado da ECF anterior, importado e/ou editado.

- Nível / Ocorrência: **2 / 0:N** · Campo(s) chave: `COD_CTA_B + COD_TRIBUTO`
- Regras de validação (cabeçalho): `REGRA_DIVERGENCIA_E020_M010 REGRA_EXISTENCIA_M010`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo contendo a identificação do registro (M010). | C | 4 | - | [M010] | Sim |
| 2 | `COD_CTA_B` | Código Unívoco Atribuído pela Pessoa Jurídica à Conta no e-Lalur | C | - | - | - | Sim |
| 3 | `DESC_CTA_LAL` | Descrição da Conta. | C | - | - | - | Sim |
| 4 | `DT_AP_LAL` | Data Final: Data final do período de apuração em que a conta foi criada. | C | 8 | - | - | Sim |
| 5 | `COD_PB_RFB` | Código da tabela padrão da Parte B. Vide planilha PARTEB_PADRAO do arquivo “Tabelas_Dinamicas_ECF_Leiaute_12_A… | C | 6 | - | - | Sim |
| 6 | `DT_LIM_LAL` | Data Limite: Data limite para a exclusão, adição ou compensação do valor controlado, se houver. | C | 8 | - | - | Não |
| 7 | `COD_TRIBUTO` | Indicador do Tributo da Adição/Exclusão: I – Imposto de Renda Pessoa Jurídica C – Contribuição Social sobre o … | C | 1 | - | [I; C] | Sim |
| 8 | `VL_SALDO_INI` | Saldo Inicial: Saldo no período inicial desta escrituração. Se M010.DT_AP_LAL for no período da escrituração, … | N | 19 | 2 | - | Sim |
| 9 | `IND_VL_SALDO_INI` | Indicador do Saldo Inicial: D – Para prejuízos ou valores que reduzam o lucro real ou a base de cálculo da con… | C | 1 | - | [D; C] | Sim |
| 10 | `CNPJ_SIT_ESP` | CNPJ da outra pessoa jurídica relacionada com evento originário da conta. Exemplos: 1- Identificar a investida… | C | 14 | - | - | Não |

Regras (seção I do registro):

- `REGRA_EXISTENCIA_M010`: Verifica se os saldos recuperados no registro E020 existem no registro M010. A advertência ocorre se 0010.FORMA_TRIB = “1”, “2”, “3” ou “4”, para cada E020 com VL_SALDO_FIN diferente de zero não localizado no registro M010.
- `REGRA_SALDOS_M010_E020`: Verifica se os saldos recuperados no registro E020 são iguais aos saldos do registro M010. O erro ocorre se 0010.FORMA_TRIB = “1”, “2”, “3” ou “4”, para cada M010 localizado no registro E020 com conteúdo diferente em qualquer dos seguintes campos do registro M…

### M030 — Identificação dos Períodos e Formas de Apuração do IRPJ e da CSLL das Empresas Tributadas pelo Lucro Real (p.241)

> Registro de identificação dos períodos da escrituração necessários conforme definições de parâmetros do Bloco 0.

- Nível / Ocorrência: **2 / 0:13** · Campo(s) chave: `PER_APUR`
- Regras de validação (cabeçalho): `REGRA_DUPLICIDADE_DESPREZADA` · `REGRA_PERIODO_DESPREZADO. REGRA_LINHA_ALTERADA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M030). | C | 4 | - | [M030] | Sim |
| 2 | `DT_INI` | Data do Início do Período | N | 8 | - | - | Sim |
| 3 | `DT_FIN` | Data do Fim do período | N | 8 | - | - | Sim |
| 4 | `PER_APUR` | Período de apuração [para 0010.FORMA_APUR = “A”]: A00 – Receita Bruta/ Balanço de Suspensão e Redução Anual A0… | C | 3 | - | [A00; A01; A02; A03; A04; A05; A06; A07; A08; A09; A10; A11; A12; T01; T02; T03; | Sim |

Regras (seção I do registro):

- `REGRA_DUPLICIDADE_DESPREZADA`: Verifica se o registro já foi importado anteriormente, de acordo com a chave e os registros pais. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_PERIODO_DESPREZADO`: Verifica se a linha deste período existe no arquivo de importação, mas não deve ser importado, pois as datas não compatíveis com o período da ECF. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_ALTERADA`: Verifica se a linha deste período existe no arquivo de importação, mas deve ser alterada, pois as datas não compatíveis com o período da ECF. Se a regra não for cumprida, a ECF gera um aviso. Exemplo de Preenchimento: |M030|01012024|31032024|T01| |M030|: Ident…

### M300 — Demonstração do Lucro Real – Lançamentos da Parte A do e-Lalur (p.244)

> Apresenta os lançamentos da parte A do e-LALUR. Este registro demonstrará a apuração da base de cálculo da IRPJ anual, trimestral e nos meses com estimativa apurada com base no

- Nível / Ocorrência: **3 / 1:N** · Campo(s) chave: `CODIGO`
- Regras de validação (cabeçalho): `REGRA_VALOR_DETALHADO` · `REGRA_DUPLICIDADE_DESPREZADA` · `REGRA_LINHA_DESPREZADA` · `REGRA_LINHA_ATUALIZADA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M300). | C | 4 | - | [M300] | Sim |
| 2 | `CODIGO` | Código do Lançamento no e-Lalur, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro … | C | - | - | — | Sim |
| 3 | `DESCRICAO` | Descrição do Tipo de Lançamento no e-Lalur, conforme tabela dinâmica do Sped (Disponibilizada no item III dest… | C | - | - | — | Não |
| 4 | `TIPO_LANCAMENTO` | Indicador do Tipo de Lançamento: A- Adição E - Exclusão. P - Compensação de Prejuízo L - Lucro Observação: O t… | C | 1 | - | [A; E; P; L] | Não |
| 5 | `IND_RELACAO` | Indicador de Relacionamento do Lançamento da Parte A: 1 - Com Conta da Parte B 2 - Com Conta Contábil 3 – Com … | N | 1 | - | [1; 2; 3; 4] | Não |
| 6 | `VALOR` | Valor do Lançamento no e-Lalur | NS | 19 | 2 | - | Não |
| 7 | `HIST_LAN_LAL` | Histórico do Lançamento no e-Lalur | C | 500 | - | - | Não |

### M305 — Conta da Parte B do e-Lalur (p.250)

> Relacionamento do lançamento da parte A do e-Lalur com a conta da parte B do e-Lalur, de acordo com as regras abaixo:

- Nível / Ocorrência: **4 /  0:N** · Campo(s) chave: `COD_CTA_B`
- Regras de validação (cabeçalho): —

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M305). | C | 4 | - | [M305] | Sim |
| 2 | `COD_CTA_B` | Código da Conta na Parte B: Código unívoco atribuído pelo contribuinte à conta no e-Lalur no registro M010. | C | - | - | [M010.COD_CTA_B] | Sim |
| 3 | `VL_CTA` | Valor Total dos Lançamentos: Valor total dos lançamentos adicionados ou excluídos da conta. Observação: Valor … | N | 19 | 2 | - | Sim |
| 4 | `IND_VL_CTA†` | Indicador do Valor Total dos Lançamentos: D – Para prejuízos ou valores que reduzam o lucro real em períodos s… | C | 1 | - | [D; C] | Sim |

### M310 — Contas Contábeis Relacionadas ao Lançamento da Parte A do e-Lalur (p.252)

> Relaciona os lançamentos da parte A do e-Lalur com as contas contábeis.

- Nível / Ocorrência: **4 / 0:N** · Campo(s) chave: `COD_CTA + COD_CCUS`
- Regras de validação (cabeçalho): `REGRA_REGISTRO_M312_OBRIGATORIO`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M310). | C | 4 | - | [M310] | Sim |
| 2 | `COD_CTA` | Código da Conta Contábil (Plano de Contas da Pessoa Jurídica): Código da conta ou subconta contábil onde está … | C | - | - | [J050.COD_CTA] | Sim |
| 3 | `COD_CCUS` | Código do Centro de Custos (deve existir no J100). | C | - | - | [J100_COD_CCUS] | Não |
| 4 | `VL_CTA` | Valor da Conta Utilizado no Lançamento da Parte A. | N | 19 | 2 | - | Sim |
| 5 | `IND_VL_CTA` | Indicador do Valor do Lançamento: D – Devedor. C – Credor. | C | 1 | - | [D; C] | Sim |

Regras (seção I do registro):

- `REGRA_REGISTRO_M312_OBRIGATORIO`: Verifica se o registro M312 foi preenchido no caso de M310.VL_CTA, para o mesmo M310.COD_CTA e M310.COD_CCUS: - No caso de J050.COD_NAT igual a“1” (Ativo), “2” (Passivo) ou “3” (Patrimônio Líquido): - For diferente do saldo final da conta em K155.VL_SLD_FIN no…

### M312 — Números dos Lançamentos Relacionados à Conta Contábil (p.254)

>  Esse registro é de preenchimento facultativo para PJ Componente do Sistema Financeiro (0010.COD_QUALIF_PJ = “02”) ou Sociedades Seguradoras, de Capitalização ou Entidade Aberta de

- Nível / Ocorrência: **5 /  0:N** · Campo(s) chave: `NUM_LCTO`
- Regras de validação (cabeçalho): `REGRA_FINANCEIRAS_NAO_OBRIGATORIO`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M312). | C | 4 | - | [M312] | Sim |
| 2 | `NUM_LCTO` | Número do Lançamento Descrito na ECD (Escrituração Contábil Digital) no campo 2 (NUM_LCTO) registro “I200 – La… | C | 50 | - | - | Sim |

### M350 — Demonstração da Base de Cálculo da CSLL – Lançamentos da Parte A do e-Lacs (p.256)

> Apresenta os lançamentos da parte A do e-Lacs. Este registro demonstrará a apuração da base de cálculo da CSLL anual, trimestral e nos meses com estimativa apurada com base no

- Nível / Ocorrência: **3 /  1:N** · Campo(s) chave: `CODIGO`
- Regras de validação (cabeçalho): `REGRA_VALOR_DETALHADO` · `REGRA_DUPLICIDADE_DESPREZADA` · `REGRA_LINHA_DESPREZADA` · `REGRA_LINHA_ATUALIZADA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M350). | C | 4 | - | [M350] | Sim |
| 2 | `CODIGO` | Código do Lançamento no e-Lalur, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro … | C | - | - | — | Sim |
| 3 | `DESCRICAO` | Descrição do Tipo de Lançamento no e-Lalur, conforme tabela dinâmica do Sped (Disponibilizada no item III dest… | C | - | - | — | Não |
| 4 | `TIPO_LANCAMENTO` | Indicador do Tipo de Lançamento: A- Adição E - Exclusão. P - Compensação de Prejuízo L - Lucro Observação: O t… | C | 1 | - | [A; E; P; L] | Não |
| 5 | `IND_RELACAO` | Indicador de Relacionamento do Lançamento da Parte A: 1 - Com Conta da Parte B 2 - Com Conta Contábil 3 – Com … | N | 1 | - | [1; 2; 3; 4] | Não |
| 6 | `VALOR` | Valor do Lançamento no e-Lalur | NS | 19 | 2 | - | Não |
| 7 | `HIST_LAN_LAL` | Histórico do Lançamento no e-Lalur | C | 500 | - | - | Não |

### M355 — Conta da Parte B do e-Lacs (p.262)

> Relacionamento do lançamento da parte A do e-Lacs com a conta da parte B do e-Lacs, de acordo com as regras abaixo:

- Nível / Ocorrência: **4 /  0:N** · Campo(s) chave: `COD_CTA_B`
- Regras de validação (cabeçalho): `REGRA_SALDO_DISPONIVEL_PARTE_B`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M355). | C | 4 | - | [M355] | Sim |
| 2 | `COD_CTA_B` | Código da Conta na Parte B: Código unívoco atribuído pelo contribuinte à conta no e-Lacs no registro M010. | C | - | - | [M010.COD_CTA_B] | Sim |
| 3 | `VL_CTA` | Valor Total dos Lançamentos: Valor total dos lançamentos adicionados ou excluídos da conta. Observação: Valor … | N | 19 | 2 | - | Sim |
| 4 | `IND_VL_CTA†` | Indicador do Valor Total dos Lançamentos: D – Para prejuízos ou valores que reduzam o lucro real em períodos s… | C | 1 | - | [D; C] | Sim |

### M360 — Contas Contábeis Relacionadas ao Lançamento da Parte A do e-Lacs (p.264)

> Relaciona os lançamentos da parte A do e-Lacs com as contas contábeis.

- Nível / Ocorrência: **4 / 0:N** · Campo(s) chave: `COD_CTA + COD_CCUS`
- Regras de validação (cabeçalho): `REGRA_REGISTRO_M362_OBRIGATORIO`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M360). | C | 4 | - | [M360] | Sim |
| 2 | `COD_CTA` | Código da Conta Contábil (Plano de Contas da Pessoa Jurídica): Código da conta ou subconta contábil onde está … | C | - | - | [J050.COD_CTA] | Sim |
| 3 | `COD_CCUS` | Código do Centro de Custos (deve existir no J100). | C | - | - | [J100_COD_CCUS] | Não |
| 4 | `VL_CTA` | Valor da Conta Utilizado no Lançamento da Parte A. | N | 19 | 2 | - | Sim |
| 5 | `IND_VL_CTA` | Indicador do Valor do Lançamento: D – Devedor. C – Credor. | C | 1 | - | [D; C] | Sim |

Regras (seção I do registro):

- `REGRA_REGISTRO_M362_OBRIGATORIO`: Verifica se o registro M362 foi preenchido no caso de M360.VL_CTA, para o mesmo M360.COD_CTA e M360.COD_CCUS: - No caso de J050.COD_NAT igual “1” (Ativo), “2” (Passivo) ou “3” (Patrimônio Líquido): - For diferente do saldo final da conta em K155.VL_SLD_FIN no …

### M410 — Lançamento na Conta da Parte B do e-Lalur e do e-Lacs sem Reflexo na Parte A (p.268)

> Apresenta os lançamentos em contas da parte B sem reflexos na parte A.

- Nível / Ocorrência: **3 / 0:N** · Campo(s) chave: `—`
- Regras de validação (cabeçalho): `REGRA_PREJUIZO_FISCAL` · `REGRA_BC_NEGATIVA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M410). | C | 4 | - | [M410] | Sim |
| 2 | `COD_CTA_B` | Código da Conta do Lançamento (conta da Parte B) | C | - | - | - | Não |
| 3 | `COD_TRIBUTO` | Código do Tributo: I – Imposto de Renda C – Contribuição Social sobre o Lucro Líquido | C | 1 | - | [I; C] | Sim |
| 4 | `VAL_LAN_LALB_PB` | Valor do Lançamento. | N | 19 | 2 | - | Sim |
| 5 | `IND_VAL_LAN_LALB_PB` | Indicador do Lançamento: CR – Crédito DB – Débito PF - Prejuízo do exercício. BC - Base de cálculo negativa da… | C | - | - | [CR; DB; PF; BC] | Sim |
| 6 | `COD_CTA_B_CTP` | Código Unívoco da Contrapartida (conta da Parte B), caso seja necessária a transferência de saldo de uma conta… | C | - | - | - | Não |
| 7 | `HIST_LAN_LALB` | Histórico do Lançamento. | C | - | - | - | Sim |
| 8 | `IND_LAN_ANT` | Lançamento para Realização de Valores Cuja Tributação Tenha Sido Diferida: S – Sim N – Não Observação: Marca-s… | C | 1 | - | [S; N] | Sim |

Regras (seção I do registro):

- `REGRA_PREJUIZO_FISCAL`: Verifica se o somatório dos lançamentos de prejuízo fiscal é igual ao valor da base de cálculo do IRPJ. Se a regra não for cumprida, a ECF gera um erro.
- `REGRA_BC_NEGATIVA`: Verifica se o somatório dos lançamentos da base de cálculo negativa da CSLL é igual ao valor da base de cálculo da CSLL. Se a regra não for cumprida, a ECF gera um erro.

### M500 — Controle de Saldos das Contas da Parte B do e-Lalur e do e-Lacs (p.271)

> Apresenta a visão sintética do controle de saldos das contas da parte B do e-LALUR e e-LACS. Registro gerado pelo sistema a partir do saldo inicial e das movimentações.

- Nível / Ocorrência: **3 / 0:N** · Campo(s) chave: `COD_CTA_B + COD_TRIBUTO`
- Regras de validação (cabeçalho): —

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (M500). | C | 4 | - | [M500] | Sim |
| 2 | `COD_CTA_B` | Código Unívoco Atribuído Pelo Contribuinte à Conta no e-Lalur e no e-Lacs (deve existir no M010.COD_CTA_B) | C | - | - | [M010.COD_CTA_B] | Sim |
| 3 | `COD_TRIBUTO` | Código do Tributo: I – Imposto de Renda C – Contribuição Social Sobre o Lucro Líquido | C | 1 | - | [I; C] | Sim |
| 4 | `SD_INI_LAL` | Saldo Inicial da Conta no Período de Apuração. | N | 19 | 2 | - | Sim |
| 5 | `IND_SD_INI_LAL†` | Indicador de Saldo Inicial: D – Para prejuízos ou valores que serão excluídos do lucro real ou da base de cálc… | C | 1 | - | [C; D] | Sim |
| 6 | `VL_LCTO_PARTE_A` | Somatório dos Lançamentos da Parte B com Reflexo na Parte A no Período. | N | 19 | 2 | - | Sim |
| 7 | `IND_VL_LCTO_PARTE_A†` | Indicador do Somatório dos Lançamentos da Parte B com Reflexo na Parte A no período: C – Para prejuízos ou val… | C | 1 | - | [C; D] | Sim |
| 8 | `VL_LCTO_PARTE_B†` | Somatório dos Lançamentos da Parte B Sem Reflexo na Parte A no Período (entre contas da parte B). | N | 19 | 2 | - | Sim |
| 9 | `IND_VL_LCTO_PARTE_B†` | Indicador Somatório dos Lançamentos da Parte B Sem Reflexo na Parte A no Período (entre contas da parte B): C … | C | 1 | - | [C; D] | Sim |
| 10 | `SD_FIM_LAL` | Saldo Final da Conta no Período de Apuração. | N | 19 | 2 | - | Sim |
| 11 | `IND_SD_FIM_LAL†` | Indicador de Saldo Final: D – Para prejuízos ou valores que serão excluídos do lucro real ou da base de cálcul… | C | 1 | - | [C; D] | Sim |

### M990 — Encerramento do Bloco M (p.275)

- Nível / Ocorrência: **1 / 1:1** · Campo(s) chave: `[REG]`
- Regras de validação (cabeçalho): —

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo contendo a identificação do registro (M990). | C | 4 | - | [M990] | Sim |
| 2 | `QTD_LIN` | Quantidade total de registros do Bloco M. | N | - | - | - | Sim |

### N001 — Abertura do Bloco N (p.276)

- Nível / Ocorrência: **1 / 1:1** · Campo(s) chave: `[REG]`
- Regras de validação (cabeçalho): `REGRA_OCORRENCIA_UNITARIA_ARQ`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo contendo a identificação do registro (N001). | C | 4 | - | [N001] | Sim |
| 2 | `IND_DAD` | Indicador de movimento: 0 – Bloco com dados informados. 1 – Bloco sem dados informados. | N | 1 | - | [0;1] | Sim |

Regras (seção I do registro):

- `REGRA_OCORRENCIA_UNITARIA_ARQ`: Verifica se registro ocorreu apenas uma vez por arquivo, considerando a chave “N001” (REG). Se a regra não for cumprida, a ECF gera um erro. Exemplo de Preenchimento: |N001|0| |N001|: Identificação do tipo do registro. |0|: Indica que o bloco possui dados info…

### N030 — Identificação dos Períodos e Formas de Apuração do IRPJ e da CSLL das Empresas Tributadas pelo Lucro Real (p.277)

> Registro de identificação dos períodos da escrituração necessários conforme definições de parâmetros do Bloco 0.

- Nível / Ocorrência: **2 / 0:13** · Campo(s) chave: `PER_APUR`
- Regras de validação (cabeçalho): `REGRA_DUPLICIDADE_DESPREZADA` · `REGRA_PERIODO_DESPREZADO` · `REGRA_LINHA_ALTERADA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (N030). | C | 4 | - | [N030] | Sim |
| 2 | `DT_INI` | Data do Início do Período | N | 8 | - | - | Sim |
| 3 | `DT_FIN` | Data do Fim do período | N | 8 | - | - | Sim |
| 4 | `PER_APUR` | Período de apuração [para 0010.FORMA_APUR = “A”]: A00 – Receita Bruta/ Balanço de Suspensão e Redução Anual A0… | C | 3 | - | [A00; A01; A02; A03; A04; A05; A06; A07; A08; A09; A10; A11; A12; T01; T02; T03; | Sim |

Regras (seção I do registro):

- `REGRA_DUPLICIDADE_DESPREZADA`: Verifica se o registro já foi importado anteriormente, de acordo com a chave e os registros pais. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_PERIODO_DESPREZADO`: Verifica se a linha deste período existe no arquivo de importação, mas não deve ser importado, pois as datas não compatíveis com o período da ECF. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_ALTERADA`: Verifica se a linha deste período existe no arquivo de importação, mas deve ser alterada, pois as datas não compatíveis com o período da ECF. Se a regra não for cumprida, a ECF gera um aviso. Exemplo de Preenchimento: |N030|01012024|31032024|T01| |N030|: Ident…

### N500 — Base de Cálculo do IRPJ Sobre o Lucro Real Após as Compensações de Prejuízos (p.280)

> Apresenta a base de cálculo do IRPJ após as compensações de prejuízos.

- Nível / Ocorrência: **3 / 1:13** · Campo(s) chave: `REG`
- Regras de validação (cabeçalho): `REGRA_DUPLICIDADE_DESPREZADA REGRA_LINHA_DESPREZADA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (N500). | C | 4 | - | [N500] | Sim |
| 2 | `CODIGO` | Código, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro e no programa da ECF no d… | C | - | - | - | Sim |
| 3 | `DESCRICAO` | Descrição, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro e no programa da ECF n… | C | - | - | - | Não |
| 4 | `VALOR` | Valor | C | - | - | - | Não |

Regras (seção I do registro):

- `REGRA_DUPLICIDADE_DESPREZADA`: Verifica se o registro já foi importado anteriormente, de acordo com a chave e os registros pais. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_DESPREZADA`: Verifica se o registro existe na importação, mas não será importado por não existir na tabela dinâmica devido às configurações do bloco 0 ou da tabela dinâmica. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_ATUALIZADA`: Verifica se o registro está desatualizado em relação à tabela da RFB. Se a regra não for cumprida, a ECF gera um aviso.

### N630 — Apuração do IRPJ Com Base no Lucro Real (p.298)

> Apresenta o cálculo do IRPJ com base no lucro real.

- Nível / Ocorrência: **3 / 0:N** · Campo(s) chave: `CODIGO`
- Regras de validação (cabeçalho): `REGRA_DUPLICIDADE_DESPREZADA` · `REGRA_LINHA_DESPREZADA` · `REGRA_LINHA_ATUALIZADA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (N630). | C | 4 | - | [N630] | Sim |
| 2 | `CODIGO` | Código, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro e no programa da ECF no d… | C | - | - | - | Sim |
| 3 | `DESCRICAO` | Descrição, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro e no programa da ECF n… | C | - | - | - | Não |
| 4 | `VALOR` | Valor | C | - | - | - | Não |

Regras (seção I do registro):

- `REGRA_DUPLICIDADE_DESPREZADA`: Verifica se o registro já foi importado anteriormente, de acordo com a chave e os registros pais. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_DESPREZADA`: Verifica se o registro existe na importação, mas não será importado por não existir na tabela dinâmica devido às configurações do bloco 0 ou da tabela dinâmica. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_ATUALIZADA`: Verifica se o registro está desatualizado em relação à tabela da RFB. Se a regra não for cumprida, a ECF gera um aviso.

### N670 — Apuração da CSLL Com Base no Lucro Real (p.307)

> Este registro apresenta o cálculo da CSLL com base no lucro real.

- Nível / Ocorrência: **3 / 0:N** · Campo(s) chave: `CODIGO`
- Regras de validação (cabeçalho): `REGRA_DUPLICIDADE_DESPREZADA` · `REGRA_LINHA_DESPREZADA` · `REGRA_LINHA_ATUALIZADA`

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto Fixo Contendo a Identificação do Registro (N670). | C | 4 | - | [N670] | Sim |
| 2 | `CODIGO` | Código, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro e no programa da ECF no d… | C | - | - | - | Sim |
| 3 | `DESCRICAO` | Descrição, conforme tabela dinâmica do Sped (Disponibilizada no item III deste registro e no programa da ECF n… | C | - | - | - | Não |
| 4 | `VALOR` | Valor | NS | 19 | 2 | - | Não |

Regras (seção I do registro):

- `REGRA_DUPLICIDADE_DESPREZADA`: Verifica se o registro já foi importado anteriormente, de acordo com a chave e os registros pais. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_DESPREZADA`: Verifica se o registro existe na importação, mas não será importado por não existir na tabela dinâmica devido às configurações do bloco 0 ou da tabela dinâmica. Se a regra não for cumprida, a ECF gera um aviso.
- `REGRA_LINHA_ATUALIZADA`: Verifica se o registro está desatualizado em relação à tabela da RFB. Se a regra não for cumprida, a ECF gera um aviso.

### N990 — Encerramento do Bloco N (p.309)

- Nível / Ocorrência: **1 / 1:1** · Campo(s) chave: `[REG]`
- Regras de validação (cabeçalho): —

| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |
|---|---|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo contendo a identificação do registro (N990). | C | 4 | - | [N990] | Sim |
| 2 | `QTD_LIN` | Quantidade total de registros do Bloco N. | N | - | - | - | Sim |


## Tabelas Dinâmicas — contagem por aba

| Aba | Linhas | E | CNA | CA | R | outros |
|---|--:|--:|--:|--:|--:|---|
| M300A | 386 | 374 | 7 | 1 | 4 | — |
| M350A | 353 | 342 | 7 | 0 | 4 | — |
| N500 | 2 | 1 | 1 | 0 | 0 | — |
| N630A | 45 | 26 | 15 | 2 | 2 | — |
| N670 | 38 | 26 | 5 | 5 | 2 | — |

> As linhas `CNA` (com FÓRMULA) e `CA` **nunca** são emitidas pelo Luminaris (Fork 3→a). As `E` abaixo são o
> universo do catálogo do item 10 do BRIEF; `DT_FIM` preenchido = linha encerrada; `DT_INI` posterior ao
> exercício = linha ainda não vigente (item 9: 400).

### M300A — 374 linhas `E`

| Código | Descrição | DT_INI | DT_FIM | TIPO LANÇ |
|---|---|---|---|---|
| 6 | Provisões ou perdas estimadas não dedutíveis | 2015-01-01 | — | A |
| 7 | Custos não dedutíveis | 2015-01-01 | — | A |
| 8 | Despesas não necessárias | 2015-01-01 | — | A |
| 8.01 | Realização de ativos indedutíveis | 2015-01-01 | — | A |
| 8.11 | PRONAC – despesa operacional – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.1101 | PRONAC - despesa operacional - redução linear de benefícios | 2026-01-01 | — | A |
| 8.12 | Pesquisas científicas e tecnológicas – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.13 | Doações a entidades civis – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.14 | Doações a instituições de ensino e pesquisa – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.1401 | Doação a instituições de ensino e pesquisa - redução linear de benefícios | 2026-01-01 | — | A |
| 8.15 | Vale cultura – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.16 | Planos de poupança e investimento – PAIT – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.1601 | Planos de poupança e investimento – PAIT - redução linear de benefícios | 2026-01-01 | — | A |
| 8.18 | Fundo de aposentadoria individual – FAPI – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.25 | Despesas de aluguéis - parcelas não dedutíveis | 2017-01-01 | — | A |
| 8.30 | Despesas com alimentação de sócios, acionistas e administradores | 2017-01-01 | — | A |
| 8.35 | Despesas com propaganda - parcelas não dedutíveis | 2017-01-01 | — | A |
| 8.40 | Despesas financeiras - lucros e/ou dividendos | 2017-01-01 | — | A |
| 8.45 | Doações | 2017-01-01 | — | A |
| 8.50 | Furto | 2017-01-01 | — | A |
| 8.55 | Despesas com bens não intrinsecamente relacionados com a produção ou comercialização de bens e serviços | 2017-01-01 | — | A |
| 8.60 | Multas por infrações fiscais | 2017-01-01 | — | A |
| 8.65 | Multas impostas por transgressões de leis de natureza não tributária | 2017-01-01 | — | A |
| 8.70 | Pagamentos sem causa | 2017-01-01 | — | A |
| 8.75 | Remuneração de sócios, diretores, administradores, titulares de empresas individuais e conselheiros fiscais e consultivo | 2017-01-01 | — | A |
| 8.80 | Remuneração indireta a administradores e terceiros | 2017-01-01 | — | A |
| 8.85 | Royalties e assistência técnica, científica e administrativa | 2017-01-01 | — | A |
| 8.90 | Serviços assistenciais e benefícios previdenciários a empregados e dirigentes - contribuições não compulsórias | 2017-01-01 | — | A |
| 8.95 | Serviços assistenciais e benefícios previdenciários a empregados e dirigentes - excesso em relação ao limite | 2017-01-01 | — | A |
| 8.97 | Pagamentos efetuados a sociedade simples | 2017-01-01 | — | A |
| 11.05 | Lucros, rendimentos e ganhos de capital auferidos no exterior - resultado positivo | 2017-01-01 | — | A |
| 11.10 | Lucros, rendimentos e ganhos de capital auferidos no exterior - parcela do ajuste do valor do investimento | 2017-01-01 | — | A |
| 11.15 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados por coligada no exterior | 2017-01-01 | — | A |
| 11.20 | Lucros, rendimentos e ganhos de capital auferidos no exterior - resultado da coligada | 2017-01-01 | — | A |
| 11.25 | Lucros, rendimentos e ganhos de capital auferidos no exterior - resultado da coligada no caso de descumprimento do art.  | 2017-01-01 | — | A |
| 11.30 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados | 2017-01-01 | — | A |
| 11.35 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados no caso d | 2017-01-01 | — | A |
| 11.40 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados no caso d | 2017-01-01 | — | A |
| 11.45 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados no caso d | 2017-01-01 | — | A |
| 11.50 | Lucros, rendimentos e ganhos de capital auferidos no exterior - investimentos não avaliados pela equivalência patrimonia | 2017-01-01 | — | A |
| 11.55 | Lucros, rendimentos e ganhos de capital auferidos no exterior - excluídos nos primeiro, segundo e terceiro trimestres | 2017-01-01 | — | A |
| 11.60 | Lucros, rendimentos e ganhos de capital auferidos no exterior - perdas incorridas em operações no exterior e reconhecida | 2017-01-01 | — | A |
| 12 | Ajustes decorrentes de métodos de preços de transferência | 2015-01-01 | — | A |
| 13 | Regras de subcapitalização - ajustes decorrentes de empréstimos com pessoa física ou jurídica, vinculada, residente ou d | 2015-01-01 | — | A |
| 13.05 | Regras de subcapitalização - ajustes decorrentes de empréstimos com pessoa física ou jurídica residente, domiciliada ou  | 2015-01-01 | — | A |
| 13.10 | Crédito presumido apurado com base em créditos decorrentes de diferenças temporárias oriundos de provisões para créditos | 2025-01-01 | — | A |
| 14 | Pagamento a pessoas situadas em país com tributação favorecida | 2015-01-01 | — | A |
| 15 | Variação cambial ativa - regra geral - operações liquidadas | 2015-01-01 | — | A |
| 16 | Variação cambial passiva - regra geral - valor evidenciado no registro L300 de acordo com o regime de competência. | 2015-01-01 | — | A |
| 16.05 | Variação cambial - mudança de regime de caixa para competência | 2017-01-01 | — | A |
| 16.10 | Variação cambial sobre juros a apropriar decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 16.15 | Variação cambial - redução nas receitas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 16.20 | Variação cambial - aumento nas despesas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 19.05 | Investimento avaliado pelo valor de patrimônio líquido - contrapartida por redução no valor de patrimônio líquido reconh | 2017-01-01 | — | A |
| 19.10 | Investimento avaliado pelo valor de patrimônio líquido - ganho proveniente de compra vantajosa | 2017-01-01 | — | A |
| 19.15 | Investimento avaliado pelo valor de patrimônio líquido – ganho proveniente de compra vantajosa - incorporação, fusão e c | 2017-01-01 | — | A |
| 19.20 | Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia | 2017-01-01 | — | A |
| 19.25 | Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill | 2017-01-01 | — | A |
| 19.30 | Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill - incoporação, fusão ou cisão | 2017-01-01 | — | A |
| 19.35 | Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia | 2017-01-01 | — | A |
| 19.40 | Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia - incorporação, fusão ou cisão | 2017-01-01 | — | A |
| 19.45 | Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia - incorporação, fusão ou cisão - quotas  | 2017-01-01 | — | A |
| 19.50 | Investimento avaliado pelo valor de patrimônio líquido - perda reconhecida no resultado por variação na porcentagem de p | 2017-01-01 | — | A |
| 19.55 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho com base no valor justo | 2017-01-01 | — | A |
| 19.60 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho decorrente do excesso do valor ju | 2017-01-01 | — | A |
| 19.65 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - perda com base no valor justo | 2017-01-01 | — | A |
| 19.70 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva da mais-va | 2017-01-01 | — | A |
| 19.75 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da mais-va | 2017-01-01 | — | A |
| 19.80 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva do goodwil | 2017-01-01 | — | A |
| 19.85 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa do goodwil | 2017-01-01 | — | A |
| 19.90 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução positiva da menos-valia | 2017-01-01 | — | A |
| 19.95 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da menos-v | 2017-01-01 | — | A |
| 19951 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - ganho - real | 2017-01-01 | — | A |
| 19952 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - ganho - alie | 2017-01-01 | — | A |
| 19953 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - registrado e | 2017-01-01 | — | A |
| 19954 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - registrado e | 2017-01-01 | — | A |
| 19955 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida não controlado por meio de subconta - registra | 2017-01-01 | — | A |
| 19956 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - não registrado em co | 2017-01-01 | — | A |
| 19957 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - registrado em conta  | 2017-01-01 | — | A |
| 19958 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida - não controlado por subconta - não registrado | 2017-01-01 | — | A |
| 19959 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida - não controlado por subconta - registrado em  | 2017-01-01 | — | A |
| 19960 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - realização da mais-valia integran | 2017-01-01 | — | A |
| 19961 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19962 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - contrapar | 2017-01-01 | — | A |
| 19963 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19964 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - perda dec | 2017-01-01 | — | A |
| 19965 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19966 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - contrapar | 2017-01-01 | — | A |
| 19967 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19968 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - regra de transição | 2017-01-01 | — | A |
| 19969 | Combinação de negócios, exceto investimento avaliado pelo valor de patrimônio líquido - contrapartida da redução do ágio | 2017-01-01 | — | A |
| 19970 | Combinação de negócios, exceto investimento avaliado pelo valor de patrimônio líquido | 2017-01-01 | — | A |
| 19971 | Resultados positivos não realizados nas operações intercompanhias | 2017-01-01 | — | A |
| 19972 | Resultados negativos não realizados nas operações intercompanhias | 2017-01-01 | — | A |
| 20 | Excesso de juros sobre o capital próprio pagos ou creditados | 2015-01-01 | — | A |
| 21 | Juros sobre o capital próprio auferidos - não contabilizados como receita | 2015-01-01 | — | A |
| 23 | Dispêndios em pesquisa científica e tecnológica e de inovação tecnológica por ICT ou entidades científicas e tecnológica | 2015-01-01 | — | A |
| 24 | Dispêndios com pesquisa tecnológica e desenvolvimento de inovação tecnológica - reversão da amortização/depreciação | 2015-01-01 | — | A |
| 25 | Realização de reserva de reavaliação | 2015-01-01 | — | A |
| 28 | Prêmios da emissão de debêntures - destinação diversa | 2015-01-01 | — | A |
| 29 | Doações e subvenções para investimento - destinação diversa | 2015-01-01 | — | A |
| 29.05 | Doações e subvenções - art. 30, § 2º, da Lei nº 12.350/2010 | 2017-01-01 | — | A |
| 29.10 | Doações e subvenções - art. 30, § 1º, da Lei nº 12.350/2010 | 2017-01-01 | — | A |
| 30 | Realização de receitas originárias de planos de benefícios administrados por entidades fechadas de previdência complemen | 2015-01-01 | — | A |
| 31 | Remuneração da prorrogação da licença-maternidade | 2015-01-01 | — | A |
| 32 | Despesas e custos com pesquisa e desenvolvimento de produtos e processos inovadores em empresas e entidades nacionais re | 2015-01-01 | — | A |
| 33 | Despesas e custos com remuneração de pesquisadores empregados em atividades de inovação tecnológica em empresas no país  | 2015-01-01 | — | A |
| 34 | Impostos e contribuições com exigibilidade suspensa | 2015-01-01 | — | A |
| 35 | Resultados negativos com atos cooperativos | 2015-01-01 | — | A |
| 35.05 | Juros sobre o capital integralizado pelas cooperativas a seus associadas que excederem 12% ao ano | 2017-01-01 | — | A |
| 36 | Custos e despesas vinculados às receitas da atividade imobiliária tributadas pelo RET | 2015-01-01 | — | A |
| 36.10 | Custos e despesas vinculados às receitas da atividade de construção no âmbito do PMCMV tributadas pelo RET | 2017-01-01 | — | A |
| 37 | Custos e despesas vinculados às receitas da atividade de construção no âmbito do PMCMV | 2015-01-01 | — | A |
| 38 | Custos e despesas vinculados às receitas da atividade de construção ou reforma de estabelecimentos de educação infantil | 2015-01-01 | — | A |
| 39 | Parcela dos lucros de contratos de construção por empreitada ou fornecimento, celebrados com pessoa jurídica de direito  | 2015-01-01 | — | A |
| 40 | Aporte do poder público | 2015-01-01 | — | A |
| 40.05 | Aporte do poder público - saldo remanescente | 2017-01-01 | — | A |
| 40.10 | Aporte do poder público - ainda não adicionado, no caso de extinção da concessão antes do advento do termo contratural | 2017-01-01 | — | A |
| 41 | Participações nos resultados não dedutíveis - debêntures e empregados | 2015-01-01 | — | A |
| 41.05 | Participações nos resultados não dedutíveis - administradores e dirigentes | 2017-01-01 | — | A |
| 42 | Incentivo fiscal - amortização acelerada incentivada - ativo intangível vinculado à pesquisa tecnológica e ao desenvolvi | 2015-01-01 | — | A |
| 42.05 | Incentivo fiscal - depreciação acelerada incentivada - inovação tecnológica | 2017-01-01 | — | A |
| 42.10 | Incentivo fiscal - depreciação ou amortização acelerada incentivada - pesquisa e desenvolvimento tecnológico | 2017-01-01 | — | A |
| 42.15 | Incentivo fiscal - gastos com desenvolvimento de inovação tecnológica | 2017-01-01 | — | A |
| 42.20 | Incentivo fiscal - microempresa e EPP - pesquisa e inovação tecnológica | 2017-01-01 | — | A |
| 43 | Incentivo fiscal - depreciação acelerada incentivada - SUDENE | 2015-01-01 | — | A |
| 43.01 | Incentivo fiscal - depreciação acelerada incentivada - SUDAM | 2015-01-01 | — | A |
| 43.05 | Incentivo fiscal - depreciação ou amortização acelerada incentivada - alienação ou baixa de ativo | 2017-01-01 | — | A |
| 47 | Incentivo fiscal - depreciação acelerada incentivada - veículos automóveis para transporte de mercadorias e vagões, loco | 2015-01-01 | — | A |
| 49 | Incentivo fiscal - depreciação acelerada - máquinas, equipamentos, aparelhos e instrumentos | 2015-01-01 | — | A |
| 50 | Incentivo fiscal - depreciação/amortização acelerada incentivada - demais hipóteses de reversão | 2015-01-01 | — | A |
| 50.05 | Incentivo fiscal - depreciação/amortização acelerada incentivada - máquinas, os equipamentos, os aparelhos e os instrume | 2024-01-01 | — | A |
| 51 | Perdas incorridas no mercado de renda variável no período de apuração, exceto day-trade | 2015-01-01 | — | A |
| 52 | Perdas em operações day-trade no período de apuração | 2015-01-01 | — | A |
| 52.05 | Operações realizadas em mercados de liquidação futura - resultados negativos incorridos reconhecidos na contabilidade an | 2017-01-01 | — | A |
| 52.10 | Operações realizadas em mercados de liquidação futura - resultados positivos incorridos reconhecidos na contabilidade an | 2017-01-01 | — | A |
| 53 | Arrendamento mercantil - PJ arrendatária - depreciação, amortização e exaustão | 2015-01-01 | — | A |
| 53.05 | Arrendamento mercantil - PJ arrendatária - depreciação, amortização e exaustão apropriado como custo de produção | 2017-01-01 | — | A |
| 53.10 | Arrendamento mercantil - PJ arrendatária - contrato não tipificado como arrendamento mercantil financeiro | 2017-01-01 | — | A |
| 53.15 | Arrendamento mercantil - PJ arrendadora - não disciplinado pela Lei nº 6.099/74 - resultado proporcional ao valor da con | 2017-01-01 | — | A |
| 54 | Arrendamento mercantil - PJ arrendadora - não disciplinado pela Lei nº 6.099/74 - ajustes decorrentes da neutralização d | 2015-01-01 | — | A |
| 54.05 | Arrendamento mercantil - PJ arrendadora - contrato não tipificado como arrendamento mercantil financeiro - resultado pro | 2017-01-01 | — | A |
| 54.10 | Arrendamento mercantil - PJ arrendadora - contrato não tipificado como arrendamento mercantil financeiro - Ajustes decor | 2017-01-01 | — | A |
| 54.15 | Arrendamento mercantil - PJ arrendadora - valor residual | 2017-01-01 | — | A |
| 55 | Arrendamento mercantil - PJ arrendatária - despesas financeiras dos contratos de arrendamento | 2015-01-01 | — | A |
| 55.05 | Arrendamento mercantil - PJ arrendatária - despesas financeiras dos contratos não tipificados como arrendamento | 2017-01-01 | — | A |
| 55.10 | Arrendamento mercantil - PJ arrendatária - ganho de capital | 2017-01-01 | — | A |
| 55.15 | Arrendamento mercantil - PJ arrendatária - contrato não tipificado como arrendamento - ganho de capital | 2017-01-01 | — | A |
| 55.20 | Arrendamento mercantil - PJ arrendatária - perda na alienação de bem | 2017-01-01 | — | A |
| 56.05 | Juros produzidos por NTN | 2017-01-01 | — | A |
| 57 | Juros de empréstimos - custos de empréstimos | 2015-01-01 | — | A |
| 57.05 | Juros de empréstimos - empresa controlada ou coligada | 2017-01-01 | — | A |
| 58 | Mais valia de investimentos avaliados pelo patrimônio líquido em sociedades estrangeiras que não funcionem no país. | 2015-01-01 | — | A |
| 59 | Ágio por rentabilidade futura (goodwill) de investimentos avaliados pelo patrimônio líquido em sociedades estrangeiras q | 2015-01-01 | — | A |
| 60 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - controlado por subconta | 2015-01-01 | — | A |
| 60.05 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - não controlado por subconta | 2017-01-01 | — | A |
| 60.10 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - não controlado por subconta - com prejuízo fisca | 2017-01-01 | — | A |
| 60.15 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - não controlado por subconta - com prejuízo fisca | 2017-01-01 | — | A |
| 60.20 | Avaliação a valor justo - subscrição - ganho - controlado por subconta. | 2017-01-01 | — | A |
| 60.25 | Avaliação a valor justo - subscrição - ganho - sem subconta | 2017-01-01 | — | A |
| 60.30 | Avaliação a valor justo - subscrição - ganho - não controlado por subconta - com prejuízo fiscal - valor anteriormente e | 2017-01-01 | — | A |
| 60.35 | Avaliação a valor justo - subscrição - ganho - não controlado por subconta - com prejuízo fiscal | 2017-01-01 | — | A |
| 60.40 | Avaliação a valor justo - incorporação, fusão e cisão - ganho | 2017-01-01 | — | A |
| 60.45 | Avaliação a valor Justo - ativo ou passivo da pessoa jurídica - perda - controlada por subconta | 2017-01-01 | — | A |
| 60.50 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - perda - não controlada por subconta | 2017-01-01 | — | A |
| 60.55 | Avaliação a valor justo - subscrição - perda - controlada por subconta | 2017-01-01 | — | A |
| 60.60 | Avaliação a valor justo - subscrição - perda - não controlada por subconta | 2017-01-01 | — | A |
| 64 | Ajuste a valor presente de ativo - venda | 2015-01-01 | — | A |
| 64.05 | Ajuste a valor presente de ativo - demais operações | 2017-01-01 | — | A |
| 65 | Ajuste a valor presente de passivo - incisos I, II e III do art. 5º da Lei nº 12.973/2014. | 2015-01-01 | — | A |
| 65.05 | Ajuste a valor presente de passivo - incisos IV e V do art. 5º da Lei nº 12.973/2014. | 2017-01-01 | — | A |
| 65.10 | Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo - relacionado a um ativo | 2017-01-01 | — | A |
| 65.15 | Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo - relacionado a uma despesa ou cust | 2017-01-01 | — | A |
| 66.05 | Adoção Inicial dos Arts. 1º a 71 da Lei nº 12.973/2014 - diferença positiva de ativo - não controlada por subconta | 2017-01-01 | — | A |
| 66.10 | Adoção inicial dos Arts. 1º a 71 da Lei nº 12.973/2014 - diferença positiva de ativo - controlada por subconta | 2017-01-01 | — | A |
| 66.15 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - diferença negativa de passivo - não controlada por subconta | 2017-01-01 | — | A |
| 66.20 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - diferença negativa de passivo - controlada por subconta | 2017-01-01 | — | A |
| 66.25 | Adoção inicial dos Arts. 1º a 71 da Lei nº 12.973/2014 - reserva de reavaliação - ativos de coligadas ou controladas | 2017-01-01 | — | A |
| 66.30 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - reserva de reavaliação - subscrição | 2017-01-01 | — | A |
| 66.35 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - reserva de reavaliação - ativos próprios | 2017-01-01 | — | A |
| 66.40 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - ajustes de avaliação patrimonial | 2017-01-01 | — | A |
| 69 | Atividade imobiliária - permuta - lucro bruto decorrente da avaliação a valor justo das unidades permutadas | 2015-01-01 | — | A |
| 70 | Atividade imobiliária - diferimento da tributação - ajustes pertinentes ao reconhecimento do lucro bruto | 2015-01-01 | — | A |
| 71 | Despesas pré-operacionais | 2015-01-01 | — | A |
| 79 | Contratos de longo prazo - divergência de critério - ajuste da diferença dos critérios adotados no § 1º do art. 10 do De | 2015-01-01 | — | A |
| 80 | Provisões ou perdas estimadas - teste de recuperabilidade | 2015-01-01 | — | A |
| 81 | Pagamento baseado em ações apropriado como despesa ou custo | 2015-01-01 | — | A |
| 81.05 | Pagamento baseado em ações - serviços prestados por pessoa física que não seja considerada empregado ou similar | 2017-01-01 | — | A |
| 82 | Contratos de concessão de serviços públicos - realização de ativo intangível representativo do direito | 2015-01-01 | — | A |
| 82.05 | Contratos de concessão de serviços públicos - recebimento de ativo financeiro | 2017-01-01 | — | A |
| 82.10 | Contratos de concessão de serviços públicos - apropriação de receitas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 84 | CPC 47 - Ajustes de Receita Bruta | 2018-01-01 | — | A |
| 84.05 | CPC 47 - Ajustes de Custos/Despesas | 2018-01-01 | — | A |
| 84.10 | CPC 47 - Ajustes de Outras Receitas / Outros Resultados | 2018-01-01 | — | A |
| 86 | Depreciação - diferença entre as depreciações contábil e fiscal | 2015-01-01 | — | A |
| 88 | Provisões ou perdas estimadas - gastos com desmontagem | 2015-01-01 | — | A |
| 89 | Outros ajustes decorrentes de modificação ou adoção de métodos e critérios contábeis por meio de atos administrativos, c | 2015-01-01 | — | A |
| 91 | Contratos de concessão de serviços públicos - diferença negativa - adoção inicial dos arts. 1º a 71 da Lei nº 12.973/201 | 2015-01-01 | — | A |
| 91.01 | Depreciação - diferença entre as depreciações contábil e fiscal - alienação ou baixa de ativo | 2015-01-01 | — | A |
| 91.02 | Despesa com instrumentos de capital ou de dívida subordinada - estorno | 2015-01-01 | — | A |
| 91.10 | Devolução de capital social | 2017-01-01 | — | A |
| 91.15 | Ganho de capital - recebimento após o término do período de apuração da contratação | 2017-01-01 | — | A |
| 91.20 | Perdas no recebimento de créditos - PJ credora - não contabilmente estornadas no caso de desistência da cobrança pela vi | 2017-01-01 | — | A |
| 91.25 | Perdas no recebimento de créditos - PJ credora - encargos financeiros incidentes sobre o crédito vencido e não recebido | 2017-01-01 | — | A |
| 91.30 | Encargos incidentes sobre o débito vencido e não pago deduzidos como despesa ou custo a partir da data da citação inicia | 2017-01-01 | — | A |
| 91.35 | Prejuízo na alienação de participações | 2017-01-01 | — | A |
| 91.40 | Ajustes de exercícios anteriores - lançamentos extemporâneos | 2017-01-01 | — | A |
| 91.45 | Ganho decorrente da mensuração de ativo pelo valor de liquidação - Realização | 2021-01-01 | — | A |
| 91.50 | Perda decorrente da mensuração de ativo pelo valor de liquidação | 2021-01-01 | — | A |
| 91.55 | Despesa estimada para realização do ativo - Entidade em Liquidação | 2021-01-01 | — | A |
| 91.60 | Ganho decorrente do reconhecimento de ativo não registrado até a data de início de liquidação - Realização | 2021-01-01 | — | A |
| 91.65 | Perda decorrente da baixa de ativo registrado até a data de início de liquidação | 2021-01-01 | — | A |
| 91.70 | Encargos de Depreciação/Amortização/Exaustão dos Gastos ativados na atividade de exploração de jazidas de petróleo e gás | 2023-01-01 | — | A |
| 91.75 | Encargos de Exaustão apropriados ao resultado referentes aos Gastos com o desenvolvimento da produção dos campos de petr | 2023-01-01 | — | A |
| 91.80 | Encargos de Exaustão apropriados ao resultado referente aos Gastos com o desenvolvimento da produção dos campos de petró | 2023-01-01 | — | A |
| 91.85 | Depreciação - diferença entre as depreciações contábil e fiscal - Art. 6º da IN RFB nº 1.778/2017 | 2023-01-01 | — | A |
| 92 | Outras adições - indicador de relacionamento 1, 2 ou 3 | 2015-01-01 | — | A |
| 92.01 | Outras adições - indicador de relacionamento 4 | 2015-01-01 | — | A |
| 95 | (-) Reversão ou uso de provisões ou perdas estimadas não dedutíveis | 2015-01-01 | — | E |
| 96 | (-) Lucros e dividendos derivados de investimentos avaliados pelo custo de aquisição | 2015-01-01 | — | E |
| 100.05 | (-) Investimento avaliado pelo valor de patrimônio líquido - contrapartida por aumento no valor de patrimônio líquido re | 2017-01-01 | — | E |
| 100.10 | (-) Investimento avaliado pelo valor de patrimônio líquido - ganho proveniente de compra vantajosa | 2017-01-01 | — | E |
| 100.15 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia | 2017-01-01 | — | E |
| 100.20 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia - incorporação, fusão ou cisão | 2017-01-01 | — | E |
| 100.25 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia - incorporação, fusão ou cisão - quot | 2017-01-01 | — | E |
| 100.30 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill | 2017-01-01 | — | E |
| 100.35 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill - incoporação, fusão ou cisão | 2017-01-01 | — | E |
| 100.40 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia | 2017-01-01 | — | E |
| 100.45 | (-) Investimento avaliado pelo valor de patrimônio líquido - ganho reconhecido no resultado por variação na porcentagem  | 2017-01-01 | — | E |
| 100.50 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho com base no valor justo | 2017-01-01 | — | E |
| 100.55 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho decorrente do excesso do valo | 2017-01-01 | — | E |
| 100.60 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - perda com base no valor justo | 2017-01-01 | — | E |
| 100.65 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva da mai | 2017-01-01 | — | E |
| 100.70 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da mai | 2017-01-01 | — | E |
| 100.75 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva do goo | 2017-01-01 | — | E |
| 100.80 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa do goo | 2017-01-01 | — | E |
| 100.85 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva da men | 2017-01-01 | — | E |
| 100.90 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da men | 2017-01-01 | — | E |
| 100.95 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - ganho | 2017-01-01 | — | E |
| 100951 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - registra | 2017-01-01 | — | E |
| 100952 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida não controlado por meio de subconta - regi | 2017-01-01 | — | E |
| 100953 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - não registrado e | 2017-01-01 | — | E |
| 100954 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - não registrado e | 2017-01-01 | — | E |
| 100955 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - registrado em co | 2017-01-01 | — | E |
| 100956 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - registrado em co | 2017-01-01 | — | E |
| 100957 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100958 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reduç | 2017-01-01 | — | E |
| 100959 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100960 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - ganho | 2017-01-01 | — | E |
| 100961 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - ganho | 2017-01-01 | — | E |
| 100962 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100963 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reduç | 2017-01-01 | — | E |
| 100964 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100965 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - regra de transição | 2017-01-01 | — | E |
| 100966 | (-) Combinação de negócios, exceto investimento avaliado pelo valor de patrimônio líquido | 2017-01-01 | — | E |
| 100967 | (-) Resultados positivos não realizados nas operações intercompanhias | 2017-01-01 | — | E |
| 100968 | (-) Resultados negativos não realizados nas operações intercompanhias | 2017-01-01 | — | E |
| 101 | (-) Variação cambial ativa - regra geral - valor evidenciado no registro L300 de acordo com o regime de competência | 2015-01-01 | — | E |
| 102 | (-) Variação cambial passiva - regra geral - operações liquidadas | 2015-01-01 | — | E |
| 102.05 | (-) Variação cambial - regra geral - mudança de regime de caixa para competência | 2015-01-01 | — | E |
| 102.10 | (-) Variação cambial sobre juros a apropriar decorrentes de ajuste a valor presente | 2017-01-01 | — | E |
| 102.15 | (-) Variação cambial - aumento nas receitas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | E |
| 102.20 | (-) Variação cambial - redução nas despesas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | E |
| 102.25 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - investimentos não avaliados pela equivalência patrim | 2017-01-01 | — | E |
| 102.30 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - excluídos nos primeiro, segundo e terceiro trimestre | 2017-01-01 | — | E |
| 103 | (-) Incentivo fiscal - pesquisas tecnológicas e desenvolvimento de inovação tecnológica | 2015-01-01 | — | E |
| 105 | (-) Prêmio da emissão de debêntures | 2015-01-01 | — | E |
| 105.05 | (-) Impostos e contribuições com exigibilidade suspensa | 2017-01-01 | — | E |
| 106 | (-) Doações e subvenções para investimentos | 2015-01-01 | — | E |
| 106.05 | (-) Doações e subvenções - Art. 30 da Lei nº 12.350/2010 | 2017-01-01 | — | E |
| 106.10 |  | 2023-01-01 | — | E |
| 107 | (-) Realização de receitas originárias de planos de benefícios administrados por entidades fechadas de previdência compl | 2015-01-01 | — | E |
| 108 | (-) Receitas de subvenções governamentais para pesquisa e desenvolvimento de produtos e processos inovadores em empresas | 2015-01-01 | — | E |
| 109 | (-) Receitas de subvenções governamentais para remuneração de pesquisadores empregados em atividades de inovação tecnoló | 2015-01-01 | — | E |
| 110 | (-) Rendimentos tributados exclusivamente na fonte | 2015-01-01 | — | E |
| 111 | (-) Cooperativas | 2015-01-01 | — | E |
| 112 |  | 2015-01-01 | — | E |
| 112.10 |  | 2015-01-01 | — | E |
| 113 |  | 2015-01-01 | — | E |
| 114 |  | 2015-01-01 | — | E |
| 115 | (-) Parcela dos lucros de contratos de construção por empreitada ou fornecimento, celebrados com pessoa jurídica de dire | 2015-01-01 | — | E |
| 116 | (-) Aporte do poder público | 2015-01-01 | — | E |
| 117 | (-) Juros produzidos por NTN (Lei nº 10.179/2001) | 2015-01-01 | — | E |
| 117.05 | (-) Juros produzidos por NTN | 2017-01-01 | — | E |
| 117.10 | (-) Aquisição de bens e direitos no âmbito do PND | 2017-01-01 | — | E |
| 118 | (-) Incentivo fiscal - pesquisas tecnológicas e desenvolvimento de inovação tecnológica (Lei 11.196/05, art. 19, § 1º) | 2015-01-01 | — | E |
| 118.10 | (-) Incentivo fiscal - pesquisas tecnológicas e desenvolvimento de inovação tecnológica (Lei 11.196/05, art. 19, § 3º) | 2017-01-01 | — | E |
| 119 | (-) Incentivo fiscal - pesquisa científica e tecnológica e de inovação tecnológica (Lei 11.196/05, art. 19A) | 2015-01-01 | — | E |
| 120 | (-) Incentivo fiscal - investimento em projeto aprovado pela ANCINE | 2015-01-01 | — | E |
| 121 | (-) Incentivo fiscal - amortização acelerada incentivada - ativo intangível vinculado à pesquisa tecnológica e ao desenv | 2015-01-01 | — | E |
| 121.05 | (-) Incentivo fiscal - depreciação acelerada incentivada - inovação tecnológica | 2017-01-01 | — | E |
| 121.10 | (-) Incentivo fiscal - depreciação ou amortização acelerada incentivada - pesquisa e desenvolvimento tecnológico | 2017-01-01 | — | E |
| 121.15 | (-) Incentivo fiscal - gastos com desenvolvimento de inovação tecnológica | 2017-01-01 | — | E |
| 121.20 | (-) Incentivo fiscal - microempresa e EPP - pesquisa e inovação tecnológica | 2017-01-01 | — | E |
| 122 | (-) Incentivo fiscal - depreciação acelerada incentivada - SUDENE | 2015-01-01 | — | E |
| 122.01 | (-) Incentivo fiscal - depreciação acelerada incentivada - SUDAM | 2015-01-01 | — | E |
| 122.05 | (-) Incentivo fiscal - crédito presumido de IPI do programa INOVAR-AUTO | 2017-01-01 | — | E |
| 126 | (-) Incentivo fiscal - depreciação acelerada incentivada - veículos automóveis para transporte de mercadorias e vagões,  | 2015-01-01 | — | E |
| 128 | (-) Incentivo fiscal - Depreciação acelerada - máquinas, equipamentos, aparelhos e instrumentos | 2015-01-01 | — | E |
| 128.05 | (-) Incentivo fiscal - Depreciação acelerada - máquinas, os equipamentos, os aparelhos e os instrumentos do ativo não ci | 2024-01-01 | — | E |
| 129 | (-) Depreciação/amortização acelerada incentivada - demais hipóteses | 2015-01-01 | — | E |
| 130 | (-) Exaustão incentivada | 2015-01-01 | — | E |
| 131 | (-) Perdas incorridas no mercado de renda variável - períodos de apuração anteriores | 2015-01-01 | — | E |
| 131.05 | (-) Operações realizadas em mercados de liquidação futura - resultados positivos incorridos reconhecidos na contabilidad | 2017-01-01 | — | E |
| 131.10 | (-) Operações realizadas em mercados de liquidação futura - resultados negativos incorridos reconhecidos na contabilidad | 2017-01-01 | — | E |
| 132 | (-) Horário gratuito de televisão e rádio | 2015-01-01 | — | E |
| 133 | (-) Incentivo fiscal - empresas de TI e TIC | 2015-01-01 | — | E |
| 134 | (-) Arrendamento mercantil - PJ arrendadora | 2015-01-01 | — | E |
| 134.01 | (-) Arrendamento mercantil - PJ arrendatária - contraprestações pagas ou creditadas de contratos de arrendamento | 2015-01-01 | — | E |
| 134.05 | (-) Arrendamento mercantil - PJ arrendadora - contrato não tipificado como arrendamento mercantil financeiro | 2017-01-01 | — | E |
| 134.15 | (-) Arrendamento mercantil - PJ arrendatária - contraprestações pagas ou creditadas de contratos não tipificados como ar | 2017-01-01 | — | E |
| 134.20 | (-) Avaliação a valor justo - subscrição - ganho | 2017-01-01 | — | E |
| 134.25 | (-) Avaliação a valor justo - subscrição - ganho - sem subconta | 2017-01-01 | — | E |
| 134.30 | (-) Avaliação a valor justo - subscrição - ganho | 2017-01-01 | — | E |
| 134.35 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - perda | 2017-01-01 | — | E |
| 134.40 | (-) Avaliação a valor justo - subscrição - perda | 2017-01-01 | — | E |
| 135 | (-) Juros de empréstimos - custos de empréstimos | 2015-01-01 | — | E |
| 136.05 | (-) Atividade imobiliária - permuta - lucro bruto decorrente da avaliação a valor justo das unidades permutadas | 2017-01-01 | — | E |
| 137 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho | 2015-01-01 | — | E |
| 137.05 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - sem subconta | 2017-01-01 | — | E |
| 137.10 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho | 2017-01-01 | — | E |
| 141 | (-) Ajuste a valor presente de ativo - venda | 2015-01-01 | — | E |
| 141.05 | (-) Ajuste a valor presente de ativo - outras operações | 2017-01-01 | — | E |
| 142 | (-) Ajuste a valor presente de passivo - incisos I, II e III do art. 5º da Lei nº 12.973/2014. | 2015-01-01 | — | E |
| 142.05 | (-) Ajuste a valor presente de passivo - incisos IV e V do art. 5º da Lei nº 12.973/2014. | 2017-01-01 | — | E |
| 142.10 | (-) Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo. | 2017-01-01 | — | E |
| 142.15 | (-) Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo - relacionado a uma despesa ou  | 2017-01-01 | — | E |
| 143.05 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - realização de diferença negativa entre valores de ativo con | 2017-01-01 | — | E |
| 143.10 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - baixa ou liquidação de diferença positiva entre valores de  | 2017-01-01 | — | E |
| 143.15 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - ativo diferido - realização de diferença negativa entre val | 2017-01-01 | — | E |
| 143.20 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - ativo diferido - realização de diferença negativa entre val | 2017-01-01 | — | E |
| 145 | (-) Atividade imobiliária - diferimento da tributação - ajustes pertinentes ao reconhecimento do lucro bruto | 2015-01-01 | — | E |
| 146 | (-) Despesa com emissão de ações | 2015-01-01 | — | E |
| 146.01 | (-) Despesa com instrumentos de capital ou de dívida subordinada | 2015-01-01 | — | E |
| 147 | (-) Despesas pré-operacionais | 2015-01-01 | — | E |
| 154 | (-) Contratos de longo prazo - divergência de critério - ajuste da diferença dos critérios adotados no § 1º do art. 10 d | 2015-01-01 | — | E |
| 155 | (-) Provisões ou perdas estimadas - teste de recuperabilidade - alienação ou baixa do bem correspondente | 2015-01-01 | — | E |
| 155.05 | (-) Provisões ou perdas estimadas - teste de recuperabilidade - reversão | 2017-01-01 | — | E |
| 156 | (-) Pagamento baseado em ações apropriado como despesa ou custo | 2015-01-01 | — | E |
| 157 | (-) Contratos de concessão de serviços públicos - realização de ativo intangível representativo do direito | 2015-01-01 | — | E |
| 157.05 | (-) Contratos de concessão de serviços públicos - recebimento de ativo financeiro | 2017-01-01 | — | E |
| 157.10 | (-) Contratos de concessão de serviços públicos - apropriação de receitas financeiras decorrentes de ajuste a valor pres | 2017-01-01 | — | E |
| 159 | (-) CPC 47 - Ajustes de Receita Bruta | 2018-01-01 | — | E |
| 159.05 | (-) CPC 47 - Ajustes de Custos/Despesas | 2018-01-01 | — | E |
| 159.10 | (-) CPC 47 - Ajustes de Outras Receitas / Outros Resultados | 2018-01-01 | — | E |
| 161 | (-) Depreciação - diferença entre as depreciações contábil e fiscal | 2015-01-01 | — | E |
| 163 | (-) Provisões ou perdas estimadas - gastos com desmontagem | 2015-01-01 | — | E |
| 164 | (-) Outros ajustes decorrentes de modificação ou adoção de métodos e critérios contábeis por meio de atos administrativo | 2015-01-01 | — | E |
| 166 | (-) Contratos de concessão de serviços públicos - diferença positiva - adoção inicial dos arts. 1º a 71 da Lei nº 12.973 | 2015-01-01 | — | E |
| 166.01 | (-) Lucros de participações em controladas e coligadas domiciliadas no Brasil, no caso do art. 85 da Lei nº 12.973/2014 | 2015-01-01 | — | E |
| 166.03 | (-) Juros sobre o capital próprio | 2017-01-01 | — | E |
| 166.05 | (-) Ganho de capital - recebimento após o término do ano-calendário seguinte ao da contratação | 2017-01-01 | — | E |
| 166.10 | (-) Perdas no recebimento de créditos - PJ credora - encargos financeiros incidentes sobre o crédito vencido e não receb | 2017-01-01 | — | E |
| 166.15 | (-) Encargos incidentes sobre o débito vencido e não pago deduzidos como despesa a serem excluídos no período de apuraçã | 2017-01-01 | — | E |
| 166.20 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - Preços de Transferência | 2017-01-01 | — | E |
| 166.21 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - Subcapitalização | 2017-01-01 | — | E |
| 166.25 | (-) Programas de estímulo à solicitação de documento fiscal | 2017-01-01 | — | E |
| 166.30 | (-) Seguros ou pecúlio por morte do sócio | 2017-01-01 | — | E |
| 166.35 | (-) Ajustes de exercícios anteriores - lançamentos extemporâneos | 2017-01-01 | — | E |
| 166.45 | (-) Ganho decorrente da mensuração de ativo pelo valor de liquidação | 2021-01-01 | — | E |
| 166.50 | (-) Perda decorrente da mensuração de ativo pelo valor de liquidação - Realização | 2021-01-01 | — | E |
| 166.55 | (-) Despesa estimada para realização do ativo - Entidade em Liquidação - Realização | 2021-01-01 | — | E |
| 166.60 | (-) Ganho decorrente do reconhecimento de ativo não registrado até a data de início de liquidação | 2021-01-01 | — | E |
| 166.65 | (-) Perda decorrente da baixa de ativo registrado até a data de início de liquidação - Efetiva saída do ativo do patrimô | 2021-01-01 | — | E |
| 166.70 | (-) Gastos ativados no imobilizado/intangível na atividade de exploração de petróleo e gás natural | 2023-01-01 | — | E |
| 166.75 | (-) Exaustão Acelerada dos gastos com o desenvolvimento da produção dos campos de petróleo e gás natural | 2023-01-01 | — | E |
| 166.85 | (-) Depreciação - diferença entre as depreciações contábil e fiscal - Art. 6º da IN RFB nº 1.778/2017 | 2023-01-01 | — | E |
| 166.90 | (-) Receitas atinentes à atualização pela taxa Selic em razão de repetição de indébito tributário. | 2025-01-01 | — | E |
| 166.95 | (-) Incentivo fiscal - Regime Especial de Reintegração de Valores Tributários para as Empresas Exportadoras - REINTEGRA  | 2025-01-01 | — | E |
| 167 | (-) Outras exclusões - com indicador de relacionamento 1, 2 ou 3 | 2015-01-01 | — | E |
| 167.01 | (-) Outras exclusões - qualquer indicador de relacionamento | 2015-01-01 | — | E |
| 173 | (-) Compensação de Prejuízos Fiscais de Períodos Anteriores - Atividades em Geral | 2015-01-01 | — | P |
| 174 | (-) Compensação de Prejuízos Fiscais de Períodos Anteriores - Atividade Rural | 2015-01-01 | — | P |
| 176 | LUCRO REAL POSTERGADO DE PERÍODOS DE APURAÇÃO ANTERIORES | 2015-01-01 | — | A |

Linhas calculadas (8) — só para o teste negativo do item 14: `2`, `9`, `93`, `168`, `169`, `170`, `171`, `175`


### M350A — 342 linhas `E`

| Código | Descrição | DT_INI | DT_FIM | TIPO LANÇ |
|---|---|---|---|---|
| 6 | Provisões ou perdas estimadas não dedutíveis | 2015-01-01 | — | A |
| 7 | Custos não dedutíveis | 2015-01-01 | — | A |
| 8 | Despesas não necessárias | 2015-01-01 | — | A |
| 8.01 | Realização de ativos indedutíveis | 2015-01-01 | — | A |
| 8.02 | Encargos de Depreciação, Amortização e Exaustão e Baixa de Bens - Diferença de Correção Monetária - IPC/BTNF | 2015-01-01 | — | A |
| 8.11 | PRONAC – despesa operacional – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.1101 | PRONAC – redução linear de benefícios | 2026-01-01 | — | A |
| 8.12 | Pesquisas científicas e tecnológicas – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.13 | Doações a entidades civis – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.14 | Doações a instituições de ensino e pesquisa – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.1401 | Doação a instituições de ensino e pesquisa - redução linear de benefícios | 2026-01-01 | — | A |
| 8.15 | Vale cultura – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.16 | Planos de poupança e investimento – PAIT – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.1601 | Planos de poupança e investimento – PAIT - redução linear de benefícios | 2026-01-01 | — | A |
| 8.18 | Fundo de aposentadoria individual – FAPI – parcelas não dedutíveis | 2015-01-01 | — | A |
| 8.30 | Despesas com alimentação de sócios, acionistas e administradores | 2017-01-01 | — | A |
| 8.40 | Despesas financeiras - lucros e/ou dividendos | 2017-01-01 | — | A |
| 8.45 | Doações | 2017-01-01 | — | A |
| 8.50 | Furto | 2017-01-01 | — | A |
| 8.55 | Despesas com bens não intrinsecamente relacionados com a produção ou comercialização de bens e serviços | 2017-01-01 | — | A |
| 8.60 | Multas por infrações fiscais | 2017-01-01 | — | A |
| 8.65 | Multas impostas por transgressões de leis de natureza não tributária | 2017-01-01 | — | A |
| 8.70 | Pagamentos sem causa | 2017-01-01 | — | A |
| 8.75 | Remuneração de sócios, diretores, administradores, titulares de empresas individuais e conselheiros fiscais e consultivo | 2017-01-01 | — | A |
| 8.80 | Remuneração indireta a administradores e terceiros | 2017-01-01 | — | A |
| 8.90 | Serviços assistenciais e benefícios previdenciários a empregados e dirigentes - contribuições não compulsórias | 2017-01-01 | — | A |
| 8.95 | Serviços assistenciais e benefícios previdenciários a empregados e dirigentes - excesso em relação ao limite | 2017-01-01 | — | A |
| 11.05 | Lucros, rendimentos e ganhos de capital auferidos no exterior - resultado positivo | 2017-01-01 | — | A |
| 11.10 | Lucros, rendimentos e ganhos de capital auferidos no exterior - parcela do ajuste do valor do investimento | 2017-01-01 | — | A |
| 11.15 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados por coligada no exterior | 2017-01-01 | — | A |
| 11.20 | Lucros, rendimentos e ganhos de capital auferidos no exterior - resultado da coligada | 2017-01-01 | — | A |
| 11.25 | Lucros, rendimentos e ganhos de capital auferidos no exterior - resultado da coligada no caso de descumprimento do art.  | 2017-01-01 | — | A |
| 11.30 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados | 2017-01-01 | — | A |
| 11.35 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados no caso d | 2017-01-01 | — | A |
| 11.40 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados no caso d | 2017-01-01 | — | A |
| 11.45 | Lucros, rendimentos e ganhos de capital auferidos no exterior - lucros disponibilizados e ainda não tributados no caso d | 2017-01-01 | — | A |
| 11.50 | Lucros, rendimentos e ganhos de capital auferidos no exterior - investimentos não avaliados pela equivalência patrimonia | 2017-01-01 | — | A |
| 11.55 | Lucros, rendimentos e ganhos de capital auferidos no exterior - excluídos nos primeiro, segundo e terceiro trimestres | 2017-01-01 | — | A |
| 11.60 | Lucros, rendimentos e ganhos de capital auferidos no exterior - perdas incorridas em operações no exterior e reconhecida | 2017-01-01 | — | A |
| 12 | Ajustes decorrentes de métodos de preços de transferência | 2015-01-01 | — | A |
| 13 | Regras de subcapitalização - ajustes decorrentes de empréstimos com pessoa física ou jurídica, vinculada, residente ou d | 2015-01-01 | — | A |
| 13.05 | Regras de subcapitalização - ajustes decorrentes de empréstimos com pessoa física ou jurídica residente, domiciliada ou  | 2015-01-01 | — | A |
| 13.10 | Crédito presumido apurado com base em créditos decorrentes de diferenças temporárias oriundos de provisões para créditos | 2025-01-01 | — | A |
| 13 | Regras de subcapitalização - ajustes decorrentes de empréstimos com pessoas vinculadas ou situadas em país com tributaçã | 2015-01-01 | — | A |
| 14 | Pagamento a pessoas situadas em país com tributação favorecida | 2015-01-01 | — | A |
| 15 | Variação cambial ativa - regra geral - operações liquidadas | 2015-01-01 | — | A |
| 16 | Variação cambial passiva - regra geral - valor evidenciado no registro L300 de acordo com o regime de competência. | 2015-01-01 | — | A |
| 16.05 | Variação cambial - mudança de regime de caixa para competência | 2017-01-01 | — | A |
| 16.10 | Variação cambial sobre juros a apropriar decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 16.15 | Variação cambial - redução nas receitas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 16.20 | Variação cambial - aumento nas despesas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 19.05 | Investimento avaliado pelo valor de patrimônio líquido - contrapartida por redução no valor de patrimônio líquido reconh | 2017-01-01 | — | A |
| 19.10 | Investimento avaliado pelo valor de patrimônio líquido - ganho proveniente de compra vantajosa | 2017-01-01 | — | A |
| 19.15 | Investimento avaliado pelo valor de patrimônio líquido – ganho proveniente de compra vantajosa - incorporação, fusão e c | 2017-01-01 | — | A |
| 19.20 | Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia | 2017-01-01 | — | A |
| 19.25 | Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill | 2017-01-01 | — | A |
| 19.30 | Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill - incoporação, fusão ou cisão | 2017-01-01 | — | A |
| 19.35 | Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia | 2017-01-01 | — | A |
| 19.40 | Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia - incorporação, fusão ou cisão | 2017-01-01 | — | A |
| 19.45 | Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia - incorporação, fusão ou cisão - quotas  | 2017-01-01 | — | A |
| 19.50 | Investimento avaliado pelo valor de patrimônio líquido - perda reconhecida no resultado por variação na porcentagem de p | 2017-01-01 | — | A |
| 19.55 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho com base no valor justo | 2017-01-01 | — | A |
| 19.60 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho decorrente do excesso do valor ju | 2017-01-01 | — | A |
| 19.65 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - perda com base no valor justo | 2017-01-01 | — | A |
| 19.70 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva da mais-va | 2017-01-01 | — | A |
| 19.75 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da mais-va | 2017-01-01 | — | A |
| 19.80 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva do goodwil | 2017-01-01 | — | A |
| 19.85 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa do goodwil | 2017-01-01 | — | A |
| 19.90 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução positiva da menos-valia | 2017-01-01 | — | A |
| 19.95 | Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da menos-v | 2017-01-01 | — | A |
| 19951 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - ganho - real | 2017-01-01 | — | A |
| 19952 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - ganho - alie | 2017-01-01 | — | A |
| 19953 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - registrado e | 2017-01-01 | — | A |
| 19954 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - registrado e | 2017-01-01 | — | A |
| 19955 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida não controlado por meio de subconta - registra | 2017-01-01 | — | A |
| 19956 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - não registrado em co | 2017-01-01 | — | A |
| 19957 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - registrado em conta  | 2017-01-01 | — | A |
| 19958 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida - não controlado por subconta - não registrado | 2017-01-01 | — | A |
| 19959 | Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida - não controlado por subconta - registrado em  | 2017-01-01 | — | A |
| 19960 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - realização da mais-valia integran | 2017-01-01 | — | A |
| 19961 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19962 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - contrapar | 2017-01-01 | — | A |
| 19963 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19964 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - perda dec | 2017-01-01 | — | A |
| 19965 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19966 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - contrapar | 2017-01-01 | — | A |
| 19967 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - realizaçã | 2017-01-01 | — | A |
| 19968 | Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - regra de transição | 2017-01-01 | — | A |
| 19969 | Combinação de negócios, exceto investimento avaliado pelo valor de patrimônio líquido - contrapartida da redução do ágio | 2017-01-01 | — | A |
| 19970 | Combinação de negócios, exceto investimento avaliado pelo valor de patrimônio líquido | 2017-01-01 | — | A |
| 19971 | Resultados positivos não realizados nas operações intercompanhias | 2017-01-01 | — | A |
| 19972 | Resultados negativos não realizados nas operações intercompanhias | 2017-01-01 | — | A |
| 20 | Excesso de juros sobre o capital próprio pagos ou creditados | 2017-01-01 | — | A |
| 21 | Juros sobre o capital próprio auferidos - não contabilizados como receita | 2015-01-01 | — | A |
| 23 | Dispêndios em pesquisa científica e tecnológica e de inovação tecnológica por ICT ou entidades científicas e tecnológica | 2015-01-01 | — | A |
| 24 | Dispêndios com pesquisa tecnológica e desenvolvimento de inovação tecnológica - reversão da amortização/depreciação | 2015-01-01 | — | A |
| 25 | Realização de reserva de reavaliação | 2015-01-01 | — | A |
| 28 | Prêmios da emissão de debêntures - destinação diversa | 2015-01-01 | — | A |
| 29 | Doações e subvenções para investimento - destinação diversa | 2015-01-01 | — | A |
| 29.05 | Doações e subvenções - art. 30, § 2º, da Lei nº 12.350/2010 | 2017-01-01 | — | A |
| 29.10 | Doações e subvenções - art. 30, § 1º, da Lei nº 12.350/2010 | 2017-01-01 | — | A |
| 30 | Realização de receitas originárias de planos de benefícios administrados por entidades fechadas de previdência complemen | 2015-01-01 | — | A |
| 31 | Remuneração da prorrogação da licença-maternidade | 2015-01-01 | — | A |
| 32 | Despesas e custos com pesquisa e desenvolvimento de produtos e processos inovadores em empresas e entidades nacionais re | 2015-01-01 | — | A |
| 33 | Despesas e custos com remuneração de pesquisadores empregados em atividades de inovação tecnológica em empresas no país  | 2015-01-01 | — | A |
| 34 | Impostos e contribuições com exigibilidade suspensa | 2015-01-01 | — | A |
| 35 | Resultados negativos com atos cooperativos | 2015-01-01 | — | A |
| 35.05 | Juros sobre o capital integralizado pelas cooperativas a seus associadas que excederem 12% ao ano | 2017-01-01 | — | A |
| 36 | Custos e despesas vinculados às receitas da atividade imobiliária tributadas pelo RET | 2015-01-01 | — | A |
| 36.10 | Custos e despesas vinculados às receitas da atividade de construção no âmbito do PMCMV tributadas pelo RET | 2017-01-01 | — | A |
| 37 | Custos e despesas vinculados às receitas da atividade de construção no âmbito do PMCMV | 2015-01-01 | — | A |
| 38 | Custos e despesas vinculados às receitas da atividade de construção ou reforma de estabelecimentos de educação infantil | 2015-01-01 | — | A |
| 39 | Parcela dos lucros de contratos de construção por empreitada ou fornecimento, celebrados com pessoa jurídica de direito  | 2015-01-01 | — | A |
| 40 | Aporte do poder público | 2015-01-01 | — | A |
| 40.05 | Aporte do poder público - saldo remanescente | 2017-01-01 | — | A |
| 40.10 | Aporte do poder público - ainda não adicionado, no caso de extinção da concessão antes do advento do termo contratural | 2017-01-01 | — | A |
| 42.15 | Incentivo fiscal - gastos com desenvolvimento de inovação tecnológica | 2018-01-01 | — | A |
| 49 | Incentivo fiscal - depreciação acelerada - máquinas, equipamentos, aparelhos e instrumentos | 2015-01-01 | — | A |
| 50.05 | Incentivo fiscal - depreciação/amortização acelerada incentivada - máquinas, os equipamentos, os aparelhos e os instrume | 2024-01-01 | — | A |
| 52.05 | Operações realizadas em mercados de liquidação futura - resultados negativos incorridos reconhecidos na contabilidade an | 2017-01-01 | — | A |
| 52.10 | Operações realizadas em mercados de liquidação futura - resultados positivos incorridos reconhecidos na contabilidade an | 2017-01-01 | — | A |
| 53 | Arrendamento mercantil - PJ arrendatária - depreciação, amortização e exaustão | 2015-01-01 | — | A |
| 53.05 | Arrendamento mercantil - PJ arrendatária - depreciação, amortização e exaustão apropriado como custo de produção | 2017-01-01 | — | A |
| 53.10 | Arrendamento mercantil - PJ arrendatária - contrato não tipificado como arrendamento mercantil financeiro | 2017-01-01 | — | A |
| 53.15 | Arrendamento mercantil - PJ arrendadora - não disciplinado pela Lei nº 6.099/74 - resultado proporcional ao valor da con | 2017-01-01 | — | A |
| 54 | Arrendamento mercantil - PJ arrendadora - não disciplinado pela Lei nº 6.099/74 - ajustes decorrentes da neutralização d | 2015-01-01 | — | A |
| 54.05 | Arrendamento mercantil - PJ arrendadora - contrato não tipificado como arrendamento mercantil financeiro - resultado pro | 2017-01-01 | — | A |
| 54.10 | Arrendamento mercantil - PJ arrendadora - contrato não tipificado como arrendamento mercantil financeiro - Ajustes decor | 2017-01-01 | — | A |
| 54.15 | Arrendamento mercantil - PJ arrendadora - valor residual | 2017-01-01 | — | A |
| 55 | Arrendamento mercantil - PJ arrendatária - despesas financeiras dos contratos de arrendamento | 2015-01-01 | — | A |
| 55.05 | Arrendamento mercantil - PJ arrendatária - despesas financeiras dos contratos não tipificados como arrendamento | 2017-01-01 | — | A |
| 55.10 | Arrendamento mercantil - PJ arrendatária - ganho de capital | 2017-01-01 | — | A |
| 55.15 | Arrendamento mercantil - PJ arrendatária - contrato não tipificado como arrendamento - ganho de capital | 2017-01-01 | — | A |
| 56.05 | Juros produzidos por NTN | 2017-01-01 | — | A |
| 57 | Juros de empréstimos - custos de empréstimos | 2015-01-01 | — | A |
| 57.05 | Juros de empréstimos - empresa controlada ou coligada | 2017-01-01 | — | A |
| 58 | Mais valia de investimentos avaliados pelo patrimônio líquido em sociedades estrangeiras que não funcionem no país. | 2015-01-01 | — | A |
| 59 | Ágio por rentabilidade futura (goodwill) de investimentos avaliados pelo patrimônio líquido em sociedades estrangeiras q | 2015-01-01 | — | A |
| 60 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - controlado por subconta | 2015-01-01 | — | A |
| 60.05 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - não controlado por subconta | 2017-01-01 | — | A |
| 60.10 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - não controlado por subconta - com prejuízo fisca | 2017-01-01 | — | A |
| 60.15 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - não controlado por subconta - com prejuízo fisca | 2017-01-01 | — | A |
| 60.20 | Avaliação a valor justo - subscrição - ganho - controlado por subconta. | 2017-01-01 | — | A |
| 60.25 | Avaliação a valor justo - subscrição - ganho - não controlado por subconta | 2017-01-01 | — | A |
| 60.30 | Avaliação a valor justo - subscrição - ganho - não controlado por subconta - com prejuízo fiscal - valor anteriormente e | 2017-01-01 | — | A |
| 60.35 | Avaliação a valor justo - subscrição - ganho - não controlado por subconta - com prejuízo fiscal | 2017-01-01 | — | A |
| 60.40 | Avaliação a valor justo - incorporação, fusão e cisão - ganho | 2017-01-01 | — | A |
| 60.45 | Avaliação a valor Justo - ativo ou passivo da pessoa jurídica - perda - controlada por subconta | 2017-01-01 | — | A |
| 60.50 | Avaliação a valor justo - ativo ou passivo da pessoa jurídica - perda - não controlada por subconta | 2017-01-01 | — | A |
| 60.55 | Avaliação a valor justo - subscrição - perda - controlada por subconta | 2017-01-01 | — | A |
| 60.60 | Avaliação a valor justo - subscrição - perda - não controlada por subconta | 2017-01-01 | — | A |
| 64 | Ajuste a valor presente de ativo - venda | 2015-01-01 | — | A |
| 64.05 | Ajuste a valor presente de ativo - demais operações | 2017-01-01 | — | A |
| 65 | Ajuste a valor presente de passivo - incisos I, II e III do art. 5º da Lei nº 12.973/2014. | 2015-01-01 | — | A |
| 65.05 | Ajuste a valor presente de passivo - incisos IV e V do art. 5º da Lei nº 12.973/2014. | 2017-01-01 | — | A |
| 65.10 | Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo - relacionado a um ativo | 2017-01-01 | — | A |
| 65.15 | Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo - relacionado a uma despesa ou cust | 2017-01-01 | — | A |
| 66.05 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - diferença positiva entre valores de ativo | 2017-01-01 | — | A |
| 66.10 | Adoção inicial dos Arts. 1º a 71 da Lei nº 12.973/2014 - diferença positiva de ativo - controlada por subconta | 2017-01-01 | — | A |
| 66.15 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - diferença negativa de passivo - não controlada por subconta | 2017-01-01 | — | A |
| 66.20 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - diferença negativa de passivo - controlada por subconta | 2017-01-01 | — | A |
| 66.25 | Adoção inicial dos Arts. 1º a 71 da Lei nº 12.973/2014 - reserva de reavaliação - ativos de coligadas ou controladas | 2017-01-01 | — | A |
| 66.30 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - reserva de reavaliação - subscrição | 2017-01-01 | — | A |
| 66.35 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - reserva de reavaliação - ativos próprios | 2017-01-01 | — | A |
| 66.40 | Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - ajustes de avaliação patrimonial | 2017-01-01 | — | A |
| 69 | Atividade imobiliária - permuta - lucro bruto decorrente da avaliação a valor justo das unidades permutadas | 2015-01-01 | — | A |
| 70 | Atividade imobiliária - diferimento da tributação - ajustes pertinentes ao reconhecimento do lucro bruto | 2015-01-01 | — | A |
| 71 | Despesas pré-operacionais | 2015-01-01 | — | A |
| 79 | Contratos de longo prazo - divergência de critério - ajuste da diferença dos critérios adotados no § 1º do art. 10 do De | 2015-01-01 | — | A |
| 80 | Provisões ou perdas estimadas - teste de recuperabilidade | 2015-01-01 | — | A |
| 81 | Pagamento baseado em ações apropriado como despesa ou custo | 2015-01-01 | — | A |
| 81.05 | Pagamento baseado em ações - serviços prestados por pessoa física que não seja considerada empregado ou similar | 2017-01-01 | — | A |
| 82 | Contratos de concessão de serviços públicos - realização de ativo intangível representativo do direito | 2015-01-01 | — | A |
| 82.05 | Contratos de concessão de serviços públicos - recebimento de ativo financeiro | 2017-01-01 | — | A |
| 82.10 | Contratos de concessão de serviços públicos - apropriação de receitas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | A |
| 84 | CPC 47 - Ajustes de Receita Bruta | 2018-01-01 | — | A |
| 84.05 | CPC 47 - Ajustes de Custos/Despesas | 2018-01-01 | — | A |
| 84.10 | CPC 47 - Ajustes de Outras Receitas / Outros Resultados | 2018-01-01 | — | A |
| 86 | Depreciação - diferença entre as depreciações contábil e fiscal | 2015-01-01 | — | A |
| 88 | Provisões ou perdas estimadas - gastos com desmontagem | 2015-01-01 | — | A |
| 89 | Outros ajustes decorrentes de modificação ou adoção de métodos e critérios contábeis por meio de atos administrativos, c | 2015-01-01 | — | A |
| 91 | Contratos de concessão de serviços públicos - diferença negativa - adoção inicial dos arts. 1º a 71 da Lei nº 12.973/201 | 2015-01-01 | — | A |
| 91.01 | Depreciação - diferença entre as depreciações contábil e fiscal - alienação ou baixa de ativo | 2015-01-01 | — | A |
| 91.02 | Despesa com instrumentos de capital ou de dívida subordinada - estorno | 2015-01-01 | — | A |
| 91.10 | Devolução de capital social | 2017-01-01 | — | A |
| 91.15 | Ganho de capital - recebimento após o término do período de apuração da contratação | 2017-01-01 | — | A |
| 91.20 | Perdas no recebimento de créditos - PJ credora - não contabilmente estornadas no caso de desistência da cobrança pela vi | 2017-01-01 | — | A |
| 91.25 | Perdas no recebimento de créditos - PJ credora - encargos financeiros incidentes sobre o crédito vencido e não recebido | 2017-01-01 | — | A |
| 91.30 | Encargos incidentes sobre o débito vencido e não pago deduzidos como despesa ou custo a partir da data da citação inicia | 2017-01-01 | — | A |
| 91.40 | Ajustes de Exercícios Anteriores - Lançamentos Extemporâneos | 2017-01-01 | — | A |
| 91.45 | Ganho decorrente da mensuração de ativo pelo valor de liquidação - Realização | 2021-01-01 | — | A |
| 91.50 | Perda decorrente da mensuração de ativo pelo valor de liquidação | 2021-01-01 | — | A |
| 91.55 | Despesa estimada para realização do ativo - Entidade em Liquidação | 2021-01-01 | — | A |
| 91.60 | Ganho decorrente do reconhecimento de ativo não registrado até a data de início de liquidação - Realização | 2021-01-01 | — | A |
| 91.65 | Perda decorrente da baixa de ativo registrado até a data de início de liquidação | 2021-01-01 | — | A |
| 91.70 | Encargos de Depreciação/Amortização/Exaustão dos Gastos ativados na atividade de exploração de jazidas de petróleo e gás | 2023-01-01 | — | A |
| 91.75 | Encargos de Exaustão apropriados ao resultado referentes aos Gastos com o desenvolvimento da produção dos campos de petr | 2023-01-01 | — | A |
| 91.80 | Encargos de Exaustão apropriados ao resultado referente aos Gastos com o desenvolvimento da produção dos campos de petró | 2023-01-01 | — | A |
| 91.85 | Depreciação - diferença entre as depreciações contábil e fiscal - Art. 6º da IN RFB nº 1.778/2017 | 2023-01-01 | — | A |
| 92 | Outras adições - indicador de relacionamento 1, 2 ou 3 | 2015-01-01 | — | A |
| 92.01 | Outras adições - indicador de relacionamento 4 | 2015-01-01 | — | A |
| 95 | (-) Reversão ou uso de provisões ou perdas estimadas não dedutíveis | 2015-01-01 | — | E |
| 96 | (-) Lucros e dividendos derivados de investimentos avaliados pelo custo de aquisição | 2015-01-01 | — | E |
| 100.05 | (-) Investimento avaliado pelo valor de patrimônio líquido - contrapartida por aumento no valor de patrimônio líquido re | 2017-01-01 | — | E |
| 100.10 | (-) Investimento avaliado pelo valor de patrimônio líquido - ganho proveniente de compra vantajosa | 2017-01-01 | — | E |
| 100.15 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia | 2017-01-01 | — | E |
| 100.20 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia - incorporação, fusão ou cisão | 2017-01-01 | — | E |
| 100.25 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da mais-valia - incorporação, fusão ou cisão - quot | 2017-01-01 | — | E |
| 100.30 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill | 2017-01-01 | — | E |
| 100.35 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução do goodwill - incoporação, fusão ou cisão | 2017-01-01 | — | E |
| 100.40 | (-) Investimento avaliado pelo valor de patrimônio líquido - redução da menos-valia | 2017-01-01 | — | E |
| 100.45 | (-) Investimento avaliado pelo valor de patrimônio líquido - ganho reconhecido no resultado por variação na porcentagem  | 2017-01-01 | — | E |
| 100.50 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho com base no valor justo | 2017-01-01 | — | E |
| 100.55 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - ganho decorrente do excesso do valo | 2017-01-01 | — | E |
| 100.60 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - perda com base no valor justo | 2017-01-01 | — | E |
| 100.65 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva da mai | 2017-01-01 | — | E |
| 100.70 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da mai | 2017-01-01 | — | E |
| 100.75 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva do goo | 2017-01-01 | — | E |
| 100.80 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa do goo | 2017-01-01 | — | E |
| 100.85 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação positiva da men | 2017-01-01 | — | E |
| 100.90 | (-) Investimento avaliado pelo valor de patrimônio líquido - aquisição em estágios - redução da variação negativa da men | 2017-01-01 | — | E |
| 100.95 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - ganho | 2017-01-01 | — | E |
| 100951 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por meio de subconta - registra | 2017-01-01 | — | E |
| 100952 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida não controlado por meio de subconta - regi | 2017-01-01 | — | E |
| 100953 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - não registrado e | 2017-01-01 | — | E |
| 100954 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - não registrado e | 2017-01-01 | — | E |
| 100955 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - registrado em co | 2017-01-01 | — | E |
| 100956 | (-) Investimento avaliado pelo valor de patrimônio líquido - AVJ na investida controlado por subconta - registrado em co | 2017-01-01 | — | E |
| 100957 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100958 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reduç | 2017-01-01 | — | E |
| 100959 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100960 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - ganho | 2017-01-01 | — | E |
| 100961 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - ganho | 2017-01-01 | — | E |
| 100962 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100963 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reduç | 2017-01-01 | — | E |
| 100964 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - aquisição em estágios - reali | 2017-01-01 | — | E |
| 100965 | (-) Investimento avaliado pelo valor de patrimônio líquido - incorporação, fusão e cisão - regra de transição | 2017-01-01 | — | E |
| 100966 | (-) Combinação de negócios, exceto investimento avaliado pelo valor de patrimônio líquido | 2017-01-01 | — | E |
| 100967 | (-) Resultados positivos não realizados nas operações intercompanhias | 2017-01-01 | — | E |
| 100968 | (-) Resultados negativos não realizados nas operações intercompanhias | 2017-01-01 | — | E |
| 101 | (-) Variação cambial ativa - regra geral - valor evidenciado no registro L300 de acordo com o regime de competência | 2015-01-01 | — | E |
| 102 | (-) Variação cambial passiva - regra geral - operações liquidadas | 2015-01-01 | — | E |
| 102.05 | (-) Variação cambial - regra geral - mudança de regime de caixa para competência | 2017-01-01 | — | E |
| 102.10 | (-) Variação cambial sobre juros a apropriar decorrentes de ajuste a valor presente | 2017-01-01 | — | E |
| 102.15 | (-) Variação cambial - aumento nas receitas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | E |
| 102.20 | (-) Variação cambial - redução nas despesas financeiras decorrentes de ajuste a valor presente | 2017-01-01 | — | E |
| 102.25 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - investimentos não avaliados pela equivalência patrim | 2017-01-01 | — | E |
| 102.30 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - excluídos nos primeiro, segundo e terceiro trimestre | 2017-01-01 | — | E |
| 103 | (-) Incentivo fiscal - pesquisas tecnológicas e desenvolvimento de inovação tecnológica | 2015-01-01 | — | E |
| 105 | (-) Prêmio da emissão de debêntures | 2015-01-01 | — | E |
| 105.05 | (-) Impostos e contribuições com exigibilidade suspensa | 2017-01-01 | — | E |
| 106 | (-) Doações e subvenções para investimentos | 2015-01-01 | — | E |
| 106.05 | (-) Doações e subvenções - Art. 30 da Lei nº 12.350/2010 | 2017-01-01 | — | E |
| 106.10 |  | 2023-01-01 | — | E |
| 107 | (-) Realização de receitas originárias de planos de benefícios administrados por entidades fechadas de previdência compl | 2015-01-01 | — | E |
| 108 | (-) Receitas de subvenções governamentais para pesquisa e desenvolvimento de produtos e processos inovadores em empresas | 2015-01-01 | — | E |
| 109 | (-) Receitas de subvenções governamentais para remuneração de pesquisadores empregados em atividades de inovação tecnoló | 2015-01-01 | — | E |
| 111 | (-) Cooperativas | 2015-01-01 | — | E |
| 112 |  | 2015-01-01 | — | E |
| 112.10 |  | 2017-01-01 | — | E |
| 113 |  | 2015-01-01 | — | E |
| 114 |  | 2015-01-01 | — | E |
| 115 | (-) Parcela dos lucros de contratos de construção por empreitada ou fornecimento, celebrados com pessoa jurídica de dire | 2015-01-01 | — | E |
| 116 | (-) Aporte do poder público | 2015-01-01 | — | E |
| 117 | (-) Juros produzidos por NTN (Lei nº 10.179/2001) | 2015-01-01 | — | E |
| 117.05 | (-) Juros produzidos por NTN | 2017-01-01 | — | E |
| 117.10 | (-) Aquisição de bens e direitos no âmbito do PND | 2017-01-01 | — | E |
| 118 | (-) Incentivo fiscal - pesquisas tecnológicas e desenvolvimento de inovação tecnológica (Lei 11.196/05, art. 19, § 1º) | 2015-01-01 | — | E |
| 118.10 | (-) Incentivo fiscal - pesquisas tecnológicas e desenvolvimento de inovação tecnológica (Lei 11.196/05, art. 19, § 3º) | 2017-01-01 | — | E |
| 119 | (-) Incentivo fiscal - pesquisa científica e tecnológica e de inovação tecnológica (Lei 11.196/05, art. 19A) | 2015-01-01 | — | E |
| 121.05 | (-) Incentivo fiscal - depreciação acelerada incentivada - inovação tecnológica | 2021-01-01 | — | E |
| 121.15 | (-) Incentivo fiscal - gastos com desenvolvimento de inovação tecnológica | 2018-01-01 | — | E |
| 122.05 | (-) Incentivo fiscal - crédito presumido de IPI do programa INOVAR-AUTO | 2017-01-01 | — | E |
| 128 | (-) Incentivo fiscal - Depreciação acelerada - máquinas, equipamentos, aparelhos e instrumentos | 2015-01-01 | — | E |
| 128.05 | (-) Incentivo fiscal - Depreciação acelerada - máquinas, os equipamentos, os aparelhos e os instrumentos do ativo não ci | 2024-01-01 | — | E |
| 131.05 | (-) Operações realizadas em mercados de liquidação futura - resultados positivos incorridos reconhecidos na contabilidad | 2017-01-01 | — | E |
| 131.10 | (-) Operações realizadas em mercados de liquidação futura - resultados negativos incorridos reconhecidos na contabilidad | 2017-01-01 | — | E |
| 134 | (-) Arrendamento mercantil - PJ arrendadora | 2015-01-01 | — | E |
| 134.01 | (-) Arrendamento mercantil - PJ arrendatária - contraprestações pagas ou creditadas de contratos de arrendamento | 2015-01-01 | — | E |
| 134.05 | (-) Arrendamento mercantil - PJ arrendadora - contrato não tipificado como arrendamento mercantil financeiro | 2017-01-01 | — | E |
| 134.15 | (-) Arrendamento mercantil - PJ arrendatária - contraprestações pagas ou creditadas de contratos não tipificados como ar | 2017-01-01 | — | E |
| 134.20 | (-) Avaliação a valor justo - subscrição - ganho | 2017-01-01 | — | E |
| 134.25 | (-) Avaliação a valor justo - subscrição - ganho - sem subconta | 2017-01-01 | — | E |
| 134.30 | (-) Avaliação a valor justo - subscrição - ganho | 2017-01-01 | — | E |
| 134.35 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - perda | 2017-01-01 | — | E |
| 134.40 | (-) Avaliação a valor justo - subscrição - perda | 2017-01-01 | — | E |
| 135 | (-) Juros de empréstimos - custos de empréstimos | 2015-01-01 | — | E |
| 136.05 | (-) Atividade imobiliária - permuta - lucro bruto decorrente da avaliação a valor justo das unidades permutadas | 2017-01-01 | — | E |
| 137 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho | 2015-01-01 | — | E |
| 137.05 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho - sem subconta | 2017-01-01 | — | E |
| 137.10 | (-) Avaliação a valor justo - ativo ou passivo da pessoa jurídica - ganho | 2017-01-01 | — | E |
| 141 | (-) Ajuste a valor presente de ativo - venda | 2015-01-01 | — | E |
| 141.05 | (-) Ajuste a valor presente de ativo - outras operações | 2017-01-01 | — | E |
| 142 | (-) Ajuste a valor presente de passivo - incisos I, II e III do art. 5º da Lei nº 12.973/2014. | 2015-01-01 | — | E |
| 142.05 | (-) Ajuste a valor presente de passivo - incisos IV e V do art. 5º da Lei nº 12.973/2014. | 2017-01-01 | — | E |
| 142.10 | (-) Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo. | 2017-01-01 | — | E |
| 142.15 | (-) Ajuste a valor presente de passivo - outras operações que não sejm aquisição a prazo - relacionado a uma despesa ou  | 2017-01-01 | — | E |
| 143.05 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - realização de diferença negativa entre valores de ativo con | 2017-01-01 | — | E |
| 143.10 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - baixa ou liquidação de diferença positiva entre valores de  | 2017-01-01 | — | E |
| 143.15 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - ativo diferido - realização de diferença negativa entre val | 2017-01-01 | — | E |
| 143.20 | (-) Adoção inicial dos arts. 1º a 71 da Lei nº 12.973/2014 - ativo diferido - realização de diferença negativa entre val | 2017-01-01 | — | E |
| 145 | (-) Atividade imobiliária - diferimento da tributação - ajustes pertinentes ao reconhecimento do lucro bruto | 2015-01-01 | — | E |
| 146 | (-) Despesa com emissão de ações | 2015-01-01 | — | E |
| 146.01 | (-) Despesa com instrumentos de capital ou de dívida subordinada | 2015-01-01 | — | E |
| 147 | (-) Despesas pré-operacionais | 2015-01-01 | — | E |
| 154 | (-) Contratos de longo prazo - divergência de critério - ajuste da diferença dos critérios adotados no § 1º do art. 10 d | 2015-01-01 | — | E |
| 155 | (-) Provisões ou perdas estimadas - teste de recuperabilidade - alienação ou baixa do bem correspondente | 2015-01-01 | — | E |
| 155.05 | (-) Provisões ou perdas estimadas - teste de recuperabilidade - reversão | 2017-01-01 | — | E |
| 156 | (-) Pagamento baseado em ações apropriado como despesa ou custo | 2015-01-01 | — | E |
| 157 | (-) Contratos de concessão de serviços públicos - realização de ativo intangível representativo do direito | 2015-01-01 | — | E |
| 157.05 | (-) Contratos de concessão de serviços públicos - recebimento de ativo financeiro | 2017-01-01 | — | E |
| 157.10 | (-) Contratos de concessão de serviços públicos - apropriação de receitas financeiras decorrentes de ajuste a valor pres | 2017-01-01 | — | E |
| 159 | (-) CPC 47 - Ajustes de Receita Bruta | 2018-01-01 | — | E |
| 159.05 | (-) CPC 47 - Ajustes de Custos/Despesas | 2018-01-01 | — | E |
| 159.10 | (-) CPC 47 - Ajustes de Outras Receitas / Outros Resultados | 2018-01-01 | — | E |
| 161 | (-) Depreciação - diferença entre as depreciações contábil e fiscal | 2015-01-01 | — | E |
| 163 | (-) Provisões ou perdas estimadas - gastos com desmontagem | 2015-01-01 | — | E |
| 164 | (-) Outros ajustes decorrentes de modificação ou adoção de métodos e critérios contábeis por meio de atos administrativo | 2015-01-01 | — | E |
| 166 | (-) Contratos de concessão de serviços públicos - diferença positiva - adoção inicial dos arts. 1º a 71 da Lei nº 12.973 | 2015-01-01 | — | E |
| 166.01 | (-) Lucros de participações em controladas e coligadas domiciliadas no Brasil, no caso do art. 85 da Lei nº 12.973/2014 | 2015-01-01 | — | E |
| 166.03 | (-) Juros sobre o capital próprio | 2016-01-01 | — | E |
| 166.05 | (-) Ganho de capital - recebimento após o término do ano-calendário seguinte ao da contratação | 2017-01-01 | — | E |
| 166.10 | (-) Perdas no recebimento de créditos - PJ credora - encargos financeiros incidentes sobre o crédito vencido e não receb | 2017-01-01 | — | E |
| 166.15 | (-) Encargos incidentes sobre o débito vencido e não pago deduzidos como despesa a serem excluídos no período de apuraçã | 2017-01-01 | — | E |
| 166.20 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - Preços de Transferência | 2017-01-01 | — | E |
| 166.21 | (-) Lucros, rendimentos e ganhos de capital auferidos no exterior - Subcapitalização | 2017-01-01 | — | E |
| 166.25 | (-) Programas de estímulo à solicitação de documento fiscal | 2017-01-01 | — | E |
| 166.35 | (-) Ajustes de Exercícios Anteriores - Lançamentos Extemporâneos | 2017-01-01 | — | E |
| 166.45 | (-) Ganho decorrente da mensuração de ativo pelo valor de liquidação | 2021-01-01 | — | E |
| 166.50 | (-) Perda decorrente da mensuração de ativo pelo valor de liquidação - Realização | 2021-01-01 | — | E |
| 166.55 | (-) Despesa estimada para realização do ativo - Entidade em Liquidação - Realização | 2021-01-01 | — | E |
| 166.60 | (-) Ganho decorrente do reconhecimento de ativo não registrado até a data de início de liquidação | 2021-01-01 | — | E |
| 166.65 | (-) Perda decorrente da baixa de ativo registrado até a data de início de liquidação - Efetiva saída do ativo do patrimô | 2021-01-01 | — | E |
| 166.70 | (-) Gastos ativados no imobilizado/intangível na atividade de exploração de petróleo e gás natural | 2023-01-01 | — | E |
| 166.75 | (-) Exaustão Acelerada dos gastos com o desenvolvimento da produção dos campos de petróleo e gás natural | 2023-01-01 | — | E |
| 166.85 | (-) Depreciação - diferença entre as depreciações contábil e fiscal - Art. 6º da IN RFB nº 1.778/2017 | 2023-01-01 | — | E |
| 166.90 | (-) Receitas atinentes à atualização pela taxa Selic em razão de repetição de indébito tributário. | 2025-01-01 | — | E |
| 166.95 | (-) Incentivo fiscal - Regime Especial de Reintegração de Valores Tributários para as Empresas Exportadoras - REINTEGRA  | 2025-01-01 | — | E |
| 167 | (-) Outras exclusões - com indicador de relacionamento 1, 2 ou 3 | 2015-01-01 | — | E |
| 167.01 | (-) Outras exclusões - qualquer indicador de relacionamento | 2015-01-01 | — | E |
| 173 | (-) Compensação de Base de Cálculo Negativa da CSLL de Períodos Anteriores - Atividades em Geral | 2015-01-01 | — | P |
| 174 | (-) Compensação de Base de Cálculo Negativa da CSLL de Períodos Anteriores - Atividade Rural | 2015-01-01 | — | P |

Linhas calculadas (7) — só para o teste negativo do item 14: `2`, `93`, `168`, `169`, `170`, `171`, `175`


### N500 — 1 linhas `E`

| Código | Descrição | DT_INI | DT_FIM |
|---|---|---|---|
| 2 | Valor da base de cálculo do IRPJ - Estimativa com base na receita bruta | 2015-01-01 | — |

Linhas calculadas (1) — só para o teste negativo do item 14: `1`


### N630A — 26 linhas `E`

| Código | Descrição | DT_INI | DT_FIM |
|---|---|---|---|
| 6 | (-) Operações de Caráter Cultural e Artístico | 2015-01-01 | — |
| 8 | (-) Programa de Alimentação do Trabalhador | 2015-01-01 | — |
| 9 | (-) Desenvolvimento Tecnológico Industrial / Agropecuário | 2015-01-01 | — |
| 10 | (-) Atividade Audiovisual | 2015-01-01 | — |
| 11 | (-) Fundos dos Direitos da Criança e do Adolescente | 2015-01-01 | — |
| 12 | (-) Fundos Nacional, Estaduais ou Municipais do Idoso (Lei nº 12.213/2010, art. 3º) | 2015-01-01 | — |
| 13 | (-) Atividades de Caráter Desportivo | 2015-01-01 | — |
| 14 | (-) Programa Nacional de Apoio à Atenção Oncológica - PRONON (Lei nº 12.715/2012, arts. 1º e 4º) | 2015-01-01 | 2026-12-31 |
| 15 | (-) Programa Nacional de Apoio à Atenção da Saúde da Pessoa com Deficiência - PRONAS/PCD (Lei nº 12.715/2012, arts. 3º e | 2015-01-01 | 2026-12-31 |
| 16 | (-) Valor da Remuneração da Prorrogação da Licença-Maternidade e da Licença-Paternidade (Lei nº 11.770/2008, art. 5º) | 2015-01-01 | — |
| 16.01 | (-) Crédito Presumido de 9% Sobre a Parcela dos Lucros Auferidos no Exterior (Art. 28, da Instrução Normativa 1.520/2014 | 2015-01-01 | — |
| 16.04 | (-) Imposto Sobre a Renda Pago no Exterior pela Controlada Direta ou Indireta, no Caso do Art. 87 da Lei nº 12.973/2014 | 2015-01-01 | — |
| 16.05 | (-) Imposto Sobre a Renda Retido na Fonte no Exterior Incidente Sobre os Dividendos no Caso do Art. 88 da Lei nº 12.973/ | 2015-01-01 | — |
| 16.06 | (-) Programa Rota 2030 - Mobilidade e Logística - Despesa Operacional do Período (Art. 11 da Lei nº 13.755/2018) | 2019-01-01 | — |
| 16.07 | (-) Programa Rota 2030 - Mobilidade e Logística - Parcela Excedente de Períodos Anteriores (Art. 11, § 3º da Lei nº 13.7 | 2019-01-01 | — |
| 16.10 | (-) Incentivo a Projetos de Reciclagem (Art. 3º, da Lei nº 14.260/2021) | 2021-01-01 | — |
| 16.50 | (-) Outras Deduções | 2024-01-01 | — |
| 19 | (-) Imposto Pago no Exterior sobre Lucros, Rendimentos e Ganhos de Capital | 2015-01-01 | — |
| 20 | (-) Imposto de Renda Retido na Fonte | 2015-01-01 | — |
| 21 | (-) Imposto de Renda Retido na Fonte por Órgãos, Autarquias e Fundações Federais (Lei nº 9.430/1996, art. 64) | 2015-01-01 | — |
| 22 | (-) Imposto de Renda Retido na Fonte pelas Demais Entidades da Administração Pública Federal (Lei n° 10.833/2003, art. 3 | 2015-01-01 | — |
| 23 | (-) Imposto Pago Incidente sobre Ganhos no Mercado de Renda Variável | 2015-01-01 | — |
| 24 | (-) Imposto de Renda Mensal Efetivamente Pago por Estimativa | 2015-01-01 | — |
| 25 | (-) Imposto de Renda Efetivamente Parcelado Referente a Estimativas Mensais | 2015-01-01 | — |
| 27 | IMPOSTO DE RENDA SOBRE A DIFERENÇA ENTRE O CUSTO ORÇADO E O CUSTO EFETIVO | 2015-01-01 | — |
| 28 | IMPOSTO DE RENDA POSTERGADO DE PERÍODOS DE APURAÇÃO ANTERIORES | 2015-01-01 | — |

Linhas calculadas (17) — só para o teste negativo do item 14: `1`, `3`, `4`, `6.1`, `8.1`, `10.1`, `11.1`, `12.1`, `13.1`, `14.1`, `15.1`, `16001`, `16.15`, `17`, `18`, `26`, `29`


### N670 — 26 linhas `E`

| Código | Descrição | DT_INI | DT_FIM |
|---|---|---|---|
| 0.51 | Total das Receitas Brutas Computadas no Trimestre | 2020-03-01 | — |
| 0.52 | Total das Receitas Brutas do Mês de Março | 2020-03-01 | — |
| 0.53 | Total das Receitas Brutas Computadas no Balanço do Período | 2020-03-01 | — |
| 0.54 | Total das Receitas Brutas do Mês de Março até o Final do Período | 2020-03-01 | — |
| 0.55 | Total das Receitas Brutas Computadas no Balanço do Período | 2021-07-01 | — |
| 0.56 | Total das Receitas Brutas do Mês de Julho até o Final do Período | 2021-07-01 | — |
| 0.57 | Total das Receitas Brutas Computadas no Balanço do Período | 2022-08-01 | — |
| 0.58 | Total das Receitas Brutas do Mês de Agosto até o Final do Período | 2022-08-01 | — |
| 3 | Adição de Créditos de CSLL sobre Depreciação Utilizados Anteriormente (Lei nº 11.051/2004, art. 1º, §§ 7º, 11 e 12) | 2015-01-01 | — |
| 6 | (-) Recuperação de Crédito de CSLL (MP nº 1.807/1999, art. 8º) | 2015-01-01 | — |
| 7 | (-) Créditos sobre Depreciação de Bens do Ativo Imobilizado (Lei nº 11.051/2004, art. 1º) | 2015-01-01 | — |
| 12 | (-) Isenção sobre o Lucro da Exploração da Atividade de Serviços - SPE - Eventos do CIO | 2015-01-01 | — |
| 13 | (-) Bônus de Adimplência Fiscal (Lei nº 10.637/2002, art. 38) | 2015-01-01 | — |
| 13.01 | (-) Programa Rota 2030 - Mobilidade e Logística - Despesa Operacional do Período (Art. 11 da Lei nº 13.755/2018) | 2019-01-01 | — |
| 13.02 | (-) Programa Rota 2030 - Mobilidade e Logística - Parcela Excedente de Períodos Anteriores (Art. 11, § 3º da Lei nº 13.7 | 2019-01-01 | — |
| 14 | (-) Imposto Pago no Exterior sobre Lucros, Rendimentos e Ganhos de Capital (MP nº 1.858-6/1999, art. 19) | 2015-01-01 | — |
| 14.03 | (-) Imposto Sobre a Renda Pago no Exterior pela Controlada Direta ou Indireta, no Caso do Art. 87 da Lei nº 12.973/2014 | 2015-01-01 | — |
| 14.04 | (-) Imposto Sobre a Renda Retido na Fonte no Exterior Incidente Sobre os Dividendos no Caso do Art. 88 da Lei nº 12.973/ | 2015-01-01 | — |
| 15 | (-) CSLL Retida na Fonte por Órgãos, Autarquias e Fundações Federais (Lei nº 9.430/1996, art. 64) | 2015-01-01 | — |
| 16 | (-) CSLL Retida na Fonte pelas Demais Entidades da Administração Pública Federal (Lei n° 10.833/2003, art. 34) | 2015-01-01 | — |
| 17 | (-) CSLL Retida na Fonte por Pessoas Jurídicas de Direito Privado (Lei n° 10.833/2003, art. 30) | 2015-01-01 | — |
| 18 | (-) CSLL Retida na Fonte por Órgãos, Autarquias e Fundações dos Estados, Distrito Federal e Municípios (Lei n° 10.833/20 | 2015-01-01 | — |
| 19 | (-) CSLL Mensal Efetivamente Paga por Estimativa | 2015-01-01 | — |
| 20 | (-) CSLL Efetivamente Parcelada Referente a Estimativas Mensais | 2015-01-01 | — |
| 22 | CSLL SOBRE A DIFERENÇA ENTRE O CUSTO ORÇADO E O CUSTO EFETIVO | 2015-01-01 | — |
| 23 | CSLL POSTERGADA DE PERÍODOS DE APURAÇÃO ANTERIORES | 2015-01-01 | — |

Linhas calculadas (10) — só para o teste negativo do item 14: `0.61`, `1`, `2`, `4`, `8`, `9`, `10`, `11`, `12.20`, `21`



---

Script gerador: `node scripts/transcrever-ecf-lmn.mjs` (lê o PDF e o XLSX do corpus; rodar de novo com diff vazio é o teste de que esta transcrição ainda bate com a fonte). Marcas `†` = nome normalizado pelo parser (ver cabeçalho).
