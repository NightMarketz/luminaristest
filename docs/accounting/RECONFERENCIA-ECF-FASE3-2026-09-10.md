# Reconferência do BRIEF da ECF Fase 3 contra o Manual do Leiaute 12

> **Escopo:** conferir `BE-INCR-SPED-ECF-FASE3-lucro-real-brief.md` e
> `BE-INCR-SPED-ECF-layout-transcription.md` contra o Manual oficial agora no corpus local
> (`docs/accounting/fontes-oficiais/`). **Nada aqui ratifica fork nem edita o BRIEF** — é leitura de
> fonte primária, produzindo achados citáveis. Fork continua sendo decisão do dono (ORCH-006).
>
> **Fontes lidas (não de memória):**
> - `Manual-ECF-Leiaute-12.pdf` — Anexo ao ADE Cofis nº 02/2026, **Atualização: maio/2026**, 621 pp.
>   Texto extraído com marcador por página; toda citação `p.N` abaixo é a página impressa do PDF
>   (confirmado: o sumário aponta L100→224 e o registro está na p.224).
> - `RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx` — 1.724.077 bytes, `arquivo/download/8002`.
> - `SPED-indice-manuais.html` — índice oficial `pasta/show/1644`.
> - `server/src/lib/ecf.ts`, `server/src/lib/__tests__/ecf.test.ts`.

## Resumo em duas linhas

O BRIEF **não** foi escrito contra manual velho — as 10 citações de página do Bloco P batem exatamente
com este PDF. Mas quatro coisas mudaram: **Forks 2 e 3 agora têm resposta na fonte**, o **contrato
esboçado do Fork 4 está com a forma errada**, o **item 5 (marcado `[direto]`, já implementado)
aponta a fonte errada do Bloco L**, e há **um possível defeito no Presumido já mergeado** (E990/M990).

---

## A. Versão — o `[DONO confere]` de §4 é satisfazível por evidência

| Afirmação | Estado |
|---|---|
| Manual vigente = Leiaute 12, ADE Cofis 02/2026, atualização **20/05/2026** | ✅ **VERIFICADO**. O PDF carimba "Atualização: maio/2026" (p.1) e o índice oficial `pasta/show/1644` lista *"Manual da ECF - Versão em .pdf - Leiaute 12 (Atualização: 20/05/2026)"* → `item/show/8003`. |
| "Atualização em 23/07/2026, superando a de 20/05" (fonte ATVI) | ❌ **FALSO**. Não existe tal versão no índice oficial. A correção de 2026-09-03 (`TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md` §A.2) estava **certa**. |
| Transcrição (`layout-transcription.md`, cabeçalho §Fonte normativa): "atualização **julho/2026**, 621 páginas" | ⚠️ **ERRO DE TRANSCRIÇÃO**. O próprio doc cita o arquivo `..._20_05_2026_...` duas linhas abaixo. O PDF diz maio/2026. Só o mês está errado; **o conteúdo transcrito não é afetado** (ver B). |

**O BRIEF foi escrito contra este manual.** Falsificador rodado: conferi as 10 páginas que a
transcrição §3 atribui ao Bloco P — P001 **326**, P030 **327**, P100 **329**, P130 **333**, P150 **336**,
P200 **339**, P230 **341**, P300 **343**, P400 **345**, P500 **347**. **Todas exatas.** Idem p.31
(charset ISO 8859-1), p.43-44 (C/E com Entrada=N). Se a transcrição fosse de outro leiaute, essas
páginas teriam deslizado. Não deslizaram.

## B. §5 "Insumos ausentes" está desatualizado — e nomeia o artefato errado

O BRIEF §5 diz *"O Manual … não está commitado no repositório"* e §4 chama o Manual de **artefato único**
que resolveria as 8 pendências externas. Duas correções:

