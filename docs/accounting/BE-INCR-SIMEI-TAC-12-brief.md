# BE-INCR-SIMEI-TAC-12 — DAS-MEI do transportador autônomo de cargas (CPP de 12%) (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código. Nenhum fork deste documento se auto-ratifica.
> **Autorização:** dono, chat, 2026-10-10: *"abre o BRIEF do DAS de 12% do transportador"* (repassada pelo
> orquestrador). Cobre **só** este BRIEF. **Não** cobre código nem `executa`.
> **Ratificação F-TAC-1..5:** dono, chat, 2026-10-10, questionário (repassada pelo orquestrador) — ver §0. F-TAC-5 → (b)
> trouxe o bloco 2027 (§9) para este nó; forks F-TAC-6..10 **RATIFICADOS** (dono, 2026-10-09, todos (a) — §9.6.0).
> **Nó no vault:** [`SIMEI-TAC-12`](../plano/nos/SIMEI-TAC-12.md) (`planned`, depende de [[X14]]).
> **Origem da lacuna:** D3 do [BRIEF SIMPLES-PISO-ANEXO-XI](BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI-brief.md) §5.2 e PR #619.
> **Base:** `origin/main` `45790e8f` (fetch 2026-10-09).
> **Graus:** **V-corpus** = li no corpus `docs/accounting/fontes-oficiais/` nesta sessão · **V-web** = li na
> página compilada do planalto.gov.br nesta sessão (download por `curl`) · **V-código** = li o arquivo nesta
> sessão · **I** = inferido · **A** = assumido.

## 0. Ratificação (dono, chat, 2026-10-10, questionário)

| Fork | Decisão | Observação |
|---|---|---|
| F-TAC-1 | **(a)** parâmetro legal `SIMEI_VALOR/CPP_TAC_PCT` = 1200 bp, vigente desde 2022-04 | = recomendação |
| F-TAC-2 | **(a)** ocupação mista (Tabela A + B) ⇒ CPP 5% (MEI comum), mesmo booleano do limite | = recomendação; conferência das citações do dono abaixo |
| F-TAC-3 | **(a)** sem Anexo XI transcrito vigente, segue a flag do perfil (12%) | = recomendação |
| F-TAC-4 | **(a)** competência anterior a 04/2022 ⇒ 5% | = recomendação |
| F-TAC-5 | **(b)** IBS/CBS no DAS do MEI a partir de 2027 **entra neste nó** | **diverge** da recomendação (a); bloco §9, forks F-TAC-6..10 pendentes |

**Conferência das citações do dono no F-TAC-2** (lidas nesta sessão; a decisão **não muda** com o resultado):

| Citação | O que a fonte diz | Grau |
|---|---|---|
| LC 188/2021 | Art. 2º acrescenta o art. 18-F à LC 123 (limites R$ 251.600 / R$ 20.966,67 e CPP de 12%). A palavra "exclusiva" **não aparece** no texto da LC 188 (busca textual: 0 ocorrências). Sustenta o 12%, **não** a exigência de exclusividade. | V-web |
| LC 123 art. 18-A § 17 | **Diverge.** O § 17 trata de alteração de dados no CNPJ que equivale a comunicação de desenquadramento (natureza jurídica, atividade não autorizada, filial). Não fala de transportador nem de ocupação exclusiva. | V-web |
| Res. CGSN 140 art. 100 § 8º | **Diverge.** O § 8º define ocupação **independente** (sem pessoalidade + subordinação + habitualidade com o contratante). Não trata do transportador. | V-corpus |
| *(achado)* Res. CGSN 140 art. 100 § 1º-B | **É o dispositivo que decide a mista de forma expressa:** "o exercício de qualquer ocupação permitida ao SIMEI e não prevista na tabela B do Anexo XI durante o ano calendário implicará a observância dos limites de que tratam o caput e o § 1º **e do disposto na alínea 'b' do inciso I do art. 101**" (5%). Confirma (a) por texto, não só por inferência — a nota "Grau I: a lei não trata a mista" do §5 fica **superada** (V-corpus). | V-corpus |
| *(contexto)* Res. 140 art. 100 caput e § 1º-A | A exigência de exclusividade está no caput ("de forma independente e exclusiva, apenas as ocupações constantes do Anexo XI") e no § 1º-A ("ocupação profissional exclusiva o transporte rodoviário de cargas nos termos da tabela B") — o que o dono quis dizer com "exclusiva". | V-corpus |

