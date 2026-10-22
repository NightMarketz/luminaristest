# BE-INCR-ECF-Y600 — registro Y600 (sócios, titular, dirigentes) na ECF (BRIEF)

> **Sessão:** `sessao-planejamento`, sem código. Nenhum fork se auto-ratifica: todos os F-Y600-n abaixo estão
> **RATIFICAÇÃO PENDENTE**.
> **Item:** L11 do H1 (`docs/accounting/RUNBOOK-H1-PVA.md`, passo 6, "Tentativa 2 — validação", tabela de diagnóstico,
> linha **L11**; PR #837, branch `claude/h1-l10-ecf-ordem-bloco-p`, ainda sem merge).
> **Autorização (dono, chat, 2026-10-22):** *"Pausa o passo 6 do H1 até haver ECD assinada (M2 ou 1º cliente) e
> registra isso; segue para o L11 em planejamento."* Registro em
> `docs/plano/decisoes/D-2026-10-22-H1-PASSO6-ESPERA-ECD-ASSINADA.md` (no #837): *"Decide a pausa do passo 6 e o trilho
> do L11 (planejamento, só BRIEF); não autoriza código do L11 nem muda o estado do H1"*. Cobre **este BRIEF**. Não
> cobre código: a execução exige um "executa" próprio.
> **Base:** `origin/main` em `d6ce04db` (22/10).
> **Fonte legal:** dossiê [`pesquisas-legais/ecf-y600/relatorio.md`](../../pesquisas-legais/ecf-y600/relatorio.md),
> **[D01]** = Manual de Orientação do Leiaute 12 da ECF (Anexo ao ADE Cofis 02/2026), "Atualização: maio/2026",
> 621 pp., baixado de sped.rfb.gov.br em 22/10/2026, sha256
> `7216ec2bd62de7d45e5b019298be2420d08c2a3c6ade3646a053412937e95265` (o mesmo do corpus, `fontes-oficiais/MANIFEST.md`).
> O índice oficial (<http://sped.rfb.gov.br/pasta/show/1644>, conferido 22/10) mostra o L12 de 20/05/2026 como o mais
> recente; não há Leiaute 13.

## Contexto fixo

- **Lacuna (verificada pelo PVA):** PVA ECF 12.2.7, validação de 22/10/2026 (H1, tentativa 3): *"Registro obrigatório
  não preenchido"* → **Y600** (`|Y001|1|`). Causa no código (verificada, leitura): `server/src/lib/ecf.ts:381` põe
  `Y001/Y990` em `EMPTY_BLOCKS_TAIL`; nada no gerador emite Y600.
- **Mesma lacuna no Real (verificada, leitura):** `server/src/lib/ecfReal.ts:405` também emite o bloco Y vazio.
- **Obrigatoriedade (verificada, [D01] p. 56):** Y600, entrada `F`, saída **`OC (Se 0010.FORMA_TRIB = "1" a "7")`**,
  ocorrência `[0;N]`. Presumido sai com `FORMA_TRIB = 5` e Real com `1`: os dois caem na regra.
- **Insumos lidos:**
  - `server/src/lib/ecf.ts` (`EcfFileInput`, `buildEcfFile`, `EMPTY_BLOCKS_TAIL`, `buildBlockOpen/Close`, contagem do
    bloco 9 genérica por tipo de registro).
  - `server/src/lib/ecfReal.ts` (`EMPTY_BLOCKS_AFTER_N`, `dataBlock`).
  - `server/src/features/accounting/dtos/SpedEcfDto.ts` (request transiente `.strict()`, D4 do ADR da ECF; `SignerSchema`
    e `refineEcfSigners` exportados e reusados pelo `SpedEcfRealDto`).
  - `server/src/features/accounting/services/SpedEcfGenerationService.ts` (monta `EcfFileInput` a partir do DTO) e
    `SpedEcfRealGenerationService.ts`.
  - Cadastro de sócios do IRRF-DISTRIBUICAO, PR-1 já em `main` (#794): model `Partner` (`schema.prisma:1802`; uma linha
    por **vigência**: `nome`, `taxId` 11/14 com DV, `tipoPessoa` PF/PJ, `residenteBrasil`, `participacaoBp` 0..10000,
    `entradaEm`, `saidaEm` inclusive), `IPartnerRepository.list(scope)`, rotas `GET/POST/PUT/DELETE
    /accounting/partners` (`routes/accounting.ts:409-413`), gate de sobreposição de vigência por `taxId` (item 2 do
    BRIEF IRRF) e soma das participações que não bloqueia o cadastro (item 3, F-IRD-14).
  - `lib/sped.ts`: `spedDate('YYYY-MM-DD') → ddmmaaaa` (valida a data) e `centsToSpedDecimal(int) → "n,dd"`.
- **Nós vizinhos:** consome [IRRF-DISTRIBUICAO](../plano/nos/IRRF-DISTRIBUICAO.md) (só o PR-1; os eventos de
  distribuição e JCP dos PR-2..4 **não existem** em `main`: não há `ProfitDistributionEvent` no schema). É consumido pelo
  H1 (passo 6, pausado) e pela 2ª passada do H1 em Real. Vizinho de tela: o painel da ECF no `my-app` (incremento FE
  separado, ver §6).

## 0. Onde vive

Não há model nem tabela nova na recomendação (F-Y600-2 a). O Y600 é **saída de arquivo** montada pelo gerador da ECF, que
já é Prisma first-class (ADR-INCR-SPED-ECF). Lê o `Partner` (Prisma, PR-1 do IRRF) pelo repositório e recebe no request
os campos que só a ECF usa, no mesmo padrão transiente do declarante e dos signatários (D4). Nada toca DynamicTable,
`RuleContext` ou plugin. Nova dependência: `SpedEcfGenerationService → IPartnerRepository`, dentro de
`features/accounting` (rodar `npm run check:arch`).

## 1. O que o Manual exige (artefato de origem de cada comportamento)

| # | Regra | [D01] | Grau |
|---|---|---|---|
| M1 | Y600 obrigatório na saída quando `FORMA_TRIB` ∈ 1..7 | p. 56 | verificado (texto + PVA) |
| M2 | Lista os 500 maiores sócios/titulares/dirigentes/conselheiros **na data final**, ordenados pelo total de `VL_REM_TRAB + VL_LUC_DIV + VL_JUR_CAP + VL_DEM_REND`; depois as 499 maiores alterações do período (`DT_ALT_SOC`) | p. 570 | verificado (texto) |
| M3 | Entram também os que saíram do quadro no período | p. 570 | verificado |
| M4 | Campos de valor sempre informados, inclusive zero | p. 570 | verificado |
| M5 | 17 campos, nesta ordem: `REG`, `DT_ALT_SOC` (N8, obrig.), `DT_FIM_SOC` (N8, só se a saída foi no ano), `PAIS` (N3, obrig.), `IND_QUALIF_SOCIO` (PF/PJ/FI), `CPF_CNPJ` (C14), `NOM_EMP` (obrig.), `QUALIF` (C2), `PERC_CAP_TOT` (N 8,4), `PERC_CAP_VOT` (N 8,4), `CPF_REP_LEG` (N11, opc.), `QUALIF_REP_LEG` (N2, opc.), `VL_REM_TRAB`, `VL_LUC_DIV`, `VL_JUR_CAP`, `VL_DEM_REND`, `VL_IR_RET` (N 19,2, obrig.) | pp. 570–573 | verificado |
| M6 | `DT_ALT_SOC` pode ser anterior ao ano; com `DT_FIM_SOC`, é a data da última alteração antes da saída; para dirigente, a data em que começou a exercer a função | p. 571 | verificado |
| M7 | 100% sai como `100` | pp. 572–573 | verificado |
| M8 | `REGRA_DATA_FIM_SOC` (Erro): `DT_FIM_SOC` entre `0000.DT_INI` e `0000.DT_FIN` | p. 574 | verificado |
| M9 | `REGRA_OBRIGATORIO_BRASIL` (Erro): `CPF_CNPJ` preenchido **somente** quando `PAIS = 105` | p. 574 | verificado |
| M10 | `REGRA_VALIDA_CPF_CNPJ`, `REGRA_CPF_IND_QUALIF_PJ_FI`, `REGRA_CPF_IND_QUALIF_PF` (Erro): PF ⇒ CPF de 11 com DV; PJ/FI ⇒ CNPJ de 14 com DV | p. 574 | verificado |
| M11 | `REGRA_Y600_QUALIF` (Erro): Brasil+PF ∈ {01,02,09..17}; Brasil+PJ ∈ {03,04}; exterior+PF ∈ {05,06,14}; exterior+PJ ∈ {07,08}. Sócio que também é administrador usa 02 (ou 06) | pp. 572, 574 | verificado |
| M12 | `REGRA_QUALIF_REP_LEG_OBRIGATORIO` (Erro): `CPF_REP_LEG` e `QUALIF_REP_LEG` juntos ou nenhum; PF ∈ {01..06}, PJ ∈ {01,06} | pp. 573–574 | verificado |
| M13 | Sem campo-chave declarado: duas ocorrências do mesmo CPF não colidem | p. 570 ("Campo(s) chave:" vazio) | inferido |
| M14 | Y672 **não** se aplica ao Presumido com `TIP_ESC_PRE = C` (só `FORMA_TRIB` 6, ou 5/7 com `TIP_ESC_PRE = L`); Y612 só imunes/isentas (8, 9) | p. 56 | verificado |

## 2. Checklist de comportamentos

Cada item é testável sozinho. Os marcados *(F-Y600-n)* dependem do fork; o texto segue a **recomendação** e muda se o
dono escolher outro caminho.

### 2.1 Serializador (`lib/ecf.ts`, função pura)

1. **`buildY600(row: Y600Row): string`** emite os 17 campos na ordem de M5. Datas por `spedDate`; valores por
   `centsToSpedDecimal` (zero sai `0,00`, M4); percentuais em bp: `10000` sai `100` (M7), os demais
   `centsToSpedDecimal(bp)` (6000 → `60,00`, como no exemplo da p. 575). `CPF_CNPJ` vazio quando `pais ≠ '105'` (M9);
   `CPF_REP_LEG`/`QUALIF_REP_LEG` vazios juntos (M12); `DT_FIM_SOC` vazio quando ausente. Teste-guarda (nome do GAP-MAP):
   `ecf.test.ts › "L11: Y600"` com a linha do exemplo da p. 575 **acrescida do campo 3 vazio** (17 campos; ver P1 em §4)
   e um caso com saída no ano, um com 100% e um não residente.
2. **Bloco Y com dados.** `EcfFileInput` ganha `y600: Y600Row[]`. Com ≥ 1 linha: `Y001` com `IND_DAD = 0`, as linhas
   Y600 na ordem do item 3, `Y990` com a contagem auto-inclusiva (mesmo padrão do bloco P). O bloco Y sai de
   `EMPTY_BLOCKS_TAIL`; X continua vazio antes dele. O bloco 9 já conta por tipo: o teste confere `|9900|Y600|n|`,
   `Y990` e `9999`. Teste de determinismo existente (mesma entrada ⇒ mesmo sha256) estendido com Y600.
3. **Ordem das ocorrências** *(F-Y600-6)*: primeiro as vigentes em `DT_FIN`, por total (`rem+luc+jur+dem`) decrescente,
   desempate por `NOM_EMP` e depois `CPF_CNPJ` crescentes; depois as demais (encerradas no ano), por `DT_ALT_SOC`
   decrescente com o mesmo desempate. Mais de 500 vigentes ou mais de 499 encerradas → `ValidationError` (400), nunca
   truncamento silencioso.

### 2.2 Contrato do request (`dtos/SpedEcfDto.ts`)

4. **`socios`** *(F-Y600-2, F-Y600-3)*: array obrigatório de complementos, um por **vigência** do cadastro (`partnerId`
   = id da linha `Partner`), com `qualif`, `pais` (só para não residente), `percCapVotBp` (opcional; default =
   `participacaoBp`), `representanteLegal` (opcional) e `valores` (os 5 campos em centavos, **todos obrigatórios**, sem
   default). `partnerId` repetido → 400.
5. **`dirigentes`** *(F-Y600-5)*: array opcional (default `[]`) de pessoas que não estão no cadastro de sócios
   (administrador, diretor, conselheiro): `nome`, `cpf` (11 com DV), `qualif` ∈ {10..17}, `dtAltSoc`, `dtFimSoc?`,
   `representanteLegal?`, `valores`. Saem com `PAIS = 105`, `IND_QUALIF_SOCIO = PF` e percentuais `0`.
6. **`superRefine` espelhando as regras de Erro do PVA**: M11 para `qualif` × residência × tipo de pessoa (o tipo e a
   residência dos sócios só se conhecem no serviço; o DTO valida o que for local — dirigentes e representante legal —
   e o serviço valida o resto, item 9); M12 para o representante; `dtFimSoc ≥ dtAltSoc`; `pais` = 3 dígitos e ≠ `105`.
   `QUALIF 18` recusado *(F-Y600-9)*.
7. **Ponto único:** os schemas `SocioEcfSchema`/`DirigenteEcfSchema` e o refine ficam exportados para o
   `SpedEcfRealDto` reusar (mesmo padrão de `SignerSchema`/`refineEcfSigners`) *(F-Y600-1)*.

### 2.3 Serviço (`SpedEcfGenerationService`)

8. **Leitura do cadastro.** Injeta `Pick<IPartnerRepository, 'list'>` (factory `lib/factory.ts:1695`). Seleciona as
   vigências vivas que cruzam `[ano-01-01, ano-12-31]`: `entradaEm ≤ DT_FIN` e (`saidaEm` nulo ou `≥ DT_INI`).
9. **Cruzamento request × cadastro (400, nada aceito e ignorado).**
   - complemento com `partnerId` inexistente, apagado ou fora do ano → 400 com o `partnerId`;
   - vigência do ano sem complemento → 400 listando os `partnerId` faltantes (sem nome nem CPF na mensagem);
   - sócio `residenteBrasil: false` sem `pais`, ou residente com `pais` → 400 *(F-Y600-10)*;
   - `qualif` incompatível com tipo de pessoa e residência do cadastro (M11) → 400.
10. **Mapeamento vigência → `Y600Row`** *(F-Y600-4)*: `DT_ALT_SOC = entradaEm` (M6); `DT_FIM_SOC = saidaEm` **só** se
    `saidaEm` cai no ano **e** não há outra vigência viva do mesmo `taxId` começando em `saidaEm + 1 dia` (saída de fato;
    mudança de participação não é saída, M2 regra 2); `PAIS = '105'` para residente, senão o do complemento;
    `IND_QUALIF_SOCIO = tipoPessoa`; `CPF_CNPJ = taxId` (vazio no exterior, M9); `NOM_EMP = nome`;
    `PERC_CAP_TOT = participacaoBp`; valores do complemento.
11. **Sem nenhuma ocorrência** (cadastro vazio no ano e `dirigentes` vazio) → 400 `ECF_Y600_SEM_SOCIOS` antes de gerar
    *(F-Y600-7)*. Soma das participações ≠ 100% em `DT_FIN` **não** bloqueia *(F-Y600-8)*.
12. **PII fora da auditoria.** O payload do evento de auditoria da geração não ganha nome nem CPF/CNPJ de sócio (memória
    "Allowlist de auditoria (PII)"); se ganhar algo, só a contagem de Y600, e o campo novo entra na allowlist com teste
    na mesma mudança. Teste: o payload auditado não contém o `taxId` do sócio.

### 2.4 Real *(F-Y600-1, recomendação (a))*

13. `ecfReal.ts` usa o mesmo `buildY600` e a mesma ordem (item 3) e tira o Y de `EMPTY_BLOCKS_AFTER_N`;
    `SpedEcfRealDto` ganha `socios`/`dirigentes` pelos schemas do item 7; `SpedEcfRealGenerationService` lê o cadastro
    pelo mesmo `Pick<IPartnerRepository, 'list'>` e aplica os itens 8–11 (função compartilhada no serviço do Presumido
    ou módulo `y600FromPartners.ts` em `features/accounting/services/`, **um** lugar só).

### 2.5 Gates da mudança

14. `dtoShapeSnapshot`: inserir só as entradas novas (memória "UPDATE do snapshot reordena"). OpenAPI: o corpo de
    `POST /accounting/sped/ecf/generate` (e `/real/generate`, se F-Y600-1 a) documenta `socios`/`dirigentes`; contagem
    de paths inalterada. `cd server && npx tsc --noEmit` e o `tsconfig.test.json`; `npm run check:arch`.
15. **GAP-MAP:** a linha L11 (proposta neste PR, `[ABERTO]`) vira `[CORRIGIDO]` no PR da execução, com o teste-guarda
    do item 1 e o comando `cd server && npx jest src/lib/__tests__/ecf.test.ts -t L11`.
16. **RUNBOOK-H1 (EMENDA, o agente prepara, o dono executa):** antes do `POST /accounting/sped/ecf/generate` do passo 6,
    cadastrar 1 sócio fictício (`POST /accounting/partners`, CPF com DV válido, 100%, `entradaEm` anterior a 2025) e
    mandar `socios` com `qualif` e valores **zero explícitos**. Oráculo disponível já, sem ECD assinada: na validação da
    ECF, o erro do Y600 some e ficam só os 18 do R1 (ECD não recuperada).

## 3. Contratos (esboço; nomes finais pelo `GENERATION_CONTRACTS.md`)

```ts
// dtos/SpedEcfDto.ts
const cents = z.number().int().nonnegative();          // + o teto MAX_CENTS da casa (política, não persistência)
const dateOnly = (f: string) => z.string().refine(isValidDateOnly, `${f} deve ser YYYY-MM-DD real`);
const cpf = z.string().regex(/^\d{11}$/).refine(isValidCpf, 'CPF com DV inválido');

/** Y600 campos 13–17 (Manual ECF L12 p. 573) — todos obrigatórios, zero explícito (p. 570). */
export const Y600ValoresSchema = z
  .object({
    remTrabCents: cents,   // VL_REM_TRAB: pró-labore, aluguéis… antes do IRRF
    lucDivCents: cents,    // VL_LUC_DIV: lucros/dividendos efetivamente pagos no ano
    jurCapCents: cents,    // VL_JUR_CAP: JCP pagos ou creditados, antes do IRRF
    demRendCents: cents,   // VL_DEM_REND: demais rendimentos
    irRetCents: cents,     // VL_IR_RET
  })
  .strict();

/** Campos 11–12 (p. 573); M12: os dois juntos. A faixa de qualif depende do tipo de pessoa (refine). */
export const RepresentanteLegalSchema = z
  .object({ cpf, qualif: z.enum(['01', '02', '03', '04', '05', '06']) })
  .strict();

/** QUALIF aceito pela REGRA_Y600_QUALIF (p. 574); 18 fica de fora (F-Y600-9). */
export const Y600_QUALIF = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17'] as const;

export const SocioEcfSchema = z
  .object({
    partnerId: z.string().min(1),                       // id da VIGÊNCIA (linha Partner)
    qualif: z.enum(Y600_QUALIF),
    pais: z.string().regex(/^\d{3}$/).refine((p) => p !== '105').optional(), // só não residente (F-Y600-10)
    percCapVotBp: z.number().int().min(0).max(10000).optional(),           // default = participacaoBp
    representanteLegal: RepresentanteLegalSchema.optional(),
    valores: Y600ValoresSchema,
  })
  .strict();

export const DirigenteEcfSchema = z
  .object({
    nome: z.string().trim().min(1).max(200),
    cpf,
    qualif: z.enum(['10', '11', '12', '13', '14', '15', '16', '17']),
    dtAltSoc: dateOnly('dtAltSoc'),
    dtFimSoc: dateOnly('dtFimSoc').optional(),
    representanteLegal: RepresentanteLegalSchema.optional(),
    valores: Y600ValoresSchema,
  })
  .strict();

// SpedEcfRequestSchema (e SpedEcfRealRequestSchema, se F-Y600-1 a):
//   socios: z.array(SocioEcfSchema).min(0).max(999),   // obrigatório; o serviço exige ≥ 1 ocorrência no total (item 11)
//   dirigentes: z.array(DirigenteEcfSchema).max(999).default([]),
//   + superRefine: partnerId único; representante PJ só 01/06 é checado no serviço (tipo vem do cadastro).
```

```ts
// lib/ecf.ts — linha já resolvida (o serializador não sabe de Partner)
export interface Y600Row {
  dtAltSoc: string;          // YYYY-MM-DD
  dtFimSoc?: string;         // YYYY-MM-DD, só saída de fato no ano
  pais: string;              // '105' = Brasil
  indQualifSocio: 'PF' | 'PJ';
  cpfCnpj?: string;          // omitido quando pais ≠ '105'
  nome: string;
  qualif: string;
  percCapTotBp: number;      // 0..10000
  percCapVotBp: number;
  cpfRepLeg?: string;
  qualifRepLeg?: string;
  remTrabCents: number; lucDivCents: number; jurCapCents: number; demRendCents: number; irRetCents: number;
}
export function buildY600(r: Y600Row): string;
// EcfFileInput.y600: Y600Row[]  (já ordenado pelo serviço, item 3)
```

Erros novos (400, `ValidationError`): `ECF_Y600_SEM_SOCIOS`, `ECF_Y600_COMPLEMENTO_FALTANDO` (lista de `partnerId`),
`ECF_Y600_PARTNER_FORA_DO_ANO`, `ECF_Y600_PAIS_INCOERENTE`, `ECF_Y600_QUALIF_INCOERENTE`, `ECF_Y600_LIMITE`.

## 4. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-Y600-1** | Escopo de regime | (a) Presumido **e** Real no mesmo incremento; (b) só Presumido (o L11 literal); o Real vira item próprio antes da 2ª passada do H1 | **(a)**: o Real tem a mesma lacuna (`ecfReal.ts:405`), M1 vale para `FORMA_TRIB = 1`, e o serializador e o cruzamento são os mesmos. Divergência registrada: a autorização nomeia o L11, que nasceu do Presumido; (a) estende ao Real e por isso precisa do OK do dono |
| **F-Y600-2** | De onde vem a pessoa | (a) cadastro `Partner` dá identidade, vigência e participação; o request traz só o que é da ECF (qualif, país, voto, representante, valores); (b) tudo no request, transiente como o declarante (D4), sem ler o cadastro; (c) colunas novas no `Partner` (qualif, país, voto) + valores derivados | **(a)**: o cadastro já existe, valida DV e sobreposição, e é a fonte que o IRRF usa; (b) cria uma segunda lista de sócios que pode divergir da primeira; (c) mexe no model e no write_set do IRRF-DISTRIBUICAO, com PR-2..4 ainda por vir |
| **F-Y600-3** | Valores e defaults | (a) os 5 valores **obrigatórios e explícitos** por ocorrência, sem default; `percCapVot` default = participação; `qualif` obrigatório; (b) valores com default zero; (c) derivar do razão e dos eventos de distribuição | **(a)**: zero por default declara à RFB "não pagou nada" sem ninguém ter dito; (c) não é possível hoje (sem `ProfitDistributionEvent`, sem módulo de pró-labore, e o razão não separa por sócio). Quando o IRRF PR-2..4 entrar, derivar lucro/JCP/IRRF vira incremento próprio (§6) |
| **F-Y600-4** | Vigência com mudança de participação | (a) uma ocorrência por vigência do ano, complemento e valores por vigência (o usuário diz quanto foi pago em cada uma); `DT_FIM_SOC` só na saída de fato; (b) complemento por pessoa (`taxId`), produto põe os valores na última ocorrência e zera as outras; (c) colapsar numa linha por pessoa | **(a)**: segue a regra 2 da p. 570 (alterações viram ocorrências) sem o produto inventar rateio; (c) perde as alterações que o Manual manda informar. Como dividir os valores entre ocorrências fica com quem preenche (pergunta ao contador em §5, P3) |
| **F-Y600-5** | Dirigente/conselheiro que não é sócio | (a) array `dirigentes` transiente no request; (b) fora do escopo (só sócios do cadastro) | **(a)**: o Y600 os inclui (p. 570) e o cadastro de sócios não os modela; custo pequeno. (b) deixa a ECF incompleta para PJ com administrador não sócio |
| **F-Y600-6** | Ordem e limites | (a) ordem do item 3, 400 acima de 500/499; (b) mesma ordem, truncar o excesso; (c) ordem do cadastro | **(a)**: a ordem pelo total é texto do Manual (p. 570); truncar esconderia gente da declaração |
| **F-Y600-7** | Nenhuma ocorrência no ano | (a) 400 `ECF_Y600_SEM_SOCIOS`; (b) gerar com Y vazio e deixar o PVA acusar | **(a)**: falha cedo e diz o que falta, como o `unmappedAccounts` da ECD |
| **F-Y600-8** | Soma das participações ≠ 100% em `DT_FIN` | (a) não bloquear; (b) 400; (c) aviso no job | **(a)**: o leiaute não tem regra para isso (só o aviso `REGRA_W100_Y600`, de outro bloco) e o cadastro já devolve `somaParticipacaoBp`; (b) seria política além do PVA |
| **F-Y600-9** | `QUALIF 18` (usufrutuário) | (a) recusar no DTO; (b) aceitar | **(a)**: a descrição do campo lista o 18 (p. 572), mas a `REGRA_Y600_QUALIF` (p. 574, Erro) não o aceita em nenhuma combinação; aceitar levaria a erro no PVA |
| **F-Y600-10** | Não residente, FI, ações em tesouraria/free float | (a) não residente aceito com `pais` obrigatório e `CPF_CNPJ` vazio (M9); FI, tesouraria e free float fora (o `Partner` só tem PF/PJ e o público é LTDA/SLU); (b) recusar não residente também, como os fluxos do IRRF (F-IRD-7) | **(a)**: a ECF só declara e o leiaute cobre o caso; recusar impediria a ECF de PJ com sócio no exterior. A tabela de países fica como insumo ausente (§5) |

## 5. Pendente de validação externa

- **P1 — exemplo × tabela (PVA).** O exemplo da p. 575 tem 16 campos (sem `DT_FIM_SOC`); a tabela tem 17. O BRIEF segue
  a tabela. Oráculo: o PVA na retomada do passo 6 (item 16). Se o PVA recusar 17, o campo 3 sai e o teste do item 1
  muda.
- **P2 — `QUALIF 18` (PVA).** F-Y600-9 segue a regra de validação; confirmar se aparecer cliente usufrutuário.
- **P3 — valores com mudança de participação (contador).** Pergunta exata: *"Sócio que passou de 60% para 40% em julho:
  são duas linhas Y600 (uma por `DT_ALT_SOC`)? Os valores pagos no ano vão inteiros na linha vigente em 31/12 e zerados
  na outra, ou cada linha leva o que foi pago no seu período?"* (F-Y600-4 deixa a escolha com quem preenche.)
- **P4 — conteúdo de `VL_REM_TRAB` × `VL_DEM_REND` (contador).** O Manual põe aluguéis pagos a sócios em
  `VL_REM_TRAB` (p. 573). O produto não classifica; quem preenche decide. Sem efeito no código.

## 6. Insumos ausentes

- **Tabela de países do Sped** (código do `PAIS`): só existe dentro do programa PVA (`Recursos/Tabelas`, p. 571), não
  está no corpus. O DTO valida só o formato (3 dígitos, ≠ 105). Baixar a tabela é passo próprio, se o dono quiser
  validar o código.
- **Eventos de distribuição** (IRRF-DISTRIBUICAO PR-2..4): sem eles, lucros, JCP e IRRF não podem ser derivados
  (F-Y600-3).

## 7. Achados fora de escopo

- **FE-INCR-ECF-Y600 (vizinho, não planejado aqui).** O painel da ECF no `my-app` não manda `socios`. Com este
  incremento, a geração pela tela passa a dar 400 até o FE existir (pela F-Y600-7 a; sem o Y600 o PVA já recusa o
  arquivo). O H1 gera a ECF pela API (RUNBOOK-H1, passo 6), então não depende da tela. Exige autorização própria.
- **Derivar valores dos eventos** quando o IRRF PR-2..4 entrar (lucros, JCP, IRRF por sócio no ano).
- **ADR-INCR-SPED-ECF linha 206** ("PENDENTE-VERIFICAR (FASE 2) quais registros de Y são obrigatórios para Presumido"):
  este BRIEF responde para o Y600, o Y612 e o Y672 (M1, M14). O fold no ADR fica para o PR da execução ou um fold de
  docs; não editado aqui (regra 1 da sessão).
- **Nota do nó.** Não há nó do L11 em `docs/plano/nos/`; o L11 vive no gate [H1](../plano/gates/H1.md) e no GAP-MAP.
  Registrar o BRIEF no H1 é fold posterior (pendência 2 do template da sessão).