1. O Manual **está** no corpus desde hoje (`Manual-ECF-Leiaute-12.pdf`).
2. **O Manual sozinho não resolve as pendências 3 e 4.** O conteúdo linha-a-linha de L/M/N/P — o que é
   entrada nossa e o que a RFB calcula — vive nas **Tabelas Dinâmicas (XLSX)**, com abas dedicadas:
   `L100A/B/C`, `L210`, `L300A/B/C`, `M300A/R/B/C`, `M350A/R/B/C`, `N500`, `N600`, `N610`, `N620`,
   `N630A/B/C`, `N650`, `N660`, `N670`. Esse XLSX **já estava baixado desde 2026-08-31**
   (`ACCOUNTING-MASTER-MAP.md:546`, `Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026…`, 1.724.077 bytes) —
   é byte-a-byte o mesmo que o corpus baixou de `arquivo/download/8002`. Estava catalogado só como
   "plano referencial" (item X2); ninguém tinha olhado as abas de L/M/N.

## C. Fork 2 (`HASH_ECF_ANTERIOR`) — o Manual responde, e nenhuma das duas opções é a resposta

O fork oferece *"job anterior vs input humano"*. A fonte diz que é **nenhum dos dois**:

- **p.70, registro 0010 campo 2:** `HASH_ECF_ANTERIOR`, C 40, *"Hashcode da ECF do período
  imediatamente anterior a ser recuperado. **Campo preenchido automaticamente pelo sistema**"*,
  Obrigatório = **Não**.
- **p.14:** a recuperação da ECF anterior é obrigatória quando `FORMA_TRIB="1"` **e** `0000.DT_INI` ≠
  01/01/2014 **e** `0000.IND_SIT_INI_PER` ∈ {0, 3, 6}. Na transmissão o programa verifica se existe ECF
  transmitida do período anterior com hashcode igual ao informado; **se não existe ECF anterior, o campo
  tem de estar vazio**.

⇒ É o mesmo padrão dos Blocos C/E que a FASE 2 já tinha descoberto: **o PVA preenche**. O
`HASH_ECF_ANTERIOR` hardcoded vazio de `ecf.ts:152` está **certo** e continua certo no Real; o campo
`hashEcfAnterior` do DTO esboçado (§2) **não deve existir**. Grau: **VERIFICADO**.

**Residual que sobra — e é humano, não de código:** na 2ª geração em diante, se o operador não fizer a
recuperação da ECF anterior dentro do PVA, a **transmissão** falha. Isso é passo de runbook
(`RUNBOOK-H1-PVA.md`, 2ª passada), não comportamento do serializer.

## D. Fork 3 (quem computa o Bloco N) — agora tem evidência, não "consistência com o Presumido"

A recomendação era *"(a) PVA, por consistência com o Presumido"* — analogia. A aba **`N630A`** do XLSX
tem coluna **`TIPO`** com o alfabeto que decide:

| TIPO | Significado | Exemplo em N630A |
|---|---|---|
| **CNA** | Calculada **N**ão **A**lterável — traz a **FÓRMULA** da RFB | linha 1 `BASE DE CÁLCULO DO IRPJ` = `N500(1)`; linha 3 `À Alíquota de 15%` = `SE (N630(1) > 0) ENTAO N630(1)*0,15 SENAO 0 FIM_SE`; linha 4 `Adicional` = `SE (N630(1) <= 20000 * MESES_PERIODO()) ENTAO 0 SENAO (N630(1) - 20000 * MESES_PERIODO()) * 0,1` |
| **E** | Entrada — **nossa** | linha 6 `(-) Operações de Caráter Cultural e Artístico` |
| **R** | Rótulo/subtotal | linha 2 `IMPOSTO SOBRE O LUCRO REAL` |

Contagem por aba: `N630A` 15 CNA / 26 E · `N670` (CSLL) 5 CNA / 26 E · `N500` 1 CNA / 1 E.

