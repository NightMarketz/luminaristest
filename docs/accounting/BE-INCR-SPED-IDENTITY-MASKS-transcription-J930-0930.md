# BE-INCR-SPED-IDENTITY-MASKS (C12) — transcrição J930 (ECD L9) + 0930 (ECF L12)

> **Estado:** transcrição CONCLUÍDA em 2026-09-16 (`sessao-planejamento`, docs-only). Resolve o §5
> "Insumos ausentes" e o §4.1/§4.2 do `BE-INCR-SPED-IDENTITY-MASKS-brief.md`. **Não autoriza
> implementação** — a `sessao-feature` continua exigindo "executa" do dono (ORCH-006).
> Autorização desta sessão: dono, em sessão, 2026-09-16 — *"Pode abrir a transcrição J930/0930"*.
>
> **Três achados tocam forks já ratificados (F-C12-1 a · F-C12-3 a) — §5.** Ratificação não foi
> reaberta (classe `parafrase-de-regra-ratificada-perde-ramo`). **F-C12-5/6/7 (§5.1-5.3) ✅ RATIFICADOS
> 2026-09-16 pelo dono, 3/3 na recomendação** — registro no adendo da cédula 16/09.

## Fonte normativa (grau VERIFICADO — leitura direta dos PDFs do corpus local)

| id | documento | arquivo | sha256 (12) conferido nesta sessão | manifesto |
|---|---|---|---|---|
| `manual-ecd-l9` | Manual de Orientação do Leiaute 9 da ECD — Anexo ao ADE Cofis 01/2026, *Atualização: maio de 2026*, 236 pp. | `docs/accounting/fontes-oficiais/Manual-ECD-Leiaute-9.pdf` | `bc63f0a893ce` | ✅ igual |
| `manual-ecf-l12` | Manual de Orientação do Leiaute 12 da ECF — Anexo ao ADE Cofis 02/2026, *Atualização: maio/2026*, 621 pp. | `docs/accounting/fontes-oficiais/Manual-ECF-Leiaute-12.pdf` | `7216ec2bd62d` | ✅ igual |

Procedimento: `pdftotext -layout -enc UTF-8` (mesmo do precedente ECF) **e**, porque o modo
`-layout` desalinhou as duas tabelas de qualificação (colunas Código/Descrição deslocadas em uma
linha), pareamento código↔descrição **reconferido por duas extrações independentes** (`pdftotext`
sem `-layout` + `pypdf 6.15`) — as três concordam. Paginação impressa == índice do PDF nos dois
manuais (verificado: "Página 201 de 236" está na página 201 do PDF).

A planilha oficial `RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx` **não** contém
`SPEDECF_QUALIF_ASSINANTE` (79 abas, todas de blocos L/M/N/P/S/T/U/V/X/Y) — a tabela vive no PVA
(`Recursos/Tabelas/SPEDECF_LOCAL$SPEDECF_QUALIF_ASSINANTE`, Manual ECF p. 104) e no manual; o
manual é a fonte transcrita.

---

## 1. ECD — Registro J930: Signatários da Escrituração (Manual L9 pp. 198-203)

### 1.1 Leiaute (p. 200-201) — Ocorrência 1:N, nível 3, chave `[IDENT_CPF_CNPJ]+[COD_ASSIN]`

