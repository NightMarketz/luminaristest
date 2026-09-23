# BE-INCR-FIXED-ASSETS (C8) PR-4 — transcrição J801 + J932 (ECD L9)

> **Estado:** transcrição CONCLUÍDA em 2026-09-23 (insumo documental do Passo 18 de
> `BE-INCR-FIXED-ASSETS-execution-plan.md`, docs-only). **Não implementa nada.**
> Autorização: dono — *"Executa C8"* (18/09) + download do Manual ECD L9 autorizado em sessão (23/09).
> Padrão seguido: `BE-INCR-SPED-IDENTITY-MASKS-transcription-J930-0930.md` (PR #339).
>
> Regra de transcrição: a redação do manual é reproduzida; nada aqui parafraseia regra. Onde o manual
> é internamente inconsistente, a inconsistência está em §3 (**não resolvida** aqui — decisão do dono/fork).

## Fonte normativa (grau VERIFICADO — leitura direta do PDF do corpus local)

| id | documento | arquivo | sha256 conferido nesta sessão | páginas usadas |
|---|---|---|---|---|
| `manual-ecd-l9` | Manual de Orientação do Leiaute 9 da ECD — Anexo ao ADE Cofis 01/2026, *Atualização: janeiro de 2026*, 235 pp. — **redação vigente, fornecida pelo dono em 23/09** (original `Manual_de_Orientação_da_ECD_Leiaute_9_janeiro_2026.pdf`) | `docs/accounting/fontes-oficiais/Manual-ECD-Leiaute-9.pdf` (gitignored; copiar à mão — o script baixa a versão maio/2026, ver MANIFEST) | `7ddf47755f616ecd76671b8be9c8b61e30adbb0e8408634e45af95f616119b2e` | J801: pp. 192-194 · J932: pp. 203-205 |

Procedimento: `pdftotext -layout -enc UTF-8` do PDF inteiro; a coluna "Obrigatório" de J801 campo 07
saiu vazia no `-layout` e foi reconferida com `pdftotext -raw` (resultado: **Sim**). Paginação impressa
== índice do PDF ("Página N de 235"; confere com o sumário: J801 → 192, J932 → 203), como no precedente.

---

## 1. ECD — Registro J801: Termo de Verificação para Fins de Substituição da ECD (pp. 192-194)

### 1.1 Texto introdutório (p. 192) — transcrito

> O registro J801, com limite de 30 MB, deve ser utilizado obrigatoriamente no caso de substituição de
> um arquivo da ECD, conforme previsão da Instrução Normativa RFB no 2.003/2021.
>
> A entidade deverá preencher o registro J801 – Termo de Verificação Para Fins de Substituição da ECD –
> detalhando os erros que deram motivo à substituição com as seguintes informações:
>
> I – identificação da escrituração substituída;
> II – descrição pormenorizada dos erros;
> III – identificação clara e precisa dos registros que contenham os erros, exceto quando estes
> decorrerem de outro erro já discriminado;
> IV – autorização expressa para acesso do Conselho Federal de Contabilidade a informações pertinentes
> às modificações; e
> V – descrição dos procedimentos pré-acordados executados pelos auditores independentes, quando for o
> caso, e quando estes julgarem necessário.
>
> Desde que contenha as informações acima, a redação, extensão e forma do termo são de livre definição
> pela pessoa jurídica.
>
> O Termo de Verificação para Fins de Substituição deve ser assinado (os dados dos assinantes serão
> preenchidos no registro J935):
>
> I - pelo próprio profissional da contabilidade que assina os livros contábeis substitutos; e
> II - quando as demonstrações contábeis tenham sido auditadas por auditor independente, pelo próprio
> profissional da contabilidade que assina os livros contábeis substitutos e também pelo seu auditor
> independente.
>
> A manifestação do profissional da contabilidade que não assina a escrituração se restringe às
> modificações relatadas no Termo de Verificação para Fins de Substituição.
>
> Só é admitida a substituição da ECD até o fim do prazo de entrega relativo ao ano-calendário subsequente.
>
> São nulas as alterações efetuadas em desacordo com as regras supramencionadas ou com o Termo de
> Verificação para Fins de Substituição.

Procedimento de anexação (p. 192), transcrito: 1 – Digite o documento que deseja anexar no Word;
2 – Salve o documento como .rtf; 3 – Abra o documento no Bloco de Notas; 4 – Copie todo o conteúdo do
arquivo aberto no Bloco de Notas; 5 – Cole o conteúdo copiado no registro J801; 6 – Importe o arquivo,
de acordo com o Leiaute da ECD, para o programa da ECD.

Funcionalidade de inclusão no programa da ECD: 1 – Selecionar a opção incluir arquivo rtf. 2 – O sistema
abre uma interface de localização de arquivo. 3 – Selecionar somente arquivo ".RTF" (formato RTF) 4 – O
sistema copia o arquivo para a pasta do sistema com o nome padronizado. 5 – O sistema calcula o hash e
armazena o nome o local e o hash da cópia do arquivo selecionado. 6 – O sistema coloca o nome do arquivo
no campo descrição. Exclusão: 1 – Selecionar um registro e solicitar a exclusão (Botão "-"). 2 – O
sistema exclui o registro J801 e o arquivo na pasta.

### 1.2 Cabeçalho do registro (p. 192)

- Regras de validação do registro: `[REGRA_REGISTRO_NAO_DEVE_EXISTIR_NO RTF]` (grafia do manual, com espaço)
- **Nível Hierárquico – 2** · **Ocorrência – 0:1** · Campo(s) chave: `[REG]`

### 1.3 Leiaute (pp. 193-194)

| Nº | Campo | Descrição (manual) | Tipo | Tam. | Dec. | Valores válidos | Obrig. | Regras do campo |
|---|---|---|---|---|---|---|---|---|
| 01 | `REG` | Texto fixo contendo "J801". | C | 004 | - | "J801" | Sim | - |
| 02 | `TIPO_DOC` | Tipo de documento: 001: Termo de Verificação para Fins Substituição da ECD | C | 003 | - | - | Sim | - |
| 03 | `DESC_RTF` | Descrição do arquivo .rtf. | C | - | - | - | Não | - |
| 04 | `COD_MOT_SUBS` | Código do motivo da substituição: (tabela 1.4) Observação: O código a ser adotado deve ser aquele cujo motivo é o preponderante na substituição da ECD. | C | 010 | - | ["001"; "002"; "003"; "004"; "005"; "099"] | Sim | - |
| 05 | `HASH_RTF` | Hash do arquivo .rtf incluído. Observação: O HASH é preenchido automaticamente pelo sistema (não é editável e não pode ser alterado). | C | 041 | - | - | Não | `[REGRA_VALIDA_HASH_ARQUIVO]` |
| 06 | `ARQ_RTF` | Sequência de bytes que representem um único arquivo no formato RTF (Rich Text Format). | C | 30 megabytes | - | - | Sim | - |
| 07 | `IND_FIM_RTF` | Indicador de fim do arquivo RTF. Texto fixo contendo "J801FIM". | C | 007 | - | "J801FIM" | Sim (conferido no `-raw`) | - |

### 1.4 `COD_MOT_SUBS` — valores (p. 193, redação do manual)

| Código | Descrição |
|---|---|
| `001` | Mudanças de saldos das contas que não podem ser realizadas por meio de lançamentos extemporâneos |
| `002` | Alteração de assinatura |
| `003` | Alteração de demonstrações contábeis |
| `004` | Alteração da forma de escrituração contábil |
| `005` | Alteração do número do livro |
| `099` | Outros |

### 1.5 Observações, regras e exemplo (p. 194)

- I – Observações: *Registro facultativo* · *Nível hierárquico: 3* · *Ocorrência: Um por arquivo, se for o arquivo de uma ECD substituta.*
- II – Tabelas do Registro: não há.
- III – Regra do registro — **REGRA_REGISTRO_NAO_DEVE_EXISTIR_NO RTF**: "Verifica, no campo J801.ARQ_RTF,
  se existem as tags C001, I001, J001, K001, J800, J801 ou J900. Caso existam, o PGE da Sped gera um erro."
- IV – Regra do campo — **REGRA_VALIDA_HASH_ARQUIVO**: "Verifica que o HASH do conteúdo do arquivo é igual
  ao HASH armazenado. Se a regra não for cumprida, o PGE do Sped Contábil gera um erro."
- V – Exemplo (literal):

```
|J801|001| Termo de Verificação para Fins Substituição da ECD
|001|1234567890ABCDEFABCDEFABCDEFAB1234567890|{\rtf1\ansi\ansicpg1252\uc1...|J801FIM|
```

Campo 04 do exemplo = `001`; campo 05 do exemplo = 40 caracteres hex.

---

## 2. ECD — Registro J932: Signatários do Termo de Verificação para Fins de Substituição da ECD (pp. 203-205)

### 2.1 Texto introdutório (p. 203) — transcrito

> O registro J932, que identifica os signatários do Termo de Verificação para Fins de Substituição da ECD.
>
> As ECD substitutas devem ter o Termo de Verificação para fins de Substituição da ECD assinado:
> I - pelo próprio profissional da contabilidade que assina os livros contábeis substitutos; e
> II - quando as demonstrações contábeis tenham sido auditadas por auditor independente, pelo próprio
> profissional da contabilidade que assina os livros contábeis substitutos e também pelo seu auditor
> independente.
>
> Exemplo: 1. Uma ECD substituta, em pessoa jurídica que não tenha sido auditada por auditor
> independente, contém apenas as assinaturas de um contabilista (código de assinante 900) e do e-CNPJ do
> declarante.
>
> INCORRETO. O Termo de Verificação para Substituição de ECD em pessoa jurídica que não possui auditoria
> independente, deve ser assinado por um contador/contabilista (códigos 910 ou 920), o mesmo que assinou
> a ECD (código 900).

### 2.2 Cabeçalho do registro (p. 203)

- Regras de validação do registro: `[REGRA_OBRIGATORIO_CONTADOR_ASS_TERMO]`, `[REGRA_IDENT_CPF_COD_ASSIN_DUPLICIDADE]`
- **Nível Hierárquico – 3** · **Ocorrência – 0:2** · Campo(s) chave: `[IDENT_CPF_CNPJ_T]+[COD_ASSIN_T]`

### 2.3 Leiaute (pp. 203-204)

| Nº | Campo | Descrição (manual) | Tipo | Tam. | Dec. | Valores válidos | Obrig. | Regras do campo |
|---|---|---|---|---|---|---|---|---|
| 01 | `REG` | Texto fixo contendo "J932". | C | 004 | - | ["J932"] | Sim | - |
| 02 | `IDENT_NOM_T` | Nome do signatário do termo de verificação. | C | - | - | - | Sim | - |
| 03 | `IDENT_CPF_CNPJ_T` | CPF ou CNPJ do assinante do termo de verificação. | C | CPF (11) / CNPJ (14) | - | - | Sim | `[REGRA_VALIDA_CPF]`, `[REGRA_VALIDA_CNPJ]` |
| 04 | `IDENT_QUALIF_T` | Qualificação do assinante do termo de verificação, conforme tabela. | C | - | - | - | Sim | `[REGRA_TABELA_ASSINANTE_DESC]` |
| 05 | `COD_ASSIN_T` | Código de qualificação do assinante do termo de verificação, conforme tabela. | C | 003 | - | - | Sim | `[REGRA_QUALIF_INVALIDA_ASS_TERMO]` |
| 06 | `IND_CRC_T` | Número de inscrição do contabilista no Conselho Regional de Contabilidade. | C | - | - | - | Não | `[REGRA_OBRIGATORIO_ASS_TERMO]` |
| 07 | `EMAIL_T` | Email do signatário. | C | 060 | - | - | Não | `[REGRA_OBRIGATORIO_ASS_TERMO]` |
| 08 | `FONE_T` | Telefone do signatário. | C | 014 | - | - | Não | `[REGRA_OBRIGATORIO_ASS_TERMO]` |
| 09 | `UF_CRC_T` | Indicação da unidade da federação que expediu o CRC. | C | 002 | - | - | Não | `[REGRA_TABELA_UF]`, `[REGRA_OBRIGATORIO_ASS_TERMO]` |
| 10 | `NUM_SEQ_CRC_T` | Número da Certidão de Regularidade Profissional do Contador no seguinte formato: UF/ano/número | C | - | - | - | Não | `[REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC]`, `[REGRA_ADV_ASS_CONTADOR_TERMO]` |
| 11 | `DT_CRC_T` | Data de validade da Certidão de Regularidade Profissional do Contador | N | 008 | - | - | Não | `[REGRA_ADV_ASS_CONTADOR_TERMO]` |

### 2.4 Observações e tabela (p. 204)

- I – Observações: *Registro obrigatório quando a ECD for substituta (Campo IND_FIN_ESC – Campo 14 – do
  registro 0000 – igual a "1 – Substituta).* · *Nível hierárquico: 3* · *Ocorrência: 0-2 por arquivo.*
- II – Tabela de Qualificação do Assinante do Termo de Verificação (campos 04 e 05) — **2 códigos**:

| Código | Descrição |
|---|---|
| `910` | Contador/Contabilista Responsável Pelo Termo de Verificação para Fins de Substituição da ECD |
| `920` | Auditor Independente Responsável pelo Termo de Verificação para Fins de Substituição da ECD |

### 2.5 Regras de validação do registro (p. 204) — redação do manual

- **REGRA_OBRIGATORIO_CONTADOR_ASS_TERMO**: "Verifica se existe, no mínimo, um registro J932 cujo código de
  qualificação do assinante do termo – COD_ASSIN_T (Campo 05) – seja igual a 910 (Contador ou Contabilista
  Responsável Pelo Termo de Verificação par Fins de Substituição da ECD). Se a regra não for cumprida, o PGE
  do Sped Contábil gera um erro."
- **REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE**: "Verifica se o registro não é duplicado considerando a
  chave CPF ou CNPJ e código de identificação do assinante (IDENT_CPF_CNPJ_T + COD_ASSIN_T). Se a regra não
  for cumprida, o PGE do Sped Contábil gera um erro."

### 2.6 Regras de validação dos campos (p. 205) — redação do manual

| Regra | Texto | Severidade |
|---|---|---|
| REGRA_VALIDA_CPF | "Verifica se a regra de formação do CPF – IDENT_CPF_CNPJ_T (Campo 03) – é válida." | erro |
| REGRA_VALIDA_CNPJ | "Verifica se a regra de formação do CNPJ – IDENT_CPF_CNPJ_T (Campo 03) – é válida." | erro |
| REGRA_TABELA_ASSINANTE_DESC | "Caso o código de qualificação do assinante – COD_ASSIN_T (Campo 05) – seja igual a 910 (Contador/Contabilista Responsável Pelo Termo de Verificação para Fins de Substituição da ECD), verifica se a descrição informada no campo IDENT_QUALIF_T (Campo 04) corresponde a Contador/Contabilista Responsável Pelo Termo de Verificação para Fins de Substituição da ECD." | erro |
| REGRA_QUALIF_INVALIDA_ASS_TERMO | "Verifica, quando o campo CPF/CNPJ do assinante do termo – IDENT_CPF_CNPJ_T (Campo 03) – é igual a um CNPJ, se o campo código do assinante do termo – COD_ASSIN (Campo 05) – é igual a "920" (Auditor Independente Responsável pelo Termo de Verificação para Fins de Substituição da ECD)." | erro |
| REGRA_OBRIGATORIO_ASS_TERMO | "Verifica se os campos número de inscrição do contabilista no Conselho Regional de Contabilidade – IND_CRC_T (Campo 06) –, e-mail do signatário – EMAIL_T (Campo 07) –, telefone do signatário – FONE_T (Campo 08) – e indicação do CRC expedidor – UF_CRC_T (Campo 09) – foram preenchidos quando o código de qualificação do assinante do termo de verificação – COD_ASSIN_T (Campo 05) – for igual a 910 (…)." | erro |
| REGRA_TABELA_UF | "Verifica se o código informado da Unidade da Federação – UF_CRC_T (Campo 09) – existe na Tabela de Unidades da Federação." | erro |
| REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC | "Verifica se o formato do campo número sequencial – NUM_SEQ_CRC_T (Campo 10) – é UF/YYYY/NÚMERO, onde UF deve existir na Tabela de Unidades da Federação e yyyy corresponde ao ano." | **aviso** |
| REGRA_ADV_ASS_CONTADOR_TERMO | "Verifica se os campos número da certidão de regularidade – NUM_SEQ_CRC_T (Campo 10) – e data de validade da certidão – DT_CRC_T (Campo 11) – foram preenchidos quando o código de qualificação do assinante – COD_ASSIN_T (Campo 05) – for igual a 910 (…)." | **aviso** |

Todas as regras "de erro" terminam em "Se a regra não for cumprida, o PGE do Sped Contábil gera um erro."; as duas de aviso, "…gera um aviso.".

### 2.7 Exemplo (p. 205, literal)

```
|J932|FULANO BELTRANO|12345678900|CONTADOR/CONTABILISTA RESPONSÁVEL PELO TERMO
DE VERIFICAÇÃO PARA FINS DE SUBSTITUIÇÃO DA
ECD|910|1SP123456|FULANO@GMAIL.COM|2199999999|RJ|RJ/2012/001|31122023|
```

---

## 3. Ambiguidades / inconsistências do manual (NÃO resolvidas aqui)

| # | Local | Achado |
|---|---|---|
| A1 | J801 p. 192 × p. 194 | Cabeçalho diz **Nível Hierárquico – 2**; Observações dizem **Nível hierárquico: 3**. |
| A2 | J801 p. 192 × p. 194 | Intro: "deve ser utilizado **obrigatoriamente** no caso de substituição"; Observações: "**Registro facultativo**"; ocorrência 0:1. Leitura consistente possível: facultativo no leiaute, obrigatório quando substituta — mas o manual não declara regra PGE que o exija. |
| A3 | J801 p. 192 | Assinantes do termo "serão preenchidos no registro **J935**" — o registro de signatários do termo é o **J932** (p. 203); J935 não é descrito nestas páginas. Provável erro material. |
| A4 | J801 campo 04 | `COD_MOT_SUBS` tem **Tamanho 010**, mas todos os valores válidos têm 3 dígitos. |
| A5 | J801 campo 05 | `HASH_RTF` Tamanho **041**; o exemplo traz hash de **40** caracteres (SHA-1 hex). Algoritmo do hash não é declarado. |
| A6 | J801 campo 06 | `ARQ_RTF` Tamanho "30 megabytes" (não é contagem de caracteres). Regra de escape de `|`/quebra de linha dentro do RTF não é declarada. |
| A7 | J801 campo 07 | Obrigatório vazio no `-layout`; `-raw` dá **Sim**. |
| A8 | J801 exemplo | Campo 03 começa com espaço (" Termo de…") e o registro quebra linha no exemplo — artefato de diagramação provável. |
| A9 | J932 p. 203 × p. 204 | Nome da regra no cabeçalho `REGRA_IDENT_CPF_COD_ASSIN_DUPLICIDADE` ≠ no corpo `REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE`. |
| A10 | J932 p. 203 (exemplo) | "deve ser assinado por um contador/contabilista (**códigos 910 ou 920**)" — pela tabela, 920 é **Auditor Independente**; e a regra PGE exige ≥1 **910**. |
| A11 | J932 REGRA_QUALIF_INVALIDA_ASS_TERMO | Cita "COD_ASSIN (Campo 05)" sem o sufixo `_T`. Semântica: CNPJ ⇒ código tem de ser 920; CPF não é restringido por esta regra. |
| A12 | J932 REGRA_TABELA_ASSINANTE_DESC | Só confere a descrição quando código = **910**; para 920 o manual não declara conferência. |
| A13 | J932 Observações | "obrigatório quando a ECD for substituta" (0000.IND_FIN_ESC = 1), mas **não há regra PGE** listada que imponha a presença do J932; a única regra de presença (OBRIGATORIO_CONTADOR_ASS_TERMO) exige 910 *se* houver J932. Ocorrência 0:2 limita a um contador + um auditor (com a chave CPF/CNPJ+código). |
| A14 | J932 exemplo | `IND_CRC_T` = `1SP123456` com `UF_CRC_T` = `RJ` e `NUM_SEQ_CRC_T` = `RJ/2012/001` — UFs divergentes no próprio exemplo. |

---

## 4. Revisão 2026-09-23 — troca de fonte (bc63f0a893ce → 7ddf47755f61)

Decisão do dono (23/09, sessão): o vigente é a redação **janeiro/2026** (`7ddf47755f61`), não a
**maio/2026** baixada da URL do script (`bc63f0a893ce`). A 1ª versão desta transcrição (commit
`20f9c85e`) foi feita sobre a maio/2026.

**Método da comparação (checagem que teria falhado):** as seções J801 (do título até "Registro J900") e
J932 (do título até o fim do exemplo) foram extraídas com `pdftotext -layout` dos dois PDFs,
normalizadas (espaços, rodapé "Página N de 235/236", "Atualização: <mês> de 2026") e comparadas palavra
a palavra com `diff`. **J801: 0 diferenças. J932: 0 diferenças** (o único excedente no novo foi o J935
seguinte, por causa do recorte, e não o conteúdo do J932). Campo 07 do J801 reconferido com `-raw` no
novo PDF: Obrig. = Sim.

**Diff de conteúdo: nenhum.** Mudou só:
- fonte / sha256 / "Atualização" / total de páginas (236 → 235);
- **paginação, -1 em tudo:** J801 pp. 193-195 → **192-194**; J932 pp. 204-206 → **203-205**.

**Ambiguidades A1–A14: as 14 persistem** com texto idêntico, porque a redação não mudou. Nenhuma sumiu e
nenhuma é nova no J801/J932. Nota sobre A3: o novo PDF mostra que o **J935** existe logo depois (p. 205
em diante), mas como "Identificação dos Auditores Independentes", sem relação com os signatários do termo.
A remissão do J801 ao "J935" continua errada; o registro certo é o J932.

---

## 5. Decisões do dono (2026-09-23, sessão PR-4) sobre as ambiguidades acima

Registradas aqui (padrão desta transcrição) e replicadas no JSDoc dos pontos de código que as
implementam (`SpedEcdDto.ts`, `lib/sped.ts`). Cobrem exatamente A2, A13/A10, A4/A5 e A3 — as
demais (A1, A6-A9, A11, A12, A14) **não mudam comportamento implementado** e continuam em aberto
como registro histórico do manual, sem decisão pendente sobre elas nesta sessão.

| Ambiguidade | Decisão do dono | Onde entra no código |
|---|---|---|
| **A2** (facultativo × obrigatório) | J801 é **obrigatório** na ECD substituta — sem `.rtf` anexado, `400`. | `SpedGenerationService.generate`: `isSubstituta && !rtfFile` → `ValidationError`. |
| **A13/A10** (obrigatoriedade do J932 × códigos 910/920) | J932 é **obrigatório** na substituta; **1 a 2 signatários**; **pelo menos um código 910**; **920 (Auditor Independente) fica fora do escopo** desta implementação. | `SpedEcdDto.ts` `VerificationTermSignerSchema.codAssin = z.literal('910')`; `VerificationTermSchema` exige `signers.min(1).max(2)` com ≥1 `910`. |
| **A4/A5** (tamanhos de campo vs. tabela de valores) | Validar pelo **conteúdo real**: `COD_MOT_SUBS` = enum de 3 dígitos (001..005, 099), nunca o "Tamanho 010" do leiaute; `HASH_RTF`/`0000.COD_HASH_SUB` = **40 hex** (SHA-1), nunca o "Tamanho 041" do leiaute. | `SpedEcdDto.ts`: `COD_MOT_SUBS_CODES`, `hash40Hex`; `SpedGenerationService.composeFile` calcula `hashRtf = sha1(rtfFile.buffer)`. |
| **A3** (remissão ao J935) | Confirmado erro material do manual: os signatários do Termo vão no **J932**, nunca no J935 (que trata de auditores independentes, sem relação com o termo). | `lib/sped.ts`: só `buildJ801`/`buildJ932` implementados; `J935` fica fora (comentário explícito no `buildEcdFile`). |

**Regra de prazo (art. 8º §4)** aplicada no DTO (Passo 19 do execution-plan) é **grau INFERIDO**,
não coberta por esta transcrição (que cobre só o leiaute J801/J932, não o texto normativo do
prazo) — ver comentário em `SpedEcdDto.ts`/`SpedEcfDto.ts` (`refineEcfRectification`).