Consequência para o código: nenhuma — (a) já era o desenho dos itens 4 e 6. A fonte do seed/alerta passa a citar
"Res. CGSN 140 art. 100 §§ 1º-A e 1º-B; art. 101 I b-c".

## 1. Fatos legais

| # | Fato | Fonte | Grau |
|---|---|---|---|
| L1 | Para o transportador autônomo de cargas inscrito como MEI, a contribuição do art. 13 § 1º X é **12% sobre o salário-mínimo mensal**. | LC 123 art. 18-F III (incl. LC 188/2021) | V-web |
| L2 | Res. CGSN 140 art. 101 I "c": **a partir da competência abril de 2022**, para o transportador do art. 100 § 1º-A, 12% do limite mínimo mensal do salário de contribuição. "b": 5% desde 05/2011 para os demais. | Res. CGSN 140 art. 101 I b-c | V-corpus |
| L3 | O transportador do § 1º-A é o que tem **como ocupação profissional exclusiva** o transporte rodoviário de cargas da **Tabela B** do Anexo XI. | Res. CGSN 140 art. 100 § 1º-A | V-corpus |
| L4 | ICMS R$ 1,00 e ISS R$ 5,00, "caso seja contribuinte", definidos pelo enquadramento do Anexo XI e pelo CNPJ — **iguais para o TAC**; o art. 101 não diferencia II/III. | Res. CGSN 140 art. 101 II, III, § 1º | V-corpus |
| L5 | Lei 8.212 art. 21 § 2º II: 5% para o MEI sobre o limite mínimo mensal do salário de contribuição. **Não há** menção ao transportador autônomo no art. 21 (busca textual na página compilada). O 12% vem só da LC 123 art. 18-F III. | Lei 8.212 art. 21 § 2º | V-web |
| L6 | "Limite mínimo do salário de contribuição" (Res. 140) = "salário-mínimo mensal" (LC 18-F III). A base de hoje (`SALARIO_MINIMO`/`NACIONAL`) serve às duas. | L1 × L2 | I |
| L7 | LC 123 art. 18-A § 3º V tem alíneas "d" e "e" com remissão "Vide LC 214/2025 — produção de efeitos" e LC 227/2026 incluiu no art. 22 a partilha do **"IBS recolhido pelo MEI"** (50% Município / 50% Estado). Na página compilada as alíneas "d"/"e" estão **vazias** (HTML bruto lido: só o rótulo e a remissão). **Texto lido na LC 214 art. 517** — ver §9 (L9-1). | LC 123 art. 18-A § 3º V; art. 22 IV-VI; LC 214 art. 517 | V-web |

**Conferência do insumo do dono** ("DAS-MEI = 5% do SM (12% se caminhoneiro) + R$ 1 ICMS + R$ 5 ISS (R$ 6 misto)"):
- 5% / 12% do salário-mínimo — **confirma** (L1, L2), com duas precisões: o 12% vale **a partir de 04/2022** e
  só para ocupação **exclusiva** da Tabela B ("caminhoneiro" de carga; transporte de passageiros não entra).
- R$ 1 ICMS + R$ 5 ISS (R$ 6 se contribuinte dos dois) — **confirma** (L4), e vale igual para o TAC.
- Valores 2026 (I, aritmética): SM R$ 1.621,00 ⇒ CPP comum R$ 81,05; CPP TAC **R$ 194,52**.

## 2. Estado do código (V-código)