| Nº | Campo | Descrição | Tipo | Tam. | Obrig. | Regras do campo |
|---|---|---|---|---|---|---|
| 01 | `REG` | Texto fixo "J930" | C | 004 | Sim | — |
| 02 | `IDENT_NOM` | Nome do signatário | C | - | Sim | — |
| 03 | `IDENT_CPF_CNPJ` | CPF ou CNPJ | C | CPF (11) / CNPJ (14) | Sim | `REGRA_VALIDA_CPF`, `REGRA_VALIDA_CNPJ` |
| 04 | `IDENT_QUALIF` | Qualificação do assinante, conforme tabela | C | - | Sim | `REGRA_TABELA_ASSINANTE_DESC` |
| 05 | `COD_ASSIN` | Código de qualificação do assinante, conforme tabela | C | 003 | Sim | `REGRA_QUALIF_INV_RESP_LEGAL` |
| 06 | `IND_CRC` | Número de inscrição do contabilista no CRC | C | - | Não | `REGRA_OBRIGATORIO_CONTADOR`, `REGRA_AVISO_ASSIN_CNPJ` |
| 07 | `EMAIL` | Email do signatário | C | 060 | Não | `REGRA_OBRIGATORIO_CONTADOR` |
| 08 | `FONE` | Telefone do signatário | C | 014 | Não | `REGRA_OBRIGATORIO_CONTADOR` |
| 09 | `UF_CRC` | UF que expediu o CRC | C | 002 | Não | `REGRA_TABELA_UF`, `REGRA_OBRIGATORIO_CONTADOR`, `REGRA_AVISO_ASSIN_CNPJ` |
| 10 | `NUM_SEQ_CRC` | Nº da Certidão de Regularidade Profissional, formato **UF/ano/número** | C | - | Não | `REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC`, `REGRA_ADVERTENCIA_CONTADOR`, `REGRA_AVISO_ASSIN_CNPJ` |
| 11 | `DT_CRC` | Data de validade da Certidão | N | 008 | Não | `REGRA_ADVERTENCIA_CONTADOR`, `REGRA_AVISO_ASSIN_CNPJ` |
| 12 | `IND_RESP_LEGAL` | Signatário validado como responsável pela assinatura da ECD: S/N | C | 001 | Sim | — |

> Nota de leitura: a coluna "Obrigatório" impressa marca 03 e 04 como Sim/Não de forma ambígua no
> `-layout`; a extração raw confirma **02, 03, 04, 05 = Sim; 06-11 = Não; 12 = Sim**.

### 1.2 Tabela de Qualificação do Assinante (pp. 201-202) — **19 códigos**

Transcrita campo a campo; é a fonte de `SPED_ECD_QUALIF_ASSINANTE` (checklist item 1).

| Código | Descrição |
|---|---|
| `001` | Pessoa Jurídica (e-CNPJ ou e-PJ) |
| `203` | Diretor |
| `204` | Conselheiro de Administração |
| `205` | Administrador |
| `206` | Administrador do Grupo |
| `207` | Administrador de Sociedade Filiada |
| `220` | Administrador Judicial – Pessoa Física |
| `222` | Administrador Judicial – Pessoa Jurídica - Profissional Responsável |
| `223` | Administrador Judicial/Gestor |
| `226` | Gestor Judicial |
| `309` | Procurador |
| `312` | Inventariante |
| `313` | Liquidante |
| `315` | Interventor |
| `401` | Titular – Pessoa Física - EIRELI |
| `801` | Empresário |
| `900` | Contador/Contabilista |
| `940` | Auditor Independente |
| `999` | Outros |

**Inconsistência interna do manual (registrada, não corrigida):** o exemplo 9 da p. 200 diz
*"um interventor - código **305**"*; a tabela da p. 202 lista Interventor = **315** e não existe
305. **A tabela prevalece** (é o que o PVA carrega); `305` **não** entra na const. Os demais códigos
citados nos exemplos (203 diretor, 205 administrador, 309 procurador, 801 empresário, 900 contador,
001 e-CNPJ) batem com a tabela.

### 1.3 Regras de assinatura (pp. 198-200) — prosa normativa, não regra de campo

1. Toda ECD é assinada por **um contador/contabilista** (e-PF/e-CPF, regra 2) **e** por um
   **responsável pela assinatura** (regra 1/3), único (regra 3).
2. O responsável pode ser e-PJ/e-CNPJ do declarante (recomendado, 4.1), e-PJ/e-CNPJ de procurador
   (4.2) ou e-PF/e-CPF de representante legal/procurador (4.3).
3. Assinatura e-PJ/e-CNPJ: opcional, **só uma vez** (6.1), **exclusivamente com código `001`** (6.2).
4. O responsável pode ter **qualquer código exceto 900** (7.3) — exemplo 2: contador designado
   responsável é INCORRETO; pode assinar de novo com outro código (ex. 309 procurador).
5. ECD original: ≥2 assinaturas — uma `900` e-PF/e-CPF **e** uma responsável (`001` PJ, ou e-PF/e-CPF
   com código ≠ 900) (p. 199).

### 1.4 Regras de validação do registro (p. 202)

