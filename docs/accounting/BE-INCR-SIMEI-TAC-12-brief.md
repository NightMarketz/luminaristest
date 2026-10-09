# BE-INCR-SIMEI-TAC-12 — DAS-MEI do transportador autônomo de cargas (CPP de 12%) (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código. Nenhum fork deste documento se auto-ratifica.
> **Autorização:** dono, chat, 2026-10-10: *"abre o BRIEF do DAS de 12% do transportador"* (repassada pelo
> orquestrador). Cobre **só** este BRIEF. **Não** cobre código, `executa` nem ratificação de fork.
> **Nó no vault:** [`SIMEI-TAC-12`](../plano/nos/SIMEI-TAC-12.md) (`planned`, depende de [[X14]]).
> **Origem da lacuna:** D3 do [BRIEF SIMPLES-PISO-ANEXO-XI](BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI-brief.md) §5.2 e PR #619.
> **Base:** `origin/main` `45790e8f` (fetch 2026-10-09).
> **Graus:** **V-corpus** = li no corpus `docs/accounting/fontes-oficiais/` nesta sessão · **V-web** = li na
> página compilada do planalto.gov.br nesta sessão (download por `curl`) · **V-código** = li o arquivo nesta
> sessão · **I** = inferido · **A** = assumido.

## 1. Fatos legais

| # | Fato | Fonte | Grau |
|---|---|---|---|
| L1 | Para o transportador autônomo de cargas inscrito como MEI, a contribuição do art. 13 § 1º X é **12% sobre o salário-mínimo mensal**. | LC 123 art. 18-F III (incl. LC 188/2021) | V-web |
| L2 | Res. CGSN 140 art. 101 I "c": **a partir da competência abril de 2022**, para o transportador do art. 100 § 1º-A, 12% do limite mínimo mensal do salário de contribuição. "b": 5% desde 05/2011 para os demais. | Res. CGSN 140 art. 101 I b-c | V-corpus |
| L3 | O transportador do § 1º-A é o que tem **como ocupação profissional exclusiva** o transporte rodoviário de cargas da **Tabela B** do Anexo XI. | Res. CGSN 140 art. 100 § 1º-A | V-corpus |
| L4 | ICMS R$ 1,00 e ISS R$ 5,00, "caso seja contribuinte", definidos pelo enquadramento do Anexo XI e pelo CNPJ — **iguais para o TAC**; o art. 101 não diferencia II/III. | Res. CGSN 140 art. 101 II, III, § 1º | V-corpus |
| L5 | Lei 8.212 art. 21 § 2º II: 5% para o MEI sobre o limite mínimo mensal do salário de contribuição. **Não há** menção ao transportador autônomo no art. 21 (busca textual na página compilada). O 12% vem só da LC 123 art. 18-F III. | Lei 8.212 art. 21 § 2º | V-web |
| L6 | "Limite mínimo do salário de contribuição" (Res. 140) = "salário-mínimo mensal" (LC 18-F III). A base de hoje (`SALARIO_MINIMO`/`NACIONAL`) serve às duas. | L1 × L2 | I |
| L7 | LC 123 art. 18-A § 3º V tem alíneas "d" e "e" com remissão "Vide LC 214/2025 — produção de efeitos" e LC 227/2026 incluiu no art. 22 a partilha do **"IBS recolhido pelo MEI"** (50% Município / 50% Estado). O texto das alíneas "d"/"e" **não saiu** na extração da página compilada. | LC 123 art. 18-A § 3º V; art. 22 IV-VI | V-web (existência) / **texto não lido** |

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

## 5. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-TAC-1** | Onde mora o 12%? | (a) linha `SIMEI_VALOR/CPP_TAC_PCT` em `legal_parameters` com vigência 2022-04; (b) constante no código | **(a)** — é o padrão do 5% (`CPP_PCT`) e traz vigência, fonte e versão na memória do DAS; mudança de alíquota vira publicação de parâmetro, não deploy. |
| **F-TAC-2** | Ocupação mista (Tabela B + Tabela A) | (a) CPP 5% (não é "exclusiva" ⇒ não é o transportador do § 1º-A, coerente com o limite R$ 81.000 do item 14); (b) CPP 12% se houver qualquer ocupação B | **(a)** — art. 101 I "c" remete ao § 1º-A, que exige ocupação **exclusiva** da Tabela B (L2, L3); usar o mesmo booleano do limite evita estado contraditório (limite comum + CPP de TAC). Grau I: a lei não trata a mista no art. 101 de forma expressa. |
| **F-TAC-3** | Flag TAC sem Anexo XI transcrito vigente na competência (hoje `anexo = null` ⇒ o limite segue só a flag) | (a) segue a flag: 12%; (b) 5% até haver Anexo para conferir | **(a)** — mantém o mesmo booleano do limite (comportamento atual de `limiteMei`) e o PGMEI cobra pelo CNPJ; divergência com o DAS oficial aparece em `divergenciaCents`. |
| **F-TAC-4** | TAC em competência anterior a 04/2022 | (a) 5% (sem linha vigente cai no comum); (b) 400 | **(a)** — o texto vigente da alínea "c" só começa em 04/2022; antes o TAC pagava como MEI comum (I). Hoje inalcançável (SM só a partir de 2024). |
| **F-TAC-5** | 2027: IBS/CBS no valor fixo do MEI (LC 214 / LC 227) | (a) fora deste nó — vai ao BRIEF/PRE-ADR do Simples 2027 (#452); (b) incluir aqui | **(a)** — o texto das alíneas "d"/"e" não foi lido (L7); planejar sem a fonte viola a regra 3 da sessão. |

## 6. Pendente de validação externa

- **L7** — texto das alíneas "d" e "e" do art. 18-A § 3º V (LC 214) e se o valor fixo de IBS/CBS do MEI difere para
  o TAC. Fonte: LC 214/2025 texto original (planalto) — não lido nesta sessão.
- Se o PGMEI de um TAC com ocupação mista emite 5% ou 12% (fecharia F-TAC-2 por observação). Oráculo: guia real.
- SEST/SENAT do transportador autônomo: **não** aparece no art. 101 nem no 18-F; assumido (A) que não entra no DAS-MEI.

## 7. Insumos ausentes

- Res. CGSN 140 na web (normas.receita.fazenda.gov.br) não carregou nesta sessão; usei o corpus versionado
  (`Res-CGSN-140-2018.txt`), mesmo texto usado pelo BRIEF irmão.
- Salário mínimo anterior a 2024 não está em `legal_parameters` — fora do escopo (só importa a F-TAC-4).

## 8. Achados fora de escopo

- O seed `sn1-simei-cpp-pct` cita "art. 101 I b" — correto; nenhuma correção.
- Fluxo guiado MEI→ME (FE) segue aberto no nó SIMPLES-PISO-ANEXO-XI; não planejado aqui.