- `simplesCalc.ts` `apurarSimei(competencia, enquadramento, linhas)` (l.503-530): CPP = `SALARIO_MINIMO/NACIONAL` ×
  `SIMEI_VALOR/CPP_PCT` (500 bp, fonte "art. 101 I b", vigente 2011-05-01); ICMS/ISS = `SIMEI_VALOR/ICMS|ISS`.
  **Não recebe** o transportador — CPP sempre 5%.
- `SimplesApuracaoService.montarMei` (l.477-560): já calcula `transportador` (flag `perfil.meiTransportadorCargas`,
  rebaixado para `false` com alerta `MEI_TAC_COM_OCUPACAO_A` quando nem todas as ocupações estão na Tabela B; sem
  Anexo XI vigente transcrito ⇒ fica a flag) e o usa **só** em `limiteMei` (MEI × MEI_TAC). `apurarSimei` é
  chamado **antes** dessa decisão.
- Salário mínimo por competência: `legal_parameters` `SALARIO_MINIMO/NACIONAL` com vigência (2024 R$ 1.412,
  2025 R$ 1.518, 2026 R$ 1.621 — seeds com fonte/URL/sha256 de decreto). Resolvido por `linhaLegalVigente(...,
  competencia-01)`. **Não há linha antes de 2024** (A: competência anterior ⇒ 400 "sem parâmetro legal", hoje já).
- `impressao` (gate dentro da tx do `registrarDas`) inclui `enquadramento` e os ids de `tabela`, **não** a flag
  nem o resultado de `transportador`.
- Provisão (`provisionar`, l.~780): lança o **`valorOficialCents`** digitado do DAS, não o calculado. O 12% muda
  `totalCalculadoCents` e `divergenciaCents`, **não** o lançamento.
- DASN-SIMEI (`SimplesDeclaracaoService.dasnSimei`, art. 109): receita bruta total / parte sujeita a ICMS /
  empregado — **não** soma DAS (I pela leitura da assinatura e do comentário l.46). Sem efeito.

## 3. Checklist de comportamentos

1. **Parâmetro legal da alíquota do TAC** (forma conforme **F-TAC-1**): `SIMEI_VALOR/CPP_TAC_PCT` = 1200 bp,
   `vigenteDesde 2022-04-01`, fonte "Res. CGSN 140 art. 101 I c; LC 123 art. 18-F III", migração de seed
   `INSERT OR IGNORE` no padrão LEGAL-PARAMS (idempotente; entra em `TABELAS_MIGRADAS` se a tabela já estiver
   lá — `SIMEI_VALOR` já é tabela existente, só chave nova). Teste: seed lido por `linhaLegalVigente` em 2022-04 e
   ausente em 2022-03.
2. **`apurarSimei` recebe o transportador**: assinatura `apurarSimei(competencia, enquadramento, linhas,
   opcoes: { transportadorCargas: boolean })`. `true` ⇒ CPP = SM × `CPP_TAC_PCT`; `false` ⇒ `CPP_PCT`.
   Teste de tabela: 2026-05 comum = 8105; TAC = 19452; TAC + ICMS + ISS = 20052.
3. **Competência anterior a 04/2022 com TAC** ⇒ usa 5% (sem linha `CPP_TAC_PCT` vigente o cálculo cai no comum,
   **não** 400) — ver **F-TAC-4** (se o dono preferir 400, muda aqui). Hoje inalcançável (não há SM antes de 2024).