| Regra | Enunciado transcrito | Severidade |
|---|---|---|
| `REGRA_OBRIGATORIO_ASSIN_CONTADOR` | ≥1 J930 com `COD_ASSIN = 900` **e** ≥1 J930 com `COD_ASSIN ≠ 900` | erro |
| `REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE` | registro não duplicado na chave `IDENT_CPF_CNPJ + COD_ASSIN` | erro |
| `REGRA_OBRIGATORIO_UM_RESP_LEGAL` | existe um J930 com `IND_RESP_LEGAL = S` | erro |

### 1.5 Regras de validação dos campos (pp. 202-203)

| Regra | Enunciado transcrito | Severidade |
|---|---|---|
| `REGRA_VALIDA_CPF` | regra de formação do CPF em `IDENT_CPF_CNPJ` (campo 03) válida | erro |
| `REGRA_VALIDA_CNPJ` | regra de formação do CNPJ em `IDENT_CPF_CNPJ` válida | erro |
| `REGRA_TABELA_ASSINANTE_DESC` | se `COD_ASSIN = 900`, a descrição em `IDENT_QUALIF` (campo 04) **corresponde a "Contador" ou "Contabilista"** | erro |
| `REGRA_QUALIF_INV_RESP_LEGAL` | se `IND_RESP_LEGAL = S` então `COD_ASSIN ≠ 900` | erro |
| `REGRA_OBRIGATORIO_CONTADOR` | se `COD_ASSIN = 900` então `IND_CRC` (06), `EMAIL` (07), `FONE` (08) e `UF_CRC` (09) preenchidos | erro |
| `REGRA_AVISO_ASSIN_CNPJ` | se `COD_ASSIN = 001` então `IND_CRC`, `UF_CRC`, `NUM_SEQ_CRC`, `DT_CRC` **não** preenchidos | aviso |
| `REGRA_TABELA_UF` | `UF_CRC` existe na Tabela de UF | erro |
| `REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC` | `NUM_SEQ_CRC` no formato **UF/YYYY/NÚMERO**, UF na tabela, yyyy = ano | **aviso** |
| `REGRA_ADVERTENCIA_CONTADOR` | se `COD_ASSIN = 900` então `NUM_SEQ_CRC` (10) e `DT_CRC` (11) preenchidos | aviso |

**O manual NÃO declara** (a) formato de `IND_CRC` (confirma cédula 10/09 §5) nem (b) que
`COD_ASSIN = 900` exige CPF de 11 posições como regra de campo — o que existe é a regra de
assinatura 2 (p. 198, *"o contador/contabilista deve utilizar um e-PF ou e-CPF"*) e a regra 7.3.

### 1.6 Exemplo de preenchimento (p. 203)

```
|J930|FULANO BELTRANO|12345678900|CONTADOR|900|1SP123456|FULANO@GMAIL.COM|2199999999|RJ|RJ/2012/001|31122023|S|
```

Campo 04 = `CONTADOR` (maiúsculas) · campo 06 = **`1SP123456`** (não é o formato CFC
`UF-NNNNNN/O-D`) · campo 10 = `RJ/2012/001` · campo 12 = `S`.
**O próprio exemplo viola `REGRA_QUALIF_INV_RESP_LEGAL`** (contador 900 com `IND_RESP_LEGAL = S`) —
segunda inconsistência interna; a regra prevalece.

---

## 2. ECF — Registro 0930: Identificação dos Signatários da ECF (Manual L12 pp. 103-106)

### 2.1 Leiaute (p. 104) — Ocorrência 1:N (mas ≤ 2, §2.3), nível 2, chave `[REG]`

| Nº | Campo | Descrição | Tipo | Tam. | Obrig. |
|---|---|---|---|---|---|
| 1 | `REG` | Texto fixo "0930" | C | 4 | Sim |
| 2 | `IDENT_NOM` | Nome do signatário | C | - | Sim |
| 3 | `IDENT_CPF_CNPJ` | CPF/CNPJ — *"o tamanho do campo deve ser exatamente o informado"* | C | CPF (11) / CNPJ (14) | Sim |
| 4 | `IDENT_QUALIF` | **Código** de qualificação do assinante, conforme tabela do Sped (`SPEDECF_QUALIF_ASSINANTE`) | C | 3 | Sim |
| 5 | `IND_CRC` | Nº de inscrição do contabilista no CRC | C | - | Não |
| 6 | `EMAIL` | E-mail do signatário | C | 60 | Sim |
| 7 | `FONE` | DDD e telefone do signatário | C | 14 | Sim |