⇒ **O PVA computa o imposto do Lucro Real exatamente como computa o do Presumido.** A recomendação (a)
está **correta e agora VERIFICADA**. O comportamento genérico do item 7 do checklist ("nenhuma alíquota
hardcoded sem constante de domínio citável") é confirmado por um fato colateral: as linhas **6.1 / 8.1 /
10.1** têm `DT_INI = 01012026` e implementam o teto de 90% da **LC 224/25** — qualquer alíquota que
tivéssemos fixado em código já estaria desatualizada.

## E. Fork 4 (ajustes do Lalur) — o Manual **não** decide a persistência, mas invalida o contrato

A pergunta "transiente vs model persistido" **continua sendo do dono** — a fonte não fala de
persistência. Mas o esboço de contrato do §2 está com a forma errada:

```ts
lalurAdjustments: z.array(z.object({
  descricao: z.string().min(1),        // ❌ a linha é identificada por CÓDIGO da RFB, não por texto
  valorCents: z.number().int().positive(),
  tipo: z.enum(['adicao','exclusao']), // ❌ redundante: a própria linha traz coluna "TIPO LANÇ"
  natureza: z.enum(['temporaria','definitiva']), // ⚠️ isso é eixo da Parte B, não da Parte A
}))
```

O que a aba **`M300A`** mostra (386 linhas, **374 delas `E`**, 7 CNA, 1 CA, 4 R):

- Cada ajuste é **uma linha de código fixo da RFB** — `6` (Provisões ou perdas estimadas não dedutíveis),
  `7` (Custos não dedutíveis), `8` (Despesas não necessárias), `8.01`, `8.11`… — cada uma com a **base
  legal** na coluna `ORIENTAÇÕES` (arts. 70/71/284 da IN RFB 1.700/2017, art. 6º §2º DL 1.598/77, etc.).
- Existe coluna **`TIPO LANÇ`** (`A` = adição) — a natureza adição/exclusão **é atributo da linha**, não
  input nosso.
- A linha 2 `Lucro Líquido Antes do IRPJ` é **CNA** com fórmula
  `T_DRE(L300("3.01") + L300("3.02.01.01.01.01"))` — o ponto de partida da Parte A é **derivado do
  Bloco L pelo PVA**, não informado por nós.
- `M350A` (e-Lacs/CSLL) tem a mesma forma: 353 linhas, 342 `E`.
- "Temporária vs definitiva" se materializa na **Parte B** (`M010` identificação da conta,
  `M410` lançamento sem reflexo na Parte A, `M500` controle de saldos) — eixo que o esboço não modela.

⇒ **Qualquer que seja a direção do Fork 4**, o contrato precisa de `codigoM300: string` (código da linha)
+ `valorCents`, e a Parte B é um segundo agregado. Sugestão de emenda ao §2 — não aplicada aqui.

## F. Achado novo — o item 5 do checklist aponta a fonte errada do Bloco L

Este é o achado que o BRIEF não tem e que **muda trabalho já marcado como `[direto]` e já implementado**
(item 5 consta ✅ no fold da PR #263).

> **Item 5 do checklist:** *"Novo serviço injeta `AccountingReportService` via
> `getFactory().getAccountingReportService()` para `balanceSheet`/`incomeStatement`"* — com o §Contexto
> dizendo que `balanceSheet`/`incomeStatement` são a *"fonte candidata do Bloco L"*.

O que o Manual determina:

- **p.224, L100 (Balanço Patrimonial):** *"O saldo inicial pode ser replicado do registro E010/E015 ou
  preenchido. **O saldo final será recuperado do registro K155/K156. Os saldos finais do registro L100
  não são editáveis.**"*
- **p.232, L300 (DRE):** *"**Os saldos finais do registro L300 não são editáveis.**"*
- **p.41, Bloco K:** *"Caso haja recuperação da ECD, o bloco K pode ser construído automaticamente."*

⇒ A cadeia real é **ECD recuperada → Bloco K (automático) → L100/L300 (saldos finais não editáveis) →
`M300(2)` via `T_DRE(L300(...))` → `N500` → `N630`**. `AccountingReportService.balanceSheet` **não
alimenta** L100/L300 — os saldos finais vêm do K, e o PVA não aceita edição.

Três consequências:

1. **A contribuição real do Luminaris na ECF-Real é o Bloco M** (as ~374 linhas `E` de M300A + as de
   M350A + Parte B) — exatamente o que o PVA **não** tem como inventar. O Bloco L não é nosso.
2. **Existe um fork que ninguém abriu:** *emitimos L100/L300, ou deixamos o PVA construir da ECD
   recuperada (como já fazemos com J/K/P100/P150 no Presumido)?* O BRIEF assume a primeira sem
   perguntar. Recomendação (não ratificada): **deixar ao PVA**, pela mesma razão do §5 da transcrição —
   importar por fora arrisca divergir do recuperado.
3. **O bloqueador referencial volta pela porta dos fundos.** A FASE 2 concluiu que o §5.1 (`3.3` sem
   código RFB) *"NÃO trava a ECF"* e migra para a ECD. Continua verdade — mas no Real a ECD passa a
   travar a ECF **transitivamente**: mapeamento referencial ruim → K ruim → L100/L300 ruins → `M300(2)`
   ruim → base do IRPJ errada. O item 10 do checklist ("nenhum gate de conta não-mapeada é necessário")
   é verdadeiro sobre *exaustividade da receita 3.1/3.3* e **enganoso** sobre cobertura referencial.

## G. Possível defeito no Presumido já mergeado — `E990` e `M990`

A Tabela de Registros (§4.2, legenda na p.42: `O`=Obrigatório, `F`=Facultativo, `OC`=Obrigatório
Condicional, `N`=**Não Deve Existir**; "Obrigatoriedade de **Entrada**" = no momento da **importação**):

| Registro | Entrada | Saída | p. |
|---|---|---|---|
| C001 / C990 | O / O | O / O | 43-44 |
| E001 | **O** | O | 44 |
| **E990** | **N** | O | 44 |
| M001 | F | O | 47 |
| **M990** | **N** | O | 47 |
| J/K/L/N/P/Q/T/U/V/W/X/Y (001 e 990) | F | O | 45-50 |
| S001 | F | O | 50 |
| **S990** | **ausente da tabela** | — | — |

`server/src/lib/ecf.ts:341-360` emite `E001/E990` e `M001/M990` como pares de bloco vazio, e `S001/S990`
na cauda, justificando pela regra "todos os blocos são obrigatórios" (p.41). O comentário do próprio
arquivo já marcou **S001** como "confirmar no PVA-ECF (sign-off humano)". **`E990` e `M990` são a mesma
classe e não foram marcados.**

**Grau:** o texto do Manual é **VERIFICADO** (Entrada=N). Se o PVA **rejeita** na importação é
**DESCONHECIDO** — só o PVA decide, e é exatamente o déficit de oráculo. `E990=N` com `E001=O` parece
erro de digitação da RFB (todo bloco aberto se fecha), mas "parece typo" não é evidência.

**Ação barata (não executada aqui):** acrescentar ao `RUNBOOK-H1-PVA.md` um passo que, se a importação
falhar, teste remover `E990`/`M990`/`S990` — uma linha em `EMPTY_BLOCKS` cada. Custo zero se o PVA
tolerar; salva uma rodada de diagnóstico se não tolerar.

## H. Correções pontuais de citação

1. **`layout-transcription.md:85`** cita *"Manual p. 13 §1.3"* para `FORMA_TRIB=1`. A frase
   *"1 – Forma de tributação pelo lucro real (0010.FORMA_TRIB = "1")"* está na **p.14**; a p.13 tem a
   lista vizinha de `FORMA_TRIB`. O **conteúdo está certo** — a ratificação de `formaTrib` com
   `.default('1')` (dono, 2026-09-02) é **confirmada pela fonte**: p.70-71, campo 4, `1 – Lucro Real`.
2. **`FORMA_TRIB` é `N`, tamanho 1, valores válidos `[1;2;3;4;5;6;7;8;9;10]`** — o valor `10` (TEF,
   Tributação Específica do Futebol) tem **2 dígitos** num campo de tamanho 1. Um DTO que valide
   "1 dígito" rejeita TEF. Irrelevante ao Luminaris, mas merece comentário no schema para o próximo
   leitor não achar que é bug.
3. **`FORMA_TRIB_PER` (p.71-72, campo 7):** `C 4`, valores `[0;R;P;A;E;S]`, Obrigatório **Não**, formato
   `XXXX` — **um caractere por trimestre**: `0` não compreendido, `R` Real, `P` Presumido, `A` Arbitrado,
   `E` Real Estimativa, `S` TEF/SAF. A decisão de deixar `formaTribPer` **sem default** estava certa (o
   `PPPP` da lib é Presumido). Sob o Fork 5 já ratificado (trimestral), o valor do Real é **`RRRR`**;
   anual/estimativa seria `EEEE`.
4. **`FORMA_APUR` (p.71, campo 5):** `C 1`, `[T;A]`, Obrigatório **Não** — `T` Trimestral, `A` Anual, e é
   **regime-agnóstico** (não é campo só do Presumido). O item 9 do checklist está certo ao parametrizá-lo.
   Fork 5 (a) se materializa em **dois** campos: `FORMA_APUR='T'` **e** `FORMA_TRIB_PER='RRRR'`.
5. **`COD_QUALIF_PJ` (p.70-71, campo 6):** é ele que escolhe o plano referencial (`01 – PJ em Geral`) —
   amarra direto no `RUNBOOK-X2`.

---

## O que muda na fila (proposto, não decidido)

| # | Item | Quem decide |
|---|---|---|
| 1 | Fechar o `[DONO confere]` de §4 com o carimbo maio/2026 + índice oficial | dono (é fold de marcador, não decisão) |
| 2 | Corrigir "julho/2026" → "maio/2026" no cabeçalho da transcrição | correção factual |
| 3 | Registrar Fork 2 como **respondido pela fonte** (PVA preenche; remover `hashEcfAnterior` do DTO) | dono ratifica a leitura |
| 4 | Registrar Fork 3 como **respondido pela fonte** (CNA/E das Tabelas Dinâmicas) | dono ratifica a leitura |
| 5 | Emendar o contrato do Fork 4 (`codigoM300` + Parte B como 2º agregado) — **sem** decidir persistência | dono decide a persistência |
| 6 | **Abrir o fork novo do §F**: emitimos L100/L300 ou deixamos ao PVA? | dono |
| 7 | Reclassificar o item 5 do checklist (fonte do Bloco L) — hoje `[direto]` e implementado | dono |
| 8 | Passo de diagnóstico E990/M990/S990 no `RUNBOOK-H1-PVA.md` | preparável por agente; execução é humana |
| 9 | Transcrever campo-a-campo L/M/N (padrão "Passo A") agora que Manual **e** XLSX estão no corpus | `sessao-planejamento` com autorização própria |

## Grau das afirmações deste documento

- **VERIFICADO** (leitura direta do PDF/XLSX/código, com página ou aba citada): tudo em A, B, C, D, E, F,
  G (o texto do Manual), H.
- **DESCONHECIDO**: se o PVA rejeita `E990`/`M990`/`S990` na importação (§G) — só o PVA decide.
- **NÃO CONFERIDO**: não li o Manual de ponta a ponta (621 pp). Conferi identidade, §4.2 completa,
  registros 0010 / L100 / L300 / M001 / M300 / N630, as regras de recuperação (pp. 13-14) e as 10
  páginas do Bloco P. Campos de L/M/N que não citei aqui **seguem não transcritos**.
- **Viés meu a declarar:** procurei divergência — quem procura divergência acha padrão onde há ruído.
  Os dois lugares onde isso pode ter acontecido são `E990`/`M990` (pode ser typo da RFB, e eu registrei
  isso) e a leitura de que o item 5 está errado (depende de o Bloco L ser deixado ao PVA — que é
  justamente o fork que proponho abrir, não uma conclusão).