4. **Ordem em `montarMei`**: a decisão `transportador` (flag + item 14 do #619) passa a acontecer **antes** de
   `apurarSimei`, e o mesmo booleano alimenta CPP e `limiteMei`. Regra de quando aplica conforme **F-TAC-2/F-TAC-3**.
   Teste de integração: perfil TAC só Tabela B ⇒ CPP 12% + limite MEI_TAC; TAC + ocupação A ⇒ CPP 5% + limite MEI
   + alerta `MEI_TAC_COM_OCUPACAO_A` (texto do alerta acrescenta "e CPP de 5%").
5. **Memória expõe a regra aplicada**: `ApuracaoSimei` ganha `transportadorCargas: boolean` e
   `cppAliquotaBp: number`; `tabela` lista a linha `CPP_TAC_PCT` quando usada. Atualiza o snapshot de DTO
   (`__dto-shapes__.json`) se o schema de resposta for Zod.
6. **Gate da tx**: `impressao` inclui `transportador` (o efetivo). Teste: mudar a flag do perfil entre `calcular`
   e `registrarDas` ⇒ 409 (hoje o id da linha `CPP_TAC_PCT` em `tabela` já pegaria a mudança 5%↔12%; o campo
   explícito cobre a mudança de limite também).
7. **Divergência DAS × calculado**: sem mudança de código — o `valorOficial` do PGMEI de um TAC (≈ R$ 194,52 +
   ICMS/ISS) deixa de gerar `divergenciaCents` ≈ R$ 113,47. Teste de regressão: registrar DAS 20052 para TAC ⇒
   divergência 0.
8. **Provisão/lançamento**: inalterados (lançam `valorOficialCents`). Teste existente cobre; nenhum item novo.
9. **DASN-SIMEI**: inalterada. Nenhum item.

## 4. Contratos (esboço)

```ts
// models/simplesCalc.ts
export interface OpcoesSimei { transportadorCargas: boolean }
export function apurarSimei(
  competencia: string,                                   // 'YYYY-MM'
  enquadramento: { contribuinteIcms: boolean; contribuinteIss: boolean },
  linhas: readonly LinhaLegal[],
  opcoes: OpcoesSimei,
): ApuracaoSimei;

export interface ApuracaoSimei {
  competencia: string;
  regime: 'MEI';
  salarioMinimoCents: number;
  transportadorCargas: boolean;   // novo — o efetivo (após item 14 do #619)
  cppAliquotaBp: 500 | 1200;      // novo — lido da linha vigente, não constante
  tributos: Partial<Record<'CPP' | 'ICMS' | 'ISS', number>>;
  totalCalculadoCents: number;
  tabela: { legalParameterId: string; fonte: string; vigenteDesde: string }[];
}

// dtos — resposta (se houver schema Zod da visão MEI)
const ApuracaoMeiExtra = z.object({
  transportadorCargas: z.boolean(),
  cppAliquotaBp: z.number().int().positive(),
});

// legal_parameters (seed) — F-TAC-1 (a)
// { id: 'sn-simei-cpp-tac-pct', tabela: 'SIMEI_VALOR', chave: 'CPP_TAC_PCT', valorInt: 1200,
//   vigenteDesde: '2022-04-01', fonte: 'Res. CGSN 140/2018 art. 101 I "c"; LC 123 art. 18-F III (LC 188/2021)' }
```

Nenhum campo novo de entrada: `meiTransportadorCargas` e `meiOcupacoes` já existem no perfil (X14 PR-4 / #619).

## 5. Forks F-TAC-1..5 — RATIFICADOS (§0; texto original mantido)

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-TAC-1** ✅ (a) | Onde mora o 12%? | (a) linha `SIMEI_VALOR/CPP_TAC_PCT` em `legal_parameters` com vigência 2022-04; (b) constante no código | **(a)** — é o padrão do 5% (`CPP_PCT`) e traz vigência, fonte e versão na memória do DAS; mudança de alíquota vira publicação de parâmetro, não deploy. |
| **F-TAC-2** ✅ (a) | Ocupação mista (Tabela B + Tabela A) | (a) CPP 5% (não é "exclusiva" ⇒ não é o transportador do § 1º-A, coerente com o limite R$ 81.000 do item 14); (b) CPP 12% se houver qualquer ocupação B | **(a)** — art. 101 I "c" remete ao § 1º-A, que exige ocupação **exclusiva** da Tabela B (L2, L3); usar o mesmo booleano do limite evita estado contraditório (limite comum + CPP de TAC). Grau I: a lei não trata a mista no art. 101 de forma expressa. |
| **F-TAC-3** ✅ (a) | Flag TAC sem Anexo XI transcrito vigente na competência (hoje `anexo = null` ⇒ o limite segue só a flag) | (a) segue a flag: 12%; (b) 5% até haver Anexo para conferir | **(a)** — mantém o mesmo booleano do limite (comportamento atual de `limiteMei`) e o PGMEI cobra pelo CNPJ; divergência com o DAS oficial aparece em `divergenciaCents`. |
| **F-TAC-4** ✅ (a) | TAC em competência anterior a 04/2022 | (a) 5% (sem linha vigente cai no comum); (b) 400 | **(a)** — o texto vigente da alínea "c" só começa em 04/2022; antes o TAC pagava como MEI comum (I). Hoje inalcançável (SM só a partir de 2024). |
| **F-TAC-5** ✅ **(b)** | 2027: IBS/CBS no valor fixo do MEI (LC 214 / LC 227) | (a) fora deste nó — vai ao BRIEF/PRE-ADR do Simples 2027 (#452); (b) incluir aqui | **(a)** — o texto das alíneas "d"/"e" não foi lido (L7); planejar sem a fonte viola a regra 3 da sessão. |

## 6. Pendente de validação externa

- ~~L7~~ — lido na LC 214 art. 517 + Anexo XXIII (§9). Resta: regulamentação do CGSN para 2027 (§9.4).
- Se o PGMEI de um TAC com ocupação mista emite 5% ou 12% (fecharia F-TAC-2 por observação). Oráculo: guia real.
- SEST/SENAT do transportador autônomo: **não** aparece no art. 101 nem no 18-F; assumido (A) que não entra no DAS-MEI.

## 7. Insumos ausentes

- Res. CGSN 140 na web (normas.receita.fazenda.gov.br) não carregou nesta sessão; usei o corpus versionado
  (`Res-CGSN-140-2018.txt`), mesmo texto usado pelo BRIEF irmão.
- Salário mínimo anterior a 2024 não está em `legal_parameters` — fora do escopo (só importa a F-TAC-4).

## 8. Achados fora de escopo

- O seed `sn1-simei-cpp-pct` cita "art. 101 I b" — correto; nenhuma correção.
- Fluxo guiado MEI→ME (FE) segue aberto no nó SIMPLES-PISO-ANEXO-XI; não planejado aqui.

## 9. Bloco 2027 — IBS/CBS no DAS do MEI (F-TAC-5 → b)

> Fontes baixadas por `curl` nesta sessão: `planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm`, `lcp227.htm`, `lcp123.htm`.
> Graus como no cabeçalho.

### 9.1 Fatos legais

| # | Fato | Fonte | Grau |
|---|---|---|---|
| L9-1 | Redação de 2027 do art. 18-A § 3º: **IV** — a opção pelo MEI importa recolhimento "a) da contribuição [CPP] na forma do § 2º do art. 21 da Lei 8.212" e "b) do ICMS, do ISS, do IBS e da CBS nos valores fixos previstos no inciso V"; **V** — o MEI recolhe "valor mensal correspondente à soma das seguintes parcelas: [...] d) IBS e CBS nos valores discriminados no **Anexo VII** desta Lei Complementar; e) ICMS e ISS nos valores discriminados no Anexo VII". | LC 214 art. 517 (→ LC 123 art. 18-A § 3º IV, V "d", "e") | V-web |
| L9-2 | **Vigência:** art. 517 e art. 520 (Anexo VII) a partir de **01/01/2027**; art. 518 a partir de **01/01/2033** (redação LC 227 do inciso III do art. 544 mantém 517 e 519–534 em 2027). | LC 214 art. 544 III, V | V-web |
| L9-3 | Art. 518 (2033): o § 3º IV "b" passa a "do IBS e da CBS nos valores fixos previstos no inciso V" — ICMS e ISS saem. | LC 214 art. 518 | V-web |
| L9-4 | **Anexo VII da LC 123** (Anexo XXIII da LC 214, via art. 520) — valores fixos mensais por ano-calendário: | LC 214 Anexo XXIII | V-web |

| Vigência | ICMS | ISS | CBS | IBS | Total |
|---|---|---|---|---|---|
| 2027–2028 | R$ 1,00 | R$ 5,00 | **R$ 0,994** | **R$ 0,006** | R$ 7,00 |
| 2029 | R$ 0,90 | R$ 4,50 | R$ 1,00 | R$ 0,20 | R$ 6,60 |
| 2030 | R$ 0,80 | R$ 4,00 | R$ 1,00 | R$ 0,40 | R$ 6,20 |
| 2031 | R$ 0,70 | R$ 3,50 | R$ 1,00 | R$ 0,60 | R$ 5,80 |
| 2032 | R$ 0,60 | R$ 3,00 | R$ 1,00 | R$ 0,80 | R$ 5,40 |
| 2033+ | — | — | R$ 1,00 | R$ 2,00 | R$ 3,00 |

| # | Fato | Fonte | Grau |
|---|---|---|---|
| L9-5 | É **valor fixo** (não percentual) e **soma-se** ao R$ 1 ICMS / R$ 5 ISS até 2032 (com ICMS/ISS decrescentes de 2029 a 2032); **não os substitui** até 2033. Em 2027–28 a CBS + IBS do MEI somam R$ 1,00. | L9-4 | V-web |
| L9-6 | A redação nova das alíneas "d"/"e" **não repete** o "caso seja contribuinte do ICMS/ISS" das alíneas "b"/"c" atuais, e a coluna "Total" do Anexo VII soma as quatro parcelas. Se o MEI só de serviços passa a pagar o R$ 1 de ICMS (ou vice-versa) **não está decidido pelo texto lido**; o § 3º V remete a forma ao CGSN. | L9-1, L9-4 | I — ver F-TAC-8 |
| L9-7 | CPP inalterada em 2027: a alínea "a" do IV continua remetendo à Lei 8.212 art. 21 § 2º; o art. 18-F III (12% do TAC) não é tocado pela LC 214. O Anexo VII **não diferencia o TAC**. | L9-1; LC 123 art. 18-F (compilada) | V-web (texto) / I (TAC sem distinção, por ausência) |
| L9-8 | Opção pelo regime regular: LC 214 art. 41 § 1º–§ 2º trata "Simples Nacional **ou** MEI" como regimes distintos; o § 3º dá a opção pelo regime regular só aos "optantes pelo Simples Nacional"; a LC 123 art. 13 § 9º (red. LC 227) idem ("optante pelo Simples Nacional"), semestral, exercida em setembro/março (§ 10). Nenhum dispositivo lido nomeia o MEI na opção. Como o MEI é "modalidade de microempresa" optante (Res. 140 art. 100 § 5º), o texto **não fecha** a questão. | LC 214 art. 41; LC 123 art. 13 §§ 9º–11 (via LC 214 art. 517 / LC 227) | V-web (textos) / **I** (MEI sem opção) — ver F-TAC-9 |
| L9-9 | Partilha: o IBS recolhido pelo MEI vai 50% ao Município e 50% ao Estado do estabelecimento (LC 123 art. 22 V-VI, red. LC 227); LC 227 também trata "receitas de IBS extinto pelos MEIs" e aquisições do MEI como consumo final. Sem efeito no cálculo do DAS (só na partilha). | LC 227/2026; LC 123 art. 22 | V-web |
| L9-10 | DASN-SIMEI: a LC 214 dá nova redação ao art. 25-B ("declaração única e simplificada de informações socioeconômicas e fiscais", anual) e ao art. 26 § 1º (comprovação da receita pelo registro de vendas). Nada lido acrescenta campo de IBS/CBS à declaração. | LC 214 art. 517 (→ LC 123 arts. 25-B, 26) | V-web (texto) / I (sem efeito no `dasnSimei`) |
| L9-11 | LC 214: adquirente no regime regular pode apropriar **crédito presumido** na compra de transporte de carga de transportador autônomo PF não contribuinte **ou inscrito como MEI**. Efeito no **tomador**, não no DAS do TAC. | LC 214 (crédito presumido do transporte) | V-web (texto) / fora de escopo |

### 9.2 Relação com o PRE-ADR do Simples 2027 (#452)

- O PRE-ADR está **Accepted** (D-2026-10-07); F-SN-0 → (b) colocou o MEI no mesmo trabalho e a recomendação dele já
  dizia "a partir de 2027 com IBS/CBS pelo Anexo VII" — **coerente** com L9-1/L9-4 (V-código: `docs/adr/PRE-ADR-SIMPLES-NACIONAL-CALCULO.md:210`).
- F-SN-11 (opção semestral de IBS/CBS no perfil, com REGULAR as parcelas saem do DAS) é do **ME/EPP**; este BRIEF não o
  altera. F-TAC-9 decide só se o MEI reaproveita esse campo.
- Linha 152-153 do PRE-ADR (Anexos XVIII/XX) não se aplicam ao MEI — o MEI usa o Anexo VII (L9-4). Sem contradição.
- D-2026-09-29 #1 ("o cliente fica no DAS") é do cliente ME/EPP; não diz nada do MEI.

### 9.3 Estado do código relevante (V-código)

- `apurarSimei` lê `SIMEI_VALOR/ICMS` e `/ISS` via `valorInt` (inteiro, **centavos**) — `simplesCalc.ts:512-521`. **R$ 0,994 e
  R$ 0,006 não cabem em centavos inteiros** (F-TAC-7).
- Provisão (`SimplesApuracaoService.provisionar`, l.768-789): uma partida dedução × "Simples Nacional a recolher" pelo
  `valorOficialCents` total — não desdobra por tributo (F-TAC-10).

### 9.4 Não lido / pendente externo

- **Resoluções do CGSN posteriores à 183 que regulamentem o MEI em 2027:** a consulta em `normas.receita.fazenda.gov.br`
  devolveu página sem lista de atos (aplicação JS) — **não lido**. Não afirmo que exista ou não exista.
- PGMEI 2027: se a guia arredonda CBS/IBS por parcela ou só o total — oráculo é a guia real (jan/2027).

### 9.5 Checklist (2027) — condicionado aos forks F-TAC-6..10

10. **Seed do Anexo VII** (forma F-TAC-6/7): linhas `SIMEI_VALOR/CBS`, `/IBS` com vigência 2027-01-01, 2029, 2030, 2031,
    2032, 2033 e linhas novas de `/ICMS`, `/ISS` com vigência 2029..2032 (e fim em 2033). Fonte "LC 123 Anexo VII (LC 214
    art. 520, Anexo XXIII)". Teste: `linhaLegalVigente` devolve o valor de cada ano; 2026-12 continua R$ 1 / R$ 5 sem CBS/IBS.
11. **`apurarSimei` soma CBS/IBS** quando houver linha vigente na competência: `tributos` ganha `CBS` e `IBS`; regra de
    ICMS/ISS conforme F-TAC-8. Teste de tabela: 2027-01 comum contribuinte ICMS+ISS = CPP + 700 (centavos, após F-TAC-7);
    2033-01 = CPP + 300; TAC 2027 = 12% + mesmo fixo (L9-7).
12. **Arredondamento** (F-TAC-7): total em centavos fecha com o Anexo (R$ 7,00 em 2027–28). Teste: soma das parcelas = total da linha do Anexo.
13. **Memória e gate**: `tabela` lista as linhas CBS/IBS usadas (o gate de `impressao` já pega mudança de linha).
14. **Provisão/DASN**: conforme F-TAC-10; DASN sem mudança (L9-10).

Contrato (esboço): `tributos: Partial<Record<'CPP' | 'ICMS' | 'ISS' | 'CBS' | 'IBS', number>>` (centavos inteiros na saída).

### 9.6.0 Ratificação F-TAC-6..10 (dono, chat, 2026-10-09, questionário)

Todos **na recomendação (a)**; prevalecem sobre o texto da §9.6 abaixo, mantido como histórico.

| Fork | Decisão |
|---|---|
| F-TAC-6 | (a) Anexo VII em `legal_parameters`, vigência por ano (mesmo padrão do F-TAC-1) |
| F-TAC-7 | (a) parcelas em milésimos de real como no texto legal; arredonda só o total do DAS |
| F-TAC-8 | (a) CBS/IBS em todo DAS do MEI; ICMS (R$ 1) e ISS (R$ 5) continuam condicionados a ser contribuinte |
| F-TAC-9 | (a) não neste nó: MEI sempre recolhe IBS/CBS no DAS; sem campo novo no perfil — emenda se o CGSN regulamentar a opção |
| F-TAC-10 | (a) lançamento inalterado: uma partida pelo valor oficial do DAS; o MEI não toma crédito |

Fundamentos trazidos pelo dono (EC 132, IVA-Dual de base ampla, crédito ao adquirente, regime regular só para ME/EPP)
estão registrados como **fonte do dono, não conferida**; o texto legal lido é o da §9.1.

### 9.6 Forks novos — RATIFICADOS (ver §9.6.0)

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-TAC-6** | Onde mora o Anexo VII | (a) linhas em `legal_parameters` (`SIMEI_VALOR/CBS`, `/IBS`, e `/ICMS`, `/ISS` com vigência por ano); (b) constante por ano no código | **(a)** — mesmo padrão do F-TAC-1 e do `SIMEI_VALOR` atual; mudança da tabela vira publicação, com fonte e vigência na memória. |
| **F-TAC-7** | Valores sub-centavo (R$ 0,994 CBS / R$ 0,006 IBS em 2027–28) | (a) guardar o Anexo VII em **milésimos de real** (chave com unidade explícita, ex. `valorInt` em 1/1000) e arredondar a centavos só o **total** do DAS; (b) arredondar cada parcela a centavos (0,99 + 0,01); (c) guardar só o total CBS+IBS (R$ 1,00) e repartir na partilha | **(a)** — preserva o texto da lei e o total do Anexo (R$ 7,00); (b) acerta o total por coincidência e erra cada parcela; (c) perde a separação que a partilha (L9-9) e a memória pedem. Grau I até ver a guia PGMEI (§9.4). |
| **F-TAC-8** | ICMS/ISS e CBS/IBS do MEI em 2027 ainda dependem de "ser contribuinte"? | (a) CBS/IBS sempre; ICMS/ISS mantêm o "caso seja contribuinte" (comportamento atual) até o CGSN dizer outra coisa; (b) as quatro sempre (lê o "Total" do Anexo literalmente); (c) as quatro condicionadas | **(a)** — CBS/IBS incidem sobre bens **e** serviços, sem condição no texto; para ICMS/ISS o texto novo é silente (L9-6) e (b) cobraria ICMS de quem só presta serviço. Grau I; reabrir quando a resolução do CGSN for lida. |
| **F-TAC-9** | MEI pode optar por IBS/CBS no regime regular (fora do DAS)? | (a) não neste nó: MEI sempre recolhe pelo Anexo VII; nenhum campo novo no perfil; (b) reusar o campo semestral do F-SN-11 também para o MEI | **(a)** — a lei separa "Simples Nacional ou MEI" e dá a opção só ao "optante pelo Simples Nacional" (L9-8); sem resolução do CGSN lida, criar a opção seria inventar. Se o CGSN abrir, entra por emenda. |
| **F-TAC-10** | Lançamento do DAS-MEI a partir de 2027 | (a) inalterado: uma partida pelo `valorOficialCents` total (como hoje, §2); (b) desdobrar CBS/IBS em contas próprias | **(a)** — o MEI não credita IBS/CBS (regime do MEI, LC 214 art. 41 § 2º) e o DAS é um único débito; desdobrar não muda saldo nem obrigação. A memória da apuração já mostra o valor por tributo. |