Diferença estrutural vs. J930: **não há campo de descrição** (`IDENT_QUALIF` é o código), não há
`UF_CRC`/`NUM_SEQ_CRC`/`DT_CRC`/`IND_RESP_LEGAL`; `EMAIL` e `FONE` são obrigatórios sempre.

### 2.2 Código de Qualificação do Assinante (p. 105) — **17 códigos únicos, 18 linhas**

Fonte de `SPED_ECF_QUALIF_ASSINANTE` (checklist item 1).

| Código | Descrição |
|---|---|
| `203` | Diretor |
| `204` | Conselheiro de Administração |
| `205` | Administrador |
| `206` | Administrador do Grupo |
| `207` | Administrador de Sociedade Filiada |
| `220` | Administrador Judicial – Pessoa Física |
| `222` | Administrador Judicial – Pessoa Jurídica - Profissional Responsável |
| `223` | Administrador Judicial/Gestor |
| `226` | Gestor Judicial |
| `309` | Procurador |
| `312` | Inventariante |
| `313` | Liquidante |
| `315` | Interventor |
| `401` | Titular Pessoa Física – Sociedade Limitada Unipessoal (SLU) |
| `801` | Empresário |
| `900` | Contador |
| `900` | Contabilista |
| `999` | Outros |

`900` ocorre em **duas linhas** com descrições distintas ("Contador", "Contabilista") — mesmo
código; na const é uma chave (`'900': 'Contador/Contabilista'` ou só `'Contador'` — ver §5.1;
para a ECF a descrição nunca vai ao arquivo, então é só documental).

### 2.3 Regras (pp. 105-106)

| Regra | Enunciado transcrito | Severidade |
|---|---|---|
| `REGRA_OBRIGATORIO_ASSIN_CONTADOR` | ≥1 0930 com `IDENT_QUALIF = 900` **quando** `0010.FORMA_TRIB ∉ {8, 9}` (não imune/isenta) **ou** `0010.TIP_ESC_PRE = C`; **e** ≥1 0930 com `IDENT_QUALIF ≠ 900` | erro |
| `REGRA_OCORRENCIA_0930` | no máximo **duas** ocorrências | erro |
| `REGRA_CONTADOR_CPF` (campo 3) | se `IDENT_QUALIF = 900` então `IDENT_CPF_CNPJ` tem **11** caracteres | erro |
| `REGRA_VALIDA_CPF_CNPJ` (campo 3) | regra de formação de CPF/CNPJ válida | erro |
| `REGRA_OBRIGATORIO_CONTADOR` (campo 5) | se `IDENT_QUALIF = 900` então `IND_CRC` obrigatório | erro |

Prosa (pp. 103-104): duas assinaturas obrigatórias — contabilista (e-CPF A1/A3) e PJ (e-CNPJ da
base, e-CPF de representante legal, ou procurador e-CPF/e-CNPJ, itens 1-3.4). *"Assinatura como
procurador"*: o contador pode assinar como contador **e** procurador — duas linhas 0930 com o mesmo
nome/CPF, uma `900` e outra `309`. Observação p. 104: imunes/isentas sem ECD obrigatória — só
representante legal/procurador; contador dispensado (é o ramo `FORMA_TRIB ∈ {8, 9}` da regra).

### 2.4 Exemplo (p. 106)

```
|0930|FULANO BELTRANO|12345678900|900|1SP123456|fulanobeltrano@email.com|61333344444|
```

`IND_CRC` = **`1SP123456`** de novo (não CFC). Nota: o exemplo escreve `61333344444` (11 dígitos)
e a legenda `6133334444` (10) — terceira inconsistência interna, irrelevante para o DTO (`max(14)`).

---

## 3. ECD × ECF — diferença entre as tabelas (fecha F-C12-2)

| | ECD J930 | ECF 0930 |
|---|---|---|
| Códigos | 19 | 17 únicos |
| Só na ECD | `001` Pessoa Jurídica (e-CNPJ/e-PJ), `940` Auditor Independente | — |
| `401` | "Titular – Pessoa Física - EIRELI" | "Titular Pessoa Física – Sociedade Limitada Unipessoal (SLU)" |
| `900` | "Contador/Contabilista" (1 linha) | "Contador" + "Contabilista" (2 linhas) |
| 15 códigos comuns 203-801 | descrições idênticas | descrições idênticas |

**As tabelas NÃO são idênticas** → F-C12-2 → (a) *duas consts, cada uma transcrita do seu manual*
está **confirmada pela evidência** (o ramo (b) "alias se provado igual" não se aplica). Grau:
verificado.

---

## 4. Reconciliação com os DTOs de hoje (insumo lido: `SpedEcdDto.ts:72-124`, `SpedEcfDto.ts:62-119`, `AccountingContact.model.ts:57-182`)

| Regra do manual | ECD DTO hoje | ECF DTO hoje | Item do BRIEF |
|---|---|---|---|
| Código na tabela | `/^\d{3}$/` (qualquer) | `/^\d{3}$/` (qualquer) | **2, 4** |
| `REGRA_VALIDA_CPF` (DV) | `cpfOrCnpj` **sem DV** | idem | **5** |
| `REGRA_TABELA_ASSINANTE_DESC` (900 ⇒ "Contador"/"Contabilista") | `identQualif: z.string().min(1)` livre | n/a (sem campo) | **3** (ver §5.1) |
| `REGRA_OBRIGATORIO_ASSIN_CONTADOR` | ✅ superRefine | ✅ `refineEcfSigners` — **sem o ramo imune/isenta** (§5.4) | 6 |
| `REGRA_OBRIGATORIO_UM_RESP_LEGAL` | ✅ (`=== 1`, mais estrito que "existe um") | n/a | — |
| `REGRA_QUALIF_INV_RESP_LEGAL` (S ⇒ ≠ 900) | ❌ **ausente** | n/a | **novo — §5.3** |
| `REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE` | ❌ **ausente** | n/a (chave é só `REG`; `max(2)` ✅) | **novo — §5.3** |
| `REGRA_OBRIGATORIO_CONTADOR` (900 ⇒ IND_CRC + EMAIL + FONE + UF_CRC) | ❌ ausente (todos `optional`) | ✅ parcial (`indCrc`) — EMAIL/FONE já obrigatórios no shape | **6** (ECD: 4 campos, não 1) |
| `REGRA_CONTADOR_CPF` (900 ⇒ CPF 11) | ❌ ausente e **não declarada como regra de campo na ECD** (só prosa p. 198) | ✅ | **6** — ver §5.2 |
| `REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC` (UF/YYYY/N) | `numSeqCrc: z.string().optional()` | n/a | **7** — `CRC_CERTIFICATE_RE` casa exatamente com o formato do manual ✅ |
| `REGRA_TABELA_UF` | ✅ `z.enum(UF_CODES)` | n/a | — |
| `REGRA_AVISO_ASSIN_CNPJ` (001 ⇒ CRC vazio) | ❌ ausente | n/a | aviso — §6 |
| `REGRA_ADVERTENCIA_CONTADOR` (900 ⇒ NUM_SEQ/DT_CRC) | ❌ ausente | n/a | aviso — §6 |
| `REGRA_OCORRENCIA_0930` (≤ 2) | n/a | ✅ `max(2)` | — |

`contactToJ930Signer` (`AccountingContact.model.ts:157-182`) já emite `identQualif: 'Contador'`,
`codAssin: '900'`, `indRespLegal: 'N'` — coerente com `REGRA_TABELA_ASSINANTE_DESC` e
`REGRA_QUALIF_INV_RESP_LEGAL`. Emite `indCrc: contact.crcNumber` no formato CFC do contato (§5.1
do risco).

---

## 5. Achados que tocam forks RATIFICADOS — para o dono (não re-decididos aqui)

### 5.1 F-C12-1 → (a) "campo 04 derivado da tabela" × `REGRA_TABELA_ASSINANTE_DESC`

A tabela ECD escreve `900 = "Contador/Contabilista"`. Derivar o campo 04 **literalmente** da const
emitiria `|Contador/Contabilista|`; a regra exige que a descrição *"corresponda a Contador ou
Contabilista"* e o exemplo oficial escreve `CONTADOR`. Se o PVA compara por igualdade, o literal da
tabela **reprova**. (a) continua válida — só a **forma** da derivação precisa de uma decisão:

| Caminho | Descrição |
|---|---|
| (i) | const transcrita literal (`'900': 'Contador/Contabilista'`) + mapa de emissão só para `900` → `'Contador'` (ponytail: uma linha de exceção, nomeada) |
| (ii) | const já com o texto emitível (`'900': 'Contador'`) e comentário citando que a tabela imprime "Contador/Contabilista" — a transcrição deixa de ser literal em 1 de 19 linhas |
| (iii) | emitir em MAIÚSCULAS como o exemplo (`CONTADOR`) — extrapola: o manual não diz que é case-sensitive |

**Recomendação (não-vinculante):** (i) — mantém a const como transcrição verificável e isola a
exceção onde o teste de snapshot da linha `|J930|` (item 3) a captura. **O PVA é o oráculo** disso
(H1 2ª passada): nenhum caminho se prova por teste de contrato. **F-C12-5 → (i) ✅ RATIFICADO 16/09.**

### 5.2 Item 6 na ECD — o que o manual diz (fecha §4.2 do BRIEF)

O Manual ECD L9 diz **mais** que a ECF em CRC e **menos** em CPF:

- `COD_ASSIN = 900` ⇒ `IND_CRC` **+ `EMAIL` + `FONE` + `UF_CRC`** obrigatórios (erro,
  `REGRA_OBRIGATORIO_CONTADOR`, p. 202). → **entra no checklist item 6 com os 4 campos**, com artefato.
- `COD_ASSIN = 900` ⇒ CPF de 11 posições: **não é regra de campo** na ECD; é a regra de assinatura 2
  (p. 198). Caminhos: (a) aplicar na ECD por analogia com `REGRA_CONTADOR_CPF` da ECF + regra 2 p. 198
  como artefato (assinatura por e-CPF implica CPF) · (b) não aplicar na ECD (só o que o PVA valida
  como regra de campo). **Recomendação:** (a) — o contador **é** pessoa física por definição
  (regra 2) e o DTO ECF já o exige; divergir entre os dois DTOs para a mesma pessoa é a divergência
  que a resposta 3 da cédula 10/09 proíbe. **F-C12-6 → (a) ✅ RATIFICADO 16/09.**

### 5.3 Duas regras de registro da ECD ausentes no DTO — fora do checklist atual

`REGRA_QUALIF_INV_RESP_LEGAL` (responsável legal ≠ 900) e
`REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE` (chave única CPF+código) são **erro** no PVA e não
existem no `superRefine` de hoje. Não são "máscara de identidade" (letra do C12), mas são
"erro que o PVA morde e o DTO deixa passar" (objetivo da resposta 3). Caminhos: (a) entram no C12
como item 11 (dois `addIssue` no `superRefine` existente, ~10 linhas, mesmo arquivo que o item 6
toca) · (b) ficam em §6 "fora de escopo" para incremento próprio. **Recomendação:** (a) — o
diff é no mesmo refine que o C12 já reescreve; abrir outro incremento para 10 linhas é processo
sem valor. **F-C12-7 → (a) ✅ RATIFICADO 16/09.**

### 5.4 F-C12-3 → (a) "máscara CFC no `IND_CRC`" × exemplos oficiais `1SP123456`

**Os dois manuais exemplificam `IND_CRC = 1SP123456`** (ECD p. 203, ECF p. 106) — formato que a
`CRC_NUMBER_RE` (`UF-NNNNNN/O-D`) **rejeita**. É exatamente o *"risco nomeado"* já escrito no
fork: *"inscrição legítima fora do padrão CFC seria rejeitada — mitigação: mensagem com o formato
esperado"*. A ratificação (a) foi dada **com esse risco declarado**; o achado novo é só que o
exemplo oficial está do lado do risco. Fatos: o manual **não declara formato** (§1.5) e o PVA não
tem regra de formato para o campo 06 (só obrigatoriedade); logo a máscara CFC é escolha da casa
(#305), não do leiaute. **Não reabro o fork**; registro para que o dono saiba que o H1 2ª passada
**não vai testar** essa máscara (o PVA aceita qualquer string) — o oráculo dela é o CFC, não o PVA.

### 5.5 `refineEcfSigners` sem o ramo imune/isenta

A regra da ECF só exige contador quando `0010.FORMA_TRIB ∉ {8, 9}` ou `TIP_ESC_PRE = C`. O refine
de hoje exige sempre. **Verificado** (`SpedEcfDto.ts:18-19`, `SpedEcfRealDto.ts:37-38`): Presumido
emite `FORMA_TRIB=5` + `TIP_ESC_PRE=C` fixos → o refine é **correto**. O DTO Real aceita
`formaTrib: /^\d$/` do caller (default `'1'`) — `'8'`/`'9'` passam pelo shape e o refine exigiria
contador que o manual dispensa. Imune/isenta não é Lucro Real; o furo é o shape do Real aceitar
qualquer dígito, não o refine — registrado em §6.4, fora do C12.

---

## 6. Achados fora de escopo (registro, sem planejar)

1. Avisos do PVA (`REGRA_AVISO_ASSIN_CNPJ`: `001` ⇒ campos de CRC vazios; `REGRA_ADVERTENCIA_CONTADOR`:
   `900` ⇒ `NUM_SEQ_CRC`/`DT_CRC` preenchidos) — são *aviso*, não erro; o C12 é sobre o que
   "não deixa erro passar". Se o dono quiser zero avisos, é item novo.
2. `IDENT_QUALIF` da ECD **sem** `COD_ASSIN = 900` não tem regra de correspondência no manual
   (`REGRA_TABELA_ASSINANTE_DESC` só olha 900) — derivar da tabela (F-C12-1 a) é mais estrito que o
   PVA para os outros 18 códigos; sem risco de reprovação, só de divergência de texto.
3. Correção das páginas no BRIEF: a tabela ECD está nas **pp. 201-202** (o BRIEF §2.1 escreve
   "pp. 199-201" — 199-200 são as regras de assinatura). A `sessao-feature` cita 201-202 no cabeçalho
   da const.
4. `SpedEcfRealDto.ts:38` — `formaTrib: /^\d$/` aceita `8`/`9` (imune/isenta), que não são Lucro
   Real; `refineEcfSigners` então exige contador que o manual dispensa (§2.3). Endurecer para o
   subconjunto de valores do Real é incremento próprio (tabela `FORMA_TRIB` do Manual ECF, 0010) —
   não é campo de identidade.

---

## 7. Consequência para o checklist do BRIEF (sem editar o BRIEF — regra 1)

| Item | Estado após a transcrição |
|---|---|
| 1 | **desbloqueado** — as duas tabelas estão em §1.2 e §2.2; cabeçalho da const cita pp. 201-202 (ECD) / p. 105 (ECF) + sha256 |
| 2, 4 | desbloqueados — código ausente da tabela para o teste: qualquer um fora das listas (sugestão que **está no manual como erro**: `305`, o "interventor" do exemplo 9) |
| 3 | F-C12-5 → (i): const literal + exceção `900 → 'Contador'` |
| 5 | confirmado: `REGRA_VALIDA_CPF`/`_CNPJ` são erro nos dois manuais |
| 6 | ECD: `IND_CRC + EMAIL + FONE + UF_CRC` obrigatórios quando 900 (artefato p. 202) + CPF-11 (F-C12-6 → a) |
| 7 | `NUM_SEQ_CRC` = `UF/YYYY/NÚMERO` confirma `CRC_CERTIFICATE_RE` ✅; `IND_CRC` sem formato no manual (§5.4 — fork (a) mantido) |
| 8, 9, 10 | inalterados |
| **11 (novo, F-C12-7 → a)** | `REGRA_QUALIF_INV_RESP_LEGAL` + `REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE` no `superRefine` ECD |

**F-C12-5/6/7 ratificados 16/09** (§5.1-5.3). C12 = `ready` com 11 comportamentos; a `sessao-feature`
só espera o "executa" do dono.
